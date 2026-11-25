import {
  SpaceDashboardOutlined,
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
  AddRounded,
} from "@mui/icons-material";
import type { SvgIconComponent } from "@mui/icons-material";
import { UserRole } from "@/types/auth.types";
import type { NavCounts } from "@/hooks/useNavCounts";

/**
 * Data-driven navigation. To add a screen: add an item to a group (or a new group).
 * - `roles` limits who sees it.
 * - `title` overrides the label shown in the top bar.
 * - `match` lists extra paths that should highlight this item (e.g. old routes it replaces).
 * - `badge` shows a count from `GET /sales/counts`; `badgeAttention` turns the badge amber when
 *   that other count is above zero (e.g. website orders waiting).
 */
export type NavBadgeKey = keyof NavCounts;

export interface SidebarItem {
  id: string;
  label: string;
  path: string;
  icon: SvgIconComponent;
  roles?: UserRole[];
  title?: string;
  match?: string[];
  badge?: NavBadgeKey;
  badgeAttention?: NavBadgeKey;
  /** Spoken/tooltip text for the badge, e.g. (n) => `${n} open orders`. */
  badgeLabel?: (counts: NavCounts) => string;
}

export interface SidebarGroup {
  id: string;
  /** Small uppercase heading. Empty = no heading (top group). */
  label: string;
  items: SidebarItem[];
}

const MANAGERS: UserRole[] = [UserRole.ADMIN, UserRole.MANAGER];

/** The prominent button under the logo. */
export const newSaleAction = { label: "New sale", path: "/sales", icon: AddRounded } as const;

export const sidebarGroups: SidebarGroup[] = [
  {
    id: "overview",
    label: "",
    items: [{ id: "dashboard", label: "Dashboard", path: "/dashboard", icon: SpaceDashboardOutlined }],
  },
  {
    id: "sales",
    label: "Sales",
    items: [
      {
        id: "orders",
        label: "Orders",
        path: "/orders",
        icon: ReceiptLongOutlined,
        match: ["/sales/history"],
        badge: "open",
        badgeAttention: "websiteOpen",
        badgeLabel: (c) =>
          `${c.open ?? 0} open ${c.open === 1 ? "order" : "orders"}` +
          (c.websiteOpen ? `, ${c.websiteOpen} from the website waiting` : ""),
      },
      { id: "customers", label: "Customers", path: "/customers", icon: PeopleAltOutlined },
    ],
  },
  {
    id: "gaming",
    label: "Gaming",
    items: [
      { id: "gaming", label: "Stations", path: "/gaming", icon: SportsEsportsOutlined, title: "Gaming stations" },
      {
        id: "reservations",
        label: "Reservations",
        path: "/reservations",
        icon: EventAvailableOutlined,
        badge: "reservationsAttention",
        badgeAttention: "reservationsAttention",
        badgeLabel: (c) => `${c.reservationsAttention ?? 0} reservations need attention`,
      },
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

const matchesPath = (pathname: string, path: string) => pathname === path || pathname.startsWith(path + "/");

/** The nav item that best matches a pathname (longest matching path wins). */
export const findSidebarItem = (pathname: string): SidebarItem | undefined =>
  sidebarItems
    .flatMap((item) => [item.path, ...(item.match ?? [])].filter((p) => matchesPath(pathname, p)).map((p) => ({ item, len: p.length })))
    .sort((a, b) => b.len - a.len)[0]?.item;

const EXTRA_TITLES: Record<string, string> = {
  "/sales": "New sale",
  "/sales/history": "Sales history",
  "/profile": "Profile",
  "/reservations/settings": "Booking rules",
  "/ui-kit": "UI kit",
};

/** Title for the top bar. */
export const getPageTitle = (pathname: string): string => {
  if (EXTRA_TITLES[pathname]) return EXTRA_TITLES[pathname];
  const item = findSidebarItem(pathname);
  return item?.title ?? item?.label ?? "Epic Lounge";
};

const EXTRA_GROUPS: Record<string, string> = {
  "/sales": "Sales",
  "/reservations/settings": "Gaming",
};

/** Group label + title for the top-bar breadcrumb ("Sales › Orders"). */
export const getPageContext = (pathname: string): { group?: string; title: string } => {
  const item = findSidebarItem(pathname);
  const group = EXTRA_GROUPS[pathname] ?? (item ? sidebarGroups.find((g) => g.items.includes(item))?.label : undefined);
  return { group: group || undefined, title: getPageTitle(pathname) };
};
