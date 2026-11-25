/**
 * Display formatters — the ONE place that decides how money, numbers, dates, times and
 * durations look in the POS. Every date/time is shown in the lounge timezone (Asia/Beirut),
 * whatever timezone the device is set to. All helpers are null-safe and return "—" for
 * missing values, so tables never print "NaN" or "Invalid Date".
 */

export const LOUNGE_TZ = "Asia/Beirut";
export const EMPTY = "—";

export type Currency = "USD" | "LBP";
export type DateInput = Date | string | number | null | undefined;

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/* ---------------------------------------------------------------- money */

const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const usdCompact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const int = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export interface MoneyFormatOptions {
  /** "$1.2K" — for chart axes and tight KPI tiles. */
  compact?: boolean;
  /** Drop ".00" for whole amounts ("$12" instead of "$12.00"). Default false: always 2 decimals. */
  trimZeros?: boolean;
  /** Prefix positive values with "+" (deltas). */
  signed?: boolean;
}

/** "$12.50", "−$3.00", "$1.2K" (compact). */
export const formatUsd = (value: number | null | undefined, opts: MoneyFormatOptions = {}): string => {
  if (!isNum(value)) return EMPTY;
  const abs = Math.abs(value);
  let text: string;
  if (opts.compact && abs >= 1000) text = usdCompact.format(abs);
  else if (opts.trimZeros && Number.isInteger(Math.round(abs * 100) / 100)) text = usd0.format(abs);
  else text = usd2.format(abs);
  const sign = value < 0 && Math.round(abs * 100) !== 0 ? "−" : opts.signed && value > 0 ? "+" : "";
  return sign + text;
};

/** "1,120,000 LBP" (always whole pounds). */
export const formatLbp = (value: number | null | undefined, opts: Pick<MoneyFormatOptions, "compact" | "signed"> = {}): string => {
  if (!isNum(value)) return EMPTY;
  const abs = Math.abs(Math.round(value));
  const body = opts.compact && abs >= 1_000_000 ? `${trimNum(abs / 1_000_000)}M` : opts.compact && abs >= 1000 ? `${trimNum(abs / 1000)}K` : int.format(abs);
  const sign = value < 0 && abs !== 0 ? "−" : opts.signed && value > 0 ? "+" : "";
  return `${sign}${body} LBP`;
};

export const formatMoney = (value: number | null | undefined, currency: Currency = "USD", opts: MoneyFormatOptions = {}): string =>
  currency === "LBP" ? formatLbp(value, opts) : formatUsd(value, opts);

const trimNum = (n: number) => (Math.round(n * 10) / 10).toString();

/** Round to cents the way the API does (avoids 0.1 + 0.2 artefacts in totals). */
export const roundMoney = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/* ---------------------------------------------------------------- numbers */

/** "1,234" / "1,234.5" (up to `maxDecimals`). */
export const formatNumber = (value: number | null | undefined, maxDecimals = 0): string => {
  if (!isNum(value)) return EMPTY;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: maxDecimals }).format(value);
};

/** `value` is a percentage (12.5 → "12.5%"). Use `formatRatio` for 0–1 values. */
export const formatPercent = (value: number | null | undefined, maxDecimals = 0, signed = false): string => {
  if (!isNum(value)) return EMPTY;
  const text = `${new Intl.NumberFormat("en-US", { maximumFractionDigits: maxDecimals }).format(Math.abs(value))}%`;
  if (value < 0) return `−${text}`;
  return signed && value > 0 ? `+${text}` : text;
};

/** 0.125 → "12.5%". */
export const formatRatio = (ratio: number | null | undefined, maxDecimals = 0): string =>
  isNum(ratio) ? formatPercent(ratio * 100, maxDecimals) : EMPTY;

/** Relative change in % between two values (null when there's no meaningful base). */
export const percentChange = (current: number | null | undefined, previous: number | null | undefined): number | null => {
  if (!isNum(current) || !isNum(previous) || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
};

/* ---------------------------------------------------------------- dates & times (lounge timezone) */

export const toDate = (value: DateInput): Date | null => {
  if (value === null || value === undefined || value === "") return null;
  // Plain "YYYY-MM-DD" = a calendar day; anchor at noon UTC so it never shifts a day
  const d = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const fmtCache = new Map<string, Intl.DateTimeFormat>();
const fmt = (key: string, options: Intl.DateTimeFormatOptions, locale = "en-GB") => {
  const cacheKey = `${locale}|${key}`;
  let f = fmtCache.get(cacheKey);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options);
    fmtCache.set(cacheKey, f);
  }
  return f;
};

/** Calendar-day strings ("2026-11-25") are formatted as that day, not converted between zones. */
const zoneFor = (value: DateInput) => (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? "UTC" : LOUNGE_TZ);

/** "25 Nov 2026" */
export const formatDate = (value: DateInput): string => {
  const d = toDate(value);
  if (!d) return EMPTY;
  const tz = zoneFor(value);
  return fmt(`date-${tz}`, { timeZone: tz, day: "numeric", month: "short", year: "numeric" }).format(d);
};

/** "25 Nov" (no year) */
export const formatDateShort = (value: DateInput): string => {
  const d = toDate(value);
  if (!d) return EMPTY;
  const tz = zoneFor(value);
  return fmt(`dshort-${tz}`, { timeZone: tz, day: "numeric", month: "short" }).format(d);
};

