import React, { useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Box, Button, Paper, Skeleton, Stack, Switch, TextField, Typography } from "@mui/material";
import { ArrowBackRounded, ContentCopyRounded, SaveRounded } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { PageHeader, QuantityStepper, SectionCard, SegmentedControl, SelectField, SettingRow, TimeField } from "@/components/ui";
import { useReservationSettings } from "@/components/reservations/reservationQueries";
import { reservationsApi } from "@/api/reservations.api";
import { affects, queryKeys } from "@/api/queryKeys";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useAuthStore } from "@/store/authStore";
import { formatDuration } from "@/utils/format";
import { timeToMinutes } from "@/utils/zonedTime";
import type { DaySchedule, ReservationSettings as Settings, StationType } from "@/types/reservation.types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Monday first. */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DURATIONS = [30, 60, 90, 120, 150, 180, 240, 300, 360, 480, 720];
const ADVANCE_DAYS = [0, 1, 2, 3, 7, 14, 21, 30, 60, 90];
const LEAD_MINUTES = [0, 15, 30, 60, 120, 180, 360, 720, 1440];
const GRACE_MINUTES = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const BUFFER_MINUTES = [0, 5, 10, 15, 20, 30, 45, 60];
const TIMEZONES: string[] = (() => {
  try {
    return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone");
  } catch {
    return ["Asia/Beirut"];
  }
})();

/** Options for a numeric select, keeping a stored value that isn't in the list. */
const optionsOf = (values: number[], current: number, label: (n: number) => string) =>
  [...new Set([...values, current])].sort((a, b) => a - b).map((value) => ({ value, label: label(value) }));

const minutesLabel = (n: number) => (n === 0 ? "None" : n < 60 ? `${n} min` : formatDuration(n));
const leadLabel = (n: number) => (n === 0 ? "Any time (no notice)" : `${minutesLabel(n)} before`);
const advanceLabel = (n: number) => (n === 0 ? "Same day only" : n === 1 ? "1 day ahead" : `${n} days ahead`);

const hoursLabel = (d: DaySchedule) => {
  if (d.closed) return "Closed";
  const open = timeToMinutes(d.open);
  let close = timeToMinutes(d.close);
  const overnight = close <= open;
  if (overnight) close += 1440;
  return `${formatDuration(close - open)}${overnight ? ", closes next morning" : ""}`;
};

const normalise = (s: Settings) =>
  JSON.stringify({ ...s, schedule: [...s.schedule].sort((a, b) => a.day - b.day).map(({ day, closed, open, close }) => ({ day, closed, open, close })), updatedAt: undefined });

