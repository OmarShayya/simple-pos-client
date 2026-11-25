import type { StationType } from "./reservation.types";

/**
 * Orders (= sales). One order can hold counter products, gaming station time and website items.
 * Shapes follow the backend contract (CONTRACT.md, "Changes from v1" §3).
 */

export enum SaleStatus {
  PENDING = "pending",
  PAID = "paid",
  CANCELLED = "cancelled",
}

export enum PaymentMethod {
  CASH = "cash",
  CARD = "card",
  BANK_TRANSFER = "bank_transfer",
}

export enum Currency {
  USD = "USD",
  LBP = "LBP",
}

/** Where the order was placed: the counter (POS) or the website menu. */
export type OrderSource = "pos" | "website";

/** Filter values of `GET /sales?type=` (comma lists allowed). */
export type OrderLineMix = "gaming" | "products" | "mixed";

export interface Money {
  usd: number;
  lbp: number;
}

export interface AppliedDiscount {
  discountId: string;
  discountName: string;
  /** Percent off (10 = 10%). */
  percentage: number;
  amount: Money;
}

export interface PersonRef {
  id: string;
  name: string;
}

export interface OrderCustomer {
  id: string;
  name: string;
  /** E.164 */
  phone: string;
}

interface OrderLineBase {
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: Money;
  discount?: AppliedDiscount;
  subtotal: Money;
  finalAmount: Money;
}

export interface ProductLine extends OrderLineBase {
  kind: "product";
  productId: string;
  product?: string | null;
}

export interface GamingLine extends OrderLineBase {
  kind: "gaming";
  productId: null;
  product?: null;
  gamingSession: string | null;
  station: { id: string; pcNumber: string; name: string; type: StationType } | null;
  /** Final minutes once ended; minutes so far while running. */
  durationMinutes: number;
  /** True while the station time is still running. */
  isActive: boolean;
  /** Session details (start time + hourly rate are used for the live clock). */
  sessionData?: {
    sessionId: string;
    sessionNumber: string;
    pcNumber?: string;
    pcName?: string;
    hourlyRate: Money;
    startTime: string;
    endTime?: string;
    status: string;
  };
}

export type OrderLine = ProductLine | GamingLine;

/** A row of `GET /sales` (also used by customer activity and `/sales/today`). */
export interface OrderRow {
  id: string;
  invoiceNumber: string;
  source: OrderSource;
  status: SaleStatus;
  customer: OrderCustomer | null;
  /** Snapshot of the name (customer, or the name typed when starting a session). */
  customerName: string | null;
  /** Staff member who created the order (null for website orders). */
  cashier: PersonRef | null;
  /** Staff member who took the payment. */
  paidBy: PersonRef | null;
  hasGaming: boolean;
  hasActiveSessions: boolean;
  itemCount: number;
  subtotalBeforeDiscount: Money;
  totalItemDiscounts: Money;
  saleDiscount?: AppliedDiscount;
  discountTotal: Money;
  /** Live: running sessions are priced at "now". */
  totals: Money;
  paymentMethod?: PaymentMethod;
  paymentCurrency?: Currency;
  createdAt: string;
  paidAt?: string;
}

/** Full order (`GET /sales/:id`) — the order screen, invoice and receipt. */
export interface Order extends Omit<OrderRow, "cashier"> {
  cashier: (PersonRef & { email?: string }) | null;
  items: OrderLine[];
  activeSessions: { sessionId: string; sessionNumber: string; currentDuration: number; currentCost: Money }[];
  amountPaid: Money;
  notes?: string;
  updatedAt: string;
}

/** @deprecated Use `Order` / `OrderRow`. Kept for older imports. */
export type Sale = Order;

/** A type alias (not an interface) so it can be used as a React Query key object. */
export type OrderListFilters = {
  /** One status or several. */
  status?: SaleStatus | SaleStatus[];
  source?: OrderSource;
  type?: OrderLineMix | OrderLineMix[];
  search?: string;
  /** "YYYY-MM-DD" (lounge timezone), inclusive. */
  from?: string;
  to?: string;
  customerId?: string;
  cashierId?: string;
  page?: number;
  limit?: number;
};

export interface OrderItemInput {
  productId: string;
  quantity: number;
  discountId?: string;
}

export interface CreateSaleRequest {
  customerId?: string;
  items: OrderItemInput[];
  /** "" removes the order discount. */
  saleDiscountId?: string;
  notes?: string;
}

export interface UpdateSaleRequest {
  /** "" detaches the customer. */
  customerId?: string;
  /** Replaces the PRODUCT lines only; gaming lines stay. */
  items?: OrderItemInput[];
  saleDiscountId?: string;
  /** Discount on a gaming line; omit `discountId` to remove it. */
  sessionDiscounts?: { gamingSessionId: string; discountId?: string }[];
  notes?: string;
}

export interface PaySaleRequest {
  paymentMethod: PaymentMethod;
  paymentCurrency: Currency;
  amount: number;
}

/** Response of `POST /sales/:id/pay`. */
export type PaidOrder = Pick<Order, "id" | "invoiceNumber" | "status" | "totals" | "paymentMethod" | "paymentCurrency" | "amountPaid" | "paidAt">;

export interface OrderCounts {
  open: number;
  websiteOpen: number;
  reservationsAttention?: number;
}

/** Payload of the `order:new` socket event (website orders). */
export interface NewOrderEvent {
  id: string;
  invoiceNumber: string;
  source: OrderSource;
  customerName: string | null;
  totals: Money;
  itemCount: number;
  createdAt: string;
}
