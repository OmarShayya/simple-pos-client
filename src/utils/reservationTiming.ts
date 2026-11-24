import type { Reservation } from "@/types/reservation.types";

/** Staff can check a group in this many minutes before their slot (matches the API). */
export const CHECKIN_EARLY_MIN = 30;

/** Tells staff at a glance where a booking stands right now. */
export const getTiming = (r: Reservation, now: number) => {
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
