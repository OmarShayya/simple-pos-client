import React, { useEffect, useState } from "react";
import { Box, FormControlLabel, Stack, Switch, TextField, Typography } from "@mui/material";
import { DateField, FormDialog, SelectField } from "@/components/ui";
import { NumberField } from "@/components/kit-extras";
import ProductPicker from "@/components/products/ProductPicker";
import { useAllProducts, useCategories } from "@/components/products/productQueries";
import { dayKey } from "@/utils/format";
import { todayKey } from "@/utils/dateRanges";
import { DiscountTarget, type CreateDiscountRequest, type Discount } from "@/types/discount.types";
import { TARGET_OPTIONS, dayEndIso, dayStartIso, targetIdOf } from "./discountFormat";
import { useDiscountMutations } from "./discountQueries";

export interface DiscountFormDialogProps {
  open: boolean;
  onClose: () => void;
  discount?: Discount | null;
}

interface FormState {
  name: string;
  description: string;
  value: number | null;
  target: DiscountTarget;
  targetId: string | null;
  from: string | null;
  until: string | null;
  isActive: boolean;
}

const initial = (d?: Discount | null): FormState => ({
  name: d?.name ?? "",
  description: d?.description ?? "",
  value: d?.value ?? null,
  target: d?.target ?? DiscountTarget.SALE,
  targetId: d ? targetIdOf(d) ?? null : null,
  from: d?.startDate ? dayKey(d.startDate) : null,
  until: d?.endDate ? dayKey(d.endDate) : null,
  isActive: d?.isActive ?? true,
});

const needsTarget = (t: DiscountTarget) => t === DiscountTarget.PRODUCT || t === DiscountTarget.CATEGORY;

/** Create / edit a percentage discount: what it applies to and (optionally) when. */
const DiscountFormDialog: React.FC<DiscountFormDialogProps> = ({ open, onClose, discount }) => {
  const editing = Boolean(discount);
  const [f, setF] = useState<FormState>(() => initial(discount));
  const [touched, setTouched] = useState(false);
  const { create, update } = useDiscountMutations();
  const products = useAllProducts();
  const categories = useCategories();

  useEffect(() => {
    if (!open) return;
    setF(initial(discount));
    setTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, discount?.id]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  const errors = {
    name: f.name.trim().length < 2 ? "Enter a name staff will recognise, e.g. Happy hour" : undefined,
    value: f.value === null || f.value < 1 || f.value > 100 ? "Enter a percentage from 1 to 100" : undefined,
    targetId: needsTarget(f.target) && !f.targetId ? (f.target === DiscountTarget.PRODUCT ? "Choose the product" : "Choose the category") : undefined,
    until: f.from && f.until && f.until < f.from ? "The end date must be on or after the start date" : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);
  const show = (k: keyof typeof errors) => (touched ? errors[k] : undefined);

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    const base = {
      name: f.name.trim(),
      description: f.description.trim(),
      value: f.value!,
      target: f.target,
      isActive: f.isActive,
    };
    if (editing) {
      update.mutate(
        {
          id: discount!.id,
          data: {
            ...base,
            targetId: needsTarget(f.target) ? f.targetId : null,
            startDate: f.from ? dayStartIso(f.from) : null,
            endDate: f.until ? dayEndIso(f.until) : null,
          },
        },
        { onSuccess: onClose }
      );
    } else {
      const data: CreateDiscountRequest = {
        ...base,
        description: base.description || undefined,
        ...(needsTarget(f.target) && f.targetId ? { targetId: f.targetId } : {}),
        ...(f.from ? { startDate: dayStartIso(f.from) } : {}),
        ...(f.until ? { endDate: dayEndIso(f.until) } : {}),
      };
      create.mutate(data, { onSuccess: onClose });
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${discount!.name}` : "New discount"}
      onSubmit={submit}
      submitLabel={editing ? "Save changes" : "Create discount"}
      loading={create.isPending || update.isPending}
    >
      <Stack spacing={2.5} sx={{ pt: 0.5 }}>
        <TextField label="Name" value={f.name} onChange={(e) => set("name", e.target.value)} required autoFocus={!editing} error={Boolean(show("name"))} helperText={show("name") ?? "Staff pick it by this name at the counter"} slotProps={{ htmlInput: { maxLength: 80 } }} />
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "160px 1fr" } }}>
          <NumberField label="Discount" value={f.value} onChange={(v) => set("value", v)} min={1} max={100} suffix="%" required error={Boolean(show("value"))} helperText={show("value")} />
          <SelectField<DiscountTarget>
            label="Applies to"
            value={f.target}
            onChange={(t) => setF((s) => ({ ...s, target: t, targetId: null }))}
            options={TARGET_OPTIONS}
            required
          />
        </Box>
        {f.target === DiscountTarget.PRODUCT && (
          <ProductPicker value={f.targetId} onChange={(id) => set("targetId", id)} products={products.data ?? []} loading={products.isLoading} required error={Boolean(show("targetId"))} helperText={show("targetId")} />
        )}
        {f.target === DiscountTarget.CATEGORY && (
          <SelectField<string>
            label="Category"
            value={f.targetId ?? ""}
            onChange={(id) => set("targetId", id)}
            options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
            required
            error={Boolean(show("targetId"))}
            helperText={show("targetId")}
          />
        )}

        <Box>
          <Typography variant="subtitle2" component="h3" sx={{ mb: 0.5 }}>
            When it applies <Typography component="span" variant="body2" color="text.secondary">(optional)</Typography>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Leave both empty to keep it running until you turn it off.
          </Typography>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
            <DateField label="Starts on" value={f.from} onChange={(d) => set("from", d)} maxDate={f.until ?? undefined} />
            <DateField
              label="Ends on (last day)"
              value={f.until}
              onChange={(d) => set("until", d)}
              minDate={f.from ?? (editing ? undefined : todayKey())}
              error={Boolean(show("until"))}
              helperText={show("until")}
            />
          </Box>
        </Box>

        <TextField label="Note for staff (optional)" value={f.description} onChange={(e) => set("description", e.target.value)} multiline minRows={2} placeholder="e.g. Only for students with an ID" slotProps={{ htmlInput: { maxLength: 300 } }} />

        <FormControlLabel
          control={<Switch checked={f.isActive} onChange={(e) => set("isActive", e.target.checked)} />}
          label={
            <Box>
              <Typography sx={{ fontWeight: 600 }}>{f.isActive ? "Turned on" : "Turned off"}</Typography>
              <Typography variant="body2" color="text.secondary">
                Only turned-on discounts can be picked at the counter.
              </Typography>
            </Box>
          }
          sx={{ ml: 0, gap: 1 }}
        />
      </Stack>
    </FormDialog>
  );
};

export default DiscountFormDialog;
