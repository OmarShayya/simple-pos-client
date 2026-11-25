/**
 * Column definitions for the report's breakdown tables. The same definitions drive the on-screen
 * DataTables and the "Download CSV" file, so both always show the same numbers. Report tables stay
 * tables on phones (`phoneLayout="table"`): extra columns drop below "md" so the rest fits 360px
 * without sideways scrolling — a 31-row "day by day" list reads better as rows than as 31 cards.
 */
import type { DataTableColumn } from "@/components/ui";
import { STATION_TYPE_LABEL } from "@/types/reservation.types";
import { formatNumber, formatRatio } from "@/utils/format";
import type { CashierRow, CategoryRow, PaymentMethodRow, ReportPeriod, ReportSeriesPoint, StationRow, TopProductRow } from "@/types/report.types";
import { bucketTitle } from "./reportPeriods";

export const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  bank_transfer: "Bank transfer",
  unknown: "Not recorded (older sessions)",
};
export const paymentLabel = (method: string) => PAYMENT_LABELS[method] ?? method;

/** Keep only these columns, in this order (paper is narrower than a desktop screen). */
export const pickColumns = <R,>(columns: DataTableColumn<R>[], fields: string[]): DataTableColumn<R>[] =>
  fields.map((f) => columns.find((c) => c.field === f)).filter((c): c is DataTableColumn<R> => Boolean(c));

const share = (value: number, total: number) => (total > 0 ? value / total : null);

export const paymentColumns = (total: number): DataTableColumn<PaymentMethodRow>[] => [
  { field: "method", header: "Payment method", value: (r) => paymentLabel(r.method) },
  { field: "count", header: "Orders", type: "number" },
  { field: "amount", header: "Revenue (USD)", type: "money" },
  { field: "amountLbp", header: "Revenue (LBP)", type: "money", currency: "LBP" },
  { field: "share", header: "Share", value: (r) => formatRatio(share(r.amount, total), 1), csv: (r) => formatRatio(share(r.amount, total), 1) },
];

export const categoryColumns = (total: number): DataTableColumn<CategoryRow>[] => [
  { field: "category", header: "Category" },
  { field: "quantity", header: "Items sold", type: "number" },
  { field: "revenue", header: "Revenue (USD)", type: "money" },
  { field: "share", header: "Share", value: (r) => formatRatio(share(r.revenue, total), 1) },
];

export type RankedProduct = TopProductRow & { rank: number };

export const topProductColumns = (total: number): DataTableColumn<RankedProduct>[] => [
  { field: "rank", header: "#", type: "number", width: 56, minWidth: 56, hideBelow: "md" },
  { field: "name", header: "Product", flex: 1.4, minWidth: 120 },
  { field: "quantity", header: "Sold", type: "number", width: 80, minWidth: 64 },
  { field: "revenue", header: "Revenue", type: "money", minWidth: 112 },
  { field: "share", header: "Share", value: (r) => formatRatio(share(r.revenue, total), 1), align: "right", width: 84, minWidth: 72, hideBelow: "md", sortable: false },
];

export const cashierColumns: DataTableColumn<CashierRow>[] = [
  { field: "name", header: "Staff member", flex: 1.4, minWidth: 120 },
  { field: "orders", header: "Orders", type: "number", width: 90, minWidth: 64 },
  { field: "revenue", header: "Revenue", type: "money", minWidth: 112 },
  { field: "avg", header: "Avg. order", type: "money", value: (r) => (r.orders ? r.revenue / r.orders : null), hideBelow: "md" },
];

export const stationColumns: DataTableColumn<StationRow>[] = [
  { field: "pcNumber", header: "Station", type: "code", width: 110, minWidth: 76 },
  { field: "type", header: "Type", value: (r) => STATION_TYPE_LABEL[r.type] ?? r.type, hideBelow: "md" },
  { field: "sessions", header: "Sessions", type: "number", hideBelow: "md" },
  { field: "hours", header: "Hours", type: "number", value: (r) => r.hours, render: (r) => formatNumber(r.hours, 1), minWidth: 72 },
  { field: "revenue", header: "Revenue", type: "money", minWidth: 112 },
  {
    field: "utilization",
    header: "Busy",
    value: (r) => r.utilization,
    render: (r) => formatRatio(r.utilization),
    csv: (r) => (r.utilization === null ? "" : formatRatio(r.utilization, 1)),
    align: "right",
    width: 90,
    minWidth: 64,
  },
];

export const timelineColumns = (period: ReportPeriod): DataTableColumn<ReportSeriesPoint>[] => [
  {
    field: "key",
    header: { day: "Hour", week: "Day", month: "Day", year: "Month" }[period],
    value: (p) => p.key,
    render: (p) => bucketTitle(period, p),
    csv: (p) => bucketTitle(period, p),
    flex: 1.2,
    minWidth: 120,
  },
  { field: "orders", header: "Orders", type: "number", minWidth: 72 },
  { field: "gaming", header: "Gaming", type: "money", hideBelow: "md" },
  { field: "products", header: "Products", type: "money", hideBelow: "md" },
  { field: "revenue", header: "Revenue", type: "money", minWidth: 112 },
  { field: "avg", header: "Average order", type: "money", value: (p) => (p.orders ? p.revenue / p.orders : null), hideBelow: "lg" },
];
