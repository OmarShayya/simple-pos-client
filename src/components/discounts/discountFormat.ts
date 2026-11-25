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


/** "Whole order" / "Red Bull" / "Snacks". */
export const appliesTo = (d: Discount) =>
  d.target === DiscountTarget.PRODUCT || d.target === DiscountTarget.CATEGORY ? d.targetDetails?.name ?? "(deleted)" : TARGET_LABEL[d.target];

export type DiscountState = "on" | "off" | "scheduled" | "ended";

/** Whether the discount applies right now (labels/colours: StatusChip kind="discount"). */
export const discountState = (d: Discount, now = Date.now()): DiscountState => {
  if (!d.isActive) return "off";
  if (d.startDate && new Date(d.startDate).getTime() > now) return "scheduled";
  if (d.endDate && new Date(d.endDate).getTime() < now) return "ended";
  return "on";
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
