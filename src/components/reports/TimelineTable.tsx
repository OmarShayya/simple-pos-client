import React, { useMemo } from "react";
import { DataTable, SectionCard } from "@/components/ui";
import type { ReportPeriod, ReportSeriesPoint } from "@/types/report.types";
import { PERIODS } from "./reportPeriods";
import { timelineColumns } from "./reportColumns";

export interface TimelineTableProps {
  period: ReportPeriod;
  rows: ReportSeriesPoint[] | undefined;
  loading: boolean;
}

/**
 * The main chart as a table (exact numbers, sortable). Only buckets that have started; Day: only hours with sales.
 * Year: ranked best month first.
 */
const TimelineTable: React.FC<TimelineTableProps> = ({ period, rows, loading }) => {
  const config = PERIODS[period];
  const columns = useMemo(() => timelineColumns(period), [period]);
  const visible = useMemo(() => (period === "day" ? rows?.filter((p) => p.orders > 0 || p.revenue > 0) : rows), [rows, period]);
  return (
    <SectionCard
      variant="plain"
      title={config.timelineTitle}
      subtitle={config.timelineRanked ? "Months ranked by revenue — tap a column title to sort differently" : period === "day" ? "Hours with paid orders" : undefined}
    >
      <DataTable<ReportSeriesPoint>
        key={period}
        label={config.timelineTitle}
        rows={visible}
        columns={columns}
        getRowId={(p) => p.key}
        loading={loading}
        density="compact"
        phoneLayout="table"
        pageSize={31}
        pageSizeOptions={[31]}
        initialSort={config.timelineRanked ? { field: "revenue", direction: "desc" } : undefined}
        empty={{ title: "Nothing was paid in this period" }}
      />
    </SectionCard>
  );
};

export default TimelineTable;
