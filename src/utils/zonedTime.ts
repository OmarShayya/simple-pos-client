/**
 * Timezone helpers so the POS shows reservation times in the lounge's timezone
 * (from the reservation settings), whatever timezone the device is set to.
 */

export const DEFAULT_TZ = "Asia/Beirut";

const partsCache = new Map<string, Intl.DateTimeFormat>();
const parts = (tz: string, d: Date) => {
  let f = partsCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsCache.set(tz, f);
  }
  const out: Record<string, string> = {};
  for (const p of f.formatToParts(d)) out[p.type] = p.value;
  return out;
};

const offsetMs = (tz: string, d: Date) => {
  const p = parts(tz, d);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUtc - Math.floor(d.getTime() / 1000) * 1000;
};

/** YYYY-MM-DD of an instant in `tz`. */
export const dateInTz = (d: Date, tz = DEFAULT_TZ) => {
  const p = parts(tz, d);
  return `${p.year}-${p.month}-${p.day}`;
};

/** UTC instant of local `minutes` after midnight on `date` in `tz` (minutes may exceed 1440). */
export const zonedToUtc = (date: string, minutes: number, tz = DEFAULT_TZ): Date => {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d) + minutes * 60_000;
  const o1 = offsetMs(tz, new Date(guess));
  let ts = guess - o1;
  const o2 = offsetMs(tz, new Date(ts));
  if (o2 !== o1) ts = guess - o2;
  return new Date(ts);
};

export const addDays = (date: string, n: number) => {
  const t = new Date(`${date}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

export const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

export const timeToMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** "8:30 PM" */
export const fmtTime = (iso: string | Date, tz = DEFAULT_TZ) =>
  new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** "Tue, Nov 25" */
export const fmtDay = (date: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(
    new Date(`${date}T12:00:00Z`)
  );

/** "2h", "1h 30m", "45m" */
export const fmtDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
};

/** Opening window (UTC instants) of a business night. */
export const businessWindow = (
  date: string,
  schedule: { day: number; closed: boolean; open: string; close: string }[] | undefined,
  tz = DEFAULT_TZ
) => {
  const day = schedule?.find((d) => d.day === weekdayOf(date)) ?? { day: weekdayOf(date), closed: false, open: "16:00", close: "04:00" };
  const open = timeToMinutes(day.open);
  let close = timeToMinutes(day.close);
  if (close <= open) close += 24 * 60;
  return { ...day, start: zonedToUtc(date, open, tz), end: zonedToUtc(date, close, tz) };
};

/** Business date that "now" belongs to: before closing time after midnight still counts as last night. */
export const currentBusinessDate = (
  schedule: { day: number; closed: boolean; open: string; close: string }[] | undefined,
  tz = DEFAULT_TZ
) => {
  const today = dateInTz(new Date(), tz);
  const yesterday = addDays(today, -1);
  const w = businessWindow(yesterday, schedule, tz);
  return !w.closed && Date.now() < w.end.getTime() ? yesterday : today;
};
