import React, { useEffect } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { useUIStore } from "@/store/uiStore";

/**
 * App shell.
 * - ≥1200px: full sidebar; the top-bar button collapses it to a 72px icon rail (remembered).
 * - 900–1199px (tablets landscape): icon rail.
 * - <900px (phones, tablets portrait): off-canvas drawer opened from the top bar.
 */
const Layout: React.FC = () => {
  const theme = useTheme();
  const location = useLocation();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"), { noSsr: true });
  const isWide = useMediaQuery(theme.breakpoints.up("lg"), { noSsr: true });
  const { sidebarCollapsed, toggleSidebar, mobileNavOpen, setMobileNavOpen } = useUIStore();
  const collapsed = !isWide || sidebarCollapsed;

  // Close the phone drawer whenever the route changes
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, setMobileNavOpen]);

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh", bgcolor: "background.default" }}>
      {isDesktop ? (
        <Sidebar variant="permanent" collapsed={collapsed} />
      ) : (
        <Sidebar variant="temporary" open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      )}
      <Box sx={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopBar
          navMode={isDesktop ? (isWide ? "rail" : "none") : "drawer"}
          collapsed={collapsed}
          onToggleNav={isDesktop ? toggleSidebar : () => setMobileNavOpen(true)}
        />
        <Box
          component="main"
          id="main"
          sx={{ flex: 1, width: "100%", maxWidth: 1600, mx: "auto", px: { xs: 2, sm: 2.5, md: 3, lg: 4 }, py: { xs: 2, sm: 2.5, md: 3 } }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
