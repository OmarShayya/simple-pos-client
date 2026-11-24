import React from "react";
import { Box, Typography } from "@mui/material";
import { InboxOutlined } from "@mui/icons-material";

interface EmptyStateProps {
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}

/** Friendly placeholder for lists/tables with nothing to show. */
const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon, action, compact }) => (
  <Box sx={{ textAlign: "center", py: compact ? 3 : 6, px: 2, color: "text.secondary" }}>
    <Box
      sx={{
        width: compact ? 44 : 56,
        height: compact ? 44 : 56,
        mx: "auto",
        mb: 1.5,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        bgcolor: "action.hover",
        "& svg": { fontSize: compact ? 22 : 28 },
      }}
    >
      {icon ?? <InboxOutlined />}
    </Box>
    <Typography variant="subtitle1" color="text.primary">
      {title}
    </Typography>
    {description && (
      <Typography variant="body2" sx={{ mt: 0.5, maxWidth: 380, mx: "auto" }}>
        {description}
      </Typography>
    )}
    {action && <Box sx={{ mt: 2 }}>{action}</Box>}
  </Box>
);

export default EmptyState;
