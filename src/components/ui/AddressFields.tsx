import React from "react";
import { Box, TextField } from "@mui/material";
import CountrySelect from "./CountrySelect";
import CityField, { type CityValue } from "./CityField";

/** Matches the backend address shape (CONTRACT §2). */
export interface Address {
  /** ISO-2, e.g. "LB". */
  country: string;
  city: string;
  area?: string;
  street?: string;
}

export interface AddressFieldsProps {
  value: Partial<Address> | null | undefined;
  onChange: (value: Address) => void;
  /** Show the optional street / building line (default true). */
  showStreet?: boolean;
  required?: boolean;
  disabled?: boolean;
  /** Field-level errors, e.g. from server validation. */
  errors?: Partial<Record<keyof Address, string>>;
  size?: "small" | "medium";
}

/** Country + City/area (Lebanese places list) + optional street. Lebanon is the default country. */
const AddressFields: React.FC<AddressFieldsProps> = ({ value, onChange, showStreet = true, required, disabled, errors, size }) => {
  const country = value?.country || "LB";
  const current: Address = { country, city: value?.city ?? "", area: value?.area || undefined, street: value?.street || undefined };
  const cityValue: CityValue | null = current.city ? { city: current.city, area: current.area } : null;

  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 2fr) minmax(0, 3fr)" } }}>
      <CountrySelect
        value={country}
        onChange={(code) => onChange({ country: code ?? "LB", city: "", area: undefined, street: current.street })}
        required={required}
        disabled={disabled}
        error={Boolean(errors?.country)}
        helperText={errors?.country}
        size={size}
      />
      <CityField
        country={country}
        value={cityValue}
        onChange={(v) => onChange({ ...current, city: v?.city ?? "", area: v?.area })}
        required={required}
        disabled={disabled}
        error={Boolean(errors?.city || errors?.area)}
        helperText={errors?.city ?? errors?.area}
        size={size}
      />
      {showStreet && (
        <TextField
          label="Street / building (optional)"
          value={current.street ?? ""}
          onChange={(e) => onChange({ ...current, street: e.target.value || undefined })}
          disabled={disabled}
          error={Boolean(errors?.street)}
          helperText={errors?.street}
          size={size}
          sx={{ gridColumn: "1 / -1" }}
          slotProps={{ htmlInput: { autoComplete: "street-address" } }}
        />
      )}
    </Box>
  );
};

export default AddressFields;
