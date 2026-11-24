import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Add,
  ChevronLeft,
  ChevronRight,
  EventAvailable,
  Search,
  Settings as SettingsIcon,
  Today,
  ViewTimeline,
  ViewAgenda,
  Login,
  HourglassTop,
  PersonOff,
  EventNote,
} from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import SectionCard from "@/components/common/SectionCard";
import EmptyState from "@/components/common/EmptyState";
import ReservationCard from "@/components/reservations/ReservationCard";
import { getTiming } from "@/utils/reservationTiming";
import ReservationTimeline from "@/components/reservations/ReservationTimeline";
import ReservationDialog from "@/components/reservations/ReservationDialog";
import { reservationsApi } from "@/api/reservations.api";
import { gamingApi } from "@/api/gaming.api";
import { useAuthStore } from "@/store/authStore";
import type { Reservation, StationType } from "@/types/reservation.types";
import type { PC } from "@/types/gaming.types";
import { handleApiError } from "@/utils/errorHandler";
import { DEFAULT_TZ, addDays, businessWindow, currentBusinessDate, fmtDay } from "@/utils/zonedTime";

type TypeFilter = "all" | StationType;
type Confirm =
  | { kind: "checkin"; r: Reservation }
  | { kind: "cancel"; r: Reservation }
  | { kind: "noshow"; r: Reservation }
  | null;

