/** Plain-language highlights derived from a report (pure functions, no React). */
import { dayKey, formatPercent, formatUsd, plural } from "@/utils/format";
import type { ReportPeriod, ReportSummary } from "@/types/report.types";
import { bucketStarted, bucketTitle, hourRangeLabel } from "./reportPeriods";

export interface Highlight {
  label: string;
  value: string;
  detail?: string;
}

const AVERAGE_LABEL: Record<ReportPeriod, string> = { day: "Per open hour", week: "Daily average", month: "Daily average", year: "Monthly average" };
const BEST_LABEL: Record<ReportPeriod, string> = { day: "Busiest hour", week: "Best day", month: "Best day", year: "Best month" };
const QUIET_LABEL: Record<ReportPeriod, string> = { day: "Gaming share", week: "Quietest day", month: "Quietest day", year: "Quietest month" };

/**
 * Three callouts under the main chart, chosen per period:
 * Day → busiest hour, revenue per open hour, gaming share.
 * Week / Month → best day, daily average, quietest day. Year → best month, monthly average, quietest month.
 */
export const reportHighlights = (data: ReportSummary, today: string, now = new Date()): Highlight[] => {
  const { period, series, kpis } = data;
  const started = series.filter((p) => bucketStarted(period, p, dayKey(data.range.start), today, now));
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
