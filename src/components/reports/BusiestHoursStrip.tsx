import React from "react";
import { Box, Skeleton, Tooltip, Typography, alpha } from "@mui/material";
import { SectionCard } from "@/components/ui";
import { useChartDefaults } from "@/theme/charts";
import { formatUsd, plural } from "@/utils/format";
import type { BusiestHourRow } from "@/types/report.types";
import { SECTION_COPY, hourLabel, hourRangeLabel } from "./reportPeriods";
import { busiestHoursSubtitle } from "./reportInsights";

/** The lounge day runs into the night, so the strip starts at 6 AM and ends at 5 AM. */
const HOUR_ORDER = [...Array.from({ length: 18 }, (_, i) => i + 6), 0, 1, 2, 3, 4, 5];
const STEPS = [0.1, 0.28, 0.46, 0.66, 0.86];

export interface HourHeatGridProps {
  rows: BusiestHourRow[];
  /** "paper" = the printed report: always 24 columns, smaller cells, no tooltips. */
  variant?: "screen" | "paper";
}

/**
 * Paid orders by hour of the day as a row of cells, one teal hue (darker = busier), with a
 * Quiet → Busy key. Hover/tap a cell for the numbers on screen.
 */
export const HourHeatGrid: React.FC<HourHeatGridProps> = ({ rows, variant = "screen" }) => {
  const chart = useChartDefaults();
  const paper = variant === "paper";
  const byHour = new Map(rows.map((r) => [r.hour, r]));
  const max = Math.max(0, ...rows.map((r) => r.orders));
  const step = (orders: number) => (orders <= 0 || max === 0 ? -1 : Math.min(STEPS.length - 1, Math.floor((orders / max) * STEPS.length - 1e-9)));
  const fill = (orders: number) => {
    const s = step(orders);
    return s < 0 ? "transparent" : alpha(chart.colors.revenue, STEPS[s]);
  };
  const labelSx = { fontSize: paper ? "9pt" : "0.8125rem" };

  return (
    <>
      <Box
        role="list"
        aria-label="Paid orders by hour of the day"
        sx={{
          display: "grid",
          gridTemplateColumns: paper ? "repeat(24, minmax(0, 1fr))" : { xs: "repeat(12, minmax(0, 1fr))", md: "repeat(24, minmax(0, 1fr))" },
          columnGap: "2px",
          rowGap: 1,
        }}
      >
        {HOUR_ORDER.map((h) => {
          const r = byHour.get(h) ?? { hour: h, orders: 0, revenue: 0 };
          const text = `${hourRangeLabel(h)}: ${r.orders ? `${plural(r.orders, "order")} · ${formatUsd(r.revenue)}` : "no orders"}`;
          const cell = (
            <Box
              role="listitem"
              tabIndex={paper ? undefined : 0}
              aria-label={text}
              sx={{ minWidth: 0, outline: "none", "&:focus-visible > div:first-of-type": { boxShadow: (t) => `0 0 0 2px ${t.palette.primary.main}` } }}
            >
              <Box sx={{ height: paper ? 20 : 40, borderRadius: paper ? "3px" : "4px", bgcolor: fill(r.orders), border: 1, borderColor: r.orders ? "transparent" : "divider" }} />
              <Typography
                variant="caption"
                color="text.secondary"
                component="div"
                sx={{ ...labelSx, textAlign: "center", mt: paper ? 0.25 : 0.5, whiteSpace: "nowrap", visibility: h % 3 === 0 ? "visible" : "hidden" }}
              >
                {hourLabel(h).replace(" ", "")}
              </Typography>
            </Box>
          );
          return paper ? (
            <React.Fragment key={h}>{cell}</React.Fragment>
          ) : (
            <Tooltip key={h} title={text} placement="top">
              {cell}
            </Tooltip>
          );
        })}
      </Box>
      {!paper && <HourHeatLegend />}
    </>
  );
};

/** Quiet → Busy key for the heat strip. Paper puts it beside the section title. */
export const HourHeatLegend: React.FC<{ variant?: "screen" | "paper" }> = ({ variant = "screen" }) => {
  const chart = useChartDefaults();
  const paper = variant === "paper";
  const text = paper ? { fontSize: "9pt" } : undefined;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: paper ? 0.75 : 1, mt: paper ? 0 : 1.5, color: "text.secondary", whiteSpace: "nowrap" }} aria-hidden>
      <Typography variant="body2" sx={text}>
        Quiet
      </Typography>
      {STEPS.map((a) => (
        <Box key={a} sx={{ width: paper ? 14 : 20, height: paper ? 10 : 12, borderRadius: "3px", bgcolor: alpha(chart.colors.revenue, a) }} />
      ))}
      <Typography variant="body2" sx={text}>
        Busy
      </Typography>
      <Typography variant="body2" sx={{ ...text, ml: paper ? 1 : "auto", display: paper ? "block" : { xs: "none", sm: "block" } }}>
        {paper ? "Empty = no orders" : "Empty boxes = no orders (usually closed)"}
      </Typography>
    </Box>
  );
};

/**
 * A heat strip of paid orders by hour of the day across the whole period. Answers "when do we
 * need two people at the counter?".
 */
const BusiestHoursStrip: React.FC<{ rows: BusiestHourRow[] | undefined; loading: boolean }> = ({ rows, loading }) => (
  <SectionCard title={SECTION_COPY.busiestHours.title} subtitle={busiestHoursSubtitle(rows)}>
    {loading || !rows ? <Skeleton variant="rounded" height={72} sx={{ borderRadius: "8px" }} /> : <HourHeatGrid rows={rows} />}
  </SectionCard>
);

export default BusiestHoursStrip;
