import React from "react";
import { Alert, Box, Button, Grid, IconButton, Stack, Tooltip, Typography, useMediaQuery, type Theme } from "@mui/material";
import { RefreshRounded } from "@mui/icons-material";
import { ErrorState, PageHeader, SectionCard } from "@/components/ui";
import { useAuthStore } from "@/store/authStore";
import { UserRole } from "@/types/auth.types";
import { formatTime, LOUNGE_TZ } from "@/utils/format";
import { useNavCounts } from "@/hooks/useNavCounts";
import { useDashboardOverview, useNow } from "@/components/dashboard/useDashboardOverview";
import DashboardKpis from "@/components/dashboard/DashboardKpis";
import HourlyRevenueChart from "@/components/dashboard/HourlyRevenueChart";
import StationsNowCard from "@/components/dashboard/StationsNowCard";
import OpenOrdersCard from "@/components/dashboard/OpenOrdersCard";
import UpcomingReservationsCard from "@/components/dashboard/UpcomingReservationsCard";
import LowStockCard from "@/components/dashboard/LowStockCard";
import TopProductsTodayCard from "@/components/dashboard/TopProductsTodayCard";
import { loungeHour } from "@/components/reports/reportPeriods";

const greeting = (now: Date) => {
  const h = loungeHour(now);
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const longDate = new Intl.DateTimeFormat("en-GB", { timeZone: LOUNGE_TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });

/**
 * The shift at a glance: today's numbers vs yesterday, the floor (stations + running sessions),
 * money waiting (open orders), who's coming (bookings), stock to reorder and what sells.
 * Refreshes every 30 s and whenever an order/session/booking changes anywhere in the app.
 */
const Dashboard: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const isManager = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER;
  const now = useNow(30_000);
  const isWide = useMediaQuery((t: Theme) => t.breakpoints.up("lg"), { noSsr: true });
  const q = useDashboardOverview();
  const counts = useNavCounts();
  const data = q.data;
  const loading = q.isLoading;
  // The API decides who sees money; until it answers, go by the role
  const showMoney = data ? data.canViewRevenue : isManager;

  const header = (
    <PageHeader
      title={`${greeting(now)}, ${user?.name?.split(" ")[0] ?? "there"}`}
      subtitle={longDate.format(now)}
      actions={
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" color="text.secondary" aria-live="polite">
            {data ? `Updated ${formatTime(q.dataUpdatedAt)}` : "Loading…"}
          </Typography>
          <Tooltip title={q.isFetching ? "Refreshing…" : "Refresh now"}>
            <IconButton
              aria-label="Refresh dashboard"
              onClick={() => q.refetch()}
              sx={{ border: 1, borderColor: (t) => t.tokens.borderStrong, "& svg": { animation: q.isFetching ? "pos-spin 0.9s linear infinite" : "none" } }}
            >
              <RefreshRounded />
            </IconButton>
          </Tooltip>
        </Stack>
      }
    />
  );

  if (q.error && !data) {
    return (
      <Box>
        {header}
        <SectionCard>
          <ErrorState title="Couldn't load the dashboard" error={q.error} onRetry={() => q.refetch()} retrying={q.isFetching} />
        </SectionCard>
      </Box>
    );
  }

  const blocks = {
    chart: showMoney ? <HourlyRevenueChart key="chart" data={data} loading={loading} now={now} /> : null,
    stations: <StationsNowCard key="stations" data={data} loading={loading} now={now} />,
    openOrders: <OpenOrdersCard key="orders" rows={data?.openOrders} total={counts.open} loading={loading} now={now} />,
    upcoming: <UpcomingReservationsCard key="upcoming" rows={data?.upcomingReservations} loading={loading} now={now} />,
    lowStock: <LowStockCard key="stock" rows={data?.lowStock} loading={loading} canManage={isManager} />,
    topProducts: <TopProductsTodayCard key="top" rows={data?.topProductsToday} loading={loading} />,
  };
  const columns = {
    main: [blocks.chart, blocks.openOrders, blocks.topProducts],
    side: [blocks.stations, blocks.upcoming, blocks.lowStock],
    stacked: [blocks.stations, blocks.openOrders, blocks.upcoming, blocks.chart, blocks.topProducts, blocks.lowStock],
  };

  return (
    <Box>
      {header}
      {q.error && data && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => q.refetch()}>
              Retry
            </Button>
          }
        >
          Couldn't refresh — showing data from {formatTime(q.dataUpdatedAt)}.
        </Alert>
      )}

      <Stack spacing={{ xs: 2, md: 3 }}>
        <DashboardKpis data={data} openCount={counts.open} loading={loading} showMoney={showMoney} />

        {isWide ? (
          // Two independent columns so a long list never stretches the card next to it
          <Grid container spacing={3} alignItems="flex-start">
            <Grid size={showMoney ? 8 : 7}>
              <Stack spacing={3}>{columns.main}</Stack>
            </Grid>
            <Grid size={showMoney ? 4 : 5}>
              <Stack spacing={3}>{columns.side}</Stack>
            </Grid>
          </Grid>
        ) : (
          // Phones/tablets: what needs action first
          <Stack spacing={2}>{columns.stacked}</Stack>
        )}
      </Stack>
    </Box>
  );
};

export default Dashboard;
