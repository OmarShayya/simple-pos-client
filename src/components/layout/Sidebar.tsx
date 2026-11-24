import React from "react";
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import { findSidebarItem, getVisibleGroups } from "@/config/sidebarConfig";
import { useAuthStore } from "@/store/authStore";
import { brand } from "@/theme/theme";

export const SIDEBAR_WIDTH = 248;
export const SIDEBAR_COLLAPSED_WIDTH = 76;

interface SidebarProps {
  variant: "permanent" | "temporary";
  open?: boolean;
  collapsed?: boolean;
  /** Show the collapse/expand control (wide screens only). */
  canToggle?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

const Brand: React.FC<{ collapsed: boolean }> = ({ collapsed }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1.25,
      px: collapsed ? 0 : 2.5,
      justifyContent: collapsed ? "center" : "flex-start",
      height: 64,
      flexShrink: 0,
    }}
  >
    <Box
      component="img"
      src="/logo-96.webp"
      alt="Epic Lounge"
      sx={{ width: 36, height: 36, borderRadius: "10px", flexShrink: 0 }}
    />
    {!collapsed && (
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{ fontFamily: brand.fontDisplay, fontWeight: 800, fontSize: "0.92rem", letterSpacing: "0.06em", lineHeight: 1.1 }}
        >
          EPIC<Box component="span" sx={{ color: brand.cyan }}>.</Box>LOUNGE
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: "0.08em" }}>
          POINT OF SALE
        </Typography>
      </Box>
    )}
  </Box>
);

const Sidebar: React.FC<SidebarProps> = ({ variant, open, collapsed = false, canToggle, onToggle, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const groups = getVisibleGroups(user?.role);
  const activeId = findSidebarItem(location.pathname)?.id;
  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  const go = (path: string) => {
    navigate(path);
    onClose?.();
  };

  const content = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Brand collapsed={collapsed} />
      <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", px: collapsed ? 1 : 1.5, pb: 2 }}>
        {groups.map((group) => (
          <List
            key={group.id}
            dense
            disablePadding
            sx={{ mb: collapsed ? 1 : 1.5 }}
            subheader={
              collapsed ? (
                <Box sx={{ height: 1, bgcolor: "divider", mx: 1.5, my: 1 }} />
              ) : (
                <ListSubheader
                  disableSticky
                  sx={{
                    bgcolor: "transparent",
                    lineHeight: "32px",
                    px: 1.5,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "text.secondary",
                  }}
                >
                  {group.label}
                </ListSubheader>
              )
            }
          >
            {group.items.map((item) => {
              const active = item.id === activeId;
              const Icon = item.icon;
              const button = (
                <ListItemButton
                  key={item.id}
                  onClick={() => go(item.path)}
                  selected={active}
                  aria-current={active ? "page" : undefined}
                  sx={{
                    position: "relative",
                    borderRadius: 2.5,
                    minHeight: 44,
                    mb: 0.25,
                    px: collapsed ? 0 : 1.5,
                    justifyContent: collapsed ? "center" : "flex-start",
                    color: active ? "primary.main" : "text.primary",
                    "&.Mui-selected": {
                      bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.14 : 0.1),
                    },
                    "&.Mui-selected:hover": {
                      bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.2 : 0.14),
                    },
                    "&::before": active
                      ? {
                          content: '""',
                          position: "absolute",
                          left: collapsed ? 4 : -6,
                          top: 10,
                          bottom: 10,
                          width: 3,
                          borderRadius: 3,
                          bgcolor: "primary.main",
                        }
                      : {},
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: collapsed ? 0 : 38,
                      color: active ? "primary.main" : "text.secondary",
                      justifyContent: "center",
                    }}
                  >
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={item.label}
                      slotProps={{ primary: { sx: { fontWeight: active ? 700 : 500, fontSize: "0.92rem" } } }}
                    />
                  )}
                </ListItemButton>
              );
              return collapsed ? (
                <Tooltip key={item.id} title={item.label} placement="right">
                  {button}
                </Tooltip>
              ) : (
                button
              );
            })}
          </List>
        ))}
      </Box>
      {canToggle && (
        <Box sx={{ p: 1.5, borderTop: 1, borderColor: "divider", display: "flex", justifyContent: collapsed ? "center" : "flex-end" }}>
          <Tooltip title={collapsed ? "Expand sidebar" : "Collapse sidebar"} placement="right">
            <IconButton size="small" onClick={onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );

  if (variant === "temporary") {
    return (
      <Drawer
        variant="temporary"
        open={!!open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{ "& .MuiDrawer-paper": { width: SIDEBAR_WIDTH + 12, boxSizing: "border-box" } }}
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
