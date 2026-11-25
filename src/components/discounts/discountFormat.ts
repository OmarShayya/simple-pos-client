import type { StatusTone } from "@/components/ui";
import { dayKey, formatDate, formatDateRange } from "@/utils/format";
import { zonedToUtc } from "@/utils/zonedTime";
import { DiscountTarget, type Discount } from "@/types/discount.types";

export const TARGET_LABEL: Record<DiscountTarget, string> = {
  [DiscountTarget.SALE]: "Whole order",
  [DiscountTarget.GAMING_SESSION]: "Gaming time",
  [DiscountTarget.PRODUCT]: "One product",
  [DiscountTarget.CATEGORY]: "One category",
};

export const TARGET_OPTIONS = (Object.keys(TARGET_LABEL) as DiscountTarget[]).map((value) => ({ value, label: TARGET_LABEL[value] }));

/** Id of the product/category a discount targets (the list API populates `targetId`). */
export const targetIdOf = (d: Discount): string | undefined =>
  d.targetDetails?._id ?? (d.targetId && /^[a-f\d]{24}$/i.test(d.targetId) ? d.targetId : undefined);

/** "Whole order" / "Red Bull" / "Snacks". */
export const appliesTo = (d: Discount) =>
  d.target === DiscountTarget.PRODUCT || d.target === DiscountTarget.CATEGORY ? d.targetDetails?.name ?? "(deleted)" : TARGET_LABEL[d.target];

export type DiscountState = "on" | "off" | "scheduled" | "ended";

/** Whether the discount applies right now. */
export const discountState = (d: Discount, now = Date.now()): DiscountState => {
  if (!d.isActive) return "off";
  if (d.startDate && new Date(d.startDate).getTime() > now) return "scheduled";
  if (d.endDate && new Date(d.endDate).getTime() < now) return "ended";
  return "on";
};

export const STATE_INFO: Record<DiscountState, { label: string; tone: StatusTone }> = {
  on: { label: "Active", tone: "success" },
  off: { label: "Turned off", tone: "neutral" },
  scheduled: { label: "Scheduled", tone: "info" },
  ended: { label: "Ended", tone: "neutral" },
};

/** "Always", "From 1 Dec 2026", "Until 31 Dec 2026", "1–31 Dec 2026". */
export const validityText = (d: Pick<Discount, "startDate" | "endDate">) => {
  if (d.startDate && d.endDate) return formatDateRange(dayKey(d.startDate), dayKey(d.endDate));
  if (d.startDate) return `From ${formatDate(dayKey(d.startDate))}`;
  if (d.endDate) return `Until ${formatDate(dayKey(d.endDate))}`;
  return "Always";
};

/** Lounge-local day → the instant it starts / ends (end is inclusive: 23:59:59.999). */
export const dayStartIso = (day: string) => zonedToUtc(day, 0).toISOString();
export const dayEndIso = (day: string) => new Date(zonedToUtc(day, 24 * 60).getTime() - 1).toISOString();
