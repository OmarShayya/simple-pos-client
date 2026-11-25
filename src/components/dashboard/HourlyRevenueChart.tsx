import React, { useMemo } from "react";
import { LineChart } from "@mui/x-charts/LineChart";
import { ChartCard } from "@/components/ui";
import { useChartDefaults } from "@/theme/charts";
import { formatUsd } from "@/utils/format";
import type { DashboardOverview } from "@/types/dashboard.types";
import { hourRangeLabel, loungeHour } from "@/components/reports/reportPeriods";

const HOURS = Array.from({ length: 24 }, (_, h) => h);

/**
 * Revenue per hour today (teal, stops at the current hour) against yesterday (grey, dashed).
 * Managers only — cashiers get an empty `hourly` from the API and the chart isn't shown.
 */
const HourlyRevenueChart: React.FC<{ data: DashboardOverview | undefined; loading: boolean; now: Date }> = ({ data, loading, now }) => {
  const chart = useChartDefaults();
  const current = loungeHour(now);
  const { today, yesterday, todayTotal, yesterdayTotal } = useMemo(() => {
    const rows = data?.hourly ?? [];
    const byHour = new Map(rows.map((r) => [r.hour, r]));
    return {
      // Future hours stay empty so the line ends "now" instead of dropping to $0
      today: HOURS.map((h) => (h <= current ? byHour.get(h)?.today ?? 0 : null)),
      yesterday: HOURS.map((h) => byHour.get(h)?.yesterday ?? 0),
      todayTotal: rows.reduce((t, r) => t + r.today, 0),
      yesterdayTotal: rows.reduce((t, r) => t + r.yesterday, 0),
    };
  }, [data, current]);

  return (
    <ChartCard
      title="Revenue by hour"
      subtitle="Today so far, against all of yesterday"
      legend={[
        { label: "Today", color: chart.colors.revenue, value: data ? formatUsd(todayTotal) : undefined },
        { label: "Yesterday", color: chart.colors.previous, dashed: true, value: data ? formatUsd(yesterdayTotal) : undefined },
      ]}
      height={260}
      loading={loading}
    >
      <LineChart
        {...chart.line}
        // Refreshes every 30 s: no re-drawing animation each time
        skipAnimation
        height={260}
        xAxis={[
          {
            data: HOURS,
            scaleType: "point",
            label: "Hour of the day",
            height: 52,
            valueFormatter: (h: number, ctx) => (ctx.location === "tooltip" ? hourRangeLabel(h) : chart.hourTick(h)),
            tickInterval: (h: number) => h % 3 === 0,
          },
        ]}
        yAxis={[{ valueFormatter: chart.moneyTick, width: 64, label: "Revenue (USD)" }]}
        series={[
          { id: "today", data: today, label: "Today", color: chart.colors.revenue, area: true, showMark: false, valueFormatter: chart.money, connectNulls: false },
          { id: "yesterday", data: yesterday, label: "Yesterday", color: chart.colors.previous, showMark: false, valueFormatter: chart.money },
        ]}
        sx={{ ...chart.line.sx, ...chart.dashed("yesterday"), "& .MuiChartsAxis-label": { fontSize: "0.8125rem", fill: chart.colors.text } }}
      />
    </ChartCard>
  );
};

export default HourlyRevenueChart;
