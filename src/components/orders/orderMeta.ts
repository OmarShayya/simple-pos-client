import { PaymentMethod, type OrderListFilters, type OrderRow } from "@/types/sale.types";

/** What kind of order this is, in staff words. */
export type OrderKind = "counter" | "gaming" | "website";

export const ORDER_KIND_LABEL: Record<OrderKind, string> = {
  counter: "Counter",
  gaming: "Gaming",
  website: "Website",
};

export const orderKind = (o: Pick<OrderRow, "source" | "hasGaming">): OrderKind =>
  o.source === "website" ? "website" : o.hasGaming ? "gaming" : "counter";

/** API filters for an order kind (gaming = any order with station time, drinks or not). */
export const kindFilter = (kind: OrderKind | "all"): Pick<OrderListFilters, "source" | "type"> => {
  switch (kind) {
    case "counter":
      return { source: "pos", type: "products" };
    case "gaming":
      return { type: ["gaming", "mixed"] };
    case "website":
      return { source: "website" };
    default:
      return {};
  }
};

export const isOrderKind = (v: string | null): v is OrderKind => v === "counter" || v === "gaming" || v === "website";

/** "Ali Haidar", the name typed at the station, or "Walk-in". */
export const customerLabel = (o: Pick<OrderRow, "customer" | "customerName">): string =>
  o.customer?.name || o.customerName || "Walk-in";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Cash",
  [PaymentMethod.CARD]: "Card",
  [PaymentMethod.BANK_TRANSFER]: "Bank transfer",
};

export const paymentMethodLabel = (m?: string | null) => (m ? PAYMENT_METHOD_LABEL[m as PaymentMethod] ?? m : "—");

/** Website orders younger than this are flagged "New". */
export const NEW_WEBSITE_ORDER_MS = 15 * 60_000;

/* ---------------------------------------------------------------- links (shared with other screens) */

/** Orders page with the order's detail open. */
export const orderUrl = (id: string, opts: { pay?: boolean } = {}) =>
  `/orders?order=${encodeURIComponent(id)}${opts.pay ? "&pay=1" : ""}`;

/** POS screen with an open order loaded (to add drinks / products). */
export const posOrderUrl = (id: string) => `/sales?order=${encodeURIComponent(id)}`;
