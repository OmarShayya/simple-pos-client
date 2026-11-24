import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Computer, SportsEsports } from "@mui/icons-material";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { reservationsApi } from "@/api/reservations.api";
import type { PC } from "@/types/gaming.types";
import type { Reservation, ReservationSettings, StationType } from "@/types/reservation.types";
import { handleApiError } from "@/utils/errorHandler";
import { addDays, businessWindow, dateInTz, fmtDuration, timeToMinutes, zonedToUtc } from "@/utils/zonedTime";

const DURATIONS = [30, 60, 90, 120, 150, 180, 240, 300, 360, 480];

interface Props {
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
  onSaved: (r: Reservation) => void;
}

const hhmmIn = (d: Date, tz: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);

/** Business date a start instant belongs to (a 1 AM start belongs to the night before). */
const businessDateOf = (d: Date, settings: ReservationSettings | undefined, tz: string) => {
  const local = dateInTz(d, tz);
  const prev = addDays(local, -1);
  const w = businessWindow(prev, settings?.schedule, tz);
  return !w.closed && d >= w.start && d < w.end ? prev : local;
};

const ReservationDialog: React.FC<Props> = ({
  open,
  onClose,
  reservation,
  defaultDate,
  defaultType = "pc",
  preset,
  settings,
  stations,
  tz,
  onSaved,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const editing = !!reservation;

  const [type, setType] = useState<StationType>(defaultType);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(120);
  const [stationIds, setStationIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);

  // (Re)initialise whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    setTouched(false);
    if (reservation) {
      const start = new Date(reservation.startTime);
      setType(reservation.type);
      setDate(businessDateOf(start, settings, tz));
      setTime(hhmmIn(start, tz));
      setDuration(reservation.durationMinutes);
      setStationIds(reservation.stations.map((s) => s.id));
      setName(reservation.customerName);
      setPhone(reservation.customerPhone);
      setNotes(reservation.notes ?? "");
    } else {
      const presetStation = preset?.stationId ? stations.find((s) => s.id === preset.stationId) : undefined;
      setType((presetStation?.type as StationType) ?? defaultType);
      setDate(preset?.start ? businessDateOf(preset.start, settings, tz) : defaultDate);
      setTime(preset?.start ? hhmmIn(preset.start, tz) : "");
      setDuration(Math.max(settings?.minDurationMinutes ?? 60, 60));
      setStationIds(presetStation ? [presetStation.id] : []);
      setName("");
      setPhone("");
      setNotes("");
    }
  }, [open, reservation, preset, defaultDate, defaultType, settings, stations, tz]);

  const window = useMemo(() => businessWindow(date, settings?.schedule, tz), [date, settings, tz]);

  /** Start instant from the business date + "HH:mm" (times before opening = after midnight). */
  const startDate = useMemo(() => {
    if (!/^\d{2}:\d{2}$/.test(time)) return null;
    let mins = timeToMinutes(time);
    const openMin = timeToMinutes(window.open);
    const closeMin = timeToMinutes(window.close);
    if (closeMin <= openMin && mins < openMin) mins += 24 * 60;
    return zonedToUtc(date, mins, tz);
  }, [time, date, window, tz]);

  const availability = useQuery({
    queryKey: ["reservation-availability", type, date, duration],
    queryFn: () => reservationsApi.availability({ type, date, durationMinutes: duration }),
    enabled: open,
    refetchInterval: open ? 30_000 : false,
  });

  const typeStations = stations.filter((s) => (s.type ?? "pc") === type && s.isActive);
  const selectedSlot = availability.data?.slots.find((s) => startDate && new Date(s.start).getTime() === startDate.getTime());
  const ownIds = new Set(editing ? reservation!.stations.map((s) => s.id) : []);
  const freeIds = selectedSlot ? new Set([...selectedSlot.availableStationIds, ...ownIds]) : null;

  // Drop stations that became unavailable for the chosen time
  useEffect(() => {
    if (!freeIds) return;
    setStationIds((ids) => ids.filter((id) => freeIds.has(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlot?.start, availability.dataUpdatedAt]);

  const phoneOk = phone.replace(/\D/g, "").length >= 7;
  const valid = !!startDate && stationIds.length > 0 && name.trim().length > 0 && phoneOk;

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        start: startDate!.toISOString(),
        durationMinutes: duration,
        stationIds,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        notes: notes.trim() || undefined,
      };
      return editing ? reservationsApi.update(reservation!.id, payload) : reservationsApi.create({ type, ...payload });
    },
    onSuccess: (r) => {
      toast.success(editing ? "Booking updated" : `Booked — code ${r.code}`);
      onSaved(r);
      onClose();
    },
    onError: (e) => {
      toast.error(handleApiError(e));
      availability.refetch();
    },
  });

  const toggleStation = (id: string) =>
    setStationIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const slots = (availability.data?.slots ?? []).filter((s) => s.status !== "past" || editing);

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 800 }}>{editing ? `Edit booking ${reservation!.code}` : "New booking"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {/* What + when */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.75 }}>
                Station type
              </Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                value={type}
                disabled={editing}
                onChange={(_, v) => {
                  if (!v) return;
                  setType(v);
                  setStationIds([]);
                }}
              >
                <ToggleButton value="pc" sx={{ gap: 0.75 }}>
                  <Computer fontSize="small" /> PC
                </ToggleButton>
                <ToggleButton value="playstation" sx={{ gap: 0.75 }}>
                  <SportsEsports fontSize="small" /> PlayStation
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                label="Night of"
                type="date"
                fullWidth
                size="small"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ mt: { sm: 2.6 } }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 2.5 }}>
              <TextField
                label="Start"
                type="time"
                fullWidth
                size="small"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 300 } }}
                sx={{ mt: { sm: 2.6 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 2.5 }}>
              <TextField
                select
                label="Length"
                fullWidth
                size="small"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                sx={{ mt: { sm: 2.6 } }}
              >
                {[...new Set([...DURATIONS, duration])].sort((a, b) => a - b).map((d) => (
                  <MenuItem key={d} value={d}>
                    {fmtDuration(d)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {/* Quick-pick slots */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.75 }}>
              Quick pick {availability.data?.closed ? "— closed this day (you can still type a time)" : `· open ${window.open}–${window.close}`}
            </Typography>
            {availability.isLoading ? (
              <CircularProgress size={20} />
            ) : (
              <Box sx={{ display: "flex", gap: 0.75, overflowX: "auto", pb: 0.5 }} className="thin-scrollbar">
                {slots.map((s) => {
                  const active = startDate && new Date(s.start).getTime() === startDate.getTime();
                  const full = s.availableCount === 0;
                  return (
                    <Chip
                      key={s.start}
                      clickable
                      onClick={() => setTime(hhmmIn(new Date(s.start), tz))}
                      color={active ? "primary" : "default"}
                      variant={active ? "filled" : "outlined"}
                      label={
                        <span>
                          <b>{s.label}</b>{" "}
                          <Box component="span" sx={{ opacity: 0.75, color: full ? "error.main" : active ? "inherit" : "success.main" }}>
                            {full ? "full" : `${s.availableCount} free`}
                          </Box>
                        </span>
                      }
                      sx={{ flexShrink: 0, opacity: full && !active ? 0.55 : 1 }}
                    />
                  );
                })}
              </Box>
            )}
          </Box>

          {/* Stations */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.75 }}>
              Stations {stationIds.length ? `· ${stationIds.length} selected` : ""}
            </Typography>
            {!startDate && <Typography variant="body2" color="text.secondary">Pick a start time to see which stations are free.</Typography>}
            {startDate && (
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75}>
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
                      label={`${s.pcNumber}${free ? "" : " · busy"}`}
                      sx={{ fontWeight: 700, minWidth: 72 }}
                    />
                  );
                })}
                {!typeStations.length && <Typography variant="body2">No active stations of this type.</Typography>}
              </Stack>
            )}
            {!selectedSlot && startDate && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                Custom time — availability is checked when you save.
              </Typography>
            )}
          </Box>

          {/* Customer */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Customer name"
                fullWidth
                size="small"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={touched && !name.trim()}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Phone"
                fullWidth
                size="small"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={touched && !phoneOk}
                helperText={touched && !phoneOk ? "Enter a valid phone number" : undefined}
              />
            </Grid>
            <Grid size={12}>
              <TextField label="Notes (optional)" fullWidth size="small" multiline minRows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Grid>
          </Grid>

          {editing && reservation!.source === "website" && (
            <Alert severity="info" variant="outlined">
              Booked online — let the customer know if you change the time or stations.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          disabled={save.isPending}
          onClick={() => {
            setTouched(true);
            if (valid) save.mutate();
            else if (!startDate) toast.info("Pick a start time");
            else if (!stationIds.length) toast.info("Pick at least one station");
          }}
        >
          {save.isPending ? "Saving…" : editing ? "Save changes" : "Create booking"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReservationDialog;
