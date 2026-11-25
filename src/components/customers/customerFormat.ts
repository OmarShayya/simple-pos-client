import { countryName } from "@/data/countries";
import { shiftDay, todayKey } from "@/utils/dateRanges";
import { getStatusInfo } from "@/components/ui";
import type { CustomerAddress, CustomerSource } from "@/types/customer.types";

/** "Hamra, Beirut" + ", France" for other countries. Street is shown separately. */
export const formatPlace = (address?: CustomerAddress | null): string => {
  if (!address) return "";
  const parts = [address.area, address.city].filter(Boolean) as string[];
  if (address.country && address.country !== "LB") parts.push(countryName(address.country));
  return parts.join(", ");
};

/** Full one-line address: "Bliss St, bldg 12 · Hamra, Beirut". */
export const formatAddress = (address?: CustomerAddress | null): string => {
  const place = formatPlace(address);
  return [address?.street, place || (address?.country ? countryName(address.country) : "")].filter(Boolean).join(" · ");
};

/** A placeholder name the API gives customers created from a phone only ("Guest 1234"). */
export const isPlaceholderName = (name?: string | null) => /^Guest \d{2,4}$/.test(name ?? "");

/** How each first-contact channel reads to staff (the short label comes from the `source` status). */
export const CUSTOMER_SOURCE: Record<CustomerSource, { long: string }> = {
  pos: { long: "Added at the counter" },
  website: { long: "First ordered on the website" },
  reservation: { long: "First booked a station" },
};

export const CUSTOMER_SOURCE_OPTIONS = (Object.keys(CUSTOMER_SOURCE) as CustomerSource[]).map((value) => ({
  value,
  label: getStatusInfo(value, "source").label,
}));

export type LastVisitPreset = "any" | "today" | "7" | "30" | "90" | "custom";

export interface LastVisitValue {
  preset: LastVisitPreset;
  /** Only used for "custom". */
  from?: string | null;
  to?: string | null;
}

/** The API range (`lastVisitFrom` / `lastVisitTo`) for a filter value. */
export const lastVisitRange = (v: LastVisitValue): { lastVisitFrom?: string; lastVisitTo?: string } => {
  const today = todayKey();
  switch (v.preset) {
    case "today":
      return { lastVisitFrom: today, lastVisitTo: today };
    case "7":
    case "30":
    case "90":
      return { lastVisitFrom: shiftDay(today, -(Number(v.preset) - 1)), lastVisitTo: today };
    case "custom":
      return { lastVisitFrom: v.from || undefined, lastVisitTo: v.to || undefined };
    default:
      return {};
  }
};
