import React from "react";
import { Box, Chip, alpha, useTheme, type ChipProps } from "@mui/material";
import { getStatusInfo, type StatusKind, type StatusTone } from "./statusConfig";

export interface StatusChipProps extends Omit<ChipProps, "color" | "label"> {
  status: string;
  /** Which status family (`order`, `session`, `reservation`, `station`…). Disambiguates "pending" etc. */
  kind?: StatusKind;
  /** Override the label from the status map (keep it short). */
  label?: React.ReactNode;
  /** Override the colour from the status map. */
  tone?: StatusTone;
  /** Small coloured dot before the label (default on). */
  dot?: boolean;
}

/** Soft, colour-coded status pill. Labels and colours come from `statusConfig.ts` only. */
const StatusChip: React.FC<StatusChipProps> = ({ status, kind, label, tone, dot = true, size = "small", sx, ...rest }) => {
  const theme = useTheme();
  const info = getStatusInfo(status, kind);
  const finalTone = tone ?? info.tone;
  const dark = theme.palette.mode === "dark";
  const color =
    finalTone === "neutral" ? theme.palette.text.secondary : finalTone === "primary" ? theme.tokens.primaryText : theme.palette[finalTone].main;

  return (
    <Chip
      size={size}
      label={
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
          {dot && <Box component="span" aria-hidden sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />}
          {label ?? info.label}
        </Box>
      }
      sx={[
        {
          fontWeight: 500,
          color: finalTone === "neutral" ? "text.secondary" : color,
          bgcolor: finalTone === "neutral" ? (dark ? "#27272A" : "#F4F4F5") : alpha(color, dark ? 0.16 : 0.1),
          border: 0,
          maxWidth: "100%",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    />
  );
};

export default StatusChip;
