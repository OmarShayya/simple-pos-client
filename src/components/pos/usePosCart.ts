import { useReducer } from "react";
import type { Product } from "@/types/product.types";
import type { Discount } from "@/types/discount.types";
import type { GamingLine, Money, Order } from "@/types/sale.types";
import { choiceFromOrder, type CustomerChoice } from "@/components/orders/customerChoice";
import { addMoney, liveGamingLine, percentOf, roundMoney, ZERO, type LiveTotals } from "@/components/orders/orderMath";

export interface CartLine {
  productId: string;
  name: string;
  unitPrice: Money;
  quantity: number;
  discountId: string;
  /** Most that can be sold (stock + what this order already holds); null = no limit (services). */
  max: number | null;
}

export interface CartState {
  /** The open order being edited (null = a new sale). */
  orderId: string | null;
  invoiceNumber: string | null;
  /** Name typed when a session started (shown when the order has no customer record). */
  orderCustomerName: string | null;
  lines: CartLine[];
  /** Station time on the loaded order (read-only here; discount can change). */
  gaming: GamingLine[];
  /** sessionId → discountId ("" = none). */
  gamingDiscounts: Record<string, string>;
  saleDiscountId: string;
  customer: CustomerChoice | null;
  customerChanged: boolean;
}

type Action =
  | { type: "add"; product: Product }
  | { type: "qty"; productId: string; quantity: number }
  | { type: "lineDiscount"; productId: string; discountId: string }
  | { type: "gamingDiscount"; sessionId: string; discountId: string }
  | { type: "saleDiscount"; discountId: string }
  | { type: "customer"; customer: CustomerChoice | null }
  | { type: "load"; order: Order; stock: Record<string, number | null> }
  | { type: "reset" };

const EMPTY: CartState = {
  orderId: null,
  invoiceNumber: null,
  orderCustomerName: null,
  lines: [],
  gaming: [],
  gamingDiscounts: {},
  saleDiscountId: "",
  customer: null,
  customerChanged: false,
};

const isService = (p: Product) => (p.productType ?? "physical") === "service";
export const stockOf = (p: Product): number | null => (isService(p) ? null : p.inventory?.quantity ?? 0);

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "add": {
      const p = action.product;
      const existing = state.lines.find((l) => l.productId === p.id);
      if (existing) {
        if (existing.max !== null && existing.quantity >= existing.max) return state;
        return { ...state, lines: state.lines.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l)) };
      }
      const max = stockOf(p);
      if (max !== null && max <= 0) return state;
      return { ...state, lines: [...state.lines, { productId: p.id, name: p.name, unitPrice: { usd: p.pricing.usd, lbp: p.pricing.lbp }, quantity: 1, discountId: "", max }] };
    }
    case "qty":
      return {
        ...state,
        lines: action.quantity <= 0 ? state.lines.filter((l) => l.productId !== action.productId) : state.lines.map((l) => (l.productId === action.productId ? { ...l, quantity: l.max === null ? action.quantity : Math.min(action.quantity, l.max) } : l)),
      };
    case "lineDiscount":
      return { ...state, lines: state.lines.map((l) => (l.productId === action.productId ? { ...l, discountId: action.discountId } : l)) };
    case "gamingDiscount":
      return { ...state, gamingDiscounts: { ...state.gamingDiscounts, [action.sessionId]: action.discountId } };
    case "saleDiscount":
      return { ...state, saleDiscountId: action.discountId };
    case "customer":
      return { ...state, customer: action.customer, customerChanged: true };
    case "load": {
      const o = action.order;
      const gaming = o.items.filter((l): l is GamingLine => l.kind === "gaming");
      return {
        orderId: o.id,
        invoiceNumber: o.invoiceNumber,
        orderCustomerName: o.customer ? null : o.customerName,
        gaming,
        gamingDiscounts: Object.fromEntries(gaming.filter((g) => g.gamingSession).map((g) => [g.gamingSession!, g.discount?.discountId ?? ""])),
        lines: o.items.flatMap((l) => {
          if (l.kind !== "product") return [];
          const stock = action.stock[l.productId];
          // The order already holds its quantity, so it can go up to stock + that
          return [{ productId: l.productId, name: l.productName, unitPrice: l.unitPrice, quantity: l.quantity, discountId: l.discount?.discountId ?? "", max: stock === undefined || stock === null ? null : stock + l.quantity }];
        }),
        saleDiscountId: o.saleDiscount?.discountId ?? "",
        customer: choiceFromOrder(o.customer),
        customerChanged: false,
      };
    }
    case "reset":
      return EMPTY;
  }
}

export function usePosCart() {
  return useReducer(reducer, EMPTY);
}

export interface DiscountLookup {
  product: (productId: string) => Discount[];
  gaming: Discount[];
  sale: Discount[];
}

/** The cart's totals now, with the same rules as the API (line % first, then the order %). */
export function cartTotals(state: CartState, discounts: DiscountLookup, now: number): LiveTotals & { gamingFinal: Record<string, Money> } {
  let subtotal = ZERO;
  let lineDiscounts = ZERO;
  const gamingFinal: Record<string, Money> = {};
  for (const g of state.gaming) {
    const live = liveGamingLine({ ...g, discount: undefined }, now);
    const pct = discounts.gaming.find((d) => d.id === state.gamingDiscounts[g.gamingSession ?? ""])?.value ?? 0;
    const off = pct ? percentOf(live.subtotal, pct) : ZERO;
    subtotal = addMoney(subtotal, live.subtotal);
    lineDiscounts = addMoney(lineDiscounts, off);
    gamingFinal[g.gamingSession ?? ""] = roundMoney({ usd: live.subtotal.usd - off.usd, lbp: live.subtotal.lbp - off.lbp });
  }
  for (const l of state.lines) {
    const sub = { usd: l.unitPrice.usd * l.quantity, lbp: l.unitPrice.lbp * l.quantity };
    const pct = discounts.product(l.productId).find((d) => d.id === l.discountId)?.value ?? 0;
    subtotal = addMoney(subtotal, sub);
    if (pct) lineDiscounts = addMoney(lineDiscounts, percentOf(sub, pct));
  }
  subtotal = roundMoney(subtotal);
  lineDiscounts = roundMoney(lineDiscounts);
  const afterLines = { usd: subtotal.usd - lineDiscounts.usd, lbp: subtotal.lbp - lineDiscounts.lbp };
  const salePct = discounts.sale.find((d) => d.id === state.saleDiscountId)?.value ?? 0;
  const orderDiscount = salePct ? percentOf(afterLines, salePct) : ZERO;
  const total = roundMoney({ usd: Math.max(0, afterLines.usd - orderDiscount.usd), lbp: Math.max(0, afterLines.lbp - orderDiscount.lbp) });
  return { subtotal, lineDiscounts, orderDiscount, total, gamingFinal };
}
