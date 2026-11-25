/**
 * `GET /reports/summary?period=day|week|month|year&date=YYYY-MM-DD` (CONTRACT §4, "Changes from v1").
 * Money is USD unless a field says LBP. Ranges are half-open ISO instants in the lounge timezone.
 */
import type { StationType } from "./reservation.types";

export type ReportPeriod = "day" | "week" | "month" | "year";

/** "full" = the period is over; "to-date" = still running, so `previous` is cut to the same elapsed time. */
export type ReportComparison = "full" | "to-date";

export interface ReportRange {
  start: string;
  /** Exclusive. */
  end: string;
  /** "Tue 25 Nov 2026", "24–30 Nov 2026", "November 2026", "2026" */
  label: string;
}

export interface CountKpi {
  value: number;
  previous: number;
}

export interface MoneyKpi extends CountKpi {
  lbp: { value: number; previous: number };
}

export interface ReportKpis {
  revenue: MoneyKpi;
  orders: CountKpi;
  avgOrder: MoneyKpi;
  gamingRevenue: MoneyKpi;
  productRevenue: MoneyKpi;
  /** Station occupancy in hours (2 decimals). */
  gamingHours: CountKpi;
  sessions: CountKpi;
  discounts: MoneyKpi;
  newCustomers: CountKpi;
  websiteOrders: CountKpi;
  reservations: CountKpi;
  noShows: CountKpi;
}

/** One chart bucket: an hour (day), a day (week/month) or a month (year). */
export interface ReportSeriesPoint {
  /** "00"…"23" | "2026-11-24" | "2026-01" */
  key: string;
  /** "16:00" | "Mon 24" | "24" | "Jan" */
  label: string;
  revenue: number;
  gaming: number;
  products: number;
  orders: number;
}

export type PaymentMethodKey = "cash" | "card" | "bank_transfer" | "unknown";

export interface PaymentMethodRow {
  method: PaymentMethodKey | string;
  amount: number;
  amountLbp: number;
  count: number;
}

export interface CategoryRow {
  category: string;
  revenue: number;
  quantity: number;
}

export interface TopProductRow {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface StationRow {
  id: string;
  pcNumber: string;
  name: string;
  type: StationType;
  sessions: number;
  hours: number;
  revenue: number;
  /** 0–1; null when the lounge was closed for the whole range. */
  utilization: number | null;
}

export interface StationTypeTotals {
  sessions: number;
  hours: number;
  revenue: number;
}

export interface BusiestHourRow {
  hour: number;
  orders: number;
  revenue: number;
}

export interface CashierRow {
  id: string;
  name: string;
  orders: number;
  revenue: number;
}

export interface ReportSummary {
  period: ReportPeriod;
  timezone: string;
  comparison: ReportComparison;
  range: ReportRange;
  previous: ReportRange;
  /** Opening hours inside the range (from the booking schedule). */
  openHours: number;
  kpis: ReportKpis;
  series: ReportSeriesPoint[];
  byPaymentMethod: PaymentMethodRow[];
  byCategory: CategoryRow[];
  topProducts: TopProductRow[];
  stations: StationRow[];
  byStationType: { pc: StationTypeTotals; playstation: StationTypeTotals };
  busiestHours: BusiestHourRow[];
  cashiers: CashierRow[];
}
