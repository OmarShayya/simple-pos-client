import React, { useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { ChartCard, SegmentedControl } from "@/components/ui";
import { useChartDefaults } from "@/theme/charts";
import { formatNumber, formatUsd } from "@/utils/format";
import type { ReportPeriod, ReportSeriesPoint, ReportSummary } from "@/types/report.types";
import { bucketTick, bucketTitle, drillDown, PERIODS } from "./reportPeriods";
import type { Highlight } from "./reportInsights";

type Metric = "revenue" | "orders";

export interface RevenueChartProps {
  period: ReportPeriod;
  data: ReportSummary | undefined;
  loading: boolean;
  error?: unknown;
  onRetry?: () => void;
  highlights?: Highlight[];
  /** Click on a bar → open that day / month. */
  onDrill?: (next: { period: ReportPeriod; date: string }) => void;
}

/** Bars thinner when there are few of them (a week shouldn't be seven fat blocks). */
const GAP_RATIO: Record<ReportPeriod, number> = { day: 0.3, week: 0.66, month: 0.28, year: 0.45 };

/**
 * The report's main chart: revenue per hour / day / month, stacked gaming vs products — or the
 * number of orders (a toggle, never a second y-axis). Tapping a bar opens that day or month.
 */
const RevenueChart: React.FC<RevenueChartProps> = ({ period, data, loading, error, onRetry, highlights, onDrill }) => {
  const chart = useChartDefaults();
  const [metric, setMetric] = useState<Metric>("revenue");
  const config = PERIODS[period];
  const series = useMemo<ReportSeriesPoint[]>(() => data?.series ?? [], [data]);
  const ticks = useMemo(() => series.map((p) => bucketTick(period, p)), [series, period]);
  const canDrill = Boolean(onDrill) && period !== "day";
  const k = data?.kpis;

  const legend =
    metric === "revenue"
      ? [
          { label: "Gaming", color: chart.colors.pc, value: k ? formatUsd(k.gamingRevenue.value) : undefined },
          { label: "Products", color: chart.colors.products, value: k ? formatUsd(k.productRevenue.value) : undefined },
        ]
      : undefined;

  return (
    <ChartCard
      title={metric === "revenue" ? `Revenue by ${config.bucketNoun}` : `Paid orders by ${config.bucketNoun}`}
      subtitle={canDrill ? `Tap a bar to open that ${config.bucketNoun}` : "Money counted when the order was paid"}
      action={
        <SegmentedControl
          aria-label="Chart shows"
          value={metric}
          onChange={setMetric}
          options={[
            { value: "revenue", label: "Revenue" },
            { value: "orders", label: "Orders" },
          ]}
        />
      }
      legend={legend}
      height={320}
      loading={loading}
      error={!data ? error : undefined}
      onRetry={onRetry}
      footer={highlights && highlights.length > 0 && <Highlights items={highlights} />}
    >
      <Box sx={{ cursor: canDrill ? "pointer" : undefined }}>
        <BarChart
          {...chart.bar}
          height={320}
          margin={{ top: 12, right: 8, bottom: 4, left: 4 }}
          xAxis={[
            {
              scaleType: "band",
              data: ticks,
              categoryGapRatio: GAP_RATIO[period],
              label: config.axisLabel,
              height: 52,
              valueFormatter: (value: string, ctx) => (ctx.location === "tooltip" ? bucketTitle(period, series[ticks.indexOf(value)] ?? series[0]) : value),
            },
          ]}
          yAxis={[
            metric === "revenue"
              ? { valueFormatter: chart.moneyTick, width: 64, label: "Revenue (USD)" }
              : { valueFormatter: (v: number) => formatNumber(v), width: 64, label: "Orders", tickMinStep: 1 },
          ]}
          series={
            metric === "revenue"
              ? [
                  { id: "gaming", data: series.map((p) => p.gaming), label: "Gaming", stack: "revenue", color: chart.colors.pc, valueFormatter: chart.money },
                  { id: "products", data: series.map((p) => p.products), label: "Products", stack: "revenue", color: chart.colors.products, valueFormatter: chart.money },
                ]
              : [{ id: "orders", data: series.map((p) => p.orders), label: "Paid orders", color: chart.colors.revenue, valueFormatter: (v) => (v == null ? "—" : formatNumber(v)) }]
          }
          onAxisClick={(_, axis) => {
            const point = axis ? series[axis.dataIndex] : undefined;
            const target = point && canDrill ? drillDown(period, point) : null;
            if (target && onDrill) onDrill(target);
          }}
          sx={{
            ...chart.bar.sx,
            "& .MuiChartsAxis-label": { fontSize: "0.8125rem", fill: chart.colors.text },
          }}
        />
      </Box>
    </ChartCard>
  );
};

const Highlights: React.FC<{ items: Highlight[] }> = ({ items }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: `repeat(${items.length}, minmax(0, 1fr))` }, gap: { xs: 1.5, sm: 2 } }}>
    {items.map((h) => (
      <Box key={h.label} sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary">
          {h.label}
        </Typography>
        <Typography sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }} noWrap>
          {h.value}
        </Typography>
        {h.detail && (
          <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }} noWrap>
            {h.detail}
          </Typography>
        )}
      </Box>
    ))}
  </Box>
);

export default RevenueChart;
