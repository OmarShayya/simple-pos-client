import type React from "react";
import type { Currency } from "@/utils/format";
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatMoney,
  formatNumber,
  formatRelative,
  formatSmartDateTime,
  formatTime,
} from "@/utils/format";
import { getStatusInfo, type StatusKind } from "./statusConfig";

export type ColumnType =
  | "text"
  | "number"
  | "money"
  | "date" // "25 Nov 2026"
  | "datetime" // "25 Nov 2026, 9:41 PM"
  | "smartDateTime" // "9:41 PM" today, "Yesterday, 9:41 PM", "25 Nov, 9:41 PM"
  | "time" // "9:41 PM"
  | "relative" // "5 min ago"
  | "duration" // minutes → "1h 30m"
  | "status" // StatusChip (set statusKind)
  | "code" // monospace (invoice numbers)
  | "actions"; // row buttons (right aligned, never sorted/exported)

export interface DataTableColumn<R> {
  /** Unique key. Default value = `row[field]`. */
  field: string;
  header: string;
  /** Decides formatting, alignment, sorting and CSV output. Default "text". */
  type?: ColumnType;
  /** Value accessor (sorting, client search, CSV and default rendering). */
  value?: (row: R) => unknown;
  /** Custom cell content (wins over the type's default rendering). Keep it light. */
  render?: (row: R) => React.ReactNode;
  /** money: currency of the value (default USD). */
  currency?: Currency;
  /** status: which status family (order, session, reservation, station…). */
  statusKind?: StatusKind;
  width?: number;
  minWidth?: number;
  /** Share of the remaining width (like CSS flex-grow). Default 1 for text columns. */
  flex?: number;
  align?: "left" | "right" | "center";
  /** Default true (false for "actions"). In server mode sorting is sent to `onSortChange`. */
  sortable?: boolean;
  /** Included in the client-side search (default true for text/code/status). */
  searchable?: boolean;
  /** Hide on narrower screens (tablets) to keep the important columns readable. */
  hideBelow?: "md" | "lg";
  /**
   * Role in the phone card layout:
   * "title" (bold first line), "subtitle" (muted second line), "end" (right side: amount/status),
   * "meta" (label: value lines, default), "hidden".
   */
  mobile?: "title" | "subtitle" | "end" | "meta" | "hidden";
  /** CSV value. `false` excludes the column. Default: raw numbers for money/number, display text otherwise. */
  csv?: false | ((row: R) => string | number | null | undefined);
}

export const getValue = <R,>(col: DataTableColumn<R>, row: R): unknown =>
  col.value ? col.value(row) : (row as Record<string, unknown>)[col.field];

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : null);

/** Plain text of a cell (search, CSV, phone layout fallbacks). */
export const cellText = <R,>(col: DataTableColumn<R>, row: R): string => {
  const v = getValue(col, row);
  if (v === null || v === undefined || v === "") return "";
  switch (col.type) {
    case "money":
      return formatMoney(num(v), col.currency ?? "USD");
    case "number":
      return formatNumber(num(v), 2);
    case "date":
      return formatDate(v as string);
    case "datetime":
      return formatDateTime(v as string);
    case "smartDateTime":
      return formatSmartDateTime(v as string);
    case "time":
      return formatTime(v as string);
    case "relative":
      return formatRelative(v as string);
    case "duration":
      return formatDuration(num(v));
    case "status":
      return getStatusInfo(String(v), col.statusKind).label;
    default:
      return String(v);
  }
};

export const isNumericType = (t?: ColumnType) => t === "money" || t === "number" || t === "duration";

/** Comparable value for client sorting. */
export const sortValue = <R,>(col: DataTableColumn<R>, row: R): string | number => {
  const v = getValue(col, row);
  if (v === null || v === undefined) return "";
  if (isNumericType(col.type)) return num(v) ?? 0;
  if (col.type && ["date", "datetime", "smartDateTime", "time", "relative"].includes(col.type)) {
    const t = new Date(v as string).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  return String(v).toLowerCase();
};

const csvEscape = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const buildCsv = <R,>(columns: DataTableColumn<R>[], rows: R[]): string => {
  const cols = columns.filter((c) => c.type !== "actions" && c.csv !== false);
  const header = cols.map((c) => csvEscape(c.header)).join(",");
  const lines = rows.map((row) =>
    cols
      .map((c) => {
        if (typeof c.csv === "function") return csvEscape(c.csv(row));
        if (isNumericType(c.type) && c.type !== "duration") return csvEscape(num(getValue(c, row)) ?? "");
        return csvEscape(cellText(c, row));
      })
      .join(",")
  );
  return [header, ...lines].join("\r\n");
};

export const downloadCsv = (filename: string, csv: string) => {
  // BOM so Excel opens UTF-8 (Arabic names, "—") correctly
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
