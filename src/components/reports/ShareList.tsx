import React from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { formatPercent } from "@/utils/format";

export interface ShareRow {
  id: string;
  label: React.ReactNode;
  /** Main number (already formatted, e.g. "$1,234.50"). */
  value: string;
  /** Muted detail under the label ("312 orders"). */
  detail?: React.ReactNode;
  /** Raw amount used for the bar length and share. */
  amount: number;
}

export interface ShareListProps {
  rows: ShareRow[];
  /** One hue for every bar (bars are magnitudes, not identities). */
  color: string;
  loading?: boolean;
  /** Accessible name, e.g. "Revenue by payment method". */
  label: string;
}

/**
 * Ranked horizontal bars with the exact numbers written next to them — easier to read than a
 * donut for older staff, and nothing is hidden behind a hover. Used for payments and categories.
 */
const ShareList: React.FC<ShareListProps> = ({ rows, color, loading, label }) => {
  if (loading) {
    return (
      <Box aria-busy>
        {[0, 1, 2, 3].map((i) => (
          <Box key={i} sx={{ py: 1 }}>
            <Skeleton width={`${70 - i * 12}%`} />
            <Skeleton variant="rounded" height={8} width={`${90 - i * 18}%`} sx={{ borderRadius: "4px" }} />
          </Box>
        ))}
      </Box>
    );
  }
  const total = rows.reduce((t, r) => t + Math.max(0, r.amount), 0);
  const max = Math.max(...rows.map((r) => r.amount), 0);
  return (
    <Box component="ul" aria-label={label} sx={{ listStyle: "none", m: 0, p: 0 }}>
      {rows.map((r) => {
        const share = total > 0 ? (r.amount / total) * 100 : 0;
        return (
          <Box component="li" key={r.id} sx={{ py: 1 }}>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5 }}>
              <Typography component="div" sx={{ fontWeight: 500, flex: 1, minWidth: 0 }} noWrap>
                {r.label}
              </Typography>
              <Typography component="div" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                {r.value}
              </Typography>
              <Typography component="div" variant="body2" color="text.secondary" sx={{ width: 48, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {formatPercent(share)}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 0.5 }}>
              <Box sx={{ flex: 1, height: 8, borderRadius: "4px", bgcolor: "action.hover", overflow: "hidden" }} aria-hidden>
                <Box sx={{ width: `${max > 0 ? Math.max(1, (r.amount / max) * 100) : 0}%`, height: "100%", bgcolor: color, borderRadius: "4px" }} />
              </Box>
              {r.detail && (
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 92, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {r.detail}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default ShareList;
