import type { AppliedDiscount, GamingLine, Money, Order, OrderLine } from "@/types/sale.types";

/**
 * Client-side mirror of the API's pricing rules, used ONLY to tick running sessions live between
 * refetches (the server stays the source of truth: every write returns its own totals).
 * - Station time: every started minute is billed (`ceil`), cost = hourly rate × minutes / 60.
 * - Line discount = % of the line subtotal; order discount = % of the total after line discounts.
 */

export const ZERO: Money = { usd: 0, lbp: 0 };

const roundUsd = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
export const roundMoney = (m: Money): Money => ({ usd: roundUsd(m.usd), lbp: Math.round(m.lbp) });
export const addMoney = (a: Money, b?: Money | null): Money => ({ usd: a.usd + (b?.usd ?? 0), lbp: a.lbp + (b?.lbp ?? 0) });
const subtract = (a: Money, b: Money): Money => ({ usd: a.usd - b.usd, lbp: a.lbp - b.lbp });
const clamp = (m: Money): Money => ({ usd: Math.max(0, m.usd), lbp: Math.max(0, m.lbp) });
export const percentOf = (m: Money, pct: number): Money => roundMoney({ usd: (m.usd * pct) / 100, lbp: (m.lbp * pct) / 100 });

const hasDiscount = (d?: Pick<AppliedDiscount, "percentage"> | null): d is AppliedDiscount => !!d && d.percentage > 0;

/** Billed minutes between two instants (every started minute counts). */
export const billableMinutes = (start: string | Date, end: Date | number = Date.now()): number =>
  Math.max(0, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 60_000));

export const costForMinutes = (rate: Money, minutes: number): Money =>
  roundMoney({ usd: (rate.usd * minutes) / 60, lbp: (rate.lbp * minutes) / 60 });

export interface LivePrice {
  subtotal: Money;
  discount: Money;
  final: Money;
  minutes: number;
}

/** A gaming line priced at `now` while running (or as stored once ended). */
export const liveGamingLine = (line: GamingLine, now: number = Date.now()): LivePrice => {
  const start = line.sessionData?.startTime;
  const rate = line.sessionData?.hourlyRate;
  if (!line.isActive || !start || !rate) {
    return { subtotal: line.subtotal, discount: line.discount?.amount ?? ZERO, final: line.finalAmount, minutes: line.durationMinutes };
  }
  const minutes = billableMinutes(start, now);
  const subtotal = costForMinutes(rate, minutes);
  const discount = hasDiscount(line.discount) ? percentOf(subtotal, line.discount.percentage) : ZERO;
  return { subtotal, discount, final: clamp(roundMoney(subtract(subtotal, discount))), minutes };
};

/** Any line priced at `now`. */
export const liveLine = (line: OrderLine, now?: number): LivePrice =>
  line.kind === "gaming"
    ? liveGamingLine(line, now)
    : { subtotal: line.subtotal, discount: line.discount?.amount ?? ZERO, final: line.finalAmount, minutes: 0 };

export interface LiveTotals {
  subtotal: Money;
  lineDiscounts: Money;
  orderDiscount: Money;
  total: Money;
}

/** Order totals at `now` (identical to the stored totals when nothing is running). */
export const liveOrderTotals = (order: Pick<Order, "items" | "saleDiscount" | "totals" | "subtotalBeforeDiscount" | "totalItemDiscounts">, now?: number): LiveTotals => {
  const running = order.items.some((l) => l.kind === "gaming" && l.isActive);
  if (!running) {
    return {
      subtotal: order.subtotalBeforeDiscount,
      lineDiscounts: order.totalItemDiscounts,
      orderDiscount: order.saleDiscount?.amount ?? ZERO,
      total: order.totals,
    };
  }
  const prices = order.items.map((l) => liveLine(l, now));
  const subtotal = roundMoney(prices.reduce((acc, p) => addMoney(acc, p.subtotal), ZERO));
  const lineDiscounts = roundMoney(prices.reduce((acc, p) => addMoney(acc, p.discount), ZERO));
  const afterLines = subtract(subtotal, lineDiscounts);
  const orderDiscount = hasDiscount(order.saleDiscount) ? percentOf(afterLines, order.saleDiscount.percentage) : ZERO;
  return { subtotal, lineDiscounts, orderDiscount, total: clamp(roundMoney(subtract(afterLines, orderDiscount))) };
};

/** Change to give back for `received` in `currency` against the order `due`, in both currencies. */
export const changeDue = (received: number | null, currency: "USD" | "LBP", due: Money, rate: number) => {
  if (received === null || !Number.isFinite(received)) return null;
  if (currency === "USD") {
    const usd = roundUsd(received - due.usd);
    return { usd, lbp: Math.round(usd * rate), short: usd < 0 };
  }
  const lbp = Math.round(received - due.lbp);
  return { usd: roundUsd(lbp / rate), lbp, short: lbp < 0 };
};
