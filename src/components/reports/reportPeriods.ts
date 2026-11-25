/**
 * Calendar logic for the four report periods, on plain "YYYY-MM-DD" lounge days (weeks start Monday,
 * like the API). Everything a period view needs to know about itself lives in `PERIODS`.
 */
import { shiftDay } from "@/utils/dateRanges";
import { formatDateRange, formatDayLong, LOUNGE_TZ } from "@/utils/format";
import type { ReportComparison, ReportPeriod, ReportSeriesPoint } from "@/types/report.types";

export const REPORT_PERIODS: ReportPeriod[] = ["day", "week", "month", "year"];
export const isReportPeriod = (v: unknown): v is ReportPeriod => typeof v === "string" && (REPORT_PERIODS as string[]).includes(v);
export const isDayString = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T12:00:00Z`)) && new Date(`${v}T12:00:00Z`).toISOString().startsWith(v);

const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = (n: number) => String(n).padStart(2, "0");

/* ---------------------------------------------------------------- calendar */

/** First day of the period that contains `day`. */
export const periodStart = (period: ReportPeriod, day: string): string => {
  switch (period) {
    case "day":
      return day;
    case "week":
      return shiftDay(day, -((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7));
    case "month":
      return `${day.slice(0, 7)}-01`;
    case "year":
      return `${day.slice(0, 4)}-01-01`;
  }
};

const addMonths = (day: string, n: number) => {
  const [y, m] = day.split("-").map(Number);
  const index = y * 12 + (m - 1) + n;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}-01`;
};

/** First day of the period `steps` periods away (negative = back). */
export const shiftPeriodStart = (period: ReportPeriod, day: string, steps: number): string => {
  const start = periodStart(period, day);
  switch (period) {
    case "day":
      return shiftDay(start, steps);
    case "week":
      return shiftDay(start, steps * 7);
    case "month":
      return addMonths(start, steps);
    case "year":
      return addMonths(start, steps * 12);
  }
};

/** Last day of the period that contains `day`. */
export const periodEnd = (period: ReportPeriod, day: string): string => shiftDay(shiftPeriodStart(period, day, 1), -1);

export const isSamePeriod = (period: ReportPeriod, a: string, b: string) => periodStart(period, a) === periodStart(period, b);

/**
 * The date to show after moving `steps` periods. Landing on the current period selects today, so
 * "‹ then ›" comes back to exactly where you were.
 */
export const stepDate = (period: ReportPeriod, day: string, steps: number, today: string): string => {
  const start = shiftPeriodStart(period, day, steps);
  return isSamePeriod(period, start, today) ? today : start;
};

/** "Tue 25 Nov 2026" · "24–30 Nov 2026" · "November 2026" · "2026" (same wording as the API). */
export const periodLabel = (period: ReportPeriod, day: string): string => {
  switch (period) {
    case "day":
      return formatDayLong(day);
    case "week":
      return formatDateRange(periodStart("week", day), periodEnd("week", day));
    case "month":
      return `${MONTHS_LONG[Number(day.slice(5, 7)) - 1]} ${day.slice(0, 4)}`;
    case "year":
      return day.slice(0, 4);
  }
};

const hourFmt = new Intl.DateTimeFormat("en-US", { timeZone: LOUNGE_TZ, hourCycle: "h23", hour: "2-digit" });
/** Current hour (0–23) in the lounge. */
export const loungeHour = (now: Date = new Date()) => Number(hourFmt.format(now)) % 24;

