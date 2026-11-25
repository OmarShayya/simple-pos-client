/** Plain-language highlights derived from a report (pure functions, no React). */
import { dayKey, formatNumber, formatPercent, formatRatio, formatUsd, plural } from "@/utils/format";
import type { BusiestHourRow, ReportPeriod, ReportSeriesPoint, ReportSummary, StationRow, StationTypeTotals } from "@/types/report.types";
import type { StationType } from "@/types/reservation.types";
import { bucketStarted, bucketTitle, hourRangeLabel } from "./reportPeriods";

export interface Highlight {
  label: string;
  value: string;
  detail?: string;
}

const AVERAGE_LABEL: Record<ReportPeriod, string> = { day: "Per open hour", week: "Daily average", month: "Daily average", year: "Monthly average" };
const BEST_LABEL: Record<ReportPeriod, string> = { day: "Busiest hour", week: "Best day", month: "Best day", year: "Best month" };
const QUIET_LABEL: Record<ReportPeriod, string> = { day: "Gaming share", week: "Quietest day", month: "Quietest day", year: "Quietest month" };

/** Buckets that have started (no rows of zeros for the rest of the week; averages ignore the future). */
export const startedBuckets = (data: ReportSummary, today: string, now = new Date()): ReportSeriesPoint[] =>
  data.series.filter((p) => bucketStarted(data.period, p, dayKey(data.range.start), today, now));

/**
 * Three callouts under the main chart, chosen per period:
 * Day → busiest hour, revenue per open hour, gaming share.
 * Week / Month → best day, daily average, quietest day. Year → best month, monthly average, quietest month.
 */
export const reportHighlights = (data: ReportSummary, today: string, now = new Date()): Highlight[] => {
  const { period, kpis } = data;
  const started = startedBuckets(data, today, now);
  const withSales = started.filter((p) => p.revenue > 0);
  const best = [...withSales].sort((a, b) => b.revenue - a.revenue)[0];
  const quiet = [...withSales].sort((a, b) => a.revenue - b.revenue)[0];
  const out: Highlight[] = [];

  out.push(
    best
      ? { label: BEST_LABEL[period], value: period === "day" ? hourRangeLabel(Number(best.key)) : bucketTitle(period, best), detail: `${formatUsd(best.revenue)} · ${plural(best.orders, "order")}` }
      : { label: BEST_LABEL[period], value: "—" }
  );

  if (period === "day") {
    const perHour = data.openHours > 0 ? kpis.revenue.value / data.openHours : null;
    out.push({ label: AVERAGE_LABEL.day, value: perHour === null ? "Closed" : formatUsd(perHour), detail: data.openHours ? `${data.openHours} h open` : undefined });
    const share = kpis.revenue.value > 0 ? (kpis.gamingRevenue.value / kpis.revenue.value) * 100 : null;
    out.push({ label: QUIET_LABEL.day, value: share === null ? "—" : formatPercent(share), detail: share === null ? undefined : `Products ${formatPercent(100 - share)}` });
    return out;
  }

  const count = Math.max(1, started.length);
  out.push({ label: AVERAGE_LABEL[period], value: started.length ? formatUsd(kpis.revenue.value / count) : "—", detail: started.length ? `over ${count} ${period === "year" ? (count === 1 ? "month" : "months") : count === 1 ? "day" : "days"}` : undefined });
  out.push(
    quiet && quiet !== best
      ? { label: QUIET_LABEL[period], value: bucketTitle(period, quiet), detail: `${formatUsd(quiet.revenue)} · ${plural(quiet.orders, "order")}` }
      : { label: QUIET_LABEL[period], value: "—" }
  );
  return out;
};

/** True when nothing at all happened in the period (shows one empty state instead of empty charts). */
export const isEmptyReport = (data: ReportSummary) => {
  const k = data.kpis;
  return k.revenue.value === 0 && k.orders.value === 0 && k.sessions.value === 0 && k.gamingHours.value === 0 && k.reservations.value === 0 && k.websiteOrders.value === 0;
};

/** Rows of the bucket-by-bucket table. A day lists only the hours with sales (not 24 rows of mostly zeros). */
export const timelineRows = (period: ReportPeriod, rows: ReportSeriesPoint[]) => (period === "day" ? rows.filter((p) => p.orders > 0 || p.revenue > 0) : rows);

/** The hour with the most paid orders (undefined when nothing was paid). */
export const busiestHour = (rows: BusiestHourRow[] | undefined) => {
  const top = [...(rows ?? [])].sort((a, b) => b.orders - a.orders)[0];
  return top && top.orders > 0 ? top : undefined;
};

export const busiestHoursSubtitle = (rows: BusiestHourRow[] | undefined) => {
  const top = busiestHour(rows);
  return top ? `Most orders are paid ${hourRangeLabel(top.hour)} — plan the busiest shifts around it` : "Paid orders by hour of the day";
};

/** Average "busy" share of the stations of one type (null when the lounge was closed). */
export const averageBusy = (rows: StationRow[], type: StationType) => {
  const values = rows.filter((r) => r.type === type && r.utilization !== null).map((r) => r.utilization as number);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
};

/** Top of the "busy" scale: the busiest station rounded up to a 25% step, so quiet weeks don't squash every bar. */
export const busyScaleMax = (rows: StationRow[]) => Math.min(1, Math.max(0.25, Math.ceil(Math.max(0, ...rows.map((r) => r.utilization ?? 0)) * 4) / 4));

export const stationsSubtitle = (openHours: number) =>
  openHours > 0 ? `"Busy" = share of the ${formatNumber(openHours)} opening hours a station was in use` : "Gaming time and revenue per station";

/** "41 sessions · 124.5 h · 31% busy" */
export const stationTypeSummary = (totals: StationTypeTotals, busy: number | null) =>
  `${plural(totals.sessions, "session")} · ${formatNumber(totals.hours, 1)} h · ${busy === null ? "closed" : `${formatRatio(busy)} busy`}`;
