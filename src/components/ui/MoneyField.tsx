import React, { useEffect, useState } from "react";
import { InputAdornment, TextField, type SxProps, type Theme } from "@mui/material";
import type { Currency } from "@/utils/format";

export interface MoneyFieldProps {
  label: string;
  /** Amount as a number (USD with cents, LBP whole pounds). `null` when empty. */
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  /** "USD" shows a "$" prefix and allows 2 decimals; "LBP" shows an "LBP" suffix and groups thousands. */
  currency?: Currency;
  helperText?: React.ReactNode;
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium";
  autoFocus?: boolean;
  name?: string;
  placeholder?: string;
  sx?: SxProps<Theme>;
  onBlur?: () => void;
}

const groupInt = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const toText = (value: number | null | undefined, currency: Currency) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return currency === "LBP" ? groupInt(String(Math.round(value))) : value.toFixed(2);
};

/** Price / amount input with the currency shown, numeric keyboard on phones and safe parsing. */
const MoneyField: React.FC<MoneyFieldProps> = ({
  label,
  value,
  onChange,
  currency = "USD",
  helperText,
  error,
  required,
  disabled,
  fullWidth = true,
  size = "medium",
  autoFocus,
  name,
  placeholder,
  sx,
  onBlur,
}) => {
  const [text, setText] = useState(() => toText(value, currency));

  // Follow outside changes without fighting the user's typing ("12." stays "12.")
  useEffect(() => {
    setText((current) => {
      const parsed = current === "" ? null : Number(current.replace(/,/g, ""));
      return parsed === (value ?? null) ? current : toText(value, currency);
    });
  }, [value, currency]);

  const handle = (raw: string) => {
    if (currency === "LBP") {
      const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
      setText(groupInt(digits));
      onChange(digits === "" ? null : Number(digits));
      return;
    }
    let cleaned = raw.replace(/[^\d.]/g, "");
    const firstDot = cleaned.indexOf(".");
    if (firstDot !== -1) cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "").slice(0, 2);
    setText(cleaned);
    onChange(cleaned === "" || cleaned === "." ? null : Number(cleaned));
  };

  return (
    <TextField
      label={label}
      name={name}
      value={text}
      onChange={(e) => handle(e.target.value)}
      onBlur={() => {
        if (currency === "USD" && text !== "" && text !== ".") setText(Number(text).toFixed(2));
        onBlur?.();
      }}
      helperText={helperText}
      error={error}
      required={required}
      disabled={disabled}
      fullWidth={fullWidth}
      size={size}
      autoFocus={autoFocus}
      placeholder={placeholder ?? (currency === "USD" ? "0.00" : "0")}
      sx={sx}
      slotProps={{
        htmlInput: { inputMode: currency === "USD" ? "decimal" : "numeric", style: { fontVariantNumeric: "tabular-nums" } },
        input:
          currency === "USD"
            ? { startAdornment: <InputAdornment position="start">$</InputAdornment> }
            : { endAdornment: <InputAdornment position="end">LBP</InputAdornment> },
      }}
    />
  );
};

export default MoneyField;
