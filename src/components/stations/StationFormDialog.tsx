import React, { useEffect, useMemo, useState } from "react";
import { Box, FormControlLabel, Stack, Switch, TextField, Typography } from "@mui/material";
import { Computer, SportsEsports } from "@mui/icons-material";
import { CreatableSelect, FormDialog, MoneyField, SegmentedControl } from "@/components/ui";
import { PCStatus, type PC } from "@/types/gaming.types";
import type { StationType } from "@/types/reservation.types";
import { distinctValues, nextStationNumber } from "./stationFormat";
import { useStationMutations } from "./stationQueries";

export interface StationFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Edit this station; omit to add one. */
  station?: PC | null;
  /** All stations (for the next number, zones and spec suggestions). */
  stations: PC[];
  defaultType?: StationType;
}

type Specs = { cpu: string; gpu: string; ram: string; monitor: string };
const SPEC_FIELDS: { key: keyof Specs; label: string; noun: string }[] = [
  { key: "cpu", label: "Processor (CPU)", noun: "processor" },
  { key: "gpu", label: "Graphics card (GPU)", noun: "graphics card" },
  { key: "ram", label: "Memory (RAM)", noun: "memory size" },
  { key: "monitor", label: "Monitor", noun: "monitor" },
];

interface FormState {
  type: StationType;
  pcNumber: string;
  name: string;
  rate: number | null;
  zone: string | null;
  specs: Specs;
  notes: string;
  isActive: boolean;
  maintenance: boolean;
}

