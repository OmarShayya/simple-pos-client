import type { PC } from "@/types/gaming.types";
import type { StationType } from "@/types/reservation.types";

export const STATION_PREFIX: Record<StationType, string> = { pc: "PC", playstation: "PS" };

/**
 * Next free station number for a type, following the existing pattern ("PC-09" → "PC-10",
 * "PC-010" → "PC-011", "PS-3" → "PS-4"). With no stations yet: "PC-01", "PS-1".
 */
export const nextStationNumber = (stations: PC[], type: StationType): string => {
  const prefix = STATION_PREFIX[type];
  let max = 0;
  let width = 0;
  for (const s of stations) {
    const m = new RegExp(`^${prefix}-?(\\d+)$`, "i").exec(s.pcNumber.trim());
    if (!m) continue;
    max = Math.max(max, Number(m[1]));
    // Zero-padded numbers ("PC-01") set the width; unpadded ones ("PC-10") don't force it
    if (m[1].startsWith("0")) width = Math.max(width, m[1].length);
  }
  if (!width) width = max ? 1 : type === "pc" ? 2 : 1;
  return `${prefix}-${String(max + 1).padStart(width, "0")}`;
};

/** Distinct non-empty values of a station field (zones, specs) for consistent pickers. */
export const distinctValues = (values: (string | undefined | null)[]) =>
  [...new Map(values.map((v) => v?.trim()).filter((v): v is string => Boolean(v)).map((v) => [v.toLowerCase(), v])).values()].sort((a, b) => a.localeCompare(b));
