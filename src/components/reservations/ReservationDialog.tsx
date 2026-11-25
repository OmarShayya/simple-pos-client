import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Skeleton, Stack, TextField, Typography } from "@mui/material";
import { Computer, EventBusyOutlined, LoginRounded, PersonOffOutlined, SportsEsports } from "@mui/icons-material";
import { CodeText, DateField, FormDialog, SegmentedControl, SelectField, StatusChip, TimeField } from "@/components/ui";
import type { PhoneValue } from "@/components/ui";
import CustomerPicker from "@/components/pickers/CustomerPicker";
import { customerChoiceError, type CustomerChoice } from "@/components/pickers/customerChoice";
import { reservationsApi } from "@/api/reservations.api";
import { affects } from "@/api/queryKeys";
import { useApiMutation } from "@/hooks/useApiMutation";
import { formatDuration, formatUsd } from "@/utils/format";
import { asCountryCode, normalizePhone } from "@/utils/phone";
import { getTiming } from "@/utils/reservationTiming";
import { businessWindow, timeToMinutes, zonedToUtc } from "@/utils/zonedTime";
import type { PC } from "@/types/gaming.types";
import type { Reservation, ReservationSettings, StationType } from "@/types/reservation.types";
import { useAvailability } from "./reservationQueries";
import { businessDateOf, formatClock, hhmmIn } from "./reservationDates";

const DURATIONS = [30, 60, 90, 120, 150, 180, 240, 300, 360, 480];

export interface ReservationDialogProps {
  open: boolean;
  onClose: () => void;
  /** Edit this booking; omit to create a new one. */
  reservation?: Reservation | null;
  defaultDate: string;
  defaultType?: StationType;
  /** Pre-fill from a click on the timeline. */
  preset?: { stationId?: string; start?: Date } | null;
  settings?: ReservationSettings;
  stations: PC[];
  tz: string;
  onSaved?: (r: Reservation) => void;
  /** Booking actions offered while editing a confirmed booking. */
  actions?: { checkIn: (r: Reservation) => void; noShow: (r: Reservation) => void; cancel: (r: Reservation) => void };
}

const phoneOf = (phone: string, country?: string): PhoneValue => {
  const n = normalizePhone(phone, asCountryCode(country));
  return n ? { e164: n.e164, country: n.country, national: n.national, isValid: n.isValid } : { e164: phone, country: asCountryCode(country), national: "", isValid: false };
};

/** Name + phone the booking is saved with (an existing customer's, or the ones typed in). */
const contactOf = (c: CustomerChoice | null) =>
  c?.mode === "existing"
    ? { name: c.customer.name, phone: c.customer.phone ?? "", country: c.customer.phoneCountry }
    : { name: c?.name.trim() ?? "", phone: c?.phone?.e164 ?? "", country: c?.phone?.country };

