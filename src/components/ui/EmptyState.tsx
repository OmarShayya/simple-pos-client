import React from "react";
import { Box, Typography } from "@mui/material";
import { InboxOutlined } from "@mui/icons-material";

export interface EmptyStateProps {
  title: string;
  description?: React.ReactNode;
  /** MUI icon element. Defaults to an inbox. */
  icon?: React.ReactNode;
  /** Usually one Button ("New product", "Clear filters"). */
  action?: React.ReactNode;
  /** Smaller padding for cards, lists and table bodies. */
  compact?: boolean;
}

/** Shown when a list/table/chart has nothing to show. Say what's missing and what to do next. */
const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon, action, compact }) => (
  <Box role="status" sx={{ textAlign: "center", py: compact ? 3 : 6, px: 2, color: "text.secondary" }}>
    <Box
      aria-hidden
      sx={{
        width: compact ? 40 : 48,
        height: compact ? 40 : 48,
        mx: "auto",
        mb: 1.5,
        borderRadius: 2.5,
        display: "grid",
        placeItems: "center",
        border: 1,
        borderColor: "divider",
        color: "text.secondary",
        "& svg": { fontSize: compact ? 20 : 24 },
      }}
    >
      {icon ?? <InboxOutlined />}
    </Box>
    <Typography variant="subtitle1" color="text.primary">
      {title}
    </Typography>
    {description && (
      <Typography variant="body2" component="div" sx={{ mt: 0.5, maxWidth: 400, mx: "auto" }}>
        {description}
      </Typography>
    )}
    {action && <Box sx={{ mt: 2 }}>{action}</Box>}
  </Box>
);

export default EmptyState;
