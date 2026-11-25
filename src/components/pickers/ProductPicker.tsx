import React from "react";
import { Autocomplete, Box, TextField, Typography } from "@mui/material";
import { formatUsd } from "@/utils/format";
import type { Product } from "@/types/product.types";

export interface ProductPickerProps {
  label?: string;
  /** Selected product id. */
  value: string | null | undefined;
  onChange: (productId: string | null) => void;
  products: Product[];
  loading?: boolean;
  helperText?: React.ReactNode;
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
}

/** Searchable product list (name, SKU or category) for choosing one product. */
const ProductPicker: React.FC<ProductPickerProps> = ({ label = "Product", value, onChange, products, loading, helperText, error, required, disabled }) => {
  const selected = products.find((p) => p.id === value) ?? null;
  return (
    <Autocomplete<Product>
      options={products}
      value={selected}
      onChange={(_, p) => onChange(p?.id ?? null)}
      loading={loading}
      disabled={disabled}
      autoHighlight
      groupBy={(p) => p.category?.name ?? "Other"}
      getOptionLabel={(p) => p.name}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      filterOptions={(opts, state) => {
        const q = state.inputValue.trim().toLowerCase();
        if (!q || q === selected?.name.toLowerCase()) return opts;
        return opts.filter((p) => [p.name, p.sku, p.category?.name].some((s) => s?.toLowerCase().includes(q)));
      }}
      noOptionsText="No product matches"
      renderOption={({ key, ...props }, p) => (
        <Box component="li" key={key} {...props} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
          <Typography component="span" noWrap>
            {p.name}
          </Typography>
          <Typography component="span" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
            {formatUsd(p.pricing.usd)}
          </Typography>
        </Box>
      )}
      renderInput={(params) => <TextField {...params} label={label} helperText={helperText} error={error} required={required} placeholder="Search products" />}
    />
  );
};

export default ProductPicker;