/** Add / edit a station: PC or PlayStation, number, name, hourly rate, zone (picked from the existing ones) and PC specs. */
const StationFormDialog: React.FC<StationFormDialogProps> = ({ open, onClose, station, stations, defaultType = "pc" }) => {
  const editing = Boolean(station);
  const { create, update } = useStationMutations();
  const [f, setF] = useState<FormState | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    const type = station?.type ?? defaultType;
    const sameType = stations.filter((s) => (s.type ?? "pc") === type);
    setF({
      type,
      pcNumber: station?.pcNumber ?? nextStationNumber(stations, type),
      name: station?.name ?? "",
      rate: station?.hourlyRate.usd ?? sameType[0]?.hourlyRate.usd ?? null,
      zone: station?.location || null,
      specs: { cpu: station?.specifications?.cpu ?? "", gpu: station?.specifications?.gpu ?? "", ram: station?.specifications?.ram ?? "", monitor: station?.specifications?.monitor ?? "" },
      notes: station?.notes ?? "",
      isActive: station?.isActive ?? true,
      maintenance: station?.status === PCStatus.MAINTENANCE,
    });
    setTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, station?.id]);

  const zones = useMemo(() => distinctValues(stations.map((s) => s.location)), [stations]);
  const specOptions = useMemo(
    () => Object.fromEntries(SPEC_FIELDS.map(({ key }) => [key, distinctValues(stations.map((s) => s.specifications?.[key]))])) as Record<keyof Specs, string[]>,
    [stations]
  );

  if (!f) return null;
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => (s ? { ...s, [k]: v } : s));
  const isPc = f.type === "pc";
  const duplicate = stations.some((s) => s.id !== station?.id && s.pcNumber.trim().toUpperCase() === f.pcNumber.trim().toUpperCase());
  const errors = {
    pcNumber: !f.pcNumber.trim() ? "Enter the station number" : duplicate ? "Another station already has this number" : undefined,
    name: !f.name.trim() ? "Enter a name, e.g. Gaming PC 11" : undefined,
    rate: f.rate === null ? "Enter the price per hour" : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);
  const show = (k: keyof typeof errors) => (touched ? errors[k] : undefined);
  const occupied = station?.status === PCStatus.OCCUPIED;

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    const specifications = isPc ? Object.fromEntries(Object.entries(f.specs).map(([k, v]) => [k, v.trim()])) : undefined;
    const data = {
      type: f.type,
      pcNumber: f.pcNumber.trim().toUpperCase(),
      name: f.name.trim(),
      hourlyRateUsd: f.rate!,
      location: f.zone ?? "",
      notes: f.notes.trim(),
      ...(specifications && { specifications }),
    };
    if (editing) {
      const statusChange =
        !occupied && f.maintenance !== (station!.status === PCStatus.MAINTENANCE) ? { status: f.maintenance ? PCStatus.MAINTENANCE : PCStatus.AVAILABLE } : {};
      update.mutate({ id: station!.id, data: { ...data, isActive: f.isActive, ...statusChange } }, { onSuccess: onClose });
    } else create.mutate(data, { onSuccess: onClose });
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${station!.pcNumber}` : "Add station"}
      onSubmit={submit}
      submitLabel={editing ? "Save changes" : "Add station"}
      loading={create.isPending || update.isPending}
      dividers
    >
      <Stack spacing={2.5}>
        <SegmentedControl<StationType>
          aria-label="Station type"
          value={f.type}
          size="large"
          onChange={(type) =>
            setF((s) => (s ? { ...s, type, pcNumber: editing ? s.pcNumber : nextStationNumber(stations, type), rate: editing ? s.rate : stations.find((x) => (x.type ?? "pc") === type)?.hourlyRate.usd ?? s.rate } : s))
          }
          options={[
            { value: "pc", label: "Gaming PC", icon: <Computer /> },
            { value: "playstation", label: "PlayStation", icon: <SportsEsports /> },
          ]}
        />

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 2fr" } }}>
          <TextField
            label="Station number"
            value={f.pcNumber}
            onChange={(e) => set("pcNumber", e.target.value.toUpperCase())}
            required
            error={Boolean(show("pcNumber") || duplicate)}
            helperText={show("pcNumber") ?? (duplicate ? errors.pcNumber : "Shown on receipts and bookings")}
            slotProps={{ htmlInput: { maxLength: 12 } }}
          />
          <TextField
            label="Name"
            value={f.name}
            onChange={(e) => set("name", e.target.value)}
            required
            placeholder={isPc ? "e.g. Gaming PC 11" : "e.g. PS5 Room 4"}
            error={Boolean(show("name"))}
            helperText={show("name")}
            slotProps={{ htmlInput: { maxLength: 60 } }}
          />
        </Box>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 2fr" } }}>
          <MoneyField label="Price per hour" value={f.rate} onChange={(v) => set("rate", v)} required error={Boolean(show("rate"))} helperText={show("rate")} />
          <CreatableSelect
            label="Zone"
            value={f.zone}
            onChange={(v) => set("zone", v)}
            options={zones}
            noun="zone"
            placeholder="Choose or add a zone"
            helperText="Where it is in the lounge, e.g. Front row, Private rooms"
          />
        </Box>

        {isPc && (
          <Box>
            <Typography variant="subtitle2" component="h3" sx={{ mb: 1.25 }}>
              PC specs <Typography component="span" variant="body2" color="text.secondary">(optional, shown on the website)</Typography>
            </Typography>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
              {SPEC_FIELDS.map(({ key, label, noun }) => (
                <CreatableSelect
                  key={key}
                  label={label}
                  value={f.specs[key] || null}
                  onChange={(v) => set("specs", { ...f.specs, [key]: v ?? "" })}
                  options={specOptions[key]}
                  noun={noun}
                />
              ))}
            </Box>
          </Box>
        )}

        <TextField label="Notes (optional)" value={f.notes} onChange={(e) => set("notes", e.target.value)} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 500 } }} />

        {editing && (
          <Stack spacing={1}>
            <FormControlLabel
              control={<Switch checked={f.maintenance} disabled={occupied} onChange={(e) => set("maintenance", e.target.checked)} />}
              label={
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>Under maintenance</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {occupied ? "Someone is playing on it — end the session first." : "Can't be used or booked until you switch this off."}
                  </Typography>
                </Box>
              }
              sx={{ ml: 0, gap: 1 }}
            />
            <FormControlLabel
              control={<Switch checked={f.isActive} onChange={(e) => set("isActive", e.target.checked)} />}
              label={
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>In use at the lounge</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Off = hidden from the stations screen and the website (history is kept).
                  </Typography>
                </Box>
              }
              sx={{ ml: 0, gap: 1 }}
            />
          </Stack>
        )}
      </Stack>
    </FormDialog>
  );
};

export default StationFormDialog;
