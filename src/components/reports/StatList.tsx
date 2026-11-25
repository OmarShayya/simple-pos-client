import React from "react";
import { Box, Skeleton, Tooltip, Typography } from "@mui/material";
import { NorthEastRounded, SouthEastRounded } from "@mui/icons-material";
import { formatPercent, percentChange } from "@/utils/format";

export interface StatItem {
  label: string;
  value: number | null | undefined;
  previous?: number | null;
  format: (v: number) => string;
  /** Which way is good (default "up"); "down" for discounts / no-shows. */
  goodDirection?: "up" | "down";
  /** Small line under the label. */
  note?: React.ReactNode;
}

export interface StatListProps {
  items: StatItem[];
  previousLabel: string;
  loading?: boolean;
}

/** Change vs the previous period, coloured by whether it's good: "+12%", "−4.5%", "No change", "New". */
export const ChangeText: React.FC<{ value: number; previous: number; format: (v: number) => string; goodDirection?: "up" | "down"; previousLabel: string }> = ({
  value,
  previous,
  format,
  goodDirection = "up",
  previousLabel,
}) => {
  const diff = value - previous;
  const pct = percentChange(value, previous);
  const direction = Math.abs(diff) < 1e-9 ? "flat" : diff > 0 ? "up" : "down";
  const color = direction === "flat" ? "text.secondary" : direction === goodDirection ? "success.main" : "error.main";
  const Arrow = direction === "up" ? NorthEastRounded : direction === "down" ? SouthEastRounded : null;
  const text = direction === "flat" ? "No change" : pct === null ? "New" : `${diff > 0 ? "+" : "−"}${formatPercent(Math.abs(pct), Math.abs(pct) < 10 ? 1 : 0)}`;
  return (
    <Tooltip title={`${previousLabel.replace(/^vs /, "")}: ${format(previous)}`} placement="left">
      <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, color, fontWeight: 600, fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
        {Arrow && <Arrow sx={{ fontSize: 15 }} aria-hidden />}
        {text}
      </Box>
    </Tooltip>
  );
};

/**
 * Secondary numbers as a compact list (label · value · change) — reads faster than a wall of tiles.
 * Candidate for the kit (a "StatList" next to KpiCard).
 */
const StatList: React.FC<StatListProps> = ({ items, previousLabel, loading }) => (
  <Box component="dl" sx={{ m: 0 }}>
    {items.map((item, i) => (
      <Box
        key={item.label}
        sx={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", columnGap: 2, py: 1.25, borderTop: i ? 1 : 0, borderColor: "divider" }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography component="dt" variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {item.label}
          </Typography>
          {item.note && !loading && (
            <Typography variant="caption" color="text.secondary" component="div">
              {item.note}
            </Typography>
          )}
        </Box>
        <Box component="dd" sx={{ m: 0, textAlign: "right" }}>
          {loading || item.value === undefined ? (
            <>
              <Skeleton width={64} sx={{ ml: "auto" }} />
              <Skeleton width={44} sx={{ ml: "auto", fontSize: "0.8125rem" }} />
            </>
          ) : (
            <>
              <Typography sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1.3 }}>{item.value === null ? "—" : item.format(item.value)}</Typography>
              {typeof item.value === "number" && typeof item.previous === "number" && (
                <ChangeText value={item.value} previous={item.previous} format={item.format} goodDirection={item.goodDirection} previousLabel={previousLabel} />
              )}
            </>
          )}
        </Box>
      </Box>
    ))}
  </Box>
);

export default StatList;
