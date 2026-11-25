/** "Download CSV": the whole report in one spreadsheet-friendly file, one block per section. */
import { buildCsv, downloadCsv } from "@/components/ui/dataTableUtils";
import type { DataTableColumn } from "@/components/ui";
import { formatNumber, percentChange } from "@/utils/format";
import type { ReportKpis, ReportSummary } from "@/types/report.types";
import { PERIODS } from "./reportPeriods";
import { cashierColumns, categoryColumns, paymentColumns, stationColumns, timelineColumns, topProductColumns } from "./reportColumns";

interface KpiLine {
  metric: string;
  value: number;
  previous: number;
}

const KPI_LINES: [keyof ReportKpis, string][] = [
  ["revenue", "Revenue (USD)"],
  ["orders", "Paid orders"],
  ["avgOrder", "Average order (USD)"],
  ["gamingRevenue", "Gaming revenue (USD)"],
  ["productRevenue", "Product revenue (USD)"],
  ["gamingHours", "Gaming time (hours)"],
  ["sessions", "Sessions started"],
  ["discounts", "Discounts given (USD)"],
  ["newCustomers", "New customers"],
  ["websiteOrders", "Website orders placed"],
  ["reservations", "Bookings"],
  ["noShows", "No-shows"],
];

const kpiColumns: DataTableColumn<KpiLine>[] = [
  { field: "metric", header: "Metric" },
  { field: "value", header: "This period", type: "number", csv: (r) => r.value },
  { field: "previous", header: "Previous period", type: "number", csv: (r) => r.previous },
  { field: "change", header: "Change", csv: (r) => {
    const pct = percentChange(r.value, r.previous);
    return pct === null ? "" : `${pct > 0 ? "+" : ""}${formatNumber(pct, 1)}%`;
  } },
];

const block = (title: string, csv: string) => `${title}\r\n${csv}`;
const line = (...cells: string[]) => cells.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",");

export const reportFileName = (data: Pick<ReportSummary, "period">, date: string) => `epic-lounge-${data.period}-${date}`;

export const downloadReportCsv = (data: ReportSummary, date: string) => {
  const config = PERIODS[data.period];
  const k = data.kpis;
  const ranked = data.topProducts.map((p, i) => ({ ...p, rank: i + 1 }));
  const parts = [
    line("Epic Lounge report", `${config.label}: ${data.range.label}`),
    line("Compared with", `${data.previous.label}${data.comparison === "to-date" ? " (same point in the period)" : ""}`),
    line("Timezone", data.timezone),
    "",
    block("Summary", buildCsv(kpiColumns, KPI_LINES.map(([key, metric]) => ({ metric, value: k[key].value, previous: k[key].previous })))),
    "",
    block(config.timelineTitle, buildCsv(timelineColumns(data.period), data.series)),
    "",
    block("Payment methods", buildCsv(paymentColumns(k.revenue.value), data.byPaymentMethod)),
    "",
    block("Product sales by category", buildCsv(categoryColumns(k.productRevenue.value), data.byCategory)),
    "",
    block("Top products", buildCsv(topProductColumns(k.productRevenue.value), ranked)),
    "",
    block("Stations", buildCsv(stationColumns, data.stations)),
    "",
    block("Staff", buildCsv(cashierColumns, data.cashiers)),
  ];
  downloadCsv(reportFileName(data, date), parts.join("\r\n"));
};
