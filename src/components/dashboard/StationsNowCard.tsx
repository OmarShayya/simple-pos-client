import React from "react";
import { Box, Button, Divider, Tooltip, Typography } from "@mui/material";
import { ComputerOutlined, SportsEsportsOutlined, TimerOutlined } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { CodeText, EmptyState, MoneyText, SectionCard } from "@/components/ui";
import { useChartDefaults } from "@/theme/charts";
import { formatDuration, formatTime } from "@/utils/format";
import type { ActiveSessionRow, DashboardOverview, StationCounts } from "@/types/dashboard.types";
import { DashboardList, DashboardListRow, DashboardListSkeleton } from "./DashboardList";

const MAX_SESSIONS = 6;

/** "4 of 10 in use" + a bar: in use (series colour), reserved, maintenance (amber), free (track). */
const Occupancy: React.FC<{ label: string; icon: React.ReactNode; counts: StationCounts | undefined; color: string }> = ({ label, icon, counts, color }) => {
  const total = counts?.total ?? 0;
  const parts = counts
    ? [
        { key: "occupied", n: counts.occupied, color, label: "in use" },
        { key: "reserved", n: counts.reserved, color: "info.main", label: "reserved" },
        { key: "maintenance", n: counts.maintenance, color: "warning.main", label: "maintenance" },
      ].filter((p) => p.n > 0)
    : [];
  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ display: "flex", color: "text.secondary", "& svg": { fontSize: 20 } }} aria-hidden>
          {icon}
        </Box>
        <Typography sx={{ fontWeight: 600, flex: 1 }}>{label}</Typography>
        <Typography sx={{ fontVariantNumeric: "tabular-nums" }}>
          {counts ? (
            <>
              <Box component="span" sx={{ fontWeight: 600 }}>
                {counts.occupied}
              </Box>{" "}
              of {total} in use
            </>
          ) : (
            "—"
          )}
        </Typography>
      </Box>
      <Box aria-hidden sx={{ display: "flex", gap: "2px", height: 10, borderRadius: "5px", overflow: "hidden", bgcolor: "action.hover", mt: 1 }}>
        {parts.map((p) => (
          <Box key={p.key} sx={{ width: `${(p.n / Math.max(1, total)) * 100}%`, bgcolor: p.color }} />
        ))}
      </Box>
      {counts && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          {counts.available} free
          {counts.reserved > 0 && ` · ${counts.reserved} reserved`}
          {counts.maintenance > 0 && ` · ${counts.maintenance} in maintenance`}
        </Typography>
      )}
    </Box>
  );
};

const elapsedMinutes = (s: ActiveSessionRow, now: Date) => Math.max(s.elapsedMinutes, Math.floor((now.getTime() - new Date(s.startTime).getTime()) / 60_000));

/**
 * What's happening on the floor: PCs and PS5 rooms (free / in use / maintenance) and every running
 * session with its time and cost so far. A session opens its order.
 */
const StationsNowCard: React.FC<{ data: DashboardOverview | undefined; loading: boolean; now: Date }> = ({ data, loading, now }) => {
  const chart = useChartDefaults();
  const sessions = data?.activeSessions ?? [];
  const shown = sessions.slice(0, MAX_SESSIONS);

  return (
    <SectionCard
      title="Stations right now"
      flush
      action={
        <Button component={RouterLink} to="/gaming" variant="text">
          Stations
        </Button>
      }
    >
      <Box sx={{ px: 2.5, pb: 1 }}>
        <Occupancy label="PCs" icon={<ComputerOutlined />} counts={data?.stations.pc} color={chart.colors.pc} />
        <Occupancy label="PS5 rooms" icon={<SportsEsportsOutlined />} counts={data?.stations.playstation} color={chart.colors.playstation} />
      </Box>
      <Divider />
      <Typography variant="subtitle2" component="h4" sx={{ px: 2.5, pt: 1.5, pb: 0.5, color: "text.secondary" }}>
        Running sessions{data ? ` (${sessions.length})` : ""}
      </Typography>
      {loading ? (
        <DashboardListSkeleton rows={3} />
      ) : sessions.length === 0 ? (
        <EmptyState
          compact
          icon={<TimerOutlined />}
          title="No sessions running"
          action={
            <Button component={RouterLink} to="/gaming" variant="outlined">
              Start a session
            </Button>
          }
        />
      ) : (
        <DashboardList label="Running sessions">
          {shown.map((s) => {
            const minutes = elapsedMinutes(s, now);
            const number = s.station?.pcNumber ?? "Station";
            return (
              <DashboardListRow
                key={s.id}
                to={s.orderId ? `/orders?order=${s.orderId}` : "/gaming"}
                ariaLabel={`${number}, ${s.customerName || "Walk-in"}, ${formatDuration(minutes)} — open the order`}
                leading={
                  <Box sx={{ width: 64, display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Box aria-hidden sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: s.station?.type === "playstation" ? chart.colors.playstation : chart.colors.pc }} />
                    <CodeText>{number}</CodeText>
                  </Box>
                }
                title={s.customerName || "Walk-in"}
                subtitle={<span>Since {formatTime(s.startTime)}</span>}
                trailing={
                  <>
                    <Tooltip title="Time played so far">
                      <Typography component="div" sx={{ fontWeight: 600 }}>
                        {formatDuration(minutes)}
                      </Typography>
                    </Tooltip>
                    <MoneyText value={s.currentCost.usd} tone="muted" variant="body2" />
                  </>
                }
              />
            );
          })}
          {sessions.length > MAX_SESSIONS && (
            <DashboardListRow to="/gaming" title={`${sessions.length - MAX_SESSIONS} more running`} subtitle="See all stations" />
          )}
        </DashboardList>
      )}
    </SectionCard>
  );
};

export default StationsNowCard;
