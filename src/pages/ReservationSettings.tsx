import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  MenuItem,
  Skeleton,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { ArrowBack, ContentCopy, Save, Schedule, Rule, Public } from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import PageHeader from "@/components/common/PageHeader";
import SectionCard from "@/components/common/SectionCard";
import { reservationsApi } from "@/api/reservations.api";
import { useAuthStore } from "@/store/authStore";
import type { DaySchedule, ReservationSettings as Settings, StationType } from "@/types/reservation.types";
import { handleApiError } from "@/utils/errorHandler";
import { fmtDuration, timeToMinutes } from "@/utils/zonedTime";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Show Monday first
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DURATION_OPTIONS = [30, 60, 90, 120, 150, 180, 240, 300, 360, 480, 720];

const hoursLabel = (d: DaySchedule) => {
  if (d.closed) return "Closed";
  const open = timeToMinutes(d.open);
  let close = timeToMinutes(d.close);
  const overnight = close <= open;
  if (overnight) close += 1440;
  return `${fmtDuration(close - open)}${overnight ? " · closes next morning" : ""}`;
};

const ReservationSettings: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === "admin" || role === "manager";

  const q = useQuery({ queryKey: ["reservation-settings"], queryFn: reservationsApi.getSettings });
  const [form, setForm] = useState<Settings | null>(null);

  useEffect(() => {
    if (q.data) setForm(structuredClone(q.data));
  }, [q.data]);

  const dirty = useMemo(() => {
    if (!form || !q.data) return false;
    const pick = (s: Settings) =>
      JSON.stringify({ ...s, schedule: [...s.schedule].sort((a, b) => a.day - b.day).map(({ day, closed, open, close }) => ({ day, closed, open, close })), updatedAt: undefined });
    return pick(form) !== pick(q.data);
  }, [form, q.data]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const save = useMutation({
    mutationFn: (s: Settings) => reservationsApi.updateSettings(s),
    onSuccess: (s) => {
      queryClient.setQueryData(["reservation-settings"], s);
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      toast.success("Booking rules saved — the website uses them right away");
    },
    onError: (e) => toast.error(handleApiError(e)),
  });

  if (q.isLoading || !form) {
    return (
      <Box>
        <PageHeader title="Booking rules" />
        <Skeleton variant="rounded" height={420} />
      </Box>
    );
  }

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));
  const day = (d: number) => form.schedule.find((s) => s.day === d) ?? { day: d, closed: false, open: "16:00", close: "04:00" };
  const setDay = (d: number, patch: Partial<DaySchedule>) =>
    set(
      "schedule",
      DAY_ORDER.map((x) => (x === d ? { ...day(x), ...patch } : day(x)))
    );
  const copyToAll = (d: number) => {
    const src = day(d);
    set("schedule", DAY_ORDER.map((x) => ({ ...src, day: x })));
    toast.info(`${DAYS[d]}'s hours copied to every day`);
  };
  const toggleType = (t: StationType, on: boolean) =>
    set("bookableTypes", on ? [...new Set([...form.bookableTypes, t])] : form.bookableTypes.filter((x) => x !== t));

  const durationError = form.minDurationMinutes > form.maxDurationMinutes;

  return (
    <Box sx={{ pb: 10 }}>
      <PageHeader
        title="Booking rules"
        subtitle="Control when and how customers can reserve on the website. Staff can always book anything from the Reservations screen."
        actions={
          <Button startIcon={<ArrowBack />} onClick={() => navigate("/reservations")}>
            Reservations
          </Button>
        }
      />

      {!canEdit && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Only admins and managers can change these rules.
        </Alert>
      )}

      <Stack spacing={2.5}>
        <SectionCard title="Online bookings" icon={<Public />}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} justifyContent="space-between">
            <Box>
              <Typography sx={{ fontWeight: 700 }}>{form.enabled ? "Customers can book on the website" : "Website booking is paused"}</Typography>
              <Typography variant="body2" color="text.secondary">
                {form.enabled ? "Bookings are confirmed instantly when stations are free." : "The website shows your phone number instead."}
              </Typography>
            </Box>
            <FormControlLabel
              control={<Switch checked={form.enabled} disabled={!canEdit} onChange={(e) => set("enabled", e.target.checked)} />}
              label={form.enabled ? "On" : "Off"}
            />
          </Stack>
          <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
            <FormControlLabel
              control={<Checkbox checked={form.bookableTypes.includes("pc")} disabled={!canEdit} onChange={(e) => toggleType("pc", e.target.checked)} />}
              label="PCs bookable online"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.bookableTypes.includes("playstation")}
                  disabled={!canEdit}
                  onChange={(e) => toggleType("playstation", e.target.checked)}
                />
              }
              label="PlayStation bookable online"
            />
          </Stack>
        </SectionCard>

        <SectionCard title="Opening hours" subtitle="A closing time earlier than the opening time means the next morning." icon={<Schedule />}>
          <Stack divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}>
            {DAY_ORDER.map((d) => {
              const s = day(d);
              return (
                <Grid container key={d} spacing={1.5} alignItems="center" sx={{ py: 1.25 }}>
                  <Grid size={{ xs: 7, sm: 3 }}>
                    <FormControlLabel
                      control={<Switch checked={!s.closed} disabled={!canEdit} onChange={(e) => setDay(d, { closed: !e.target.checked })} />}
                      label={<Typography sx={{ fontWeight: 700 }}>{DAYS[d]}</Typography>}
                    />
                  </Grid>
                  <Grid size={{ xs: 5, sm: 2 }} sx={{ display: { xs: "flex", sm: "none" }, justifyContent: "flex-end" }}>
                    <Typography variant="caption" color="text.secondary">
                      {hoursLabel(s)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 2.5 }}>
                    <TextField
                      label="Opens"
                      type="time"
                      size="small"
                      fullWidth
                      value={s.open}
                      disabled={!canEdit || s.closed}
                      onChange={(e) => e.target.value && setDay(d, { open: e.target.value })}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 2.5 }}>
                    <TextField
                      label="Closes"
                      type="time"
                      size="small"
                      fullWidth
                      value={s.close}
                      disabled={!canEdit || s.closed}
                      onChange={(e) => e.target.value && setDay(d, { close: e.target.value })}
                      error={!s.closed && s.open === s.close}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid size={{ sm: 2 }} sx={{ display: { xs: "none", sm: "block" } }}>
                    <Typography variant="body2" color="text.secondary">
                      {hoursLabel(s)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }} sx={{ textAlign: { sm: "right" } }}>
                    <Button size="small" startIcon={<ContentCopy fontSize="small" />} disabled={!canEdit} onClick={() => copyToAll(d)}>
                      Copy to all
                    </Button>
                  </Grid>
                </Grid>
              );
            })}
          </Stack>
        </SectionCard>

        <SectionCard title="Booking rules" icon={<Rule />}>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                Start times every
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={form.slotMinutes}
                disabled={!canEdit}
                onChange={(_, v) => v && set("slotMinutes", v)}
              >
                <ToggleButton value={15}>15 min</ToggleButton>
                <ToggleButton value={30}>30 min</ToggleButton>
                <ToggleButton value={60}>1 hour</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Shortest booking"
                value={form.minDurationMinutes}
                disabled={!canEdit}
                error={durationError}
                onChange={(e) => set("minDurationMinutes", Number(e.target.value))}
              >
                {DURATION_OPTIONS.map((d) => (
                  <MenuItem key={d} value={d}>
                    {fmtDuration(d)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Longest booking"
                value={form.maxDurationMinutes}
                disabled={!canEdit}
                error={durationError}
                helperText={durationError ? "Must be ≥ shortest" : undefined}
                onChange={(e) => set("maxDurationMinutes", Number(e.target.value))}
              >
                {DURATION_OPTIONS.map((d) => (
                  <MenuItem key={d} value={d}>
                    {fmtDuration(d)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {(
              [
                ["maxAdvanceDays", "Book up to (days ahead)", 0, 90, "How far in the future customers can book."],
                ["minLeadMinutes", "Minimum notice (minutes)", 0, 1440, "Bookings must start at least this long from now."],
                ["noShowGraceMinutes", "No-show after (minutes)", 0, 240, "Unchecked bookings are released this long after their start."],
                ["bufferMinutes", "Gap between bookings (minutes)", 0, 120, "Time kept free on a station between two bookings."],
                ["maxStationsPerBooking", "Max stations per booking", 1, 50, "Largest group that can book online at once."],
              ] as const
            ).map(([key, label, min, max, help]) => (
              <Grid key={key} size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label={label}
                  value={form[key]}
                  disabled={!canEdit}
                  helperText={help}
                  onChange={(e) => set(key, Math.max(min, Math.min(max, Math.round(Number(e.target.value) || 0))))}
                  slotProps={{ htmlInput: { min, max, inputMode: "numeric" } }}
                />
              </Grid>
            ))}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Timezone"
                value={form.timezone}
                disabled={!canEdit}
                helperText="IANA name, e.g. Asia/Beirut"
                onChange={(e) => set("timezone", e.target.value)}
              />
            </Grid>
          </Grid>
        </SectionCard>
      </Stack>

      {/* Sticky save bar */}
      {canEdit && (
        <Box
          sx={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10,
            p: 1.5,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{
              pointerEvents: "auto",
              px: 2,
              py: 1.25,
              borderRadius: 999,
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider",
              boxShadow: 6,
              transform: dirty ? "translateY(0)" : "translateY(140%)",
              transition: "transform .3s cubic-bezier(.22,1,.36,1)",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Unsaved changes
            </Typography>
            <Button size="small" onClick={() => q.data && setForm(structuredClone(q.data))} disabled={save.isPending}>
              Discard
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<Save />}
              disabled={save.isPending || durationError}
              onClick={() => save.mutate(form)}
            >
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default ReservationSettings;
