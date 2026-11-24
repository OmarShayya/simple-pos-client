import React from "react";
import { Box, Chip, alpha, useTheme, type ChipProps } from "@mui/material";

type Tone = "success" | "error" | "warning" | "info" | "primary" | "secondary" | "default";

/**
 * One place that maps every status string in the app to a colour + label.
 * Add new statuses (e.g. "reserved", "no_show") here and every screen picks them up.
 */
const STATUS_MAP: Record<string, { tone: Tone; label?: string }> = {
  // stations
  available: { tone: "success", label: "Available" },
  occupied: { tone: "error", label: "In use" },
  maintenance: { tone: "warning", label: "Maintenance" },
  reserved: { tone: "secondary", label: "Reserved" },
  // sales / payments
  paid: { tone: "success", label: "Paid" },
  pending: { tone: "warning", label: "Pending" },
  unpaid: { tone: "warning", label: "Unpaid" },
  partial: { tone: "info", label: "Partial" },
  cancelled: { tone: "default", label: "Cancelled" },
  // sessions
  active: { tone: "info", label: "Active" },
  completed: { tone: "success", label: "Completed" },
  // generic
  inactive: { tone: "default", label: "Inactive" },
  yes: { tone: "success", label: "Yes" },
  no: { tone: "default", label: "No" },
};

interface StatusChipProps extends Omit<ChipProps, "color"> {
  status: string;
  /** Override the label from the map. */
  label?: React.ReactNode;
  /** Show a small coloured dot before the label. */
  dot?: boolean;
}

/** Soft, colour-coded status pill. */
const StatusChip: React.FC<StatusChipProps> = ({ status, label, dot = true, sx, ...rest }) => {
  const theme = useTheme();
  const key = String(status || "").toLowerCase();
  const entry = STATUS_MAP[key] ?? { tone: "default" as Tone };
  const color = entry.tone === "default" ? theme.palette.text.secondary : theme.palette[entry.tone].main;
  const text = label ?? entry.label ?? key.replace(/_/g, " ");

  return (
    <Chip
      size="small"
      label={
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
          {dot && <Box component="span" sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />}
          {text}
        </Box>
      }
      sx={{
        color,
        bgcolor: alpha(color, theme.palette.mode === "dark" ? 0.16 : 0.1),
        border: `1px solid ${alpha(color, 0.25)}`,
        textTransform: "capitalize",
        ...sx,
      }}
      {...rest}
    />
  );
};

export default StatusChip;
