import React, { useEffect, useState } from "react";
import { InputAdornment, TextField } from "@mui/material";

export interface NumberFieldProps {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  /** Decimal places allowed (default 0 = whole numbers). */
  decimals?: number;
  /** Unit after the number ("%", "min", "days"). */
  suffix?: React.ReactNode;
  prefix?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium";
  name?: string;
  autoFocus?: boolean;
  placeholder?: string;
}

const toText = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? "" : String(v));

/**
 * A plain number with its unit shown ("20 %"). Numeric keyboard on phones, only digits (and one
 * decimal point when `decimals` > 0) can be typed, and the value is clamped to min/max on blur.
 * For money use `MoneyField`; for counts with +/- buttons use `QuantityStepper`.
 */
const NumberField: React.FC<NumberFieldProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  decimals = 0,
  suffix,
  prefix,
  helperText,
  error,
  required,
  disabled,
  fullWidth = true,
  size = "medium",
  name,
  autoFocus,
  placeholder,
}) => {
  const [text, setText] = useState(() => toText(value));

  useEffect(() => {
    setText((current) => (current === "" ? null : Number(current)) === (value ?? null) ? current : toText(value));
  }, [value]);

  const handle = (raw: string) => {
    let cleaned = raw.replace(decimals > 0 ? /[^\d.]/g : /\D/g, "");
    const dot = cleaned.indexOf(".");
    if (dot !== -1) cleaned = cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "").slice(0, decimals);
    setText(cleaned);
    onChange(cleaned === "" || cleaned === "." ? null : Number(cleaned));
  };

  const clamp = () => {
    if (value === null || value === undefined) return;
    const next = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, value));
    if (next !== value) onChange(next);
    setText(toText(next));
  };

  return (
    <TextField
      label={label}
      name={name}
      value={text}
      onChange={(e) => handle(e.target.value)}
      onBlur={clamp}
      helperText={helperText}
      error={error}
      required={required}
      disabled={disabled}
      fullWidth={fullWidth}
      size={size}
      autoFocus={autoFocus}
      placeholder={placeholder}
      slotProps={{
        htmlInput: { inputMode: decimals > 0 ? "decimal" : "numeric", style: { fontVariantNumeric: "tabular-nums" } },
        input: {
          startAdornment: prefix ? <InputAdornment position="start">{prefix}</InputAdornment> : undefined,
          endAdornment: suffix ? <InputAdornment position="end">{suffix}</InputAdornment> : undefined,
        },
      }}
    />
  );
};

export default NumberField;
