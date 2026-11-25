import React from "react";
import KpiCard from "@/components/ui/KpiCard";

export type StatTone = "primary" | "secondary" | "success" | "warning" | "error" | "info";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  /** Ignored — KPI tiles are neutral; colour is reserved for the change vs previous. */
  tone?: StatTone;
  hint?: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
}

/** @deprecated Use `KpiCard` from "@/components/ui" (adds deltas vs previous + sparklines). */
const StatCard: React.FC<StatCardProps> = ({ label, value, icon, hint, loading, onClick }) => (
  <KpiCard label={label} value={value} icon={icon} hint={hint} loading={loading} onClick={onClick} />
);

export default StatCard;
