import React, { useMemo, useState } from "react";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import type { DateTimeValidationError } from "@mui/x-date-pickers/models";
import { isValid } from "date-fns";
import { formatDateTime } from "@/utils/format";
import { dateErrorMessage } from "./dateUtils";

export interface DateTimeFieldProps {
  label: string;
  /** An instant (Date or ISO string), or null. */
  value: Date | string | null | undefined;
  onChange: (value: Date | null) => void;
  minDateTime?: Date | string;
  maxDateTime?: Date | string;
  disablePast?: boolean;
  disableFuture?: boolean;
  /** Minute step in the time list (default 5). */
  minutesStep?: number;
  helperText?: React.ReactNode;
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium";
  name?: string;
}

const toDateOrNull = (v: Date | string | null | undefined) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isValid(d) ? d : null;
};

/**
 * Date + time input ("25 Nov 2026, 9:30 PM") with a calendar and a time list.
 * Shows the device's local time (POS devices run on Lebanon time). To build an instant from a
 * lounge-time day + "HH:mm" instead, use `zonedToUtc` from `@/utils/zonedTime`.
 */
const DateTimeField: React.FC<DateTimeFieldProps> = ({
  label,
  value,
  onChange,
  minDateTime,
  maxDateTime,
  disablePast,
  disableFuture,
  minutesStep = 5,
  helperText,
  error,
  required,
  disabled,
  clearable = true,
  fullWidth = true,
  size = "medium",
  name,
}) => {
  const [open, setOpen] = useState(false);
  const [validation, setValidation] = useState<DateTimeValidationError | null>(null);
  const valueKey = value instanceof Date ? value.getTime() : value ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by time, not object identity
  const dateValue = useMemo(() => toDateOrNull(value), [valueKey]);
  const min = useMemo(() => toDateOrNull(minDateTime) ?? undefined, [minDateTime]);
  const max = useMemo(() => toDateOrNull(maxDateTime) ?? undefined, [maxDateTime]);
  const message = dateErrorMessage(validation, { min: min ? formatDateTime(min) : undefined, max: max ? formatDateTime(max) : undefined });

  return (
    <DateTimePicker
      label={label}
      value={dateValue}
      onChange={(next) => {
        if (next === null) onChange(null);
        else if (isValid(next)) onChange(next);
      }}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      onError={setValidation}
      format="dd MMM yyyy, h:mm a"
      ampm
      minDateTime={min}
      maxDateTime={max}
      disablePast={disablePast}
      disableFuture={disableFuture}
      timeSteps={{ minutes: minutesStep }}
      disabled={disabled}
      name={name}
      slotProps={{
        field: { clearable, onClear: () => onChange(null) },
        textField: {
          required,
          fullWidth,
          size,
          error: error || Boolean(message),
          helperText: message ?? helperText,
          onClick: () => !disabled && setOpen(true),
        },
        actionBar: { actions: clearable ? ["clear", "accept"] : ["accept"] },
      }}
    />
  );
};

export default DateTimeField;
