import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, FormControlLabel, IconButton, Stack, Switch, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import {
  AddRounded,
  ChevronLeftRounded,
  ChevronRightRounded,
  EventAvailableOutlined,
  SettingsOutlined,
  TodayOutlined,
  ViewAgendaOutlined,
  ViewTimelineOutlined,
} from "@mui/icons-material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DateField, FilterBar, KpiCard, PageHeader, SearchField, SectionCard, SegmentedControl } from "@/components/ui";
import ReservationTimeline from "@/components/reservations/ReservationTimeline";
import ReservationDialog from "@/components/reservations/ReservationDialog";
import ReservationTable from "@/components/reservations/ReservationTable";
import { useReservationActions } from "@/components/reservations/useReservationActions";
import { formatClock } from "@/components/reservations/reservationDates";
import { useReservationList, useReservationSettings } from "@/components/reservations/reservationQueries";
import { useAllStations } from "@/components/stations/stationQueries";
import { useAuthStore } from "@/store/authStore";
import { formatDayLong, plural } from "@/utils/format";
import { attentionRank } from "@/utils/reservationTiming";
import { DEFAULT_TZ, addDays, businessWindow, currentBusinessDate } from "@/utils/zonedTime";
import type { Reservation, StationType } from "@/types/reservation.types";

type TypeFilter = "all" | StationType;
type View = "timeline" | "list";
type DialogState = { reservation?: Reservation | null; preset?: { stationId?: string; start?: Date } | null } | null;