/** "Tue 25 Nov 2026" */
export const formatDayLong = (value: DateInput): string => {
  const d = toDate(value);
  if (!d) return EMPTY;
  const tz = zoneFor(value);
  return fmt(`dlong-${tz}`, { timeZone: tz, weekday: "short", day: "numeric", month: "short", year: "numeric" })
    .format(d)
    .replace(",", "");
};

/** "9:41 PM" */
export const formatTime = (value: DateInput): string => {
  const d = toDate(value);
  if (!d) return EMPTY;
  return fmt("time", { timeZone: LOUNGE_TZ, hour: "numeric", minute: "2-digit", hour12: true }, "en-US").format(d);
};

/** "25 Nov 2026, 9:41 PM" */
export const formatDateTime = (value: DateInput): string => {
  const d = toDate(value);
  if (!d) return EMPTY;
  return `${formatDate(d)}, ${formatTime(d)}`;
};

/** Today → "9:41 PM", yesterday → "Yesterday, 9:41 PM", this year → "25 Nov, 9:41 PM", else full. */
export const formatSmartDateTime = (value: DateInput, now: Date = new Date()): string => {
  const d = toDate(value);
  if (!d) return EMPTY;
  const day = dayKey(d);
  const today = dayKey(now);
  if (day === today) return formatTime(d);
  if (day === dayKey(new Date(now.getTime() - 86_400_000))) return `Yesterday, ${formatTime(d)}`;
  if (day.slice(0, 4) === today.slice(0, 4)) return `${formatDateShort(d)}, ${formatTime(d)}`;
  return formatDateTime(d);
};

/** "2026-11-25" — the calendar day of an instant in the lounge timezone. */
export const dayKey = (value: DateInput = new Date()): string => {
  const d = toDate(value);
  if (!d) return "";
  return fmt("daykey", { timeZone: LOUNGE_TZ, year: "numeric", month: "2-digit", day: "2-digit" }, "en-CA").format(d);
};

/** "Nov 2026" */
export const formatMonth = (value: DateInput): string => {
  const d = toDate(value);
  if (!d) return EMPTY;
  const tz = zoneFor(value);
  return fmt(`month-${tz}`, { timeZone: tz, month: "short", year: "numeric" }).format(d);
};

/** "18–24 Nov 2026", "28 Nov – 4 Dec 2026", "25 Nov 2026" (same day). Inputs are YYYY-MM-DD or dates. */
export const formatDateRange = (from: DateInput, to: DateInput): string => {
  const a = toDate(from);
  const b = toDate(to);
  if (!a || !b) return EMPTY;
  const [ka, kb] = [typeof from === "string" ? from : dayKey(a), typeof to === "string" ? to : dayKey(b)];
  if (ka === kb) return formatDate(ka);
  const [ya, ma] = ka.split("-");
  const [yb, mb] = kb.split("-");
  const dayA = Number(ka.slice(8));
  if (ya === yb && ma === mb) return `${dayA}–${formatDate(kb)}`;
  if (ya === yb) return `${formatDateShort(ka)} – ${formatDate(kb)}`;
  return `${formatDate(ka)} – ${formatDate(kb)}`;
};

/* ---------------------------------------------------------------- durations */

/** 90 → "1h 30m", 45 → "45m", 120 → "2h", 0 → "0m". */
export const formatDuration = (minutes: number | null | undefined): string => {
  if (!isNum(minutes)) return EMPTY;
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
};

/** Live timer: 3909000 ms → "1:05:09"; under an hour → "05:09". */
export const formatElapsed = (ms: number | null | undefined): string => {
  if (!isNum(ms)) return EMPTY;
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};

/** Hours with one decimal: 90 min → "1.5 h". */
export const formatHours = (minutesOrHours: number | null | undefined, unit: "minutes" | "hours" = "hours"): string => {
  if (!isNum(minutesOrHours)) return EMPTY;
  const h = unit === "minutes" ? minutesOrHours / 60 : minutesOrHours;
  return `${formatNumber(h, 1)} h`;
};

/* ---------------------------------------------------------------- relative */

/** "just now", "5 min ago", "2 h ago", "yesterday", "3 days ago", then the date. Future: "in 5 min". */
export const formatRelative = (value: DateInput, now: Date = new Date()): string => {
  const d = toDate(value);
  if (!d) return EMPTY;
  const diffMs = now.getTime() - d.getTime();
  const future = diffMs < 0;
  const mins = Math.round(Math.abs(diffMs) / 60_000);
  const wrap = (s: string) => (future ? `in ${s}` : `${s} ago`);
  if (mins < 1) return future ? "in a moment" : "just now";
  if (mins < 60) return wrap(`${mins} min`);
  const hours = Math.round(mins / 60);
  if (hours < 24 && dayKey(d) === dayKey(now)) return wrap(`${hours} h`);
  const days = Math.round((Date.parse(dayKey(now)) - Date.parse(dayKey(d))) / 86_400_000);
  if (days === 1) return "yesterday";
  if (days === -1) return "tomorrow";
  if (hours < 24) return wrap(`${hours} h`);
  if (Math.abs(days) < 7) return future ? `in ${-days} days` : `${days} days ago`;
  return formatDate(d);
};

/* ---------------------------------------------------------------- text */

/** "Omar Shayya" → "OS" */
export const initials = (name: string | null | undefined): string =>
  (name ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

/** "1 order" / "3 orders" */
export const plural = (count: number, singular: string, pluralForm = `${singular}s`) =>
  `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`;