/** New / edit booking: station type, night, start time, length, stations, and the customer. */
const ReservationDialog: React.FC<ReservationDialogProps> = ({ open, onClose, reservation, defaultDate, defaultType = "pc", preset, settings, stations, tz, onSaved, actions }) => {
  const editing = Boolean(reservation);

  const [type, setType] = useState<StationType>(defaultType);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState<string | null>(null);
  const [duration, setDuration] = useState(120);
  const [stationIds, setStationIds] = useState<string[]>([]);
  const [customer, setCustomer] = useState<CustomerChoice | null>(null);
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);

  // (Re)initialise whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    setTouched(false);
    if (reservation) {
      const start = new Date(reservation.startTime);
      setType(reservation.type);
      setDate(businessDateOf(start, settings?.schedule, tz));
      setTime(hhmmIn(start, tz));
      setDuration(reservation.durationMinutes);
      setStationIds(reservation.stations.map((s) => s.id));
      setCustomer({ mode: "new", name: reservation.customerName, phone: phoneOf(reservation.customerPhone, reservation.phoneCountry) });
      setNotes(reservation.notes ?? "");
    } else {
      const presetStation = preset?.stationId ? stations.find((s) => s.id === preset.stationId) : undefined;
      setType((presetStation?.type as StationType) ?? defaultType);
      setDate(preset?.start ? businessDateOf(preset.start, settings?.schedule, tz) : defaultDate);
      setTime(preset?.start ? hhmmIn(preset.start, tz) : null);
      setDuration(Math.max(settings?.minDurationMinutes ?? 60, 60));
      setStationIds(presetStation ? [presetStation.id] : []);
      setCustomer(null);
      setNotes("");
    }
    // Only when it opens (or switches booking) — not on every refetch of stations/settings
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reservation?.id, preset]);

  const window = useMemo(() => businessWindow(date, settings?.schedule, tz), [date, settings, tz]);

  /** Start instant from the business night + "HH:mm" (times before opening = after midnight). */
  const startDate = useMemo(() => {
    if (!time) return null;
    let mins = timeToMinutes(time);
    const openMin = timeToMinutes(window.open);
    const closeMin = timeToMinutes(window.close);
    if (closeMin <= openMin && mins < openMin) mins += 24 * 60;
    return zonedToUtc(date, mins, tz);
  }, [time, date, window, tz]);

  const availability = useAvailability({ type, date, durationMinutes: duration }, open);
  const typeStations = stations.filter((s) => (s.type ?? "pc") === type && s.isActive);
  const selectedSlot = availability.data?.slots.find((s) => startDate && new Date(s.start).getTime() === startDate.getTime());
  const ownIds = useMemo(() => new Set(editing ? reservation!.stations.map((s) => s.id) : []), [editing, reservation]);
  const freeIds = selectedSlot ? new Set([...selectedSlot.availableStationIds, ...ownIds]) : null;

  // Drop stations that became unavailable for the chosen time
  useEffect(() => {
    if (!selectedSlot) return;
    const free = new Set([...selectedSlot.availableStationIds, ...ownIds]);
    setStationIds((ids) => (ids.every((id) => free.has(id)) ? ids : ids.filter((id) => free.has(id))));
  }, [selectedSlot, ownIds]);

  const save = useApiMutation({
    mutationFn: async () => {
      const contact = contactOf(customer);
      const payload = {
        start: startDate!.toISOString(),
        durationMinutes: duration,
        stationIds,
        customerName: contact.name,
        customerPhone: contact.phone,
        phoneCountry: contact.country,
        notes: notes.trim() || undefined,
      };
      return editing ? reservationsApi.update(reservation!.id, payload) : reservationsApi.create({ type, ...payload });
    },
    invalidates: affects.reservation,
    successMessage: (r: Reservation) => (editing ? "Booking updated" : `Booked — code ${r.code}`),
    onSuccess: (r) => {
      onSaved?.(r);
      onClose();
    },
    onError: () => void availability.refetch(),
  });

  const errors = {
    time: !startDate ? "Pick a start time" : undefined,
    stations: stationIds.length === 0 ? "Pick at least one station" : undefined,
    customer: customer ? customerChoiceError(customer) ?? undefined : "Find the customer or add a new one",
  };
  const valid = !Object.values(errors).some(Boolean);
  const show = (k: keyof typeof errors) => (touched ? errors[k] : undefined);

  const toggleStation = (id: string) => setStationIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const slots = (availability.data?.slots ?? []).filter((s) => s.status !== "past" || editing);
  const rate = typeStations.find((s) => stationIds.includes(s.id))?.hourlyRate.usd ?? typeStations[0]?.hourlyRate.usd;
  const estimate = rate ? (rate * duration * Math.max(stationIds.length, 1)) / 60 : null;

  const now = Date.now();
  const timing = reservation ? getTiming(reservation, now) : null;
  const canAct = editing && reservation!.status === "confirmed" && actions;

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      dividers
      title={
        editing ? (
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap" component="span">
            <span>Booking</span>
            <CodeText>{reservation!.code}</CodeText>
            <StatusChip status={reservation!.status} kind="reservation" />
          </Stack>
        ) : (
          "New booking"
        )
      }
      subtitle={editing && reservation!.source === "website" ? "Booked on the website — let the customer know if you change the time or stations." : undefined}
      onSubmit={() => {
        setTouched(true);
        if (valid) save.mutate();
      }}
      submitLabel={editing ? "Save changes" : "Create booking"}
      loading={save.isPending}
      secondaryActions={
        canAct && (
          <>
            <Button variant="outlined" startIcon={<LoginRounded />} disabled={!timing?.canCheckIn} onClick={() => actions!.checkIn(reservation!)}>
              Check in
            </Button>
            {timing?.isLate && (
              <Button color="warning" startIcon={<PersonOffOutlined />} onClick={() => actions!.noShow(reservation!)}>
                No-show
              </Button>
            )}
            <Button color="error" startIcon={<EventBusyOutlined />} onClick={() => actions!.cancel(reservation!)}>
              Cancel booking
            </Button>
          </>
        )
      }
    >
      <Stack spacing={3}>
        {/* When */}
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", md: "auto 1fr 1fr 1fr" }, alignItems: "start" }}>
          <Box sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}>
            <SegmentedControl<StationType>
              aria-label="Station type"
              value={type}
              onChange={(v) => {
                setType(v);
                setStationIds([]);
              }}
              size="large"
              options={[
                { value: "pc", label: "PC", icon: <Computer />, disabled: editing },
                { value: "playstation", label: "PlayStation", icon: <SportsEsports />, disabled: editing },
              ]}
            />
          </Box>
          <Box sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}>
            <DateField label="Night of" value={date} onChange={(d) => d && setDate(d)} clearable={false} required />
          </Box>
          <TimeField label="Start time" value={time} onChange={setTime} minutesStep={settings?.slotMinutes ?? 30} required error={Boolean(show("time"))} helperText={show("time")} />
          <SelectField<number>
            label="Length"
            value={duration}
            onChange={setDuration}
            options={[...new Set([...DURATIONS, duration])].sort((a, b) => a - b).map((d) => ({ value: d, label: formatDuration(d) }))}
          />
        </Box>

        {/* Quick pick */}
        <Box>
          <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
            Free start times{" "}
            <Typography component="span" variant="body2" color="text.secondary">
              {availability.data?.closed ? "· closed this night (you can still pick a time)" : `· open ${formatClock(window.open)} – ${formatClock(window.close)}`}
            </Typography>
          </Typography>
          {availability.isLoading ? (
            <Stack direction="row" spacing={1}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} variant="rounded" width={110} height={40} />
              ))}
            </Stack>
          ) : slots.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No start times left this night.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", gap: 1, overflowX: "auto", pb: 0.75 }}>
              {slots.map((s) => {
                const active = Boolean(startDate && new Date(s.start).getTime() === startDate.getTime());
                const full = s.availableCount === 0;
                return (
                  <Chip
                    key={s.start}
                    clickable
                    onClick={() => setTime(hhmmIn(s.start, tz))}
                    color={active ? "primary" : "default"}
                    variant={active ? "filled" : "outlined"}
                    aria-pressed={active}
                    label={
                      <span>
                        <b>{s.label}</b>{" "}
                        <Box component="span" sx={{ color: active ? "inherit" : full ? "error.main" : "text.secondary" }}>
                          {full ? "full" : `${s.availableCount} free`}
                        </Box>
                      </span>
                    }
                    sx={{ flexShrink: 0, height: 40, borderRadius: "8px", opacity: full && !active ? 0.6 : 1 }}
                  />
                );
              })}
            </Box>
          )}
        </Box>

        {/* Stations */}
        <Box>
          <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
            Stations{" "}
            <Typography component="span" variant="body2" color={show("stations") ? "error" : "text.secondary"}>
              {show("stations") ?? (stationIds.length ? `· ${stationIds.length} selected` : "· tap to select")}
            </Typography>
          </Typography>
          {!startDate ? (
            <Typography variant="body2" color="text.secondary">
              Pick a start time to see which stations are free.
            </Typography>
          ) : (
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
              {typeStations.map((s) => {
                const selected = stationIds.includes(s.id);
                const free = !freeIds || freeIds.has(s.id);
                return (
                  <Chip
                    key={s.id}
                    clickable={free}
                    disabled={!free && !selected}
                    onClick={() => free && toggleStation(s.id)}
                    color={selected ? "primary" : "default"}
                    variant={selected ? "filled" : "outlined"}
                    aria-pressed={selected}
                    label={`${s.pcNumber}${free ? "" : " · busy"}`}
                    sx={{ fontWeight: 600, minWidth: 84, height: 44, borderRadius: "8px", fontVariantNumeric: "tabular-nums" }}
                  />
                );
              })}
              {!typeStations.length && <Typography variant="body2">No active stations of this type.</Typography>}
            </Stack>
          )}
          {startDate && !selectedSlot && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Custom time — the stations are checked when you save.
            </Typography>
          )}
          {estimate !== null && stationIds.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              About <b>{formatUsd(estimate)}</b> for {formatDuration(duration)} on {stationIds.length === 1 ? "1 station" : `${stationIds.length} stations`}.
            </Typography>
          )}
        </Box>

        {/* Customer */}
        <Box>
          <Typography variant="subtitle2" component="h3" sx={{ mb: 1.25 }}>
            Customer
          </Typography>
          <Stack spacing={2}>
            <CustomerPicker value={customer} onChange={setCustomer} required label="Name or phone" showErrors={touched} />
            <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 500 } }} />
          </Stack>
        </Box>

        {editing && reservation!.status !== "confirmed" && (
          <Alert severity="info">This booking is {reservation!.status === "checked_in" ? "checked in" : reservation!.status.replace("_", "-")} — changes are for the record only.</Alert>
        )}
      </Stack>
    </FormDialog>
  );
};

export default ReservationDialog;