const Reservations: React.FC = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const role = useAuthStore((s) => s.user?.role);
  const canEditSettings = role === "admin" || role === "manager";

  const settingsQ = useReservationSettings();
  const settings = settingsQ.data;
  const tz = settings?.timezone ?? DEFAULT_TZ;

  const [date, setDate] = useState<string>(() => params.get("date") ?? currentBusinessDate(undefined, DEFAULT_TZ));
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("timeline");
  const [showClosed, setShowClosed] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [dialog, setDialog] = useState<DialogState>(null);
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
  const searching = Boolean(search.trim());

  const listQ = useReservationList(searching ? { search: search.trim() } : { date }, { refetchInterval: 30_000 });
  const stationsQ = useAllStations({ refetchInterval: 60_000 });

  const stations = useMemo(
    () => (stationsQ.data?.data ?? []).filter((s) => s.isActive && (typeFilter === "all" || (s.type ?? "pc") === typeFilter)),
    [stationsQ.data, typeFilter]
  );
  const all = useMemo(() => (listQ.data ?? []).filter((r) => typeFilter === "all" || r.type === typeFilter), [listQ.data, typeFilter]);
  const visible = useMemo(() => (showClosed || searching ? all : all.filter((r) => r.status === "confirmed" || r.status === "checked_in")), [all, showClosed, searching]);

  const counts = useMemo(() => {
    const c = { attention: 0, upcoming: 0, checkedIn: 0, noShows: 0, held: 0 };
    for (const r of all) {
      const rank = attentionRank(r, now);
      if (rank === 0) c.attention++;
      else if (rank === 1) {
        c.upcoming++;
        c.held += r.stations.length;
      } else if (rank === 2) c.checkedIn++;
      if (r.status === "no_show") c.noShows++;
    }
    return c;
  }, [all, now]);

  // A booking opened by link (?highlight=<id>, e.g. from a station badge or a customer) opens its dialog
  useEffect(() => {
    if (!highlight || !listQ.data) return;
    const r = listQ.data.find((x) => x.id === highlight);
    if (r) setDialog({ reservation: r });
  }, [highlight, listQ.data]);

  const closeDialog = () => {
    setDialog(null);
    if (highlight)
      setParams(
        (p) => {
          p.delete("highlight");
          return p;
        },
        { replace: true }
      );
  };

  const actions = useReservationActions({ noShowGraceMinutes: settings?.noShowGraceMinutes, onDone: () => closeDialog() });
  const openBooking = useCallback((r: Reservation) => setDialog({ reservation: r }), []);

  const window = businessWindow(date, settings?.schedule, tz);
  const showTimeline = isDesktop && !searching && view === "timeline" && !window.closed;
  const nightLabel = date === tonight ? "Tonight" : formatDayLong(date);

  return (
    <Box>
      <PageHeader
        title="Reservations"
        subtitle={isPhone ? undefined : "Bookings from the website and the counter. Check guests in to start their sessions."}
        actions={
          <>
            {canEditSettings && (
              <Button variant="outlined" startIcon={<SettingsOutlined />} onClick={() => navigate("/reservations/settings")}>
                Booking rules
              </Button>
            )}
            <Button variant="contained" startIcon={<AddRounded />} onClick={() => setDialog({ reservation: null, preset: null })}>
              New booking
            </Button>
          </>
        }
      >
        <FilterBar search={<SearchField value={search} onChange={setSearch} placeholder="Name, phone or booking code" />}>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ opacity: searching ? 0.45 : 1, flex: "0 0 auto" }}>
            <Tooltip title="Previous night">
              <IconButton aria-label="Previous night" onClick={() => setDate((d) => addDays(d, -1))} disabled={searching}>
                <ChevronLeftRounded />
              </IconButton>
            </Tooltip>
            <Box sx={{ width: 170 }}>
              <DateField label="Night of" size="small" value={date} onChange={(d) => d && setDate(d)} clearable={false} disabled={searching} />
            </Box>
            <Tooltip title="Next night">
              <IconButton aria-label="Next night" onClick={() => setDate((d) => addDays(d, 1))} disabled={searching}>
                <ChevronRightRounded />
              </IconButton>
            </Tooltip>
            <Button variant="outlined" startIcon={<TodayOutlined />} onClick={() => setDate(tonight)} disabled={searching || date === tonight}>
              Tonight
            </Button>
          </Stack>
          <SegmentedControl<TypeFilter>
            aria-label="Station type"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: "all", label: "All" },
              { value: "pc", label: "PCs" },
              { value: "playstation", label: "PlayStation" },
            ]}
          />
          {isDesktop && (
            <SegmentedControl<View>
              aria-label="View"
              value={view}
              onChange={setView}
              options={[
                { value: "timeline", label: "Timeline", icon: <ViewTimelineOutlined /> },
                { value: "list", label: "List", icon: <ViewAgendaOutlined /> },
              ]}
            />
          )}
        </FilterBar>
      </PageHeader>

      {!isPhone && !searching && (
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, minmax(0, 1fr))" }, mb: 2.5 }}>
          <KpiCard label="Needs attention" value={counts.attention} format="number" loading={listQ.isLoading} hint="Late, or arriving within 30 min" />
          <KpiCard label="Upcoming" value={counts.upcoming} format="number" loading={listQ.isLoading} hint={`${plural(counts.held, "station")} held`} />
          <KpiCard label="Checked in" value={counts.checkedIn} format="number" loading={listQ.isLoading} />
          <KpiCard label="No-shows" value={counts.noShows} format="number" loading={listQ.isLoading} hint={`Released after ${settings?.noShowGraceMinutes ?? 15} min`} />
        </Box>
      )}

      {settings && !settings.enabled && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            canEditSettings ? (
              <Button color="inherit" onClick={() => navigate("/reservations/settings")}>
                Turn on
              </Button>
            ) : undefined
          }
        >
          Online bookings are turned off — customers can't book on the website right now.
        </Alert>
      )}
      {!searching && window.closed && (
        <Alert severity="info" sx={{ mb: 2 }}>
          The lounge is marked closed on {formatDayLong(date)} — online booking is off for this night.
        </Alert>
      )}

      <Stack spacing={2.5}>
        {showTimeline && (
          <SectionCard
            title={`${nightLabel} · open ${formatClock(window.open)} – ${formatClock(window.close)}`}
            subtitle="Click a booking to open it, or an empty spot to book that station."
            divider
            flush
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <ReservationTimeline
                stations={stations}
                reservations={all}
                window={window}
                tz={tz}
                now={now}
                onSelect={openBooking}
                onEmptyClick={(st, at) => setDialog({ reservation: null, preset: { stationId: st.id, start: at } })}
              />
            </Box>
          </SectionCard>
        )}

        <ReservationTable
          title={searching ? "Search results" : `${nightLabel}${listQ.data ? ` · ${plural(visible.length, "booking")}` : ""}`}
          rows={visible}
          now={now}
          showDate={searching}
          loading={listQ.isLoading}
          refreshing={listQ.isFetching && !listQ.isLoading}
          error={listQ.error}
          onRetry={() => listQ.refetch()}
          onRefresh={() => {
            listQ.refetch();
            stationsQ.refetch();
          }}
          onOpen={openBooking}
          onCheckIn={actions.checkIn}
          onNoShow={actions.noShow}
          onCancel={actions.cancel}
          toolbarExtra={
            !searching && (
              <FormControlLabel
                control={<Switch checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />}
                label="Show cancelled"
                sx={{ mr: 1 }}
              />
            )
          }
          empty={{
            icon: <EventAvailableOutlined />,
            title: searching ? "No bookings match your search" : "No bookings for this night yet",
            description: searching ? "Try a name, the last digits of a phone number, or a booking code." : "New website bookings show up here automatically.",
            action: !searching && (
              <Button variant="contained" startIcon={<AddRounded />} onClick={() => setDialog({ reservation: null, preset: null })}>
                New booking
              </Button>
            ),
          }}
        />
      </Stack>

      <ReservationDialog
        open={Boolean(dialog)}
        onClose={closeDialog}
        reservation={dialog?.reservation}
        preset={dialog?.preset}
        defaultDate={date}
        defaultType={typeFilter === "all" ? "pc" : typeFilter}
        settings={settings}
        stations={stationsQ.data?.data ?? []}
        tz={tz}
        actions={actions}
      />
      {actions.dialogs}
    </Box>
  );
};

export default Reservations;
