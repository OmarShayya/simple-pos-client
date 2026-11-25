import React from "react";
import { Stack } from "@mui/material";
import { DateField, SelectField } from "@/components/ui";
import { shiftDay, todayKey } from "@/utils/dateRanges";
import type { LastVisitPreset, LastVisitValue } from "./customerFormat";

const OPTIONS: { value: LastVisitPreset; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "7", label: "In the last 7 days" },
  { value: "30", label: "In the last 30 days" },
  { value: "90", label: "In the last 3 months" },
  { value: "custom", label: "Pick dates…" },
];

/** "Last visit" filter: a short list of plain choices, with From/To calendars for "Pick dates…". */
const LastVisitFilter: React.FC<{ value: LastVisitValue; onChange: (v: LastVisitValue) => void }> = ({ value, onChange }) => (
  // No minWidth: 0 here — on phones the filter wraps to its own row instead of running off the screen
  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
    <SelectField<LastVisitPreset>
      label="Last visit"
      value={value.preset}
      onChange={(preset) => onChange(preset === "custom" ? { preset, from: value.from ?? shiftDay(todayKey(), -29), to: value.to ?? todayKey() } : { preset })}
      options={OPTIONS}
      size="small"
      fullWidth={false}
      minWidth={200}
      sx={{ width: { xs: "100%", sm: "auto" } }}
    />
    {value.preset === "custom" && (
      <>
        <DateField label="From" size="small" value={value.from ?? null} onChange={(from) => onChange({ ...value, from })} maxDate={value.to ?? todayKey()} fullWidth={false} />
        <DateField label="To" size="small" value={value.to ?? null} onChange={(to) => onChange({ ...value, to })} minDate={value.from ?? undefined} maxDate={todayKey()} fullWidth={false} />
      </>
    )}
  </Stack>
);

export default LastVisitFilter;
