import type { QueryKey } from "@tanstack/react-query";

/**
 * Central React Query key factory — the ONLY place query keys are written.
 *
 *   useQuery({ queryKey: queryKeys.orders.list(filters), queryFn: ... })
 *   useApiMutation({ mutationFn, invalidates: affects.order })
 *
 * Every key starts with its domain (`["orders", ...]`), so invalidating a domain refreshes every
 * list, detail and count of it. Filters go in as ONE object (React Query hashes it), so
 * `list({ status: "pending", page: 2 })` and `list({ page: 2, status: "pending" })` are the same.
 */

type Filters = Record<string, unknown> | undefined;

const domain = <D extends string>(name: D) => ({
  all: [name] as const,
  lists: () => [name, "list"] as const,
  list: (filters?: Filters) => [name, "list", filters ?? {}] as const,
  details: () => [name, "detail"] as const,
  detail: (id: string | undefined | null) => [name, "detail", id ?? ""] as const,
});

export const queryKeys = {
  /** Orders = sales (counter, gaming and website orders). */
  orders: domain("orders"),
  /** Gaming sessions. */
  sessions: {
    ...domain("sessions"),
    active: () => ["sessions", "active"] as const,
  },
  /** Gaming stations (PCs + PlayStation rooms). */
  stations: domain("stations"),
  reservations: {
    ...domain("reservations"),
    settings: () => ["reservations", "settings"] as const,
    availability: (params: Filters) => ["reservations", "availability", params ?? {}] as const,
  },
  customers: {
    ...domain("customers"),
    activity: (id: string) => ["customers", "activity", id] as const,
  },
  products: domain("products"),
  categories: domain("categories"),
  discounts: domain("discounts"),
  reports: {
    all: ["reports"] as const,
    summary: (period: string, date: string) => ["reports", "summary", period, date] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    overview: () => ["dashboard", "overview"] as const,
  },
  staff: domain("staff"),
  exchangeRate: {
    all: ["exchangeRate"] as const,
    current: () => ["exchangeRate", "current"] as const,
    history: () => ["exchangeRate", "history"] as const,
  },
  /** Sidebar badges (open orders, website orders waiting, …). */
  counts: {
    all: ["counts"] as const,
    nav: () => ["counts", "nav"] as const,
  },
} as const;

export type QueryDomain = keyof typeof queryKeys;

/**
 * What a write affects. Pass one of these (or a custom list) as `invalidates` to `useApiMutation`
 * so every screen showing affected data refreshes. When in doubt, invalidate more — refetches are
 * cheap, stale screens at the counter are not.
 */
export const affects = {
  /** Create / edit / pay / cancel an order, add items. */
  order: ["orders", "counts", "dashboard", "reports", "customers", "sessions", "stations", "products"],
  /** Start / end / pay / cancel a gaming session. */
  session: ["sessions", "stations", "orders", "counts", "dashboard", "reports", "customers", "reservations"],
  /** Create / edit / check in / cancel / no-show a reservation. */
  reservation: ["reservations", "stations", "sessions", "orders", "dashboard", "counts", "customers", "reports"],
  /** Add / edit / delete a station, or take it in/out of service. */
  station: ["stations", "sessions", "reservations", "dashboard", "reports"],
  customer: ["customers", "orders", "reservations", "dashboard", "reports"],
  product: ["products", "categories", "dashboard", "reports"],
  category: ["categories", "products", "reports"],
  discount: ["discounts", "orders", "products"],
  /** Names show on orders (cashier) and in reports. */
  staff: ["staff", "orders", "reports"],
  exchangeRate: ["exchangeRate", "products", "orders", "dashboard", "reports"],
} satisfies Record<string, QueryDomain[]>;

/** A domain name ("orders") or an explicit key (`queryKeys.orders.detail(id)`). */
export type Invalidation = QueryDomain | QueryKey;

/** Expand domains into concrete query-key prefixes (deduplicated). */
export const expandInvalidations = (items: readonly Invalidation[]): QueryKey[] => {
  const out: QueryKey[] = items.map((item) => (typeof item === "string" ? queryKeys[item].all : item));
  const seen = new Set<string>();
  return out.filter((k) => {
    const id = JSON.stringify(k);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};
