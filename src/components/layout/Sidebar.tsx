import React from "react";
import {
  Avatar,
  Box,
  Button,
  Drawer,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { LogoutOutlined, PersonOutline } from "@mui/icons-material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { findSidebarItem, getVisibleGroups, newSaleAction, type SidebarItem } from "@/config/sidebarConfig";
import { useAuthStore } from "@/store/authStore";
import { useNavCounts, type NavCounts } from "@/hooks/useNavCounts";
import { initials } from "@/utils/format";

export const SIDEBAR_WIDTH = 256;
export const SIDEBAR_COLLAPSED_WIDTH = 72;

interface SidebarProps {
  variant: "permanent" | "temporary";
  open?: boolean;
  /** Icon rail (desktop). */
  collapsed?: boolean;
  onClose?: () => void;
}

/* ---------------------------------------------------------------- pieces */

const Brand: React.FC<{ collapsed: boolean }> = ({ collapsed }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1.25,
      height: 64,
      px: collapsed ? 0 : 2.5,
      justifyContent: collapsed ? "center" : "flex-start",
      flexShrink: 0,
    }}
  >
    <Box component="img" src="/logo-96.webp" alt="" sx={{ width: 32, height: 32, borderRadius: "8px", flexShrink: 0 }} />
    {!collapsed && (
      <Typography component="div" sx={{ fontWeight: 600, fontSize: "1rem", letterSpacing: "-0.01em", lineHeight: 1.2 }} noWrap>
        Epic Lounge
      </Typography>
    )}
  </Box>
);

const CountBadge: React.FC<{ count: number; attention: boolean; rail?: boolean }> = ({ count, attention, rail }) => {
  const theme = useTheme();
  const t = theme.tokens;
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        minWidth: rail ? 18 : 22,
        height: rail ? 18 : 22,
        px: rail ? 0.5 : 0.75,
        borderRadius: "11px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: rail ? "0.6875rem" : "0.8125rem",
        fontWeight: 600,
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
        flexShrink: 0,
        ...(rail
          ? {
              position: "absolute",
              top: 1,
              right: 1,
              border: `2px solid ${t.sidebar}`,
              boxSizing: "content-box",
            }
          : {}),
        bgcolor: attention ? "warning.main" : rail ? "text.primary" : theme.palette.mode === "dark" ? "#27272A" : "#E4E4E7",
        color: attention ? "warning.contrastText" : rail ? "background.paper" : "text.primary",
      }}
    >
      {count > 99 ? "99+" : count}
    </Box>
  );
};

interface NavRowProps {
  item: SidebarItem;
  active: boolean;
  collapsed: boolean;
  counts: NavCounts;
  onNavigate?: () => void;
}

const NavRow: React.FC<NavRowProps> = ({ item, active, collapsed, counts, onNavigate }) => {
  const t = useTheme().tokens;
  const Icon = item.icon;
  const count = item.badge ? counts[item.badge] ?? 0 : 0;
  const attention = Boolean(item.badgeAttention && (counts[item.badgeAttention] ?? 0) > 0);
  const badgeText = count > 0 ? item.badgeLabel?.(counts) ?? String(count) : undefined;

  const row = (
    <Box
      component={Link}
      to={item.path}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? (badgeText ? `${item.label}, ${badgeText}` : item.label) : undefined}
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        height: 40,
        px: collapsed ? 0 : 1.25,
        mx: collapsed ? "auto" : 0,
        width: collapsed ? 44 : "auto",
        justifyContent: collapsed ? "center" : "flex-start",
        borderRadius: "8px",
        textDecoration: "none",
        color: active ? t.primaryText : "text.primary",
        bgcolor: active ? t.primaryTint : "transparent",
        fontWeight: active ? 600 : 500,
        fontSize: "0.9375rem",
        transition: "background-color 120ms ease, color 120ms ease",
        "&:hover": { bgcolor: active ? t.primaryTint : t.hover },
        "&:focus-visible": { outline: `2px solid ${t.primary}`, outlineOffset: -2 },
        "& .nav-icon": { fontSize: 20, color: active ? t.primaryText : "text.secondary", flexShrink: 0 },
      }}
    >
      <Icon className="nav-icon" />
      {!collapsed && (
        <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.label}
        </Box>
      )}
      {count > 0 && <CountBadge count={count} attention={attention} rail={collapsed} />}
      {badgeText && !collapsed && (
        <Box component="span" sx={visuallyHidden}>
          {`, ${badgeText}`}
        </Box>
      )}
    </Box>
  );

  if (!collapsed) return row;
  return (
    <Tooltip title={badgeText ? `${item.label} · ${badgeText}` : item.label} placement="right" enterDelay={0}>
      {row}
    </Tooltip>
  );
};

const visuallyHidden = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
} as const;