const Reservations: React.FC = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const role = useAuthStore((s) => s.user?.role);
  const canEditSettings = role === "admin" || role === "manager";

  const settingsQ = useQuery({ queryKey: ["reservation-settings"], queryFn: reservationsApi.getSettings, staleTime: 5 * 60_000 });
  const settings = settingsQ.data;
  const tz = settings?.timezone ?? DEFAULT_TZ;

  const [date, setDate] = useState<string>(() => params.get("date") ?? currentBusinessDate(undefined, DEFAULT_TZ));
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"timeline" | "list">("timeline");
  const [showClosed, setShowClosed] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [dialog, setDialog] = useState<{ reservation?: Reservation | null; preset?: { stationId?: string; start?: Date } | null } | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [cancelReason, setCancelReason] = useState("");
  const highlight = params.get("highlight");

  // Once settings arrive, snap "tonight" to the business night in the lounge's timezone
  useEffect(() => {
    if (settings && !params.get("date")) setDate(currentBusinessDate(settings.schedule, settings.timezone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.timezone]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const tonight = settings ? currentBusinessDate(settings.schedule, tz) : date;

  const listQ = useQuery({
    queryKey: ["reservations", date, search.trim()],
    queryFn: () => reservationsApi.list({ date: search.trim() ? undefined : date, search: search.trim() || undefined }),
    refetchInterval: 30_000,
  });

  const stationsQ = useQuery({
    queryKey: ["stations-all"],
    queryFn: () => gamingApi.getAllPCs({ limit: 200 }),
    refetchInterval: 60_000,
  });
  const stations: PC[] = useMemo(
    () => (stationsQ.data?.data ?? []).filter((s) => s.isActive && (typeFilter === "all" || (s.type ?? "pc") === typeFilter)),
    [stationsQ.data, typeFilter]
  );

  const all = useMemo(
    () => (listQ.data ?? []).filter((r) => typeFilter === "all" || r.type === typeFilter),
    [listQ.data, typeFilter]
  );

  const groups = useMemo(() => {
    const attention: Reservation[] = [];
    const upcoming: Reservation[] = [];
    const checkedIn: Reservation[] = [];
    const closed: Reservation[] = [];
    for (const r of all) {
      const t = getTiming(r, now);
      if (r.status === "checked_in") checkedIn.push(r);
      else if (r.status === "confirmed") (t.isLate || (t.minsToStart >= 0 && t.minsToStart <= 30) ? attention : upcoming).push(r);
      else closed.push(r);
    }
    return { attention, upcoming, checkedIn, closed };
  }, [all, now]);

  // Scroll to a booking opened from a station badge
  useEffect(() => {
    if (!highlight || !listQ.data) return;
    const el = document.getElementById(`reservation-${highlight}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlight, listQ.data, view]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["reservations"] });
    queryClient.invalidateQueries({ queryKey: ["stations-all"] });
    queryClient.invalidateQueries({ queryKey: ["reservation-availability"] });
  };

  const action = useMutation({
    mutationFn: async (c: NonNullable<Confirm>) => {
      if (c.kind === "checkin") return reservationsApi.checkIn(c.r.id);
      if (c.kind === "cancel") return reservationsApi.cancel(c.r.id, cancelReason.trim() || undefined);
      return reservationsApi.markNoShow(c.r.id);
    },
    onSuccess: (r, c) => {
      if (c.kind === "checkin") {
        toast.success(`Checked in — sessions started on ${r.stations.map((s) => s.pcNumber).join(", ")}`);
        // Sessions were started: refresh everything gaming-related
        queryClient.invalidateQueries();
      } else {
        toast.success(c.kind === "cancel" ? "Booking cancelled" : "Marked as no-show");
      }
      setConfirm(null);
      setCancelReason("");
      refresh();
    },
    onError: (e) => toast.error(handleApiError(e)),
  });

  const window = businessWindow(date, settings?.schedule, tz);
  const activeCount = (rs: Reservation[]) => rs.reduce((n, r) => n + r.stations.length, 0);
  const effectiveView = isDesktop && !search.trim() ? view : "list";

  const cardProps = {
    tz,
    now,
    onCheckIn: (r: Reservation) => setConfirm({ kind: "checkin", r }),
    onEdit: (r: Reservation) => setDialog({ reservation: r }),
    onCancel: (r: Reservation) => setConfirm({ kind: "cancel", r }),
    onNoShow: (r: Reservation) => setConfirm({ kind: "noshow", r }),
  };

  const renderGroup = (title: string, items: Reservation[], hint?: string) =>
    items.length > 0 && (
      <Box key={title}>
        <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1.25 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {items.length}
            {hint ? ` · ${hint}` : ""}
          </Typography>
        </Stack>
        <Grid container spacing={1.5}>
          {items.map((r) => (
            <Grid key={r.id} size={{ xs: 12, md: 6, xl: 4 }}>
              <ReservationCard reservation={r} highlighted={r.id === highlight} {...cardProps} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );

  return (
    <Box>
      <PageHeader
        title="Reservations"
        subtitle={isPhone ? undefined : "Bookings from the website and the counter. Check guests in to start their sessions."}
        actions={
          <>
            {canEditSettings && (
              <Button variant="outlined" startIcon={<SettingsIcon />} onClick={() => navigate("/reservations/settings")}>
                Booking rules
              </Button>
            )}
            <Button variant="contained" startIcon={<Add />} onClick={() => setDialog({ reservation: null, preset: null })}>
              New booking
            </Button>
          </>
        }
      >
        <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} alignItems={{ lg: "center" }}>
          {/* Day navigation */}
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ opacity: search.trim() ? 0.4 : 1 }}>
            <IconButton aria-label="Previous night" onClick={() => setDate((d) => addDays(d, -1))}>
              <ChevronLeft />
            </IconButton>
            <TextField
              type="date"
              size="small"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              sx={{ width: 170 }}
              slotProps={{ htmlInput: { "aria-label": "Night" } }}
            />
            <IconButton aria-label="Next night" onClick={() => setDate((d) => addDays(d, 1))}>
              <ChevronRight />
            </IconButton>
            <Button
              size="small"
              startIcon={<Today />}
              variant={date === tonight ? "contained" : "text"}
              onClick={() => setDate(tonight)}
            >
              Tonight
            </Button>
          </Stack>


          <TextField
            size="small"
            placeholder="Search name, phone or code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, minWidth: 200 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Stack direction="row" alignItems="center" spacing={1} justifyContent="space-between" flexWrap="wrap" useFlexGap>
            <ToggleButtonGroup size="small" exclusive value={typeFilter} onChange={(_, v) => v && setTypeFilter(v)}>
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="pc">PCs</ToggleButton>
              <ToggleButton value="playstation">PlayStation</ToggleButton>
            </ToggleButtonGroup>
            {isDesktop && (
              <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}>
                <Tooltip title="Timeline">
                  <ToggleButton value="timeline" aria-label="Timeline view">
                    <ViewTimeline fontSize="small" />
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="List">
                  <ToggleButton value="list" aria-label="List view">
                    <ViewAgenda fontSize="small" />
                  </ToggleButton>
                </Tooltip>
              </ToggleButtonGroup>
            )}
            <FormControlLabel
              control={<Switch size="small" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />}
              label={<Typography variant="body2">Cancelled</Typography>}
            />
          </Stack>
        </Stack>
      </PageHeader>

      {/* KPIs — compact strip on phones so the bookings stay above the fold */}
      {isPhone ? (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          {[
            { label: "Attention", value: groups.attention.length, color: "warning.main" },
            { label: "Upcoming", value: groups.upcoming.length, color: "primary.main" },
            { label: "Checked in", value: groups.checkedIn.length, color: "success.main" },
            { label: "No-shows", value: groups.closed.filter((r) => r.status === "no_show").length, color: "error.main" },
          ].map((k) => (
            <Box
              key={k.label}
              sx={{ flex: 1, minWidth: 0, px: 1, py: 0.75, borderRadius: "12px", border: 1, borderColor: "divider", bgcolor: "background.paper", textAlign: "center" }}
            >
              <Typography sx={{ fontWeight: 800, fontSize: "1.15rem", color: k.color, lineHeight: 1.2 }}>{listQ.isLoading ? "–" : k.value}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap component="div">
                {k.label}
              </Typography>
            </Box>
          ))}
        </Stack>
      ) : (
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Needs attention" value={groups.attention.length} icon={<HourglassTop />} tone="warning" loading={listQ.isLoading} hint="Late or arriving within 30 min" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Upcoming" value={groups.upcoming.length} icon={<EventNote />} tone="primary" loading={listQ.isLoading} hint={`${activeCount(groups.upcoming)} stations held`} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Checked in" value={groups.checkedIn.length} icon={<Login />} tone="success" loading={listQ.isLoading} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label="No-shows"
            value={groups.closed.filter((r) => r.status === "no_show").length}
            icon={<PersonOff />}
            tone="error"
            loading={listQ.isLoading}
            hint={`Released after ${settings?.noShowGraceMinutes ?? 15} min`}
          />
        </Grid>
      </Grid>
      )}

      {settings && !settings.enabled && (
        <Alert severity="warning" sx={{ mb: 2 }} action={canEditSettings ? <Button color="inherit" onClick={() => navigate("/reservations/settings")}>Turn on</Button> : undefined}>
          Online bookings are turned off — customers can't book on the website right now.
        </Alert>
      )}
      {!search.trim() && window.closed && (
        <Alert severity="info" sx={{ mb: 2 }}>
          The lounge is marked closed on {fmtDay(date)} — online booking is off for this night.
        </Alert>
      )}

      {listQ.isError && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => listQ.refetch()}>Retry</Button>}>
          {handleApiError(listQ.error)}
        </Alert>
      )}

      {/* Timeline */}
      {effectiveView === "timeline" && !window.closed && (
        <SectionCard
          title={`${date === tonight ? "Tonight" : fmtDay(date)} · ${window.open}–${window.close}`}
          subtitle="Click a booking to edit it, or an empty spot to book that station."
          icon={<ViewTimeline />}
          flush
          sx={{ mb: 2.5 }}
        >
          {stationsQ.isLoading ? (
            <Box sx={{ p: 2 }}>
              <Skeleton height={200} variant="rounded" />
            </Box>
          ) : (
            <Box sx={{ px: 2, pb: 1.5 }}>
              <ReservationTimeline
                stations={stations}
                reservations={all}
                window={window}
                tz={tz}
                now={now}
                onSelect={(r) => setParams((p) => { p.set("highlight", r.id); return p; }, { replace: true })}
                onEmptyClick={(st, at) => setDialog({ reservation: null, preset: { stationId: st.id, start: at } })}
              />
            </Box>
          )}
        </SectionCard>
      )}

      {/* Lists */}
      {listQ.isLoading ? (
        <Grid container spacing={1.5}>
          {[0, 1, 2].map((i) => (
            <Grid key={i} size={{ xs: 12, md: 6, xl: 4 }}>
              <Skeleton variant="rounded" height={190} />
            </Grid>
          ))}
        </Grid>
      ) : all.length === 0 || (!showClosed && !groups.attention.length && !groups.upcoming.length && !groups.checkedIn.length) ? (
        <SectionCard>
          <EmptyState
            icon={<EventAvailable />}
            title={search.trim() ? "No bookings match your search" : "No bookings for this night yet"}
            description={search.trim() ? "Try a name, the last digits of a phone number, or a booking code." : "New website bookings show up here automatically."}
            action={
              <Button variant="contained" startIcon={<Add />} onClick={() => setDialog({ reservation: null, preset: null })}>
                New booking
              </Button>
            }
          />
        </SectionCard>
      ) : (
        <Stack spacing={3}>
          {renderGroup("Needs attention", groups.attention, "late or arriving soon")}
          {renderGroup("Upcoming", groups.upcoming)}
          {renderGroup("Checked in", groups.checkedIn)}
          {showClosed && renderGroup("Cancelled & no-shows", groups.closed)}
        </Stack>
      )}

      <ReservationDialog
        open={!!dialog}
        onClose={() => setDialog(null)}
        reservation={dialog?.reservation}
        preset={dialog?.preset}
        defaultDate={date}
        defaultType={typeFilter === "all" ? "pc" : typeFilter}
        settings={settings}
        stations={stationsQ.data?.data ?? []}
        tz={tz}
        onSaved={(r) => {
          refresh();
          setParams((p) => { p.set("highlight", r.id); return p; }, { replace: true });
        }}
      />

      {/* Confirmations */}
      <Dialog open={!!confirm} onClose={() => !action.isPending && setConfirm(null)} fullWidth maxWidth="xs">
        {confirm && (
          <>
            <DialogTitle sx={{ fontWeight: 800 }}>
              {confirm.kind === "checkin" ? "Check in & start sessions?" : confirm.kind === "cancel" ? "Cancel this booking?" : "Mark as no-show?"}
            </DialogTitle>
            <DialogContent>
              <DialogContentText>
                {confirm.kind === "checkin" && (
                  <>
                    Starts a gaming session for <b>{confirm.r.customerName}</b> on{" "}
                    <b>{confirm.r.stations.map((s) => s.pcNumber).join(", ")}</b>. Billing runs from now.
                  </>
                )}
                {confirm.kind === "cancel" && (
                  <>
                    {confirm.r.customerName}'s booking ({confirm.r.code}) will be cancelled and the stations freed.
                    {confirm.r.source === "website" && " Let them know — they booked online."}
                  </>
                )}
                {confirm.kind === "noshow" && (
                  <>
                    {confirm.r.customerName} didn't show up. The stations are released for walk-ins. (This also happens
                    automatically {settings?.noShowGraceMinutes ?? 15} min after the start.)
                  </>
                )}
              </DialogContentText>
              {confirm.kind === "cancel" && (
                <TextField
                  autoFocus
                  fullWidth
                  size="small"
                  label="Reason (optional)"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  sx={{ mt: 2 }}
                />
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setConfirm(null)} disabled={action.isPending}>
                Back
              </Button>
              <Button
                variant="contained"
                color={confirm.kind === "checkin" ? "success" : confirm.kind === "cancel" ? "error" : "warning"}
                disabled={action.isPending}
                onClick={() => action.mutate(confirm)}
              >
                {action.isPending ? "Working…" : confirm.kind === "checkin" ? "Check in" : confirm.kind === "cancel" ? "Cancel booking" : "Mark no-show"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default Reservations;
