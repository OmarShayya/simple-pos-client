import { useMemo } from "react";
import { alpha, useTheme, type Theme } from "@mui/material/styles";
import { formatNumber, formatUsd } from "@/utils/format";
import { fonts } from "./tokens";

/**
 * Chart helpers for @mui/x-charts v8. Colours come from the design tokens:
 * teal = gaming/PC, blue = PlayStation, amber = products/food, slate = other, grey = "previous period".
 *
 *   const chart = useChartDefaults();
 *   <LineChart {...chart.line} height={260} series={[{ data, label: "Revenue", color: chart.colors.revenue, valueFormatter: chart.money }]} xAxis={[...]} />
 */

export interface ChartColors {
  pc: string;
  playstation: string;
  products: string;
  other: string;
  /** Main metric (revenue). Same teal as the brand accent. */
  revenue: string;
  /** Comparison series (yesterday / previous period). */
  previous: string;
  grid: string;
  text: string;
}

export const getChartColors = (theme: Theme): ChartColors => ({
  ...theme.tokens.series,
  revenue: theme.palette.primary.main,
  previous: theme.palette.mode === "dark" ? "#52525B" : "#A1A1AA",
  grid: theme.tokens.border,
  text: theme.palette.text.secondary,
});

/** Categorical palette for pies/bars with many categories (series colours first, then neutrals). */
export const getCategoricalPalette = (theme: Theme): string[] => {
  const c = getChartColors(theme);
  return theme.palette.mode === "dark"
    ? [c.pc, c.playstation, c.products, "#4ADE80", c.other, "#F472B6", "#FDE047", "#67E8F9"]
    : [c.pc, c.playstation, c.products, "#15803D", c.other, "#BE185D", "#A16207", "#0E7490"];
};

/** "$1.2K" axis ticks. */
export const moneyTick = (v: number | null) => (v == null ? "" : formatUsd(v, { compact: true, trimZeros: true }));
/** "$12.50" tooltips. */
export const moneyValue = (v: number | null) => (v == null ? "—" : formatUsd(v));
export const numberValue = (v: number | null) => (v == null ? "—" : formatNumber(v, 1));
/** 0 → "12 AM", 13 → "1 PM" */
export const hourTick = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;

export function useChartDefaults() {
  const theme = useTheme();
  return useMemo(() => {
    const colors = getChartColors(theme);
    const sx = {
      "& .MuiLineElement-root": { strokeWidth: 2 },
      "& .MuiAreaElement-root": { fillOpacity: 0.08 },
      "& .MuiMarkElement-root": { strokeWidth: 2, scale: "0.8" },
      "& .MuiChartsAxis-tickLabel": { fontFamily: fonts.sans },
      "& .MuiBarElement-root": { rx: 3 },
    } as const;
    const common = {
      hideLegend: true,
      grid: { horizontal: true },
      margin: { top: 12, right: 12, bottom: 4, left: 4 },
      sx,
    } as const;
    return {
      colors,
      palette: getCategoricalPalette(theme),
      money: moneyValue,
      moneyTick,
      hourTick,
      /** Spread into <LineChart>. */
      line: common,
      /** Spread into <BarChart>. */
      bar: { ...common, borderRadius: 4 },
      /** Spread into <PieChart>; pass series props via `pieSeries()`. */
      pie: { hideLegend: true, margin: { top: 8, right: 8, bottom: 8, left: 8 } },
      /** Donut defaults for a pie series. */
      pieSeries: { innerRadius: "62%", outerRadius: "100%", paddingAngle: 1.5, cornerRadius: 4, highlightScope: { fade: "global", highlight: "item" } } as const,
      /** sx that draws the given line series dashed (comparison / previous period). Give the series an `id`. */
      dashed: (...seriesIds: string[]) =>
        Object.fromEntries(seriesIds.map((id) => [`& .MuiLineElement-root[data-series="${id}"]`, { strokeDasharray: "5 4" }])),
      /** Faint fill colour for a series area. */
      areaFill: (color: string) => alpha(color, 0.12),
    };
  }, [theme]);
}
