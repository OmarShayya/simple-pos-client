import React, { useEffect, useState } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import DateField from "./DateField";
import { formatDateRange } from "@/utils/format";
import { DATE_RANGE_PRESETS, getPresetRange, todayKey, type DateRangePreset, type DateRangeValue } from "@/utils/dateRanges";

export type { DateRangePreset, DateRangeValue };

export interface DateRangeFieldProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  /** Which presets to offer (default: all, in the standard order). */
  presets?: DateRangePreset[];
  /** Accessible name of the chip group. Default "Date range". */
  label?: string;
  /** Latest selectable day for Custom ("YYYY-MM-DD"). Default: today. Pass null for no limit. */
  maxDate?: string | null;
  /** Show the resolved range ("18–24 Nov 2026") next to the chips. Default true. */
  showSummary?: boolean;
}

/**
 * Date-range picker built from preset chips (Today, Yesterday, This week, Last 7 days, This month,
 * Last month, Custom). Custom shows From/To calendars; To can't be before From. Values are
 * "YYYY-MM-DD" days in the lounge timezone — send them straight to the API as `from`/`to`.
 */
const DateRangeField: React.FC<DateRangeFieldProps> = ({
  value,
  onChange,
  presets = DATE_RANGE_PRESETS.map((p) => p.id),
  label = "Date range",
  maxDate,
  showSummary = true,
}) => {
  const [draft, setDraft] = useState({ from: value.from, to: value.to });
  useEffect(() => setDraft({ from: value.from, to: value.to }), [value.from, value.to]);

  const max = maxDate === undefined ? todayKey() : maxDate ?? undefined;
  const toBeforeFrom = Boolean(draft.from && draft.to && draft.to < draft.from);

  const pick = (preset: DateRangePreset) => {
    if (preset === "custom") onChange({ preset, from: value.from, to: value.to });
    else onChange(getPresetRange(preset));
  };

  const updateCustom = (next: { from: string | null; to: string | null }) => {
    const d = { from: next.from ?? "", to: next.to ?? "" };
    setDraft(d);
    if (d.from && d.to && d.to >= d.from) onChange({ preset: "custom", from: d.from, to: d.to });
  };

  return (
    <Box>
      <Stack direction="row" useFlexGap flexWrap="wrap" alignItems="center" spacing={1} role="group" aria-label={label}>
        {DATE_RANGE_PRESETS.filter((p) => presets.includes(p.id)).map((p) => {
          const selected = value.preset === p.id;
          return (
            <Chip
              key={p.id}
              label={p.label}
              clickable
              onClick={() => pick(p.id)}
              color={selected ? "primary" : "default"}
              variant={selected ? "filled" : "outlined"}
              aria-pressed={selected}
              sx={{ height: 40, px: 0.5, fontSize: "0.875rem", fontWeight: selected ? 600 : 500, borderRadius: 2 }}
            />
          );
        })}
        {showSummary && value.preset !== "custom" && (
          <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: 0.5 }, fontVariantNumeric: "tabular-nums" }}>
            {formatDateRange(value.from, value.to)}
          </Typography>
        )}
      </Stack>

      {value.preset === "custom" && (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2, maxWidth: { sm: 520 } }}>
          <DateField
            label="From"
            value={draft.from || null}
            onChange={(from) => updateCustom({ from, to: draft.to || null })}
            maxDate={max}
            clearable={false}
          />
          <DateField
            label="To"
            value={draft.to || null}
            onChange={(to) => updateCustom({ from: draft.from || null, to })}
            minDate={draft.from || undefined}
            maxDate={max}
            clearable={false}
            error={toBeforeFrom}
            helperText={toBeforeFrom ? "The end date must be on or after the start date" : undefined}
          />
        </Stack>
      )}
    </Box>
  );
};

export default DateRangeField;
