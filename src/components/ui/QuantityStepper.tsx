import React from "react";
import { Box, IconButton, InputBase, Tooltip } from "@mui/material";
import { AddRounded, RemoveRounded } from "@mui/icons-material";

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** "medium" = 40px buttons (carts), "large" = 48px (counter touch screens). */
  size?: "medium" | "large";
  disabled?: boolean;
  /** What is being counted, for screen readers: "Quantity of Pepsi". */
  label?: string;
  /** Allow typing a number in the middle (default true). */
  editable?: boolean;
}

/** − [ 2 ] + with big tap targets. Clamps to min/max; the minus button disables at `min`. */
const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  size = "medium",
  disabled,
  label = "Quantity",
  editable = true,
}) => {
  const px = size === "large" ? 48 : 40;
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const set = (n: number) => {
    const next = clamp(Number.isFinite(n) ? Math.round(n) : min);
    if (next !== value) onChange(next);
  };

  const btn = (dir: -1 | 1) => {
    const isMinus = dir === -1;
    const atLimit = isMinus ? value <= min : value >= max;
    const name = isMinus ? `Decrease ${label.toLowerCase()}` : `Increase ${label.toLowerCase()}`;
    return (
      <Tooltip title={isMinus ? "Less" : "More"} enterDelay={600}>
        <span>
          <IconButton
            onClick={() => set(value + dir * step)}
            disabled={disabled || atLimit}
            aria-label={name}
            sx={{ width: px, height: px, borderRadius: 0, color: "text.primary" }}
          >
            {isMinus ? <RemoveRounded /> : <AddRounded />}
          </IconButton>
        </span>
      </Tooltip>
    );
  };

  return (
    <Box
      role="group"
      aria-label={label}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        border: 1,
        borderColor: (t) => t.tokens.borderStrong,
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: "background.paper",
        opacity: disabled ? 0.6 : 1,
        flexShrink: 0,
      }}
    >
      {btn(-1)}
      <InputBase
        value={String(value)}
        readOnly={!editable}
        disabled={disabled}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          if (digits === "") return;
          set(Number(digits));
        }}
        onFocus={(e) => e.target.select()}
        inputProps={{ inputMode: "numeric", "aria-label": label, style: { textAlign: "center" } }}
        sx={{
          width: size === "large" ? 56 : 48,
          height: px,
          fontWeight: 600,
          fontSize: size === "large" ? "1.0625rem" : "0.9375rem",
          fontVariantNumeric: "tabular-nums",
          borderLeft: 1,
          borderRight: 1,
          borderColor: "divider",
          "& input": { p: 0 },
        }}
      />
      {btn(1)}
    </Box>
  );
};

export default QuantityStepper;
