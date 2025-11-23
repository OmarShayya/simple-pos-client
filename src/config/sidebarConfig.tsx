import {
  Dashboard,
  Inventory,
  ShoppingCart,
  People,
  Category,
  Assessment,
  AttachMoney,
  Receipt,
  SportsEsports,
  Computer,
} from "@mui/icons-material";
import { SvgIconComponent } from "@mui/icons-material";
import { UserRole } from "@/types/auth.types";

export interface SidebarItem {
  id: string;
  label: string;
  path: string;
  icon: SvgIconComponent;
  roles?: UserRole[];
}

export const sidebarItems: SidebarItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: Dashboard,
  },
  {
    id: "sales",
    label: "Sales",
    path: "/sales",
    icon: ShoppingCart,
  },
  {
    id: "gaming",
    label: "Gaming Stations",
    path: "/gaming",
    icon: SportsEsports,
  },
  {
    id: "pc-management",
    label: "PC Management",
    path: "/gaming/pc-management",
    icon: Computer,
    roles: [UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    id: "sales-history",
    label: "Sales History",
    path: "/sales/history",
    icon: Receipt,
  },
  {
    id: "products",
    label: "Products",
    path: "/products",
    icon: Inventory,
    roles: [UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    id: "categories",
    label: "Categories",
    path: "/categories",
    icon: Category,
    roles: [UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    id: "customers",
    label: "Customers",
    path: "/customers",
    icon: People,
  },
  {
    id: "reports",
    label: "Reports",
    path: "/reports",
    icon: Assessment,
    roles: [UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    id: "exchange-rate",
    label: "Exchange Rate",
    path: "/exchange-rate",
    icon: AttachMoney,
    roles: [UserRole.ADMIN, UserRole.MANAGER],
  },
];
