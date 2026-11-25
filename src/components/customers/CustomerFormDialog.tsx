import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { AddressFields, FormDialog, PhoneField } from "@/components/ui";
import type { Address, PhoneValue } from "@/components/ui";
import { customersApi } from "@/api/customers.api";
import { friendlyError } from "@/utils/apiError";
import { normalizePhone, asCountryCode } from "@/utils/phone";
import type { CreateCustomerRequest, Customer } from "@/types/customer.types";
import { useCustomerMutations } from "./customerQueries";

export interface CustomerFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Edit this customer; omit to add a new one. */
  customer?: Customer | null;
  /** Prefill a new customer (e.g. from a search that found nobody). */
  initial?: { name?: string; phone?: string; phoneCountry?: string };
  onSaved?: (customer: Customer) => void;
  /** The phone already belongs to someone: open that customer instead. */
  onOpenExisting?: (customer: Customer) => void;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emptyPhone = (country = "LB"): PhoneValue => ({ e164: "", country: asCountryCode(country), national: "", isValid: false });

const phoneFrom = (phone?: string, country?: string): PhoneValue => {
  if (!phone) return emptyPhone(country);
  const n = normalizePhone(phone, asCountryCode(country));
  return n ? { e164: n.e164, country: n.country, national: n.national, isValid: n.isValid } : { ...emptyPhone(country), e164: phone };
};

/** Address worth saving: anything beyond the default "Lebanon, nothing else". */
const meaningful = (a: Address | null) => Boolean(a && (a.city || a.area || a.street || (a.country && a.country !== "LB")));

type FieldErrors = Partial<Record<"name" | "phone" | "email" | "country", string>>;

/** Add or edit a customer: name, phone (country + number), optional email, address and notes. */
const CustomerFormDialog: React.FC<CustomerFormDialogProps> = ({ open, onClose, customer, initial, onSaved, onOpenExisting }) => {
  const editing = Boolean(customer);
  const { create, update } = useCustomerMutations();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState<PhoneValue>(emptyPhone());
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState<Address | null>(null);
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<{ message: string; field?: keyof FieldErrors; duplicatePhone?: boolean } | null>(null);
  const [findingExisting, setFindingExisting] = useState(false);

  // (Re)fill the form every time it opens
  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setServerError(null);
    setName(customer?.name ?? initial?.name ?? "");
    setPhone(phoneFrom(customer?.phone ?? initial?.phone, customer?.phoneCountry ?? initial?.phoneCountry));
    setEmail(customer?.email ?? "");
    setAddress(customer?.address ? { country: customer.address.country || "LB", city: customer.address.city ?? "", area: customer.address.area, street: customer.address.street } : null);
    setNotes(customer?.notes ?? "");
    // Only when the dialog opens (or switches to another customer) — not on every parent render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer?.id]);

  const errors: FieldErrors = {};
  if (name.trim().length < 2) errors.name = "Enter the customer's name";
  if (!phone.national && !phone.e164) errors.phone = "Enter a phone number";
  else if (!phone.isValid) errors.phone = "Check the phone number";
  if (email.trim() && !EMAIL.test(email.trim())) errors.email = "Check the email address";
  const valid = Object.keys(errors).length === 0;
  const shown = (f: keyof FieldErrors) => (touched ? errors[f] : undefined) ?? (serverError?.field === f ? serverError.message : undefined);

  const saving = create.isPending || update.isPending;

  const submit = () => {
    setTouched(true);
    setServerError(null);
    if (!valid) return;
    const payload: CreateCustomerRequest = {
      name: name.trim(),
      phone: phone.e164,
      phoneCountry: phone.country,
      email: email.trim().toLowerCase(),
      notes: notes.trim(),
    };
    if (meaningful(address)) payload.address = { country: address!.country, city: address!.city || undefined, area: address!.area, street: address!.street?.trim() || undefined };
    else if (editing && customer?.address) payload.address = {};

    const onError = (e: unknown) => {
      const message = friendlyError(e);
      const lower = message.toLowerCase();
      const field: keyof FieldErrors | undefined = lower.includes("phone") ? "phone" : lower.includes("email") ? "email" : lower.includes("country") ? "country" : undefined;
      setServerError({ message, field, duplicatePhone: field === "phone" && /already/.test(lower) });
    };
    const onSuccess = (c: Customer) => {
      onSaved?.(c);
      onClose();
    };
    if (editing) update.mutate({ id: customer!.id, data: payload }, { onSuccess, onError });
    else create.mutate(payload, { onSuccess, onError });
  };

  const openExisting = async () => {
    if (!onOpenExisting) return;
    setFindingExisting(true);
    try {
      const existing = await customersApi.getByPhone(phone.e164, phone.country);
      onClose();
      onOpenExisting(existing);
    } catch {
      setServerError({ message: "Couldn't find that customer. Search for them in the list.", field: "phone" });
    } finally {
      setFindingExisting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${customer!.name}` : "Add customer"}
      subtitle={editing ? undefined : "Only the name and phone number are needed."}
      onSubmit={submit}
      submitLabel={editing ? "Save changes" : "Add customer"}
      loading={saving}
    >
      <Stack spacing={2.5} sx={{ pt: 0.5 }}>
        {serverError && !serverError.field && <Alert severity="error">{serverError.message}</Alert>}
        {serverError?.duplicatePhone && (
          <Alert
            severity="warning"
            action={
              onOpenExisting && (
                <Button color="inherit" onClick={openExisting} disabled={findingExisting}>
                  {findingExisting ? "Opening…" : "Show customer"}
                </Button>
              )
            }
          >
            This phone number already belongs to a customer.
          </Alert>
        )}
        <TextField
          label="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus={!editing}
          error={Boolean(shown("name"))}
          helperText={shown("name")}
          slotProps={{ htmlInput: { maxLength: 100, autoComplete: "off" } }}
        />
        <PhoneField
          label="Phone"
          value={phone.e164}
          country={phone.country}
          onChange={(v) => {
            setPhone(v);
            if (serverError?.field === "phone") setServerError(null);
          }}
          required
          error={Boolean(shown("phone"))}
          helperText={shown("phone")}
        />
        <TextField
          label="Email (optional)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={Boolean(shown("email"))}
          helperText={shown("email")}
          slotProps={{ htmlInput: { autoComplete: "off", inputMode: "email" } }}
        />
        <Box>
          <Typography variant="subtitle2" component="h3" sx={{ mb: 1.25 }}>
            Address <Typography component="span" variant="body2" color="text.secondary">(optional)</Typography>
          </Typography>
          <AddressFields value={address} onChange={setAddress} errors={shown("country") ? { country: shown("country") } : undefined} />
        </Box>
        <TextField
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          minRows={2}
          placeholder="e.g. Prefers PC-07, plays on weekends"
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />
      </Stack>
    </FormDialog>
  );
};

export default CustomerFormDialog;
