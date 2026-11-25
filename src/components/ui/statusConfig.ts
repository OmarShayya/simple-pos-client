/**
 * ONE source of truth for every status label + colour in the POS. `StatusChip` reads it;
 * tables, cards and filters should too (e.g. build a status filter's options from it).
 * Add a status here and every screen picks it up.
 */

export type StatusTone = "success" | "warning" | "error" | "info" | "primary" | "neutral";

export type StatusKind =
  | "order" // sales: pending | paid | cancelled
  | "payment" // session payment: unpaid | paid | partial
  | "session" // gaming session: active | completed | cancelled
  | "reservation" // confirmed | checked_in | completed | cancelled | no_show
  | "station" // available | occupied | maintenance | reserved | offline
  | "source" // order source: pos | website
  | "stock" // in_stock | low | out
  | "role" // admin | manager | cashier
  | "generic"; // active | inactive | yes | no

export interface StatusInfo {
  label: string;
  tone: StatusTone;
}

export const STATUS_MAP: Record<StatusKind, Record<string, StatusInfo>> = {
  order: {
    pending: { label: "Unpaid", tone: "warning" },
    paid: { label: "Paid", tone: "success" },
    cancelled: { label: "Cancelled", tone: "neutral" },
    refunded: { label: "Refunded", tone: "neutral" },
  },
  payment: {
    unpaid: { label: "Unpaid", tone: "warning" },
    pending: { label: "Unpaid", tone: "warning" },
    partial: { label: "Part paid", tone: "info" },
    paid: { label: "Paid", tone: "success" },
  },
  session: {
    active: { label: "Running", tone: "primary" },
    completed: { label: "Ended", tone: "neutral" },
    cancelled: { label: "Cancelled", tone: "neutral" },
  },
  reservation: {
    pending: { label: "Pending", tone: "warning" },
    confirmed: { label: "Booked", tone: "info" },
    checked_in: { label: "Checked in", tone: "success" },
    completed: { label: "Done", tone: "neutral" },
    cancelled: { label: "Cancelled", tone: "neutral" },
    no_show: { label: "No-show", tone: "error" },
  },
  station: {
    available: { label: "Available", tone: "success" },
    occupied: { label: "In use", tone: "error" },
    maintenance: { label: "Maintenance", tone: "warning" },
    reserved: { label: "Reserved", tone: "info" },
    offline: { label: "Offline", tone: "neutral" },
  },
  source: {
    pos: { label: "Counter", tone: "neutral" },
    website: { label: "Website", tone: "info" },
  },
  stock: {
    in_stock: { label: "In stock", tone: "success" },
    low: { label: "Low stock", tone: "warning" },
    out: { label: "Out of stock", tone: "error" },
  },
  role: {
    admin: { label: "Admin", tone: "neutral" },
    manager: { label: "Manager", tone: "neutral" },
    cashier: { label: "Cashier", tone: "neutral" },
  },
  generic: {
    active: { label: "Active", tone: "success" },
    inactive: { label: "Inactive", tone: "neutral" },
    yes: { label: "Yes", tone: "success" },
    no: { label: "No", tone: "neutral" },
    info: { label: "Info", tone: "info" },
    error: { label: "Error", tone: "error" },
    warning: { label: "Warning", tone: "warning" },
  },
};

/** Lookup order when no `kind` is given (keeps older call sites working). */
const FALLBACK_ORDER: StatusKind[] = ["generic", "station", "session", "payment", "order", "reservation", "source", "stock", "role"];

const humanize = (s: string) => s.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export const getStatusInfo = (status: string | null | undefined, kind?: StatusKind): StatusInfo => {
  const key = String(status ?? "").toLowerCase();
  if (kind && STATUS_MAP[kind][key]) return STATUS_MAP[kind][key];
  for (const k of FALLBACK_ORDER) if (STATUS_MAP[k][key]) return STATUS_MAP[k][key];
  return { label: key ? humanize(key) : "—", tone: "neutral" };
};

/** `[{ value, label }]` for a status filter (e.g. SegmentedControl / SelectField options). */
export const statusOptions = (kind: StatusKind) =>
  Object.entries(STATUS_MAP[kind]).map(([value, info]) => ({ value, label: info.label }));
