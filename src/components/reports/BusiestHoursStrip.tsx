import React from "react";
import { Box, Skeleton, Tooltip, Typography, alpha } from "@mui/material";
import { SectionCard } from "@/components/ui";
import { useChartDefaults } from "@/theme/charts";
import { formatUsd, plural } from "@/utils/format";
import type { BusiestHourRow } from "@/types/report.types";
import { hourLabel, hourRangeLabel } from "./reportPeriods";

/** The lounge day runs into the night, so the strip starts at 6 AM and ends at 5 AM. */
const HOUR_ORDER = [...Array.from({ length: 18 }, (_, i) => i + 6), 0, 1, 2, 3, 4, 5];
const STEPS = [0.1, 0.28, 0.46, 0.66, 0.86];

/**
 * A heat strip of paid orders by hour of the day across the whole period (one teal hue, darker =
 * busier). Answers "when do we need two people at the counter?". Hover/tap a cell for the numbers.
 */
const BusiestHoursStrip: React.FC<{ rows: BusiestHourRow[] | undefined; loading: boolean }> = ({ rows, loading }) => {
  const chart = useChartDefaults();
  const byHour = new Map((rows ?? []).map((r) => [r.hour, r]));
  const max = Math.max(0, ...(rows ?? []).map((r) => r.orders));
  const top = [...(rows ?? [])].sort((a, b) => b.orders - a.orders)[0];
  const step = (orders: number) => (orders <= 0 || max === 0 ? -1 : Math.min(STEPS.length - 1, Math.floor((orders / max) * STEPS.length - 1e-9)));
  const fill = (orders: number) => {
    const s = step(orders);
    return s < 0 ? "transparent" : alpha(chart.colors.revenue, STEPS[s]);
  };

  return (
    <SectionCard
      title="Busiest hours"
      subtitle={top && top.orders > 0 ? `Most orders are paid ${hourRangeLabel(top.hour)} — plan the busiest shifts around it` : "Paid orders by hour of the day"}
    >
      {loading ? (
        <Skeleton variant="rounded" height={72} sx={{ borderRadius: "8px" }} />
      ) : (
        <>
          <Box
            role="list"
            aria-label="Paid orders by hour of the day"
            sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(12, minmax(0, 1fr))", md: "repeat(24, minmax(0, 1fr))" }, columnGap: "2px", rowGap: 1 }}
          >
            {HOUR_ORDER.map((h) => {
              const r = byHour.get(h) ?? { hour: h, orders: 0, revenue: 0 };
              const text = `${hourRangeLabel(h)}: ${r.orders ? `${plural(r.orders, "order")} · ${formatUsd(r.revenue)}` : "no orders"}`;
              return (
                <Tooltip key={h} title={text} placement="top">
                  <Box role="listitem" tabIndex={0} aria-label={text} sx={{ minWidth: 0, outline: "none", "&:focus-visible > div:first-of-type": { boxShadow: (t) => `0 0 0 2px ${t.palette.primary.main}` } }}>
                    <Box
                      sx={{
                        height: 40,
                        borderRadius: "4px",
                        bgcolor: fill(r.orders),
                        border: 1,
                        borderColor: r.orders ? "transparent" : "divider",
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" component="div" sx={{ textAlign: "center", mt: 0.5, fontSize: "0.8125rem", whiteSpace: "nowrap", visibility: h % 3 === 0 ? "visible" : "hidden" }}>
                      {hourLabel(h).replace(" ", "")}
                    </Typography>
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5, color: "text.secondary" }} aria-hidden>
            <Typography variant="body2">Quiet</Typography>
            {STEPS.map((a) => (
              <Box key={a} sx={{ width: 20, height: 12, borderRadius: "3px", bgcolor: alpha(chart.colors.revenue, a) }} />
            ))}
            <Typography variant="body2">Busy</Typography>
            <Typography variant="body2" sx={{ ml: "auto", display: { xs: "none", sm: "block" } }}>
              Empty boxes = no orders (usually closed)
            </Typography>
          </Box>
        </>
      )}
    </SectionCard>
  );
};

export default BusiestHoursStrip;
