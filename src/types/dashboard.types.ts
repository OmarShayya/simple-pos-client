/**
 * `GET /dashboard/overview` (CONTRACT §5, "Changes from v1"). Any signed-in staff member.
 * For cashiers (`canViewRevenue: false`) money KPIs are null, `hourly` is empty and top-product
 * revenue is null; order totals and running-session costs stay visible (needed to charge).
 */
import type { StationType } from "./reservation.types";

export interface Amount {
  usd: number;
  lbp: number;
}

/** Today vs yesterday up to the same time of day. `null` = hidden for this role. */
export interface TodayKpi {
  value: number | null;
  previous: number | null;
}

export interface StationCounts {
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
  reserved: number;
}

export interface ActiveSessionRow {
  id: string;
  sessionNumber: string;
  station: { id: string; pcNumber: string; name: string; type: StationType } | null;
  customerName: string | null;
  startTime: string;
  elapsedMinutes: number;
  currentCost: Amount;
  orderId: string | null;
}

export interface OpenOrderRow {
  id: string;
  invoiceNumber: string;
  source: "pos" | "website";
  customerName: string | null;
  totals: Amount;
  createdAt: string;
  hasGaming: boolean;
  hasActiveSessions: boolean;
}

export interface UpcomingReservationRow {
  id: string;
  code: string;
  type: StationType;
  customerName: string;
  startTime: string;
  endTime: string;
  stations: string[];
  status: string;
}

export interface LowStockRow {
  id: string;
  name: string;
  stock: number;
  threshold: number;
}

export interface TopProductTodayRow {
  name: string;
  quantity: number;
  revenue: number | null;
}

export interface DashboardOverview {
  canViewRevenue: boolean;
  timezone: string;
  generatedAt: string;
  today: {
    revenue: TodayKpi;
    orders: TodayKpi;
    avgOrder: TodayKpi;
    gamingRevenue: TodayKpi;
    productRevenue: TodayKpi;
    sessions: TodayKpi;
    newCustomers: TodayKpi;
  };
  /** 24 entries (lounge hours); empty for cashiers. Yesterday = the full day. */
  hourly: { hour: number; today: number; yesterday: number }[];
  stations: { pc: StationCounts; playstation: StationCounts };
  activeSessions: ActiveSessionRow[];
  openOrders: OpenOrderRow[];
  upcomingReservations: UpcomingReservationRow[];
  lowStock: LowStockRow[];
  topProductsToday: TopProductTodayRow[];
}
