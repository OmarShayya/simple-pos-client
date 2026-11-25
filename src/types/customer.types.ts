import type { StationType } from "./reservation.types";

/** Channel through which the lounge first met the customer. */
export type CustomerSource = "pos" | "website" | "reservation";

/** Address as the API stores it (CONTRACT §2). `country` is ISO-2 ("LB"). */
export interface CustomerAddress {
  country?: string;
  city?: string;
  area?: string;
  street?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  /** E.164 ("+96170123456"); legacy unparseable numbers come back as stored. */
  phone: string;
  /** ISO-2 country of the phone ("LB"). */
  phoneCountry?: string;
  /** National digits, to prefill a "country + number" field. */
  phoneNational?: string;
  source?: CustomerSource;
  address?: CustomerAddress;
  balance: {
    usd: number;
    lbp: number;
  };
  totalPurchases: number;
  lastPurchaseDate?: string;
  notes?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateCustomerRequest {
  name: string;
  email?: string;
  /** E.164 or a national number (+ `phoneCountry`). */
  phone: string;
  phoneCountry?: string;
  address?: CustomerAddress;
  notes?: string;
}

export type CustomerSortField = "name" | "lastPurchaseDate" | "totalPurchases" | "createdAt";

export interface CustomerFilters {
  page?: number;
  limit?: number;
  /** Name, email or phone digits in any format. */
  search?: string;
  hasBalance?: boolean;
  source?: CustomerSource[];
  /** Lounge-local days ("YYYY-MM-DD"), inclusive, over the last paid visit. */
  lastVisitFrom?: string;
  lastVisitTo?: string;
  sort?: CustomerSortField;
  order?: "asc" | "desc";
}

/** Order row as returned in a customer's activity (same shape as `GET /sales` rows). */
export interface CustomerOrderRow {
  id: string;
  invoiceNumber: string;
  source: "pos" | "website";
  status: "pending" | "paid" | "cancelled";
  hasGaming: boolean;
  hasActiveSessions?: boolean;
  itemCount: number;
  totals: { usd: number; lbp: number };
  createdAt: string;
  paidAt?: string;
}

export interface CustomerReservationRow {
  id: string;
  code: string;
  type: StationType;
  status: "confirmed" | "checked_in" | "cancelled" | "no_show";
  source: "website" | "pos";
  startTime: string;
  endTime: string;
  durationMinutes: number;
  /** Station numbers ("PC-01"). */
  stations: string[];
  estimatedCost?: { usd: number; lbp: number };
}

export interface CustomerSessionRow {
  id: string;
  sessionNumber: string;
  station: { pcNumber: string; name: string; type: StationType } | null;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  status: "active" | "completed" | "cancelled";
  paymentStatus: "unpaid" | "paid" | "partial";
  amount?: { usd: number; lbp: number };
  orderId: string | null;
}

export interface CustomerActivity {
  orders: CustomerOrderRow[];
  reservations: CustomerReservationRow[];
  sessions: CustomerSessionRow[];
  totals: {
    spentUsd: number;
    /** Distinct lounge-local days with a paid order or a session. */
    visits: number;
    lastVisit: string | null;
    /** Paid orders. */
    orders: number;
    /** Non-cancelled bookings. */
    reservations: number;
  };
}
