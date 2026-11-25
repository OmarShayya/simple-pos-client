import type { Reservation } from "@/types/reservation.types";
import type { StatusTone } from "@/components/ui";

/** Staff can check a group in this many minutes before their slot (matches the API). */
export const CHECKIN_EARLY_MIN = 30;

/** Tells staff at a glance where a booking stands right now. */
export const getTiming = (r: Pick<Reservation, "startTime" | "endTime" | "status">, now: number) => {
  const start = new Date(r.startTime).getTime();
  const end = new Date(r.endTime).getTime();
  const minsToStart = Math.round((start - now) / 60_000);
  return {
    start,
    end,
    minsToStart,
    canCheckIn: r.status === "confirmed" && now >= start - CHECKIN_EARLY_MIN * 60_000 && now <= end,
    isLate: r.status === "confirmed" && now > start,
    soon: r.status === "confirmed" && minsToStart >= 0 && minsToStart <= 60,
  };
};

/** "Late 12 min" / "In 20 min" for bookings that need attention; null otherwise. */
export const timingBadge = (r: Pick<Reservation, "startTime" | "endTime" | "status">, now: number): { label: string; tone: StatusTone } | null => {
  const t = getTiming(r, now);
  if (t.isLate) {
    const late = Math.abs(t.minsToStart);
    return { label: late >= 60 ? `Late ${Math.floor(late / 60)}h ${late % 60}m` : `Late ${late} min`, tone: "warning" };
  }
  if (t.soon) return { label: t.minsToStart === 0 ? "Starting now" : `In ${t.minsToStart} min`, tone: "info" };
  return null;
};

/** Sort order for a night's list: needs attention, upcoming, checked in, then closed ones. */
export const attentionRank = (r: Reservation, now: number) => {
  const t = getTiming(r, now);
  if (r.status === "confirmed") return t.isLate || (t.minsToStart >= 0 && t.minsToStart <= 30) ? 0 : 1;
  if (r.status === "checked_in") return 2;
  return 3;
};
