import React from "react";
import { Grid } from "@mui/material";
import { KpiCard } from "@/components/ui";
import type { ReportSummary } from "@/types/report.types";
import { mainKpis } from "./reportKpiItems";

export interface ReportKpisProps {
  data: ReportSummary | undefined;
  /** Revenue per bucket so far (future buckets left out, so the sparkline doesn't "crash" to $0). */
  trend?: number[];
  loading: boolean;
  /** "vs last week so far" */
  previousLabel: string;
}

const ReportKpis: React.FC<ReportKpisProps> = ({ data, trend, loading, previousLabel }) => (
  <Grid container spacing={{ xs: 1.5, md: 2 }}>
    {mainKpis(data?.kpis).map((kpi, i) => (
      <Grid key={kpi.label} size={{ xs: 12, sm: 6, lg: 3 }}>
        <KpiCard
          label={kpi.label}
          icon={kpi.icon}
          value={kpi.value}
          format={kpi.format}
          previous={kpi.previous}
          previousLabel={previousLabel}
          sparkline={i === 0 && trend && trend.length > 1 ? trend : undefined}
          hint={kpi.hint}
          loading={loading}
        />
      </Grid>
    ))}
  </Grid>
);

export default ReportKpis;