/** "4 PM" */
export const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h % 24 < 12 ? "AM" : "PM"}`;
/** "4 PM – 5 PM" */
export const hourRangeLabel = (h: number) => `${hourLabel(h)} – ${hourLabel((h + 1) % 24)}`;

/* ---------------------------------------------------------------- buckets */

/** Short axis label for a bucket. */
export const bucketTick = (period: ReportPeriod, p: ReportSeriesPoint) => (period === "day" ? hourLabel(Number(p.key)) : p.label);

/** Full name of a bucket (tooltips, tables): "4 PM – 5 PM", "Mon 24 Nov", "January 2026". */
export const bucketTitle = (period: ReportPeriod, p: ReportSeriesPoint) => {
  if (period === "day") return hourRangeLabel(Number(p.key));
  if (period === "year") return `${MONTHS_LONG[Number(p.key.slice(5, 7)) - 1]} ${p.key.slice(0, 4)}`;
  return formatDayLong(p.key).replace(/ \d{4}$/, "");
};

/** Has this bucket started yet? (future buckets are left out of averages and "quietest"). */
export const bucketStarted = (period: ReportPeriod, p: ReportSeriesPoint, rangeStartDay: string, today: string, now = new Date()) => {
  if (period === "day") return rangeStartDay < today || (rangeStartDay === today && Number(p.key) <= loungeHour(now));
  if (period === "year") return p.key <= today.slice(0, 7);
  return p.key <= today;
};

/** Where a click on a bucket leads (a day → its Day report, a month → its Month report). */
export const drillDown = (period: ReportPeriod, p: ReportSeriesPoint): { period: ReportPeriod; date: string } | null => {
  if (period === "week" || period === "month") return { period: "day", date: p.key };
  if (period === "year") return { period: "month", date: `${p.key}-01` };
  return null;
};

/* ---------------------------------------------------------------- per-period views */

/** Blocks a report view is built from (rendered by ReportView in the order a period lists them). */
export type ReportSectionId = "timeline" | "busiestHours" | "payments" | "categories" | "topProducts" | "cashiers" | "stations";

/** Section titles, shared by the screen and the printed report (timeline titles are per period). */
export const SECTION_COPY: Record<Exclude<ReportSectionId, "timeline">, { title: string; subtitle?: string }> = {
  payments: { title: "How customers paid", subtitle: "Revenue by payment method" },
  categories: { title: "Product sales by category", subtitle: "Drinks, snacks and food (gaming time not included)" },
  topProducts: { title: "Top products", subtitle: "Best sellers by revenue" },
  cashiers: { title: "Staff", subtitle: "Payments taken by each staff member" },
  stations: { title: "Stations" },
  busiestHours: { title: "Busiest hours" },
};

export interface PeriodConfig {
  value: ReportPeriod;
  /** Period switch label. */
  label: string;
  /** "Today" / "This week" … (jump button). */
  currentLabel: string;
  /** "day", "week", … (aria labels: "Previous week"). */
  noun: string;
  /** What one chart bar is: "hour" / "day" / "month". */
  bucketNoun: string;
  /** X-axis title. */
  axisLabel: string;
  /** Rows of sections; two ids in a row sit side by side on wide screens. */
  layout: ReportSectionId[][];
  /** Title of the bucket-by-bucket table. */
  timelineTitle: string;
  /** Year: the table ranks the months (best first) instead of listing them in order. */
  timelineRanked?: boolean;
}

export const PERIODS: Record<ReportPeriod, PeriodConfig> = {
  // A single day is about the shift: when it was busy and who took the money.
  day: {
    value: "day",
    label: "Day",
    currentLabel: "Today",
    noun: "day",
    bucketNoun: "hour",
    axisLabel: "Hour of the day",
    timelineTitle: "Hour by hour",
    layout: [["cashiers", "payments"], ["topProducts", "categories"], ["stations"], ["timeline"]],
  },
  // A week compares days and shows the busy hours to staff for.
  week: {
    value: "week",
    label: "Week",
    currentLabel: "This week",
    noun: "week",
    bucketNoun: "day",
    axisLabel: "Day",
    timelineTitle: "Day by day",
    layout: [["busiestHours"], ["payments", "categories"], ["topProducts", "cashiers"], ["stations"], ["timeline"]],
  },
  // A month adds which stations earn their place and what sells.
  month: {
    value: "month",
    label: "Month",
    currentLabel: "This month",
    noun: "month",
    bucketNoun: "day",
    axisLabel: "Day of the month",
    timelineTitle: "Day by day",
    layout: [["busiestHours"], ["topProducts", "categories"], ["stations"], ["payments", "cashiers"], ["timeline"]],
  },
  // A year is the trend: best months first, then the mix.
  year: {
    value: "year",
    label: "Year",
    currentLabel: "This year",
    noun: "year",
    bucketNoun: "month",
    axisLabel: "Month",
    timelineTitle: "Best months",
    timelineRanked: true,
    layout: [["timeline"], ["busiestHours"], ["stations"], ["topProducts", "categories"], ["payments", "cashiers"]],
  },
};

/** Short comparison text for KPI deltas ("vs last week so far"). */
export const comparisonLabel = (period: ReportPeriod, comparison: ReportComparison, previousLabel?: string): string => {
  if (comparison === "to-date") {
    return { day: "vs yesterday, same time", week: "vs last week so far", month: "vs last month so far", year: "vs last year so far" }[period];
  }
  if (period === "day") return previousLabel ? `vs ${previousLabel.replace(/ \d{4}$/, "")}` : "vs the day before";
  if (period === "year") return previousLabel ? `vs ${previousLabel}` : "vs the year before";
  return { week: "vs the week before", month: previousLabel ? `vs ${previousLabel.replace(/ \d{4}$/, "")}` : "vs the month before" }[period];
};
