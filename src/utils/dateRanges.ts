import { LOUNGE_TZ, dayKey } from "./format";

/**
 * Date-range presets used by `DateRangeField` and report filters. Ranges are calendar days
 * ("YYYY-MM-DD", inclusive) in the lounge timezone, which is what the API's `from`/`to` expect.
 * Weeks start on Monday.
 */

export type DateRangePreset = "today" | "yesterday" | "thisWeek" | "last7" | "thisMonth" | "lastMonth" | "custom";

export interface DateRangeValue {
  preset: DateRangePreset;
  /** Inclusive start, "YYYY-MM-DD". */
  from: string;
  /** Inclusive end, "YYYY-MM-DD". */
  to: string;
}

export const DATE_RANGE_PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "thisWeek", label: "This week" },
  { id: "last7", label: "Last 7 days" },
  { id: "thisMonth", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "custom", label: "Custom" },
];

/** Add (or subtract) whole days to a "YYYY-MM-DD" string. */
export const shiftDay = (day: string, n: number): string => {
  const t = new Date(`${day}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

/** Monday = 0 … Sunday = 6 */
const weekdayMon0 = (day: string) => (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;

const monthStart = (day: string) => `${day.slice(0, 7)}-01`;
const monthEnd = (day: string) => {
  const [y, m] = day.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${day.slice(0, 7)}-${String(last).padStart(2, "0")}`;
};

/** Resolve a preset to concrete days. `custom` returns today..today (the caller supplies its own). */
export const getPresetRange = (preset: DateRangePreset, now: Date = new Date()): DateRangeValue => {
  const today = dayKey(now);
  switch (preset) {
    case "today":
      return { preset, from: today, to: today };
    case "yesterday": {
      const y = shiftDay(today, -1);
      return { preset, from: y, to: y };
    }
    case "thisWeek":
      return { preset, from: shiftDay(today, -weekdayMon0(today)), to: today };
    case "last7":
      return { preset, from: shiftDay(today, -6), to: today };
    case "thisMonth":
      return { preset, from: monthStart(today), to: today };
    case "lastMonth": {
      const prev = shiftDay(monthStart(today), -1);
      return { preset, from: monthStart(prev), to: monthEnd(prev) };
    }
    default:
      return { preset: "custom", from: today, to: today };
  }
};

/** Initial value for a DateRangeField: `useState(() => defaultDateRange("today"))`. */
export const defaultDateRange = (preset: DateRangePreset = "today"): DateRangeValue => getPresetRange(preset);

/** Today in the lounge timezone, as "YYYY-MM-DD". */
export const todayKey = () => dayKey(new Date());

export { LOUNGE_TZ };
