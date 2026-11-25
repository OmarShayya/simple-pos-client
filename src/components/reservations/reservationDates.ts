import type { DaySchedule } from "@/types/reservation.types";
import { addDays, businessWindow, dateInTz, DEFAULT_TZ } from "@/utils/zonedTime";

/**
 * The business night ("YYYY-MM-DD") a booking start belongs to: a 1 AM start belongs to the
 * night before when the lounge is still open from that evening.
 */
export const businessDateOf = (start: Date | string, schedule?: DaySchedule[], tz = DEFAULT_TZ): string => {
  const d = typeof start === "string" ? new Date(start) : start;
  const local = dateInTz(d, tz);
  const prev = addDays(local, -1);
  const w = businessWindow(prev, schedule, tz);
  return !w.closed && d >= w.start && d < w.end ? prev : local;
};

/** "20:30" of an instant in the lounge timezone. */
export const hhmmIn = (d: Date | string, tz = DEFAULT_TZ) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(d));

/** Link that opens the Reservations screen on a booking's night with the booking highlighted. */
export const reservationHref = (r: { id: string; startTime: string }, schedule?: DaySchedule[], tz = DEFAULT_TZ) =>
  `/reservations?date=${businessDateOf(r.startTime, schedule, tz)}&highlight=${r.id}`;

/** "16:00" → "4:00 PM" (opening hours are stored as 24h "HH:mm"). */
export const formatClock = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
