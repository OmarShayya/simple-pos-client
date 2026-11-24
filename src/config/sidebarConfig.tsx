import {
  SpaceDashboardOutlined,
  PointOfSaleOutlined,
  ReceiptLongOutlined,
  PeopleAltOutlined,
  SportsEsportsOutlined,
  HistoryOutlined,
  ComputerOutlined,
  Inventory2Outlined,
  CategoryOutlined,
  LocalOfferOutlined,
  InsightsOutlined,
  CurrencyExchangeOutlined,
  SettingsOutlined,
  EventAvailableOutlined,
  BadgeOutlined,
} from "@mui/icons-material";
import type { SvgIconComponent } from "@mui/icons-material";
import { UserRole } from "@/types/auth.types";

/**
 * Data-driven navigation. To add a screen: add an item to a group (or a new group).
 * `roles` limits who sees it; `title` overrides the label shown in the top bar.
 */
export interface SidebarItem {
  id: string;
  label: string;
  path: string;
  icon: SvgIconComponent;
  roles?: UserRole[];
  title?: string;
}

export interface SidebarGroup {
  id: string;
  label: string;
  items: SidebarItem[];
}

const MANAGERS: UserRole[] = [UserRole.ADMIN, UserRole.MANAGER];

export const sidebarGroups: SidebarGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [{ id: "dashboard", label: "Dashboard", path: "/dashboard", icon: SpaceDashboardOutlined }],
  },
  {
    id: "sales",
    label: "Sales",
    items: [
      { id: "sales", label: "New sale", path: "/sales", icon: PointOfSaleOutlined, title: "Point of sale" },
      { id: "sales-history", label: "Sales history", path: "/sales/history", icon: ReceiptLongOutlined },
      { id: "customers", label: "Customers", path: "/customers", icon: PeopleAltOutlined },
    ],
  },
  {
    id: "gaming",
    label: "Gaming",
    items: [
      { id: "gaming", label: "Stations", path: "/gaming", icon: SportsEsportsOutlined, title: "Gaming stations" },
      { id: "reservations", label: "Reservations", path: "/reservations", icon: EventAvailableOutlined },
      { id: "gaming-history", label: "Session history", path: "/gaming/history", icon: HistoryOutlined },
      {
        id: "pc-management",
        label: "Manage stations",
        path: "/gaming/pc-management",
        icon: ComputerOutlined,
        roles: MANAGERS,
      },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    items: [
      { id: "products", label: "Products", path: "/products", icon: Inventory2Outlined, roles: MANAGERS },
      { id: "categories", label: "Categories", path: "/categories", icon: CategoryOutlined, roles: MANAGERS },
      { id: "discounts", label: "Discounts", path: "/discounts", icon: LocalOfferOutlined, roles: MANAGERS },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    items: [
      { id: "reports", label: "Reports", path: "/reports", icon: InsightsOutlined, roles: MANAGERS },
      {
        id: "exchange-rate",
        label: "Exchange rate",
        path: "/exchange-rate",
        icon: CurrencyExchangeOutlined,
        roles: MANAGERS,
      },
      { id: "staff", label: "Staff", path: "/staff", icon: BadgeOutlined, roles: MANAGERS },
      { id: "settings", label: "Settings", path: "/settings", icon: SettingsOutlined },
    ],
  },
];

/** Flat list (kept for convenience / backwards compatibility). */
export const sidebarItems: SidebarItem[] = sidebarGroups.flatMap((g) => g.items);

/** Items/groups visible to a role (empty groups are dropped). */
export const getVisibleGroups = (role?: UserRole): SidebarGroup[] =>
  sidebarGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || (role && i.roles.includes(role))) }))
    .filter((g) => g.items.length > 0);

/** The nav item that best matches a pathname (longest matching path wins). */
export const findSidebarItem = (pathname: string): SidebarItem | undefined =>
  sidebarItems
    .filter((i) => pathname === i.path || pathname.startsWith(i.path + "/"))
    .sort((a, b) => b.path.length - a.path.length)[0];

const EXTRA_TITLES: Record<string, string> = {
  "/profile": "Profile",
  "/reservations/settings": "Booking rules",
};

/** Title for the top bar. */
export const getPageTitle = (pathname: string): string => {
  if (EXTRA_TITLES[pathname]) return EXTRA_TITLES[pathname];
  const item = findSidebarItem(pathname);
  return item?.title ?? item?.label ?? "Epic Lounge";
};
