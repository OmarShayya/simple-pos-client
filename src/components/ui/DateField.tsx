import React, { useMemo, useState } from "react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import type { DateValidationError } from "@mui/x-date-pickers/models";
import { isValid } from "date-fns";
import { formatDate } from "@/utils/format";
import { DISPLAY_DATE_FORMAT, dateErrorMessage, dateToDay, dayToDate } from "./dateUtils";

export interface DateFieldProps {
  label: string;
  /** Calendar day as "YYYY-MM-DD" (no timezone shifts), or null. */
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  minDate?: string;
  maxDate?: string;
  disablePast?: boolean;
  disableFuture?: boolean;
  /** Return true to grey out a day ("YYYY-MM-DD"). */
  shouldDisableDate?: (day: string) => boolean;
  helperText?: React.ReactNode;
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
  /** Show a clear (×) button when there's a value. Default true. */
  clearable?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium";
  name?: string;
  autoFocus?: boolean;
}

/**
 * Date input with a calendar popup ("25 Nov 2026"). Tapping the field opens the calendar;
 * keyboard users can still type. Value is a plain "YYYY-MM-DD" day — perfect for API filters.
 */
const DateField: React.FC<DateFieldProps> = ({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  disablePast,
  disableFuture,
  shouldDisableDate,
  helperText,
  error,
  required,
  disabled,
  clearable = true,
  fullWidth = true,
  size = "medium",
  name,
  autoFocus,
}) => {
  const [open, setOpen] = useState(false);
  const [validation, setValidation] = useState<DateValidationError | null>(null);
  // Memoised so the picker doesn't see a "new" value on every render (that would reset typing)
  const dateValue = useMemo(() => dayToDate(value), [value]);
  const min = useMemo(() => dayToDate(minDate) ?? undefined, [minDate]);
  const max = useMemo(() => dayToDate(maxDate) ?? undefined, [maxDate]);
  const message = dateErrorMessage(validation, { min: minDate ? formatDate(minDate) : undefined, max: maxDate ? formatDate(maxDate) : undefined });

  return (
    <DatePicker
      label={label}
      value={dateValue}
      onChange={(next) => {
        if (next === null) onChange(null);
        else if (isValid(next)) onChange(dateToDay(next));
      }}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      onError={setValidation}
      format={DISPLAY_DATE_FORMAT}
      minDate={min}
      maxDate={max}
      disablePast={disablePast}
      disableFuture={disableFuture}
      shouldDisableDate={shouldDisableDate ? (d) => shouldDisableDate(dateToDay(d) ?? "") : undefined}
      disabled={disabled}
      autoFocus={autoFocus}
      name={name}
      showDaysOutsideCurrentMonth
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
        actionBar: { actions: clearable ? ["clear", "today"] : ["today"] },
      }}
    />
  );
};

export default DateField;
