import React, { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { Box, Portal, ThemeProvider, Typography, useTheme } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import getTheme from "@/theme/theme";
import { useChartDefaults } from "@/theme/charts";
import { fonts } from "@/theme/tokens";
import { formatDateTime, formatRatio, formatUsd } from "@/utils/format";
import type { ReportPeriod, ReportSummary, StationRow } from "@/types/report.types";
import { ChangeText } from "./StatList";
import { mainKpis, moreNumbers } from "./reportKpiItems";
import PrintTable from "./PrintTable";
import { HourHeatGrid, HourHeatLegend } from "./BusiestHoursStrip";
import { cashierColumns, categoryColumns, paymentColumns, pickColumns, stationColumns, timelineColumns, topProductColumns, type RankedProduct } from "./reportColumns";
import { PERIODS, SECTION_COPY, bucketTick, type ReportSectionId } from "./reportPeriods";
import { averageBusy, busiestHoursSubtitle, busyScaleMax, isEmptyReport, reportHighlights, startedBuckets, stationTypeSummary, stationsSubtitle, timelineRows } from "./reportInsights";

/** A4 portrait minus 12 mm margins = 186 mm ≈ 700 CSS px: the chart is drawn at that width. */
const PAPER_WIDTH_PX = 700;
const SMALL = "9.5pt";
/** Tables up to this many rows move to the next page whole instead of leaving a row or two behind. */
const KEEP_TOGETHER_ROWS = 16;

export interface ReportPrintViewProps {
  data: ReportSummary;
  period: ReportPeriod;
  today: string;
  /** "vs last week so far" */
  previousLabel: string;
  /** One sentence on what the changes are compared with. */
  comparisonNote: string;
}

/** The time printed in the header: refreshed the moment the browser starts printing. */
function usePrintedAt() {
  const [at, setAt] = useState(() => new Date());
  useEffect(() => {
    const update = () => flushSync(() => setAt(new Date()));
    window.addEventListener("beforeprint", update);
    return () => window.removeEventListener("beforeprint", update);
  }, []);
  return at;
}

/** CSS strings in @page margin boxes can't contain quotes or backslashes. */
const cssText = (s: string) => s.replace(/["\\]/g, "");

/**
 * Paper rules: only the printed report goes on paper (the app and its pop-ups are hidden), A4
 * portrait, and a footer with the report name and page numbers.
 */
const PaperStyles: React.FC<{ footer: string }> = ({ footer }) => {
  const t = useTheme().tokens;
  const font = `font: 9pt ${fonts.sans}; color: ${t.textMuted};`;
  return (
    <style>{`
@page {
  size: A4 portrait;
  margin: 10mm 12mm 14mm;
  @bottom-left { content: "${cssText(footer)}"; ${font} }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); ${font} }
}
@media print {
  :root { color-scheme: light !important; scrollbar-gutter: auto !important; }
  html, body { background: ${t.surface} !important; height: auto !important; overflow: visible !important; }
  body > :not(.report-paper) { display: none !important; }
  .report-paper { display: block !important; }
  .report-paper, .report-paper * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`}</style>
  );
};

const Section: React.FC<{ title: string; subtitle?: string; aside?: React.ReactNode; breakable?: boolean; children: React.ReactNode }> = ({
  title,
  subtitle,
  aside,
  breakable,
  children,
}) => (
  <Box component="section" sx={{ breakInside: breakable ? "auto" : "avoid", minWidth: 0 }}>
    <Box sx={{ display: "flex", alignItems: "baseline", gap: 2, mb: 0.5, breakAfter: "avoid" }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography component="h2" sx={{ fontSize: "11.5pt", fontWeight: 600, lineHeight: 1.3 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ fontSize: SMALL, lineHeight: 1.35 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {aside}
    </Box>
    {children}
  </Box>
);

const Legend: React.FC<{ items: { label: string; color: string; value?: string }[] }> = ({ items }) => (
  <Box sx={{ display: "flex", gap: 2, fontSize: SMALL, whiteSpace: "nowrap" }}>
    {items.map((i) => (
      <Box key={i.label} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: i.color }} />
        <span>{i.label}</span>
        {i.value && <Box component="strong" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{i.value}</Box>}
      </Box>
    ))}
  </Box>
);

/** A "Busy" cell with a small bar in the station-type colour (replaces the screen's bar chart; same scale). */
const BusyCell: React.FC<{ row: StationRow; color: string; max: number }> = ({ row, color, max }) => (
  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, justifyContent: "flex-end" }}>
    <Box sx={{ width: 64, height: 8, borderRadius: "2px", bgcolor: "action.hover", overflow: "hidden" }} aria-hidden>
      <Box sx={{ width: `${max > 0 ? Math.min(100, ((row.utilization ?? 0) / max) * 100) : 0}%`, height: "100%", bgcolor: color }} />
    </Box>
    <Box component="span" sx={{ minWidth: 34, textAlign: "right" }}>
      {formatRatio(row.utilization)}
    </Box>
  </Box>
);

/** The printed report, always in the light theme. Rendered off screen and shown only on paper. */
const ReportPaper: React.FC<ReportPrintViewProps> = ({ data, period, today, previousLabel, comparisonNote }) => {
  const chart = useChartDefaults();
  const printedAt = usePrintedAt();
  const config = PERIODS[period];
  const k = data.kpis;
  const title = `${config.label} report · ${data.range.label}`;
  const empty = isEmptyReport(data);
  const series = data.series;
  const ticks = series.map((p) => bucketTick(period, p));
  const highlights = reportHighlights(data, today);
  const stations = [...data.stations].sort((a, b) => b.revenue - a.revenue);
  const busyMax = busyScaleMax(stations);
  const typeColor = (r: StationRow) => (r.type === "playstation" ? chart.colors.playstation : chart.colors.pc);
  const timeline = timelineRows(period, startedBuckets(data, today));
  const ranked: RankedProduct[] = data.topProducts.map((r, i) => ({ ...r, rank: i + 1 }));

  const sections: Record<ReportSectionId, React.ReactNode> = {
    payments: (
      <Section {...SECTION_COPY.payments}>
        <PrintTable label="Revenue by payment method" rows={data.byPaymentMethod} columns={pickColumns(paymentColumns(k.revenue.value), ["method", "count", "amount", "share"])} emptyText="No payments in this period." />
      </Section>
    ),
    categories: (
      <Section {...SECTION_COPY.categories}>
        <PrintTable label="Product revenue by category" rows={data.byCategory} columns={categoryColumns(k.productRevenue.value)} emptyText="No products sold in this period." />
      </Section>
    ),
    topProducts: (
      <Section {...SECTION_COPY.topProducts}>
        <PrintTable label="Top products" rows={ranked} columns={topProductColumns(k.productRevenue.value)} emptyText="No products sold in this period." />
      </Section>
    ),
    cashiers: (
      <Section {...SECTION_COPY.cashiers}>
        <PrintTable label="Revenue by staff member" rows={[...data.cashiers].sort((a, b) => b.revenue - a.revenue)} columns={cashierColumns} emptyText="No payments taken in this period." />
      </Section>
    ),
    busiestHours: (
      <Section title={SECTION_COPY.busiestHours.title} subtitle={busiestHoursSubtitle(data.busiestHours)} aside={<HourHeatLegend variant="paper" />}>
        <HourHeatGrid rows={data.busiestHours} variant="paper" />
      </Section>
    ),
    stations: (
      <Section title={SECTION_COPY.stations.title} subtitle={stationsSubtitle(data.openHours)} breakable={stations.length > KEEP_TOGETHER_ROWS}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8mm", mb: 1, fontSize: "10pt", fontVariantNumeric: "tabular-nums" }}>
          {(["pc", "playstation"] as const).map((type) => (
            <Box key={type}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: type === "pc" ? chart.colors.pc : chart.colors.playstation }} />
                <Box component="strong" sx={{ fontWeight: 600 }}>
                  {type === "pc" ? "PCs" : "PS5 rooms"} · {formatUsd(data.byStationType[type].revenue)}
                </Box>
              </Box>
              <Box sx={{ color: "text.secondary", fontSize: SMALL, pl: "16px" }}>{stationTypeSummary(data.byStationType[type], averageBusy(data.stations, type))}</Box>
            </Box>
          ))}
        </Box>
        <PrintTable
          label="Stations"
          rows={stations}
          columns={pickColumns(stationColumns, ["pcNumber", "type", "sessions", "hours", "revenue", "utilization"]).map((c) =>
            c.field === "utilization" ? { ...c, render: (r: StationRow) => <BusyCell row={r} color={typeColor(r)} max={busyMax} /> } : c
          )}
          emptyText="No stations yet."
        />
      </Section>
    ),
    timeline: (
      <Section
        title={config.timelineTitle}
        subtitle={config.timelineRanked ? "Months ranked by revenue" : period === "day" ? "Hours with paid orders" : undefined}
        breakable={timeline.length > KEEP_TOGETHER_ROWS}
      >
        <PrintTable
          label={config.timelineTitle}
          rows={config.timelineRanked ? [...timeline].sort((a, b) => b.revenue - a.revenue) : timeline}
          columns={timelineColumns(period)}
          emptyText="Nothing was paid in this period."
        />
      </Section>
    ),
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "4.5mm" }}>
      <PaperStyles footer={`Epic Lounge · ${title}`} />

      <Box component="header" sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, pb: 1, borderBottom: 2, borderColor: "text.primary" }}>
        <Box component="img" src="/logo-96.webp" alt="" sx={{ width: 36, height: 36, borderRadius: "8px", mt: 0.25 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h1" sx={{ fontSize: "16pt", fontWeight: 600, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
            Epic Lounge — {title}
          </Typography>
          <Typography sx={{ fontSize: SMALL, color: "text.secondary", lineHeight: 1.4 }}>{comparisonNote}</Typography>
        </Box>
        <Box sx={{ textAlign: "right", fontSize: SMALL, color: "text.secondary", lineHeight: 1.4, whiteSpace: "nowrap" }}>
          Printed
          <br />
          {formatDateTime(printedAt)}
        </Box>
      </Box>

      <Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", border: 1, borderColor: "divider", borderRadius: "8px" }}>
          {mainKpis(k).map((kpi, i) => (
            <Box key={kpi.label} sx={{ px: 1.5, py: 1, borderLeft: i ? 1 : 0, borderColor: "divider", minWidth: 0 }}>
              <Typography sx={{ fontSize: SMALL, fontWeight: 500, color: "text.secondary" }}>{kpi.label}</Typography>
              <Typography sx={{ fontSize: "15pt", fontWeight: 600, lineHeight: 1.25, fontVariantNumeric: "tabular-nums" }}>{kpi.value === undefined ? "—" : kpi.format(kpi.value)}</Typography>
              {kpi.value !== undefined && kpi.previous !== undefined && (
                <Box sx={{ display: "flex", gap: 0.75, alignItems: "baseline", flexWrap: "wrap", fontSize: SMALL }}>
                  <ChangeText value={kpi.value} previous={kpi.previous} format={kpi.format} previousLabel={previousLabel} />
                  <Box component="span" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                    vs {kpi.format(kpi.previous)}
                  </Box>
                </Box>
              )}
              {kpi.hint && <Typography sx={{ fontSize: SMALL, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>{kpi.hint}</Typography>}
            </Box>
          ))}
        </Box>
        <Box component="dl" sx={{ m: 0, mt: 1, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", columnGap: 2, rowGap: 0.25 }}>
          {moreNumbers(k).map((item) => (
            <Box key={item.label} sx={{ px: 1.5, py: 0.25, minWidth: 0 }}>
              <Typography component="dt" sx={{ fontSize: SMALL, color: "text.secondary" }} noWrap>
                {item.label}
              </Typography>
              <Box component="dd" sx={{ m: 0, display: "flex", alignItems: "baseline", gap: 0.75, whiteSpace: "nowrap" }}>
                <Box component="span" sx={{ fontSize: "11pt", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {typeof item.value === "number" ? item.format(item.value) : "—"}
                </Box>
                {typeof item.value === "number" && typeof item.previous === "number" && (
                  <ChangeText value={item.value} previous={item.previous} format={item.format} goodDirection={item.goodDirection} previousLabel={previousLabel} />
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {empty ? (
        <Typography sx={{ fontSize: "11pt" }}>Nothing was paid and no station was used in this period.</Typography>
      ) : (
        <>
          <Section
            title={`Revenue by ${config.bucketNoun}`}
            subtitle="Money counted when the order was paid"
            aside={
              <Legend
                items={[
                  { label: "Gaming", color: chart.colors.pc, value: formatUsd(k.gamingRevenue.value) },
                  { label: "Products", color: chart.colors.products, value: formatUsd(k.productRevenue.value) },
                ]}
              />
            }
          >
            <BarChart
              {...chart.bar}
              skipAnimation
              width={PAPER_WIDTH_PX}
              height={168}
              margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
              xAxis={[{ scaleType: "band", data: ticks, categoryGapRatio: period === "week" ? 0.5 : 0.3, height: 24, tickLabelStyle: { fontSize: 11 } }]}
              yAxis={[{ valueFormatter: chart.moneyTick, width: 52, tickLabelStyle: { fontSize: 11 } }]}
              series={[
                { id: "gaming", data: series.map((p) => p.gaming), label: "Gaming", stack: "revenue", color: chart.colors.pc },
                { id: "products", data: series.map((p) => p.products), label: "Products", stack: "revenue", color: chart.colors.products },
              ]}
            />
            <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${highlights.length}, minmax(0, 1fr))`, gap: 2, mt: 0.75, pt: 0.75, borderTop: 1, borderColor: "divider" }}>
              {highlights.map((h) => (
                <Box key={h.label} sx={{ minWidth: 0, fontSize: "10pt", fontVariantNumeric: "tabular-nums" }}>
                  <Box sx={{ color: "text.secondary", fontSize: SMALL }}>{h.label}</Box>
                  <Box sx={{ fontWeight: 600 }}>{h.value}</Box>
                  {h.detail && <Box sx={{ color: "text.secondary", fontSize: SMALL }}>{h.detail}</Box>}
                </Box>
              ))}
            </Box>
          </Section>

          {config.layout.map((row) =>
            row.length > 1 ? (
              <Box key={row.join("-")} sx={{ display: "grid", gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))`, gap: "8mm", breakInside: "avoid" }}>
                {row.map((id) => (
                  <React.Fragment key={id}>{sections[id]}</React.Fragment>
                ))}
              </Box>
            ) : (
              <React.Fragment key={row[0]}>{sections[row[0]]}</React.Fragment>
            )
          )}
        </>
      )}
    </Box>
  );
};

/**
 * Print support without html2pdf: the report is laid out again for A4 paper (KPI grid, the main
 * chart, compact tables, sensible page breaks) in a light-theme copy that only paper shows.
 * Ctrl+P works too — nothing has to happen in JavaScript before the browser prints.
 */
const ReportPrintView: React.FC<ReportPrintViewProps> = (props) => {
  const light = useMemo(() => getTheme("light"), []);
  return (
    <Portal>
      <ThemeProvider theme={light}>
        <Box
          className="report-paper"
          sx={{ display: "none", bgcolor: "background.paper", color: "text.primary", fontFamily: fonts.sans, fontSize: "10.5pt", "& h1, & h2": { m: 0 } }}
        >
          <ReportPaper {...props} />
        </Box>
      </ThemeProvider>
    </Portal>
  );
};

export default React.memo(ReportPrintView);