const UserBlock: React.FC<{ collapsed: boolean; onNavigate?: () => void }> = ({ collapsed, onNavigate }) => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);

  const signOut = () => {
    setAnchor(null);
    logout();
    navigate("/login");
  };
  const goProfile = () => {
    setAnchor(null);
    onNavigate?.();
    navigate("/profile");
  };

  const avatar = (
    <Avatar sx={{ width: 32, height: 32, fontSize: "0.8125rem", bgcolor: "action.selected", color: "primary.dark" }}>
      {initials(user?.name) || "?"}
    </Avatar>
  );

  if (collapsed) {
    return (
      <Box sx={{ p: 1.25, borderTop: 1, borderColor: "divider", display: "flex", justifyContent: "center" }}>
        <Tooltip title={user?.name ?? "Account"} placement="right">
          <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="Account menu">
            {avatar}
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={() => setAnchor(null)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <Box sx={{ px: 1.5, py: 1 }}>
            <Typography variant="subtitle2">{user?.name}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: "capitalize" }}>
              {user?.role}
            </Typography>
          </Box>
          <MenuItem onClick={goProfile}>
            <ListItemIcon>
              <PersonOutline fontSize="small" />
            </ListItemIcon>
            My account
          </MenuItem>
          <MenuItem onClick={signOut}>
            <ListItemIcon>
              <LogoutOutlined fontSize="small" />
            </ListItemIcon>
            Sign out
          </MenuItem>
        </Menu>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 1.5, py: 1.25, borderTop: 1, borderColor: "divider", display: "flex", alignItems: "center", gap: 0.5 }}>
      <Box
        component="button"
        type="button"
        onClick={goProfile}
        aria-label="My account"
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          p: 0.75,
          border: 0,
          borderRadius: "8px",
          bgcolor: "transparent",
          color: "inherit",
          font: "inherit",
          textAlign: "left",
          cursor: "pointer",
          "&:hover": { bgcolor: "action.hover" },
          "&:focus-visible": { outline: (th) => `2px solid ${th.palette.primary.main}`, outlineOffset: -2 },
        }}
      >
        {avatar}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }} noWrap>
            {user?.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "capitalize", lineHeight: 1.3, display: "block" }} noWrap>
            {user?.role}
          </Typography>
        </Box>
      </Box>
      <Tooltip title="Sign out">
        <IconButton onClick={signOut} aria-label="Sign out">
          <LogoutOutlined fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

/* ---------------------------------------------------------------- sidebar */

const Sidebar: React.FC<SidebarProps> = ({ variant, open, collapsed = false, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const counts = useNavCounts();
  const groups = getVisibleGroups(user?.role);
  const activeId = findSidebarItem(location.pathname)?.id;
  const rail = variant === "permanent" && collapsed;
  const width = rail ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;
  const onNewSalePage = location.pathname === newSaleAction.path;
  const NewSaleIcon = newSaleAction.icon;

  const goNewSale = () => {
    navigate(newSaleAction.path);
    onClose?.();
  };

  const content = (
    <Box component="nav" aria-label="Main" sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Brand collapsed={rail} />

      <Box sx={{ px: rail ? 0 : 2, pb: 1.5, display: "flex", justifyContent: "center", flexShrink: 0 }}>
        {rail ? (
          <Tooltip title={newSaleAction.label} placement="right" enterDelay={0}>
            <Button
              variant="contained"
              onClick={goNewSale}
              aria-label={newSaleAction.label}
              sx={{ minWidth: 0, width: 44, height: 44, p: 0 }}
            >
              <NewSaleIcon />
            </Button>
          </Tooltip>
        ) : (
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<NewSaleIcon />}
            onClick={goNewSale}
            aria-current={onNewSalePage ? "page" : undefined}
            sx={{ minHeight: 44, py: 1 }}
          >
            {newSaleAction.label}
          </Button>
        )}
      </Box>

      <Box
        className="scroll-on-hover"
        sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", px: rail ? 1 : 1.5, pb: 2 }}
      >
        {groups.map((group, gi) => (
          <Box key={group.id} component="section" aria-label={group.label || undefined} sx={{ mt: gi === 0 ? 0.5 : rail ? 1 : 1.25 }}>
            {group.label &&
              (rail ? (
                <Box aria-hidden sx={{ height: "1px", bgcolor: "divider", mx: 1.5, mb: 1 }} />
              ) : (
                <Typography
                  component="h2"
                  sx={{
                    px: 1.25,
                    mb: 0.5,
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#71717A", // zinc-500: readable on both sidebar surfaces, quieter than the items
                    lineHeight: "24px",
                  }}
                >
                  {group.label}
                </Typography>
              ))}
            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 0.25 }}>
              {group.items.map((item) => (
                <li key={item.id}>
                  <NavRow item={item} active={item.id === activeId} collapsed={rail} counts={counts} onNavigate={onClose} />
                </li>
              ))}
            </Box>
          </Box>
        ))}
      </Box>

      <UserBlock collapsed={rail} onNavigate={onClose} />
    </Box>
  );

  if (variant === "temporary") {
    return (
      <Drawer
        variant="temporary"
        open={!!open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        slotProps={{ paper: { sx: { width: SIDEBAR_WIDTH + 24, maxWidth: "86vw", boxSizing: "border-box" } } }}
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        transition: theme.transitions.create("width", { duration: theme.transitions.duration.shorter }),
        "& .MuiDrawer-paper": {
          width,
          boxSizing: "border-box",
          overflowX: "hidden",
          transition: theme.transitions.create("width", { duration: theme.transitions.duration.shorter }),
        },
      }}
    >
      {content}
    </Drawer>
  );
};

export default Sidebar;
