import React, { useEffect } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useUIStore } from "@/store/uiStore";

/**
 * App shell.
 * - ≥1200px: full sidebar (user can collapse it to icons)
 * - 900–1199px (tablets): icon-only sidebar to leave room for content
 * - <900px: off-canvas drawer opened from the top bar
 */
const Layout: React.FC = () => {
  const theme = useTheme();
  const location = useLocation();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const isWide = useMediaQuery(theme.breakpoints.up("lg"));
  const { sidebarCollapsed, toggleSidebar, mobileNavOpen, setMobileNavOpen } = useUIStore();
  const collapsed = !isWide || sidebarCollapsed;

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, setMobileNavOpen]);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      {isDesktop ? (
        <Sidebar variant="permanent" collapsed={collapsed} canToggle={isWide} onToggle={toggleSidebar} />
      ) : (
        <Sidebar variant="temporary" open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      )}
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Navbar showMenuButton={!isDesktop} onMenuClick={() => setMobileNavOpen(true)} />
        <Box sx={{ flex: 1, p: { xs: 2, sm: 2.5, md: 3 }, width: "100%", maxWidth: 1680, mx: "auto" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
