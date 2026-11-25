import React, { useMemo, useState } from "react";
import { DesktopTimePicker } from "@mui/x-date-pickers/DesktopTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enGB } from "date-fns/locale";
import type { TimeValidationError } from "@mui/x-date-pickers/models";
import { isValid } from "date-fns";

export interface TimeFieldProps {
  label: string;
  /** Time of day as "HH:mm" (24h, e.g. "20:30"), or null/"" when empty. */
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  /** Minutes between the options in the list (default 15). */
  minutesStep?: number;
  helperText?: React.ReactNode;
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium";
  name?: string;
}

const TIME_FORMATS = { fullTime12h: "h:mm a", hours12h: "h" } as const;

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "20:30" → a Date today at 20:30 (only the time part matters to the picker). */
const toDate = (hhmm: string | null | undefined): Date | null => {
  const m = hhmm ? HHMM.exec(hhmm) : null;
  if (!m) return null;
  const d = new Date();
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
};

const toHhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/**
 * Time-of-day input ("8:30 PM") with ONE scrolling list of times (every 15 min by default) —
 * no analogue clock, easy to tap. Tapping the field opens the list; typing still works.
 * Value is a plain "HH:mm" string (what the API's opening hours use).
 */
const TimeField: React.FC<TimeFieldProps> = ({
  label,
  value,
  onChange,
  minutesStep = 15,
  helperText,
  error,
  required,
  disabled,
  fullWidth = true,
  size = "medium",
  name,
}) => {
  const [open, setOpen] = useState(false);
  const [validation, setValidation] = useState<TimeValidationError | null>(null);
  const dateValue = useMemo(() => toDate(value), [value]);
  const message = validation === "invalidDate" ? "Enter a time, e.g. 8:30 PM" : null;

  return (
    // Same adapter as the app, with list items written like the field ("8:30 PM", not "08:30 PM")
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB} dateFormats={TIME_FORMATS}>
    <DesktopTimePicker
      label={label}
      value={dateValue}
      onChange={(next) => {
        if (next === null) onChange(null);
        else if (isValid(next)) onChange(toHhmm(next));
      }}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      onError={setValidation}
      ampm
      format="h:mm a"
      timeSteps={{ minutes: minutesStep }}
      thresholdToRenderTimeInASingleColumn={24 * 60}
      skipDisabled
      disabled={disabled}
      name={name}
      slotProps={{
        field: { shouldRespectLeadingZeros: true },
        textField: {
          required,
          fullWidth,
          size,
          error: error || Boolean(message),
          helperText: message ?? helperText,
          onClick: () => !disabled && setOpen(true),
        },
        digitalClockItem: { sx: { minHeight: 44, fontVariantNumeric: "tabular-nums" } },
        layout: { sx: { "& .MuiDigitalClock-root": { maxHeight: 320, width: 160 } } },
        actionBar: { actions: [] },
      }}
    />
    </LocalizationProvider>
  );
};

export default TimeField;
