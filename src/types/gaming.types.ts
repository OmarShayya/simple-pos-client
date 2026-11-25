import type { StationType, UpcomingReservation } from "./reservation.types";
import type { Money, OrderCustomer, SaleStatus } from "./sale.types";

export enum PCStatus {
  AVAILABLE = "available",
  OCCUPIED = "occupied",
  MAINTENANCE = "maintenance",
  RESERVED = "reserved",
}

export enum SessionStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum SessionPaymentStatus {
  UNPAID = "unpaid",
  PAID = "paid",
  PARTIAL = "partial",
}

/** A gaming station (PC or PlayStation room). The API still calls them "pcs". */
export interface PC {
  id: string;
  /** "pc" (default) or "playstation" */
  type?: StationType;
  pcNumber: string;
  name: string;
  status: PCStatus;
  hourlyRate: Money;
  specifications?: {
    cpu?: string;
    gpu?: string;
    ram?: string;
    monitor?: string;
  };
  location?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  /** Next booking on this station within ~12h (from the reservations system). */
  upcomingReservation?: UpcomingReservation;
}

/** The order a session bills to (every session has one). */
export interface SessionOrderRef {
  id: string;
  invoiceNumber?: string;
  status?: SaleStatus;
  totals?: Money;
}

/** `GET /gaming/sessions/active` row. */
export interface ActiveSession {
  id: string;
  sessionNumber: string;
  pc: { id: string; pcNumber: string; name: string; status?: PCStatus };
  customer: OrderCustomer | null;
  customerName: string;
  startTime: string;
  /** Billed minutes so far (every started minute counts). */
  currentDuration: number;
  currentCost: Money;
  hourlyRate: Money;
  orderId: string | null;
  startedBy: { name: string };
}

/** Response of start / end session. */
export interface GamingSession {
  id: string;
  sessionNumber: string;
  pc: { id: string; pcNumber: string; name: string };
  customer: OrderCustomer | null;
  customerName: string;
  startTime: string;
  endTime?: string;
  /** Minutes (after the session ended). */
  duration?: number;
  hourlyRate?: Money;
  totalCost?: Money;
  discount?: { discountId: string; discountName: string; percentage: number; amount: Money };
  finalAmount?: Money;
  status: SessionStatus;
  paymentStatus?: SessionPaymentStatus;
  orderId: string | null;
  sale: SessionOrderRef | null;
}

export interface StartSessionRequest {
  pcId: string;
  /** An existing customer (wins over the phone). */
  customerId?: string;
  /** Name typed by staff (or "Walk-in"). */
  customerName?: string;
  /** E.164 or national; links / creates the customer on the server. */
  customerPhone?: string;
  phoneCountry?: string;
  /** Attach to an existing open order instead of creating one. */
  saleId?: string;
  notes?: string;
}
