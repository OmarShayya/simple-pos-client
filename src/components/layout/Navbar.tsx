import React from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  Tooltip,
  Chip,
} from "@mui/material";
import { Logout, Person, Brightness7, DarkMode } from "@mui/icons-material";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { useNavigate } from "react-router-dom";

const DRAWER_WIDTH = 260;

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { mode, toggleTheme } = useThemeStore();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    handleClose();
  };

  const handleProfile = () => {
    navigate("/profile");
    handleClose();
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: `calc(100% - ${DRAWER_WIDTH}px)`,
        ml: `${DRAWER_WIDTH}px`,
        backgroundColor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Toolbar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" color="text.primary" fontWeight={600}>
            Welcome back, {user?.name}!
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Typography>
        </Box>

        <Tooltip title="Toggle theme">
          <IconButton onClick={toggleTheme} color="inherit" sx={{ mr: 1 }}>
            {mode === "dark" ? (
              <Brightness7 />
            ) : (
              <DarkMode sx={{ color: "black" }} />
            )}
          </IconButton>
        </Tooltip>

        <Chip
          label={user?.role.toUpperCase()}
          size="small"
          color="primary"
          sx={{ mr: 2, fontWeight: 600 }}
        />

        <Tooltip title="Account settings">
          <IconButton onClick={handleMenu}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: "primary.main",
                fontSize: "1rem",
              }}
            >
              {user?.name.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {user?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>

          <Divider />

          <MenuItem onClick={handleProfile}>
            <ListItemIcon>
              <Person fontSize="small" />
            </ListItemIcon>
            Profile
          </MenuItem>

          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <Logout fontSize="small" />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
