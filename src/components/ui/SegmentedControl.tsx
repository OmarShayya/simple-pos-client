import React from "react";
import { Box, ToggleButton, ToggleButtonGroup, type SxProps, type Theme } from "@mui/material";

export interface SegmentedOption<V extends string> {
  value: V;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Small count after the label ("Unpaid 3"). */
  count?: number;
  disabled?: boolean;
  /** Accessible name when the label is not plain text. */
  ariaLabel?: string;
}

export interface SegmentedControlProps<V extends string> {
  value: V;
  onChange: (value: V) => void;
  options: SegmentedOption<V>[];
  /** Accessible name for the group, e.g. "Order status". */
  "aria-label": string;
  /** "medium" = 40px (default), "large" = 48px for counter screens. */
  size?: "medium" | "large";
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * A few big, labelled choices in one row (period, status, station type). One is always selected.
 * Use it instead of tiny toggles or tabs inside cards. For 6+ options use SelectField.
 */
function SegmentedControl<V extends string>({ value, onChange, options, size = "medium", fullWidth, sx, ...rest }: SegmentedControlProps<V>) {
  return (
    <ToggleButtonGroup
      exclusive
      value={value}
      onChange={(_, next: V | null) => {
        if (next !== null) onChange(next);
      }}
      aria-label={rest["aria-label"]}
      fullWidth={fullWidth}
      sx={[
        { maxWidth: "100%", overflowX: "auto", flexWrap: "nowrap", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {options.map((o) => (
        <ToggleButton
          key={o.value}
          value={o.value}
          disabled={o.disabled}
          aria-label={o.ariaLabel}
          sx={{
            minHeight: size === "large" ? 46 : 38,
            px: size === "large" ? 2.25 : 1.75,
            fontSize: size === "large" ? "0.9375rem" : "0.875rem",
            whiteSpace: "nowrap",
            flexShrink: 0,
            "& .MuiSvgIcon-root": { fontSize: 18 },
          }}
        >
          {o.icon}
          {o.label}
          {typeof o.count === "number" && (
            <Box
              component="span"
              sx={{
                ml: 0.25,
                px: 0.75,
                minWidth: 20,
                height: 20,
                borderRadius: "10px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8125rem",
                fontWeight: 600,
                bgcolor: "action.hover",
                color: "text.secondary",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {o.count}
            </Box>
          )}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

export default SegmentedControl;
