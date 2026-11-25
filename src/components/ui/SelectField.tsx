import React from "react";
import { ListItemIcon, MenuItem, TextField, type SxProps, type TextFieldProps, type Theme } from "@mui/material";

export interface SelectOption<V extends string | number = string> {
  value: V;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SelectFieldProps<V extends string | number = string> {
  label: string;
  value: V | "";
  onChange: (value: V) => void;
  options: SelectOption<V>[];
  /** Adds a first option with value "" (e.g. "All statuses"). */
  emptyOption?: string;
  helperText?: React.ReactNode;
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium";
  name?: string;
  /** Minimum width when not full width (filters). */
  minWidth?: number;
  sx?: SxProps<Theme>;
  slotProps?: TextFieldProps["slotProps"];
}

/** Dropdown for a fixed list of choices. For long or searchable lists use an Autocomplete-based field. */
function SelectField<V extends string | number = string>({
  label,
  value,
  onChange,
  options,
  emptyOption,
  helperText,
  error,
  required,
  disabled,
  fullWidth = true,
  size = "medium",
  name,
  minWidth = 180,
  sx,
  slotProps,
}: SelectFieldProps<V>) {
  return (
    <TextField
      select
      label={label}
      name={name}
      value={value}
      onChange={(e) => {
        const raw = e.target.value;
        const match = options.find((o) => String(o.value) === String(raw));
        onChange((match ? match.value : raw) as V);
      }}
      helperText={helperText}
      error={error}
      required={required}
      disabled={disabled}
      fullWidth={fullWidth}
      size={size}
      sx={[{ minWidth: fullWidth ? undefined : minWidth }, ...(Array.isArray(sx) ? sx : [sx])]}
      slotProps={slotProps}
    >
      {emptyOption !== undefined && <MenuItem value="">{emptyOption}</MenuItem>}
      {options.map((o) => (
        <MenuItem key={String(o.value)} value={o.value} disabled={o.disabled}>
          {o.icon && <ListItemIcon sx={{ minWidth: 30 }}>{o.icon}</ListItemIcon>}
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

export default SelectField;
