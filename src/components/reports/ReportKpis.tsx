import React from "react";
import { Grid } from "@mui/material";
import { AccessTimeRounded, PaymentsOutlined, ReceiptLongOutlined, ShoppingBasketOutlined } from "@mui/icons-material";
import { KpiCard } from "@/components/ui";
import { formatLbp, formatNumber, formatUsd, plural } from "@/utils/format";
import type { ReportSummary } from "@/types/report.types";

export interface ReportKpisProps {
  data: ReportSummary | undefined;
  /** Revenue per bucket so far (future buckets left out, so the sparkline doesn't "crash" to $0). */
  trend?: number[];
  loading: boolean;
  /** "vs last week so far" */
  previousLabel: string;
}

/** The four numbers that matter most, the same in every period so they're always in the same place. */
const ReportKpis: React.FC<ReportKpisProps> = ({ data, trend, loading, previousLabel }) => {
  const k = data?.kpis;
  return (
    <Grid container spacing={{ xs: 1.5, md: 2 }}>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <KpiCard
          label="Revenue"
          icon={<PaymentsOutlined />}
          value={k?.revenue.value}
          format="money"
          previous={k?.revenue.previous}
          previousLabel={previousLabel}
          sparkline={trend && trend.length > 1 ? trend : undefined}
          hint={k && `≈ ${formatLbp(k.revenue.lbp.value)}`}
          loading={loading}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <KpiCard
          label="Paid orders"
          icon={<ReceiptLongOutlined />}
          value={k?.orders.value}
          format="number"
          previous={k?.orders.previous}
          previousLabel={previousLabel}
          hint={k && (k.websiteOrders.value ? `${plural(k.websiteOrders.value, "website order")} placed` : "No website orders")}
          loading={loading}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <KpiCard
          label="Average order"
          icon={<ShoppingBasketOutlined />}
          value={k?.avgOrder.value}
          format="money"
          previous={k?.avgOrder.previous}
          previousLabel={previousLabel}
          hint={k && `Discounts given ${formatUsd(k.discounts.value)}`}
          loading={loading}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <KpiCard
          label="Gaming time"
          icon={<AccessTimeRounded />}
          value={k?.gamingHours.value}
          format={(v) => `${formatNumber(v, v < 100 ? 1 : 0)} h`}
          previous={k?.gamingHours.previous}
          previousLabel={previousLabel}
          hint={k && `${plural(k.sessions.value, "session")} started`}
          loading={loading}
        />
      </Grid>
    </Grid>
  );
};

export default ReportKpis;
