import React, { useEffect, useState } from "react";
import { Box, FormControlLabel, Stack, Switch, TextField, Typography } from "@mui/material";
import { Inventory2Outlined, RoomServiceOutlined } from "@mui/icons-material";
import { FormDialog, MoneyField, QuantityStepper, SegmentedControl, SelectField } from "@/components/ui";
import { useCurrentRate } from "@/components/exchange/exchangeQueries";
import { formatNumber, roundMoney } from "@/utils/format";
import { fonts } from "@/theme/tokens";
import type { Category } from "@/types/category.types";
import type { CreateProductRequest, Product, ProductType, UpdateProductRequest } from "@/types/product.types";
import ImageUploadField from "./ImageUploadField";
import { useProductMutations } from "./productQueries";

export interface ProductFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Edit this product; omit to add one. */
  product?: Product | null;
  categories: Category[];
}

interface FormState {
  type: ProductType;
  name: string;
  sku: string;
  category: string;
  description: string;
  usd: number | null;
  lbp: number | null;
  quantity: number;
  minStock: number;
  image?: string;
  onMenu: boolean;
}

const suggestSku = () => `SKU-${Date.now().toString().slice(-6)}`;

const initialState = (p?: Product | null): FormState => ({
  type: p?.productType ?? "physical",
  name: p?.name ?? "",
  sku: p?.sku ?? suggestSku(),
  category: p?.category?.id ?? "",
  description: p?.description ?? "",
  usd: p ? p.pricing.usd : null,
  lbp: p ? p.pricing.lbp : null,
  quantity: p?.inventory?.quantity ?? 0,
  minStock: p?.inventory?.minStockLevel ?? 5,
  image: p?.image || undefined,
  onMenu: p?.displayOnMenu ?? true,
});

