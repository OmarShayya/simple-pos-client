import React, { useEffect, useState } from "react";
import { AppBar, Box, Button, IconButton, Toolbar, Tooltip, Typography } from "@mui/material";
import { AddRounded, ChevronRightRounded, DarkModeOutlined, LightModeOutlined, MenuOpenRounded, MenuRounded } from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import { useThemeStore } from "@/store/themeStore";
import { getPageContext, newSaleAction } from "@/config/sidebarConfig";
import { formatDayLong, formatTime } from "@/utils/format";

interface TopBarProps {
  /** "drawer": phones/tablets (opens the drawer). "rail": desktop (collapse/expand). "none": no toggle. */
  navMode: "drawer" | "rail" | "none";
  collapsed?: boolean;
  onToggleNav: () => void;
}

/** Lounge-time clock, refreshed every 30 s. */
const Clock: React.FC = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <Typography variant="body2" color="text.secondary" noWrap sx={{ display: { xs: "none", md: "block" }, mr: 0.5 }}>
      {formatDayLong(now)} · {formatTime(now)}
    </Typography>
  );
};

/** Sticky top bar: nav toggle + page title on the left; clock, theme and (on small screens) New sale on the right. */
const TopBar: React.FC<TopBarProps> = ({ navMode, collapsed, onToggleNav }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, toggleTheme } = useThemeStore();
  const context = getPageContext(location.pathname);
  const toggleLabel = navMode === "drawer" ? "Open menu" : collapsed ? "Expand menu" : "Collapse menu";

  return (
    <AppBar
      position="sticky"
      sx={{
        top: 0,
        bgcolor: "background.default",
        color: "text.primary",
        borderBottom: 1,
        borderColor: "divider",
        zIndex: (t) => t.zIndex.appBar,
      }}
    >
      <Toolbar disableGutters sx={{ minHeight: { xs: 56, sm: 64 }, gap: 1, pl: { xs: 1, sm: 2, lg: 3 }, pr: { xs: 1.5, sm: 2, lg: 3 } }}>
        {navMode !== "none" && (
          <Tooltip title={toggleLabel}>
            <IconButton onClick={onToggleNav} aria-label={toggleLabel} edge="start" sx={{ ml: { xs: 0, sm: -0.5 } }}>
              {navMode === "rail" && !collapsed ? <MenuOpenRounded /> : <MenuRounded />}
            </IconButton>
          </Tooltip>
        )}
        <Box sx={{ flexGrow: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 0.5 }}>
          {context.group && (
            <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", gap: 0.5, color: "text.secondary", flexShrink: 0 }}>
              <Typography component="span" sx={{ fontSize: "0.9375rem" }}>
                {context.group}
              </Typography>
              <ChevronRightRounded fontSize="small" aria-hidden />
            </Box>
          )}
          <Typography component="h1" noWrap sx={{ fontSize: "0.9375rem", fontWeight: 600, minWidth: 0 }}>
            {context.title}
          </Typography>
        </Box>

        <Clock />

        <Tooltip title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
          <IconButton onClick={toggleTheme} aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            {mode === "dark" ? <LightModeOutlined /> : <DarkModeOutlined />}
          </IconButton>
        </Tooltip>

        {navMode === "drawer" && location.pathname !== newSaleAction.path && (
          <Button
            variant="contained"
            startIcon={<AddRounded />}
            onClick={() => navigate(newSaleAction.path)}
            sx={{ ml: 0.5, px: { xs: 1.5, sm: 2 } }}
          >
            {newSaleAction.label}
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
