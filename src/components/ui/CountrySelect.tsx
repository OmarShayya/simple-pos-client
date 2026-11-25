import React, { useMemo } from "react";
import { Autocomplete, Box, InputAdornment, TextField, Typography, createFilterOptions } from "@mui/material";
import CountryFlag from "./CountryFlag";
import { COUNTRIES, getCountry, matchesCountry, type Country } from "@/data/countries";

export interface CountrySelectProps {
  label?: string;
  /** ISO-2 code ("LB") or null. */
  value: string | null | undefined;
  onChange: (code: string | null) => void;
  /** Show the dial code ("+961") next to each name. */
  showDialCode?: boolean;
  helperText?: React.ReactNode;
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
  /** Allow clearing (default false: a country is always chosen). */
  clearable?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium";
  name?: string;
}

const baseFilter = createFilterOptions<Country>();

/** Searchable country picker (all countries, English names, flags). Lebanon and common countries first. */
const CountrySelect: React.FC<CountrySelectProps> = ({
  label = "Country",
  value,
  onChange,
  showDialCode,
  helperText,
  error,
  required,
  disabled,
  clearable = false,
  fullWidth = true,
  size = "medium",
  name,
}) => {
  const selected = useMemo(() => getCountry(value) ?? null, [value]);

  return (
    <Autocomplete<Country, false, boolean, false>
      options={COUNTRIES}
      value={selected}
      onChange={(_, c) => onChange(c?.code ?? null)}
      disableClearable={!clearable}
      disabled={disabled}
      fullWidth={fullWidth}
      size={size}
      autoHighlight
      groupBy={(c) => (c.common ? "Common" : "All countries")}
      getOptionLabel={(c) => c.name}
      isOptionEqualToValue={(a, b) => a.code === b.code}
      filterOptions={(options, state) =>
        state.inputValue && state.inputValue !== selected?.name ? options.filter((c) => matchesCountry(c, state.inputValue)) : baseFilter(options, { ...state, inputValue: "" })
      }
      renderOption={({ key, ...props }, c) => (
        <Box component="li" key={key} {...props} sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <CountryFlag code={c.code} />
          <Typography component="span" sx={{ flex: 1, minWidth: 0 }} noWrap>
            {c.name}
          </Typography>
          {showDialCode && (
            <Typography component="span" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {c.dialCode}
            </Typography>
          )}
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          name={name}
          required={required}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            startAdornment: selected ? (
              <InputAdornment position="start" sx={{ ml: 0.75, mr: 0 }}>
                <CountryFlag code={selected.code} />
              </InputAdornment>
            ) : undefined,
          }}
          inputProps={{ ...params.inputProps, autoComplete: "country-name" }}
        />
      )}
    />
  );
};

export default CountrySelect;