/** Add / edit a product: type, name, category, price in $ (LBP follows the exchange rate), stock, photo, menu. */
const ProductFormDialog: React.FC<ProductFormDialogProps> = ({ open, onClose, product, categories }) => {
  const editing = Boolean(product);
  const rate = useCurrentRate().data?.rate;
  const { create, update } = useProductMutations();
  const [f, setF] = useState<FormState>(() => initialState(product));
  const [touched, setTouched] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF(initialState(product));
    setTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));
  const physical = f.type === "physical";

  const setUsd = (usd: number | null) => setF((s) => ({ ...s, usd, lbp: usd !== null && rate ? Math.round(usd * rate) : s.lbp }));
  const setLbp = (lbp: number | null) => setF((s) => ({ ...s, lbp, usd: lbp !== null && rate ? roundMoney(lbp / rate) : s.usd }));

  const errors = {
    name: f.name.trim().length < 2 ? "Enter the product name" : undefined,
    sku: physical && !editing && !f.sku.trim() ? "Enter a code (any short code or the barcode)" : undefined,
    category: !f.category ? "Choose a category" : undefined,
    usd: physical && (f.usd === null || f.usd <= 0) ? "Enter the price" : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);
  const show = (k: keyof typeof errors) => (touched ? errors[k] : undefined);

  const submit = () => {
    setTouched(true);
    if (!valid || uploading) return;
    const pricing = f.usd !== null && f.usd > 0 ? { usd: f.usd, lbp: f.lbp ?? Math.round(f.usd * (rate ?? 0)) } : undefined;
    const inventory = physical ? { quantity: f.quantity, minStockLevel: f.minStock } : undefined;
    const close = { onSuccess: onClose };
    if (editing) {
      const data: UpdateProductRequest = {
        name: f.name.trim(),
        description: f.description.trim(),
        category: f.category,
        image: f.image ?? "",
        displayOnMenu: f.onMenu,
        ...(pricing && { pricing }),
        ...(inventory && { inventory }),
      };
      update.mutate({ id: product!.id, data }, close);
    } else {
      const data: CreateProductRequest = {
        name: f.name.trim(),
        productType: f.type,
        category: f.category,
        description: f.description.trim() || undefined,
        image: f.image,
        displayOnMenu: f.onMenu,
        ...(physical && { sku: f.sku.trim() }),
        ...(pricing && { pricing }),
        ...(inventory && { inventory }),
      };
      create.mutate(data, close);
    }
  };

  const activeCategories = categories.filter((c) => c.isActive || c.id === f.category);

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${product!.name}` : "Add product"}
      onSubmit={submit}
      submitLabel={editing ? "Save changes" : "Add product"}
      loading={create.isPending || update.isPending}
      submitDisabled={uploading}
      dividers
    >
      <Stack spacing={2.5}>
        <Box>
          <SegmentedControl<ProductType>
            aria-label="Kind of product"
            value={f.type}
            onChange={(v) => !editing && set("type", v)}
            options={[
              { value: "physical", label: "Item with stock", icon: <Inventory2Outlined />, disabled: editing },
              { value: "service", label: "Service (no stock)", icon: <RoomServiceOutlined />, disabled: editing },
            ]}
          />
          {editing && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              The kind of product can't be changed after it is created.
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: physical ? "2fr 1fr" : "1fr" } }}>
          <TextField label="Name" value={f.name} onChange={(e) => set("name", e.target.value)} required autoFocus={!editing} error={Boolean(show("name"))} helperText={show("name")} slotProps={{ htmlInput: { maxLength: 100 } }} />
          {physical && (
            <TextField
              label="Code (SKU)"
              value={f.sku}
              onChange={(e) => set("sku", e.target.value.toUpperCase())}
              required={!editing}
              disabled={editing}
              error={Boolean(show("sku"))}
              helperText={show("sku") ?? (editing ? "Can't be changed" : "Any short code, or scan the barcode")}
              slotProps={{ htmlInput: { style: { fontFamily: fonts.mono } } }}
            />
          )}
        </Box>

        <SelectField<string>
          label="Category"
          value={f.category}
          onChange={(v) => set("category", v)}
          options={activeCategories.map((c) => ({ value: c.id, label: c.name }))}
          required
          error={Boolean(show("category"))}
          helperText={show("category") ?? (activeCategories.length ? undefined : "Add a category first (Catalog → Categories)")}
        />

        <Box>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
            <MoneyField label={physical ? "Price" : "Price (optional)"} value={f.usd} onChange={setUsd} required={physical} error={Boolean(show("usd"))} helperText={show("usd")} />
            <MoneyField label="Price in LBP" currency="LBP" value={f.lbp} onChange={setLbp} />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            {rate ? `LBP follows the exchange rate (1 USD = ${formatNumber(rate)} LBP) — you can still change it.` : "Loading the exchange rate…"}
          </Typography>
        </Box>

        {physical && (
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
            <Box>
              <Typography variant="subtitle2" component="div" sx={{ mb: 1 }}>
                In stock
              </Typography>
              <QuantityStepper label="In stock" value={f.quantity} min={0} max={99999} size="large" onChange={(v) => set("quantity", v)} />
            </Box>
            <Box>
              <Typography variant="subtitle2" component="div" sx={{ mb: 1 }}>
                Warn when stock is at or below
              </Typography>
              <QuantityStepper label="Low-stock warning level" value={f.minStock} min={0} max={9999} size="large" onChange={(v) => set("minStock", v)} />
            </Box>
          </Box>
        )}

        <TextField label="Description (optional)" value={f.description} onChange={(e) => set("description", e.target.value)} multiline minRows={2} helperText="Shown on the website menu" slotProps={{ htmlInput: { maxLength: 500 } }} />

        <ImageUploadField value={f.image} onChange={(url) => set("image", url)} folder="products" onUploadingChange={setUploading} />

        <FormControlLabel
          control={<Switch checked={f.onMenu} onChange={(e) => set("onMenu", e.target.checked)} />}
          label={
            <Box>
              <Typography sx={{ fontWeight: 600 }}>Show on the website menu</Typography>
              <Typography variant="body2" color="text.secondary">
                Customers can order it online.
              </Typography>
            </Box>
          }
          sx={{ alignItems: "center", ml: 0, gap: 1 }}
        />
      </Stack>
    </FormDialog>
  );
};

export default ProductFormDialog;
