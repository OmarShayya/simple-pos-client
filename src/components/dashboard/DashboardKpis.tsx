import React from "react";
import { Box, Grid, Typography, useMediaQuery, type Theme } from "@mui/material";
import {
  PaymentsOutlined,
  PieChartOutlineRounded,
  ReceiptLongOutlined,
  ShoppingBasketOutlined,
  TimerOutlined,
  ComputerOutlined,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { KpiCard } from "@/components/ui";
import { useChartDefaults } from "@/theme/charts";
import { formatPercent, formatUsd, plural } from "@/utils/format";
import type { DashboardOverview } from "@/types/dashboard.types";
import { loungeHour } from "@/components/reports/reportPeriods";


export interface DashboardKpisProps {
  data: DashboardOverview | undefined;
  /** All unpaid orders (`GET /sales/counts`); the overview lists only the newest 10. */
  openCount?: number;
  loading: boolean;
  /** Cashiers don't see money totals (the API sends nulls) — show operational numbers instead. */
  showMoney: boolean;
}

/** Gaming vs products today: two labelled amounts + a split bar. */
const RevenueMix: React.FC<{ gaming: number; products: number }> = ({ gaming, products }) => {
  const chart = useChartDefaults();
  const rows = [
    { label: "Gaming", value: gaming, color: chart.colors.pc },
    { label: "Products", value: products, color: chart.colors.products },
  ];
  return (
    <Box sx={{ minWidth: 196, fontSize: "1rem" }}>
      {rows.map((r) => (
        <Box key={r.label} sx={{ display: "flex", alignItems: "center", gap: 1, lineHeight: 1.5 }}>
          <Box aria-hidden sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: r.color, flexShrink: 0 }} />
          <Typography component="span" sx={{ flex: 1, color: "text.secondary", fontSize: "0.9375rem" }}>
            {r.label}
          </Typography>
          <Typography component="span" sx={{ fontWeight: 600, fontSize: "1.0625rem", fontVariantNumeric: "tabular-nums" }}>
            {formatUsd(r.value)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

const MixBar: React.FC<{ gaming: number; products: number }> = ({ gaming, products }) => {
  const chart = useChartDefaults();
  const total = gaming + products;
  const share = total > 0 ? (gaming / total) * 100 : 0;
  return (
    <Box>
      <Box aria-hidden sx={{ display: "flex", gap: "2px", height: 6, borderRadius: "3px", overflow: "hidden", bgcolor: "action.hover", mt: 0.5 }}>
        {total > 0 && <Box sx={{ width: `${share}%`, bgcolor: chart.colors.pc }} />}
        {total > 0 && <Box sx={{ flex: 1, bgcolor: chart.colors.products }} />}
      </Box>
      <Box component="span" sx={{ display: "block", mt: 0.5 }}>
        {total > 0 ? `${formatPercent(share)} of today's revenue is gaming` : "No paid orders yet today"}
      </Box>
    </Box>
  );
};

/** Today at a glance. Managers: money; cashiers: what they can act on (no "$null"). */
const DashboardKpis: React.FC<DashboardKpisProps> = ({ data, openCount, loading, showMoney }) => {
  const navigate = useNavigate();
  // Yesterday is counted up to the same time of day; the short label fits half-width phone tiles
  const wide = useMediaQuery((t: Theme) => t.breakpoints.up("sm"), { noSsr: true });
  const PREVIOUS = wide ? "vs yesterday, same time" : "vs yesterday";
  const t = data?.today;
  const stations = data?.stations;
  const inUse = stations ? stations.pc.occupied + stations.playstation.occupied : undefined;
  const total = stations ? stations.pc.total + stations.playstation.total : undefined;
  const sessionsHint = t && `${plural(t.sessions.value ?? 0, "gaming session")} · ${plural(t.newCustomers.value ?? 0, "new customer")}`;

  if (!showMoney) {
    return (
      <Grid container spacing={{ xs: 1.5, md: 2 }}>
        <Grid size={{ xs: 6, lg: 3 }}>
          <KpiCard label="Paid orders today" icon={<ReceiptLongOutlined />} value={t?.orders.value} previous={t?.orders.previous} previousLabel={PREVIOUS} loading={loading} />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <KpiCard label="Open orders" icon={<ShoppingBasketOutlined />} value={openCount ?? data?.openOrders.length} loading={loading} hint="Waiting for payment" onClick={() => navigate("/orders?status=pending")} />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <KpiCard label="Sessions today" icon={<TimerOutlined />} value={t?.sessions.value} previous={t?.sessions.previous} previousLabel={PREVIOUS} loading={loading} />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <KpiCard
            label="Stations in use"
            icon={<ComputerOutlined />}
            value={inUse !== undefined && total !== undefined ? `${inUse} of ${total}` : undefined}
            loading={loading}
            onClick={() => navigate("/gaming")}
          />
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid container spacing={{ xs: 1.5, md: 2 }}>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <KpiCard
          label="Revenue today"
          icon={<PaymentsOutlined />}
          value={t?.revenue.value}
          format="money"
          previous={t?.revenue.previous}
          previousLabel={PREVIOUS}
          sparkline={data?.hourly.length ? data.hourly.slice(0, loungeHour() + 1).map((h) => h.today) : undefined}
          hint="Paid orders only"
          loading={loading}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 6, lg: 3 }}>
        <KpiCard
          label="Paid orders"
          icon={<ReceiptLongOutlined />}
          value={t?.orders.value}
          previous={t?.orders.previous}
          previousLabel={PREVIOUS}
          hint={sessionsHint}
          loading={loading}
          onClick={() => navigate("/orders?status=paid")}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 6, lg: 3 }}>
        <KpiCard
          label="Average order"
          icon={<ShoppingBasketOutlined />}
          value={t?.avgOrder.value}
          format="money"
          previous={t?.avgOrder.previous}
          previousLabel={PREVIOUS}
          loading={loading}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <KpiCard
          label="Gaming vs products"
          icon={<PieChartOutlineRounded />}
          value={t && t.gamingRevenue.value !== null && t.productRevenue.value !== null ? <RevenueMix gaming={t.gamingRevenue.value} products={t.productRevenue.value} /> : undefined}
          hint={t && t.gamingRevenue.value !== null && t.productRevenue.value !== null ? <MixBar gaming={t.gamingRevenue.value} products={t.productRevenue.value} /> : undefined}
          loading={loading}
        />
      </Grid>
    </Grid>
  );
};

export default DashboardKpis;
