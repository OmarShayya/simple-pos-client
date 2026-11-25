import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Autocomplete, Box, Button, CircularProgress, Stack, TextField, Typography } from "@mui/material";
import { PersonAddAlt1Outlined, SearchRounded } from "@mui/icons-material";
import { PhoneField } from "@/components/ui";
import { customersApi } from "@/api/customers.api";
import { queryKeys } from "@/api/queryKeys";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatPhone, normalizePhone } from "@/utils/phone";
import { customerChoiceError, type CustomerChoice, type PickedCustomer } from "./customerChoice";

export interface CustomerPickerProps {
  value: CustomerChoice | null;
  onChange: (value: CustomerChoice | null) => void;
  /** Gaming: a name alone is fine ("Team Phoenix"). Counter sales: a new customer needs a phone. */
  nameOnlyOk?: boolean;
  label?: string;
  autoFocus?: boolean;
  size?: "small" | "medium";
}

const looksLikePhone = (s: string) => /^[+\d][\d\s-]{3,}$/.test(s.trim());

/**
 * Optional customer: search existing ones by name or phone (any format), or add a new one with
 * name + phone (country code dropdown). Used by the POS cart and the "Start session" dialog.
 */
const CustomerPicker: React.FC<CustomerPickerProps> = ({ value, onChange, nameOnlyOk, label = "Customer (optional)", autoFocus, size = "medium" }) => {
  const [input, setInput] = useState("");
  const term = useDebouncedValue(input.trim(), 250);
  const enabled = term.length >= 2 && value?.mode !== "new";
  const search = useQuery({
    queryKey: queryKeys.customers.list({ search: term, limit: 8, picker: true }),
    queryFn: () => customersApi.getAll({ search: term, limit: 8 }),
    enabled,
    staleTime: 30_000,
  });
  const options: PickedCustomer[] = enabled ? (search.data?.data ?? []).map((c) => ({ id: c.id, name: c.name, phone: c.phone })) : [];

  const startNew = () => {
    const typed = input.trim();
    const phone = looksLikePhone(typed) ? normalizePhone(typed) : null;
    onChange({ mode: "new", name: phone ? "" : typed, phone });
  };

  if (value?.mode === "new") {
    const error = customerChoiceError(value, nameOnlyOk);
    return (
      <Box>
        <Stack spacing={1.5}>
          <TextField
            label={nameOnlyOk ? "Customer name" : "New customer name"}
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            autoFocus={!value.name}
            size={size}
            required={!nameOnlyOk}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 80 } }}
          />
          <PhoneField
            label={nameOnlyOk ? "Phone (optional)" : "Phone"}
            value={value.phone?.e164 || value.phone?.national || ""}
            country={value.phone?.country}
            onChange={(phone) => onChange({ ...value, phone })}
            size={size}
            required={!nameOnlyOk}
            helperText={nameOnlyOk ? "With a phone number the customer is saved for next time." : undefined}
          />
        </Stack>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mt: 0.75, flexWrap: "wrap" }}>
          <Typography variant="body2" color={error && value.phone?.national ? "error" : "text.secondary"}>
            {error && (value.phone?.national || value.name) ? error : ""}
          </Typography>
          <Button variant="text" startIcon={<SearchRounded />} onClick={() => onChange(null)}>
            Find an existing customer
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Autocomplete<PickedCustomer>
        options={options}
        value={value?.mode === "existing" ? value.customer : null}
        onChange={(_, c) => onChange(c ? { mode: "existing", customer: c } : null)}
        inputValue={input}
        onInputChange={(_, v) => setInput(v)}
        filterOptions={(x) => x}
        getOptionLabel={(c) => (c.phone ? `${c.name} · ${formatPhone(c.phone)}` : c.name)}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        loading={enabled && search.isFetching}
        noOptionsText={
          term.length < 2 ? (
            "Type a name or phone number"
          ) : (
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                No customer found for “{term}”.
              </Typography>
              <Button variant="outlined" size="small" startIcon={<PersonAddAlt1Outlined />} onMouseDown={(e) => e.preventDefault()} onClick={startNew}>
                Add as new customer
              </Button>
            </Box>
          )
        }
        renderOption={(props, c) => {
          const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };
          return (
            <li key={key} {...rest}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 500 }}>{c.name}</Typography>
                {c.phone && (
                  <Typography variant="body2" color="text.secondary">
                    {formatPhone(c.phone)}
                  </Typography>
                )}
              </Box>
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder="Search by name or phone"
            autoFocus={autoFocus}
            size={size}
            slotProps={{
              input: {
                ...params.InputProps,
                endAdornment: (
                  <>
                    {enabled && search.isFetching ? <CircularProgress color="inherit" size={18} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
      />
      {!value && (
        <Button variant="text" startIcon={<PersonAddAlt1Outlined />} onClick={startNew} sx={{ mt: 0.5 }}>
          New customer
        </Button>
      )}
    </Box>
  );
};

export default CustomerPicker;
