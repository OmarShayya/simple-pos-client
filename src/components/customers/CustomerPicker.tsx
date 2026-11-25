import React, { useState } from "react";
import { Autocomplete, Box, InputAdornment, TextField, Typography } from "@mui/material";
import { PersonSearchRounded } from "@mui/icons-material";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { customersApi } from "@/api/customers.api";
import { queryKeys } from "@/api/queryKeys";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatPhone } from "@/utils/phone";
import type { Customer } from "@/types/customer.types";

export interface CustomerPickerProps {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  label?: string;
  placeholder?: string;
  helperText?: React.ReactNode;
  disabled?: boolean;
  size?: "small" | "medium";
  autoFocus?: boolean;
}

const LIMIT = 8;

/**
 * Find an existing customer by name, phone (any format: "70 123", "0096170…") or email.
 * Searches the server as you type; pick one to link them. Nobody found → the caller shows
 * name + phone fields for a new customer (the API links or creates by phone).
 */
const CustomerPicker: React.FC<CustomerPickerProps> = ({
  value,
  onChange,
  label = "Find a customer",
  placeholder = "Name or phone number",
  helperText,
  disabled,
  size = "medium",
  autoFocus,
}) => {
  const [input, setInput] = useState("");
  const term = useDebouncedValue(input.trim(), 250);
  const searching = term.length >= 2 && term !== value?.name;

  const q = useQuery({
    queryKey: queryKeys.customers.list({ search: term, limit: LIMIT, picker: true }),
    queryFn: () => customersApi.getAll({ search: term, limit: LIMIT }),
    enabled: searching,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
  const options = searching ? q.data?.data ?? [] : value ? [value] : [];

  return (
    <Autocomplete<Customer, false, false, false>
      value={value}
      onChange={(_, c) => onChange(c)}
      inputValue={input}
      onInputChange={(_, v) => setInput(v)}
      options={options}
      filterOptions={(o) => o}
      getOptionLabel={(c) => c.name}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      loading={searching && q.isFetching}
      autoHighlight
      disabled={disabled}
      size={size}
      noOptionsText={term.length < 2 ? "Type at least 2 letters or digits" : "No customer found — fill in the name and phone below"}
      loadingText="Searching…"
      renderOption={({ key, ...props }, c) => (
        <Box component="li" key={key} {...props} sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start !important", py: "8px !important" }}>
          <Typography component="span" sx={{ fontWeight: 500 }}>
            {c.name}
          </Typography>
          <Typography component="span" variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {formatPhone(c.phone, c.phoneCountry)}
            {c.email ? ` · ${c.email}` : ""}
          </Typography>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          helperText={helperText}
          autoFocus={autoFocus}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                <InputAdornment position="start" sx={{ ml: 0.5 }}>
                  <PersonSearchRounded fontSize="small" />
                </InputAdornment>
                {params.InputProps.startAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};

export default CustomerPicker;
