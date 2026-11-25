import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";

/**
 * Every country the phone library knows (≈245), with English names from Intl.DisplayNames
 * and the international dial code. Lebanon first, then the countries most of the lounge's
 * customers come from, then A–Z.
 */

export interface Country {
  /** ISO 3166-1 alpha-2, e.g. "LB". */
  code: CountryCode;
  name: string;
  /** "+961" */
  dialCode: string;
  /** True for the short "common" list shown at the top of pickers. */
  common?: boolean;
}

export const DEFAULT_COUNTRY: CountryCode = "LB";

/** Shown first in pickers (in this order). */
export const COMMON_COUNTRY_CODES: CountryCode[] = ["LB", "SY", "AE", "SA", "QA", "KW", "FR", "DE", "GB", "US", "CA", "AU"];

const displayNames = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
})();

const nameOf = (code: string) => {
  try {
    return displayNames?.of(code) ?? code;
  } catch {
    return code;
  }
};

const all: Country[] = getCountries().map((code) => ({
  code,
  name: nameOf(code),
  dialCode: `+${getCountryCallingCode(code)}`,
}));

const byCode = new Map(all.map((c) => [c.code, c]));

export const COUNTRIES: Country[] = [
  ...COMMON_COUNTRY_CODES.filter((c) => byCode.has(c)).map((c) => ({ ...byCode.get(c)!, common: true })),
  ...all.filter((c) => !COMMON_COUNTRY_CODES.includes(c.code)).sort((a, b) => a.name.localeCompare(b.name)),
];

export const getCountry = (code: string | null | undefined): Country | undefined =>
  code ? byCode.get(code.toUpperCase() as CountryCode) : undefined;

export const countryName = (code: string | null | undefined): string => getCountry(code)?.name ?? code ?? "";

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

/** Lower = better: name starts with the query, then a word in it does, then anything else. */
export const countryRank = (c: Country, query: string): number => {
  const q = fold(query.trim());
  const name = fold(c.name);
  if (!q) return 0;
  if (name.startsWith(q) || c.code.toLowerCase() === q) return 0;
  if (name.split(/[\s-]+/).some((w) => w.startsWith(q))) return 1;
  return 2;
};

/** Filter + rank for pickers (keeps the Common group first so group headers stay together). */
export const searchCountries = (options: Country[], query: string): Country[] =>
  options
    .filter((c) => matchesCountry(c, query))
    .map((c, i) => ({ c, i, k: (c.common ? 0 : 10) + countryRank(c, query) }))
    .sort((a, b) => a.k - b.k || a.i - b.i)
    .map((x) => x.c);

/** Case/diacritic-insensitive match on name, ISO code or dial code ("leb", "lb", "961", "+961"). */
export const matchesCountry = (c: Country, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  return (
    c.name.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").includes(q.normalize("NFD").replace(/\p{M}/gu, "")) ||
    c.code.toLowerCase() === q ||
    (digits.length > 0 && c.dialCode.slice(1).startsWith(digits))
  );
};
