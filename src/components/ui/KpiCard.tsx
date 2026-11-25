import React from "react";
import { Box, Card, CardActionArea, Skeleton, Tooltip, Typography, useTheme } from "@mui/material";
import { NorthEastRounded, SouthEastRounded } from "@mui/icons-material";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";
import {
  formatDuration,
  formatHours,
  formatLbp,
  formatNumber,
  formatPercent,
  formatUsd,
  percentChange,
} from "@/utils/format";

export type KpiFormat = "money" | "lbp" | "number" | "percent" | "duration" | "hours" | ((value: number) => string);

export interface KpiCardProps {
  label: string;
  /** A number (formatted with `format`) or ready-made content. */
  value: number | null | undefined | React.ReactNode;
  format?: KpiFormat;
  /** Same metric for the comparison period → shows "▲ 12% vs yesterday". */
  previous?: number | null;
  /** Default "vs previous". E.g. "vs yesterday", "vs last week". */
  previousLabel?: string;
  /**
   * Which direction is good. "up" (default) for revenue/orders; "down" for bad metrics
   * (no-shows, discounts given, refunds); "neutral" never colours the change.
   */
  goodDirection?: "up" | "down" | "neutral";
  /** Show the change as a percentage (default) or as an absolute difference in `format`. */
  deltaFormat?: "percent" | "absolute";
  /** Small trend line under the value. */
  sparkline?: number[];
  /** Small muted icon next to the label. */
  icon?: React.ReactNode;
  /** Extra line under the value (a breakdown). */
  hint?: React.ReactNode;
  /** Skeletons the number/delta only — the label always renders. */
  loading?: boolean;
  onClick?: () => void;
}

const formatValue = (v: number, format: KpiFormat = "number") => {
  if (typeof format === "function") return format(v);
  switch (format) {
    case "money":
      return formatUsd(v);
    case "lbp":
      return formatLbp(v);
    case "percent":
      return formatPercent(v, 1);
    case "duration":
      return formatDuration(v);
    case "hours":
      return formatHours(v);
    default:
      return formatNumber(v, 1);
  }
};

/** KPI tile: label, big tabular value, change vs the previous period, optional sparkline. */
const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  format = "number",
  previous,
  previousLabel = "vs previous",
  goodDirection = "up",
  deltaFormat = "percent",
  sparkline,
  icon,
  hint,
  loading,
  onClick,
}) => {
  const theme = useTheme();
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : null;
  const display = numeric !== null ? formatValue(numeric, format) : value === null || value === undefined ? "—" : value;

  // Change vs previous
  let delta: React.ReactNode = null;
  if (numeric !== null && typeof previous === "number" && Number.isFinite(previous)) {
    const diff = numeric - previous;
    const pct = percentChange(numeric, previous);
    const direction = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
    const good = goodDirection === "neutral" || direction === "flat" ? null : direction === goodDirection;
    const color = good === null ? "text.secondary" : good ? "success.main" : "error.main";
    const text =
      direction === "flat"
        ? "No change"
        : deltaFormat === "absolute"
          ? `${diff > 0 ? "+" : "−"}${formatValue(Math.abs(diff), format)}`
          : pct === null
            ? "New"
            : formatPercent(Math.abs(pct), Math.abs(pct) < 10 ? 1 : 0);
    const Arrow = direction === "up" ? NorthEastRounded : direction === "down" ? SouthEastRounded : null;
    delta = (
      <Tooltip title={`${previousLabel.replace(/^vs /, "")}: ${formatValue(previous, format)}`} placement="bottom-start">
        {/* Wraps on narrow (half-width phone) tiles instead of cutting "vs yesterday" off */}
        <Box sx={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", columnGap: 0.75, rowGap: 0, minWidth: 0 }}>
          <Box
            component="span"
            sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, color, fontWeight: 600, fontSize: "0.8125rem", whiteSpace: "nowrap" }}
          >
            {Arrow && <Arrow sx={{ fontSize: 15 }} aria-hidden />}
            <span>
              {direction === "down" && deltaFormat === "percent" && pct !== null ? "−" : direction === "up" && deltaFormat === "percent" && pct !== null ? "+" : ""}
              {text}
            </span>
          </Box>
          <Typography component="span" variant="caption" color="text.secondary">
            {previousLabel}
          </Typography>
        </Box>
      </Tooltip>
    );
  }

  const body = (
    <Box sx={{ p: { xs: 2, md: 2.5 }, height: "100%", display: "flex", flexDirection: "column", gap: 0.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 22 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, flex: 1, minWidth: 0 }} noWrap>
          {label}
        </Typography>
        {icon && <Box sx={{ display: "flex", color: "text.secondary", "& svg": { fontSize: 18 } }} aria-hidden>{icon}</Box>}
      </Box>

      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 2, minHeight: 40 }}>
        {loading ? (
          <Skeleton variant="text" width="55%" sx={{ fontSize: "1.75rem" }} />
        ) : (
          <Typography
            component="div"
            sx={{ fontSize: { xs: "1.5rem", md: "1.75rem" }, fontWeight: 600, lineHeight: 1.2, letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums", flexShrink: 0, whiteSpace: "nowrap" }}
          >
            {display}
          </Typography>
        )}
        {sparkline && sparkline.length > 1 && !loading && (
          <Box sx={{ flex: 1, minWidth: 40, maxWidth: 120, height: 36, ml: "auto" }} aria-hidden>
            <SparkLineChart
              data={sparkline}
              height={36}
              curve="monotoneX"
              area
              color={theme.palette.primary.main}
              margin={{ top: 4, bottom: 2, left: 2, right: 2 }}
              sx={{ "& .MuiAreaElement-root": { fillOpacity: 0.1 }, "& .MuiLineElement-root": { strokeWidth: 1.75 } }}
            />
          </Box>
        )}
      </Box>

      {(delta || loading || hint) && (
        <Box sx={{ minHeight: 20, display: "flex", flexDirection: "column", gap: 0.25 }}>
          {loading ? <Skeleton variant="text" width="45%" sx={{ fontSize: "0.8125rem" }} /> : delta}
          {hint && !loading && (
            <Typography variant="caption" color="text.secondary" component="div">
              {hint}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );

  return (
    <Card sx={{ height: "100%" }} aria-busy={loading || undefined}>
      {onClick ? (
        <CardActionArea onClick={onClick} sx={{ height: "100%", borderRadius: 0 }}>
          {body}
        </CardActionArea>
      ) : (
        body
      )}
    </Card>
  );
};

export default KpiCard;
