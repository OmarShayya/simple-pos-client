import React from "react";
import { Box, ButtonBase, Skeleton, Typography } from "@mui/material";
import { ChevronRightRounded } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";

export interface DashboardListRowProps {
  /** Router path: the whole row becomes a link (big tap target). */
  to?: string;
  /** Accessible name for the link ("Open order 20261125-0011"). */
  ariaLabel?: string;
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
}

/**
 * One row of a dashboard list: optional leading block, title + muted subtitle, trailing amount or
 * status. Rows with `to` are links with a chevron. Candidate for the kit ("ListRow").
 */
export const DashboardListRow: React.FC<DashboardListRowProps> = ({ to, ariaLabel, leading, title, subtitle, trailing }) => {
  const content = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%", minHeight: 60, px: 2.5, py: 1.25, textAlign: "left" }}>
      {leading && <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{leading}</Box>}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography component="div" sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography component="div" variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 1, rowGap: 0.5, mt: 0.25 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {trailing && <Box sx={{ flexShrink: 0, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{trailing}</Box>}
      {to && <ChevronRightRounded sx={{ color: "text.disabled", flexShrink: 0, mr: -1 }} aria-hidden />}
    </Box>
  );
  return (
    <Box component="li" sx={{ borderTop: 1, borderColor: "divider", "&:first-of-type": { borderTop: 0 } }}>
      {to ? (
        <ButtonBase component={RouterLink} to={to} aria-label={ariaLabel} sx={{ width: "100%", display: "block", "&:hover": { bgcolor: "action.hover" } }}>
          {content}
        </ButtonBase>
      ) : (
        content
      )}
    </Box>
  );
};

export const DashboardList: React.FC<{ children: React.ReactNode; label: string }> = ({ children, label }) => (
  <Box component="ul" aria-label={label} sx={{ listStyle: "none", m: 0, p: 0 }}>
    {children}
  </Box>
);

/** Placeholder rows while the list loads (the card title stays). */
export const DashboardListSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <Box aria-busy sx={{ px: 2.5, pb: 1 }}>
    {Array.from({ length: rows }).map((_, i) => (
      <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.25, borderTop: i ? 1 : 0, borderColor: "divider" }}>
        <Box sx={{ flex: 1 }}>
          <Skeleton width={`${60 - i * 8}%`} />
          <Skeleton width={`${40 - i * 5}%`} />
        </Box>
        <Skeleton width={56} />
      </Box>
    ))}
  </Box>
);
