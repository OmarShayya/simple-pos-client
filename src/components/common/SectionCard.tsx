import React from "react";
import { Box, Card, Typography, type SxProps, type Theme } from "@mui/material";

interface SectionCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  /** Remove inner padding (e.g. for full-bleed tables/lists). */
  flush?: boolean;
  sx?: SxProps<Theme>;
}

/** Card with an optional header row (title + action). */
const SectionCard: React.FC<SectionCardProps> = ({ title, subtitle, icon, action, children, flush, sx }) => (
  <Card sx={{ height: "100%", display: "flex", flexDirection: "column", ...sx }}>
    {(title || action) && (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 2.25, pt: 2, pb: flush ? 1.5 : 0.5 }}>
        {icon && <Box sx={{ display: "flex", color: "primary.main", "& svg": { fontSize: 20 } }}>{icon}</Box>}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {title && (
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
    )}
    <Box sx={{ flex: 1, p: flush ? 0 : 2.25, pt: flush ? 0 : title ? 1 : 2.25 }}>{children}</Box>
  </Card>
);

export default SectionCard;