/** Opening hours + online booking rules (admins and managers). */
const ReservationSettings: React.FC = () => {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === "admin" || role === "manager";

  const q = useReservationSettings();
  const [form, setForm] = useState<Settings | null>(null);

  useEffect(() => {
    if (q.data) setForm(structuredClone(q.data));
  }, [q.data]);

  const dirty = useMemo(() => Boolean(form && q.data && normalise(form) !== normalise(q.data)), [form, q.data]);

  // Warn before leaving the page with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const save = useApiMutation({
    mutationFn: (s: Settings) => reservationsApi.updateSettings(s),
    invalidates: [...affects.reservation, queryKeys.reservations.settings()],
    successMessage: "Booking rules saved — the website uses them right away",
  });

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));
  const day = (d: number): DaySchedule => form?.schedule.find((s) => s.day === d) ?? { day: d, closed: false, open: "16:00", close: "04:00" };
  const setDay = (d: number, patch: Partial<DaySchedule>) => set("schedule", DAY_ORDER.map((x) => (x === d ? { ...day(x), ...patch } : day(x))));
  const copyToAll = (d: number) => {
    const src = day(d);
    set("schedule", DAY_ORDER.map((x) => ({ ...src, day: x })));
  };
  const toggleType = (t: StationType, on: boolean) =>
    form && set("bookableTypes", on ? [...new Set([...form.bookableTypes, t])] : form.bookableTypes.filter((x) => x !== t));

  const durationError = Boolean(form && form.minDurationMinutes > form.maxDurationMinutes);
  const loading = !form;
  const disabled = !canEdit || loading;
  const valueSkeleton = <Skeleton variant="rounded" width={200} height={40} />;

  return (
    <Box sx={{ pb: 12 }}>
      <PageHeader
        title="Booking rules"
        subtitle="When the lounge is open and how customers can book on the website. Staff can always book anything from the Reservations screen."
        actions={
          <Button variant="outlined" startIcon={<ArrowBackRounded />} onClick={() => navigate("/reservations")}>
            Reservations
          </Button>
        }
      />

      {!canEdit && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Only admins and managers can change these rules.
        </Alert>
      )}
      {q.isError && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => q.refetch()}>Retry</Button>}>
          Couldn't load the booking rules.
        </Alert>
      )}

      <Stack spacing={2.5}>
        <SectionCard title="Online booking" divider>
          <SettingRow
            label="Customers can book on the website"
            description={form && !form.enabled ? "Paused — the website shows your phone number instead." : "Bookings are confirmed instantly when stations are free."}
          >
            {loading ? <Skeleton variant="rounded" width={58} height={38} /> : <Switch checked={form.enabled} disabled={disabled} onChange={(e) => set("enabled", e.target.checked)} inputProps={{ "aria-label": "Online booking" }} />}
          </SettingRow>
          <SettingRow label="PCs can be booked online">
            {loading ? <Skeleton variant="rounded" width={58} height={38} /> : <Switch checked={form.bookableTypes.includes("pc")} disabled={disabled} onChange={(e) => toggleType("pc", e.target.checked)} inputProps={{ "aria-label": "PCs can be booked online" }} />}
          </SettingRow>
          <SettingRow label="PlayStation rooms can be booked online">
            {loading ? (
              <Skeleton variant="rounded" width={58} height={38} />
            ) : (
              <Switch checked={form.bookableTypes.includes("playstation")} disabled={disabled} onChange={(e) => toggleType("playstation", e.target.checked)} inputProps={{ "aria-label": "PlayStation rooms can be booked online" }} />
            )}
          </SettingRow>
        </SectionCard>

        <SectionCard title="Opening hours" subtitle="A closing time earlier than the opening time means the next morning (e.g. 4:00 PM – 4:00 AM)." divider>
          <Stack divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}>
            {DAY_ORDER.map((d) => {
              const s = day(d);
              return (
                <Box
                  key={d}
                  sx={{
                    display: "grid",
                    alignItems: "center",
                    gap: 1.5,
                    py: 1.5,
                    gridTemplateColumns: { xs: "1fr 1fr", md: "180px 170px 170px 1fr auto" },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ gridColumn: { xs: "1 / 2", md: "auto" } }}>
                    {loading ? <Skeleton variant="rounded" width={58} height={38} /> : <Switch checked={!s.closed} disabled={disabled} onChange={(e) => setDay(d, { closed: !e.target.checked })} inputProps={{ "aria-label": `Open on ${DAYS[d]}` }} />}
                    <Typography sx={{ fontWeight: 600 }}>{DAYS[d]}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ display: { xs: "block", md: "none" }, textAlign: "right" }}>
                    {loading ? <Skeleton width={80} sx={{ ml: "auto" }} /> : hoursLabel(s)}
                  </Typography>
                  {loading ? (
                    <>
                      <Skeleton variant="rounded" height={48} />
                      <Skeleton variant="rounded" height={48} />
                    </>
                  ) : (
                    <>
                      <TimeField label="Opens" size="small" value={s.open} minutesStep={30} disabled={disabled || s.closed} onChange={(v) => v && setDay(d, { open: v })} />
                      <TimeField
                        label="Closes"
                        size="small"
                        value={s.close}
                        minutesStep={30}
                        disabled={disabled || s.closed}
                        onChange={(v) => v && setDay(d, { close: v })}
                        error={!s.closed && s.open === s.close}
                        helperText={!s.closed && s.open === s.close ? "Must differ from opening" : undefined}
                      />
                    </>
                  )}
                  <Typography variant="body2" color="text.secondary" sx={{ display: { xs: "none", md: "block" } }}>
                    {loading ? <Skeleton width={120} /> : hoursLabel(s)}
                  </Typography>
                  <Button
                    variant="text"
                    startIcon={<ContentCopyRounded fontSize="small" />}
                    disabled={disabled}
                    onClick={() => copyToAll(d)}
                    // Muted: seven teal links in a column would shout louder than the hours
                    sx={{ gridColumn: { xs: "1 / -1", md: "auto" }, justifySelf: { xs: "start", md: "end" }, color: "text.secondary", "&:hover": { color: "text.primary" } }}
                  >
                    Copy to all days
                  </Button>
                </Box>
              );
            })}
          </Stack>
        </SectionCard>

        <SectionCard title="Booking rules" divider>
          <SettingRow label="Start times every" description="Customers pick a start time from this grid.">
            {loading ? (
              valueSkeleton
            ) : (
              <SegmentedControl<string>
                aria-label="Start times every"
                value={String(form.slotMinutes)}
                onChange={(v) => !disabled && set("slotMinutes", Number(v) as Settings["slotMinutes"])}
                options={[
                  { value: "15", label: "15 min", disabled },
                  { value: "30", label: "30 min", disabled },
                  { value: "60", label: "1 hour", disabled },
                ]}
              />
            )}
          </SettingRow>
          <SettingRow label="Booking length" description="Shortest and longest booking customers can make online.">
            {loading ? (
              valueSkeleton
            ) : (
              <Stack direction="row" spacing={1.5} sx={{ width: { xs: "100%", sm: 360 } }}>
                <SelectField<number>
                  label="Shortest"
                  size="small"
                  value={form.minDurationMinutes}
                  disabled={disabled}
                  error={durationError}
                  onChange={(v) => set("minDurationMinutes", v)}
                  options={optionsOf(DURATIONS, form.minDurationMinutes, formatDuration)}
                />
                <SelectField<number>
                  label="Longest"
                  size="small"
                  value={form.maxDurationMinutes}
                  disabled={disabled}
                  error={durationError}
                  helperText={durationError ? "Must be longer than the shortest" : undefined}
                  onChange={(v) => set("maxDurationMinutes", v)}
                  options={optionsOf(DURATIONS, form.maxDurationMinutes, formatDuration)}
                />
              </Stack>
            )}
          </SettingRow>
          <SettingRow label="How far ahead" description="Furthest day customers can book.">
            {loading ? valueSkeleton : <SelectField<number> label="Book up to" size="small" fullWidth={false} minWidth={220} value={form.maxAdvanceDays} disabled={disabled} onChange={(v) => set("maxAdvanceDays", v)} options={optionsOf(ADVANCE_DAYS, form.maxAdvanceDays, advanceLabel)} />}
          </SettingRow>
          <SettingRow label="Minimum notice" description="Bookings must start at least this long from now.">
            {loading ? valueSkeleton : <SelectField<number> label="Notice" size="small" fullWidth={false} minWidth={220} value={form.minLeadMinutes} disabled={disabled} onChange={(v) => set("minLeadMinutes", v)} options={optionsOf(LEAD_MINUTES, form.minLeadMinutes, leadLabel)} />}
          </SettingRow>
          <SettingRow label="No-show after" description="Bookings nobody checked in are released this long after their start time.">
            {loading ? valueSkeleton : <SelectField<number> label="Release after" size="small" fullWidth={false} minWidth={220} value={form.noShowGraceMinutes} disabled={disabled} onChange={(v) => set("noShowGraceMinutes", v)} options={optionsOf(GRACE_MINUTES, form.noShowGraceMinutes, minutesLabel)} />}
          </SettingRow>
          <SettingRow label="Gap between bookings" description="Time kept free on a station between two bookings (cleaning, overruns).">
            {loading ? valueSkeleton : <SelectField<number> label="Gap" size="small" fullWidth={false} minWidth={220} value={form.bufferMinutes} disabled={disabled} onChange={(v) => set("bufferMinutes", v)} options={optionsOf(BUFFER_MINUTES, form.bufferMinutes, minutesLabel)} />}
          </SettingRow>
          <SettingRow label="Biggest group online" description="Most stations one customer can book on the website at once.">
            {loading ? valueSkeleton : <QuantityStepper label="Stations per booking" value={form.maxStationsPerBooking} min={1} max={50} disabled={disabled} onChange={(v) => set("maxStationsPerBooking", v)} />}
          </SettingRow>
          <SettingRow label="Time zone" description="Booking times on the website and here use this clock.">
            {loading ? (
              valueSkeleton
            ) : (
              <Autocomplete
                options={TIMEZONES.includes(form.timezone) ? TIMEZONES : [form.timezone, ...TIMEZONES]}
                value={form.timezone}
                onChange={(_, v) => v && set("timezone", v)}
                disableClearable
                disabled={disabled}
                autoHighlight
                size="small"
                sx={{ width: { xs: "100%", sm: 260 } }}
                getOptionLabel={(z) => z.replace(/_/g, " ")}
                renderInput={(params) => <TextField {...params} label="Time zone" />}
              />
            )}
          </SettingRow>
        </SectionCard>
      </Stack>

      {/* Save bar — appears when something changed */}
      {canEdit && form && (
        <Box sx={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: (t) => t.zIndex.appBar, p: 2, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <Paper
            role="region"
            aria-label="Unsaved changes"
            sx={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexWrap: "wrap",
              px: 2,
              py: 1.25,
              borderRadius: "12px",
              border: 1,
              borderColor: "divider",
              boxShadow: (t) => t.tokens.shadowPopover,
              transform: dirty ? "translateY(0)" : "translateY(160%)",
              visibility: dirty ? "visible" : "hidden",
              transition: "transform .25s ease, visibility .25s",
            }}
          >
            <Typography sx={{ fontWeight: 600 }}>You have unsaved changes</Typography>
            <Button variant="outlined" onClick={() => q.data && setForm(structuredClone(q.data))} disabled={save.isPending}>
              Discard
            </Button>
            <Button variant="contained" startIcon={<SaveRounded />} disabled={save.isPending || durationError} onClick={() => save.mutate(form)}>
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default ReservationSettings;
