import React from "react";
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import {
  DarkModeOutlined,
  LightModeOutlined,
  Logout,
  MenuRounded,
  PersonOutline,
  SettingsOutlined,
} from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { getPageTitle } from "@/config/sidebarConfig";

interface NavbarProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

/** Compact top bar: page title on the left, theme + account on the right. */
const Navbar: React.FC<NavbarProps> = ({ onMenuClick, showMenuButton }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { mode, toggleTheme } = useThemeStore();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const close = () => setAnchorEl(null);
  const goto = (path: string) => {
    navigate(path);
    close();
  };
  const handleLogout = () => {
    close();
    logout();
    navigate("/login");
  };

  const today = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="inherit"
      sx={{
        top: 0,
        bgcolor: alpha(theme.palette.background.default, 0.82),
        backdropFilter: "saturate(160%) blur(12px)",
        borderBottom: 1,
        borderColor: "divider",
        color: "text.primary",
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, gap: 1, px: { xs: 1.5, sm: 2.5 } }}>
        {showMenuButton && (
          <IconButton edge="start" onClick={onMenuClick} aria-label="Open navigation" sx={{ mr: 0.5 }}>
            <MenuRounded />
          </IconButton>
        )}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {getPageTitle(location.pathname)}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: { xs: "none", sm: "block" } }}>
            {today}
          </Typography>
        </Box>

        <Tooltip title={mode === "dark" ? "Light mode" : "Dark mode"}>
          <IconButton onClick={toggleTheme} aria-label="Toggle colour mode">
            {mode === "dark" ? <LightModeOutlined /> : <DarkModeOutlined />}
          </IconButton>
        </Tooltip>

        <Box
          component="button"
          onClick={(e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)}
          aria-label="Account menu"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            border: 0,
            bgcolor: "transparent",
            color: "inherit",
            font: "inherit",
            cursor: "pointer",
            p: 0.5,
            pr: { xs: 0.5, md: 1.25 },
            borderRadius: 3,
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <Avatar sx={{ width: 34, height: 34, bgcolor: "primary.main", color: "primary.contrastText", fontWeight: 700, fontSize: "0.95rem" }}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </Avatar>
          <Box sx={{ display: { xs: "none", md: "block" }, textAlign: "left" }}>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
              {user?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: "capitalize", lineHeight: 1.2 }}>
              {user?.role}
            </Typography>
          </Box>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={close}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          slotProps={{ paper: { sx: { minWidth: 220, mt: 1 } } }}
        >
          <Box sx={{ px: 2, py: 1.25 }}>
            <Typography variant="subtitle2">{user?.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => goto("/profile")}>
            <ListItemIcon>
              <PersonOutline fontSize="small" />
            </ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem onClick={() => goto("/settings")}>
            <ListItemIcon>
              <SettingsOutlined fontSize="small" />
            </ListItemIcon>
            Settings
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
            <ListItemIcon sx={{ color: "inherit" }}>
              <Logout fontSize="small" />
            </ListItemIcon>
            Log out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
