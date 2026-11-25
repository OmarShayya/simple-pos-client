import React from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { ShowChartRounded } from "@mui/icons-material";
import SectionCard from "./SectionCard";
import EmptyState from "./EmptyState";
import ErrorState from "./ErrorState";

export interface ChartLegendItem {
  label: string;
  color: string;
  /** Optional total shown next to the label. */
  value?: React.ReactNode;
  /** Dashed swatch for comparison series ("Yesterday"). */
  dashed?: boolean;
}

export interface ChartCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right side of the header (SegmentedControl, link…). */
  action?: React.ReactNode;
  /** Plot-area height in px (default 280). */
  height?: number;
  /** Skeletons the plot area only; title, legend and action stay. */
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** Show the empty state instead of the chart. */
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: React.ReactNode;
  /** Simple legend above the plot (charts should pass `hideLegend`). */
  legend?: ChartLegendItem[];
  footer?: React.ReactNode;
  /** The chart (LineChart/BarChart/PieChart with `useChartDefaults()`), sized to `height`. */
  children: React.ReactNode;
}

/** A titled chart with consistent loading / empty / error states and an optional legend. */
const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  action,
  height = 280,
  loading,
  error,
  onRetry,
  empty,
  emptyTitle = "No data for this period",
  emptyDescription,
  legend,
  footer,
  children,
}) => {
  let plot: React.ReactNode = children;
  if (loading) plot = <Skeleton variant="rounded" width="100%" height={height} sx={{ borderRadius: 2 }} />;
  else if (error) plot = <ErrorState compact error={error} onRetry={onRetry} />;
  else if (empty) plot = <EmptyState compact icon={<ShowChartRounded />} title={emptyTitle} description={emptyDescription} />;

  return (
    <SectionCard title={title} subtitle={subtitle} action={action} footer={footer}>
      {legend && legend.length > 0 && (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, mb: 1.5, display: "flex", flexWrap: "wrap", columnGap: 2.5, rowGap: 0.75 }}>
          {legend.map((item) => (
            <Box component="li" key={item.label} sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
              <Box
                aria-hidden
                sx={{
                  width: 12,
                  height: item.dashed ? 0 : 12,
                  borderRadius: item.dashed ? 0 : "3px",
                  bgcolor: item.dashed ? "transparent" : item.color,
                  borderTop: item.dashed ? `2px dashed ${item.color}` : undefined,
                }}
              />
              <Typography variant="body2" color="text.secondary" component="span">
                {item.label}
              </Typography>
              {item.value !== undefined && (
                <Typography variant="body2" component="span" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {item.value}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}
      <Box sx={{ minHeight: height, display: "flex", flexDirection: "column", justifyContent: "center", "& > *": { flex: loading || error || empty ? undefined : 1 } }}>
        {plot}
      </Box>
    </SectionCard>
  );
};

export default ChartCard;
