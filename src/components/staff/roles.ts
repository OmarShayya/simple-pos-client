import type { UserRole } from "@/types/auth.types";

export const ROLE_INFO: Record<UserRole, { label: string; help: string }> = {
  admin: { label: "Admin", help: "Everything, including staff accounts and settings" },
  manager: { label: "Manager", help: "Reports, stations, products, discounts and booking rules; can add cashiers" },
  cashier: { label: "Cashier", help: "Sales, gaming sessions and reservations" },
};
