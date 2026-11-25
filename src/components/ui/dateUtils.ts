import type { DateValidationError, DateTimeValidationError } from "@mui/x-date-pickers/models";
import { format as formatDateFns, isValid } from "date-fns";

/** How dates read in every date field: "25 Nov 2026". */
export const DISPLAY_DATE_FORMAT = "dd MMM yyyy";

/** "YYYY-MM-DD" → local Date at midnight (what the picker expects). */
export const dayToDate = (day: string | null | undefined): Date | null => {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Picker Date → "YYYY-MM-DD" (null when empty/invalid). */
export const dateToDay = (date: Date | null): string | null => (date && isValid(date) ? formatDateFns(date, "yyyy-MM-dd") : null);

/** Plain-language messages for picker validation errors. */
export const dateErrorMessage = (
  reason: DateValidationError | DateTimeValidationError | null,
  limits: { min?: string; max?: string } = {}
): string | null => {
  switch (reason) {
    case null:
      return null;
    case "invalidDate":
      return "Enter a full date, e.g. 25 Nov 2026";
    case "minDate":
    case "minTime":
    case "minutesStep":
      return limits.min ? `Choose ${limits.min} or later` : "This date is too early";
    case "maxDate":
    case "maxTime":
      return limits.max ? `Choose ${limits.max} or earlier` : "This date is too late";
    case "disablePast":
      return "Choose today or a later date";
    case "disableFuture":
      return "Choose today or an earlier date";
    case "shouldDisableDate":
    case "shouldDisableMonth":
    case "shouldDisableYear":
    case "shouldDisableTime-hours":
    case "shouldDisableTime-minutes":
    case "shouldDisableTime-seconds":
      return "This date isn't available";
    default:
      return "Check this date";
  }
};
