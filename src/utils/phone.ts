import {
  AsYouType,
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

/**
 * Phone helpers (client side). Mirrors the backend contract: phones are stored in E.164
 * ("+96170123456") plus `phoneCountry` (ISO-2, e.g. "LB"). Legacy rows may hold local
 * Lebanese formats ("70123456", "03 555 777") — those are read as Lebanon.
 */

export type { CountryCode };
export const DEFAULT_PHONE_COUNTRY: CountryCode = "LB";

export interface NormalizedPhone {
  e164: string;
  country: CountryCode;
  /** National digits without the trunk prefix ("70123456"). */
  national: string;
  isValid: boolean;
}

export const asCountryCode = (code: string | null | undefined, fallback: CountryCode = DEFAULT_PHONE_COUNTRY): CountryCode => {
  const upper = (code ?? "").toUpperCase();
  return isSupportedCountry(upper) ? (upper as CountryCode) : fallback;
};

export const dialCode = (country: CountryCode) => `+${getCountryCallingCode(country)}`;

/** Clean user/legacy input: keep digits and a leading "+", turn a leading "00" into "+". */
const clean = (input: string) => {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  return digits;
};

/**
 * Parse any format into E.164 + country. Accepts "+961 70 123 456", "70123456", "0096170123456",
 * "03 555 777". Returns null when nothing phone-like can be parsed.
 */
export const normalizePhone = (input: string | null | undefined, defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY): NormalizedPhone | null => {
  if (!input) return null;
  const cleaned = clean(input);
  if (!cleaned.replace("+", "")) return null;
  const parsed = parsePhoneNumberFromString(cleaned, cleaned.startsWith("+") ? undefined : defaultCountry);
  if (!parsed) return null;
  return {
    e164: parsed.number,
    country: (parsed.country ?? defaultCountry) as CountryCode,
    national: parsed.nationalNumber,
    isValid: parsed.isValid(),
  };
};

export const isValidPhone = (input: string | null | undefined, defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY) =>
  Boolean(normalizePhone(input, defaultCountry)?.isValid);

/** Display: "+961 70 123 456". Unparseable legacy values are returned as they are. */
export const formatPhone = (value: string | null | undefined, country?: string | null): string => {
  if (!value) return "—";
  const parsed = parsePhoneNumberFromString(clean(value), clean(value).startsWith("+") ? undefined : asCountryCode(country));
  return parsed ? parsed.formatInternational() : value;
};

/** National number formatted as you type ("70 123 456"). */
export const formatNationalAsYouType = (digits: string, country: CountryCode) => {
  if (!digits) return "";
  return new AsYouType(country).input(digits);
};

/** `tel:` link target for a stored phone. */
export const phoneHref = (value: string | null | undefined, country?: string | null) => {
  const n = normalizePhone(value, asCountryCode(country));
  return n ? `tel:${n.e164}` : undefined;
};
