/** What the report's KPI blocks show — one definition for the screen and for paper. */
import type React from "react";
import { AccessTimeRounded, PaymentsOutlined, ReceiptLongOutlined, ShoppingBasketOutlined } from "@mui/icons-material";
import { formatLbp, formatNumber, formatUsd, plural } from "@/utils/format";
import type { ReportKpis as Kpis } from "@/types/report.types";
import type { StatItem } from "./StatList";

export interface MainKpi {
  label: string;
  icon: React.ReactNode;
  value: number | undefined;
  previous: number | undefined;
  format: (v: number) => string;
  hint?: string;
}

const money = (v: number) => formatUsd(v);
const count = (v: number) => formatNumber(v);
const hours = (v: number) => `${formatNumber(v, v < 100 ? 1 : 0)} h`;

/** The four numbers that matter most — the same in every period, on screen and on paper. */
export const mainKpis = (k: Kpis | undefined): MainKpi[] => [
  { label: "Revenue", icon: <PaymentsOutlined />, value: k?.revenue.value, previous: k?.revenue.previous, format: money, hint: k && `≈ ${formatLbp(k.revenue.lbp.value)}` },
  {
    label: "Paid orders",
    icon: <ReceiptLongOutlined />,
    value: k?.orders.value,
    previous: k?.orders.previous,
    format: count,
    hint: k && (k.websiteOrders.value ? `${plural(k.websiteOrders.value, "website order")} placed` : "No website orders"),
  },
  { label: "Average order", icon: <ShoppingBasketOutlined />, value: k?.avgOrder.value, previous: k?.avgOrder.previous, format: money, hint: k && `Discounts given ${formatUsd(k.discounts.value)}` },
  { label: "Gaming time", icon: <AccessTimeRounded />, value: k?.gamingHours.value, previous: k?.gamingHours.previous, format: hours, hint: k && `${plural(k.sessions.value, "session")} started` },
];

/** Secondary numbers ("More numbers" on screen, the second KPI row on paper). */
export const moreNumbers = (k: Kpis | undefined): StatItem[] => [
  { label: "Gaming revenue", value: k?.gamingRevenue.value, previous: k?.gamingRevenue.previous, format: money },
  { label: "Product revenue", value: k?.productRevenue.value, previous: k?.productRevenue.previous, format: money, note: "Drinks, snacks and food" },
  { label: "Sessions started", value: k?.sessions.value, previous: k?.sessions.previous, format: count },
  { label: "Discounts given", value: k?.discounts.value, previous: k?.discounts.previous, format: money, goodDirection: "down" },
  { label: "New customers", value: k?.newCustomers.value, previous: k?.newCustomers.previous, format: count },
  { label: "Website orders", value: k?.websiteOrders.value, previous: k?.websiteOrders.previous, format: count, note: "Placed from the online menu" },
  { label: "Bookings", value: k?.reservations.value, previous: k?.reservations.previous, format: count },
  {
    label: "No-shows",
    value: k?.noShows.value,
    previous: k?.noShows.previous,
    format: count,
    goodDirection: "down",
    note: k && k.reservations.value ? `of ${plural(k.reservations.value, "booking")}` : undefined,
  },
];

