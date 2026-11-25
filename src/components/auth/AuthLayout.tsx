import React, { useMemo } from "react";
import { Box, Card, IconButton, ThemeProvider, Tooltip, Typography } from "@mui/material";
import { DarkModeOutlined, LightModeOutlined } from "@mui/icons-material";
import getTheme from "@/theme/theme";
import { useThemeStore } from "@/store/themeStore";

export interface AuthLayoutProps {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  /** Below the card (e.g. "New staff? Ask an admin…"). */
  footer?: React.ReactNode;
}

/**
 * Sign-in / first-run screens: plain canvas, the logo, one centred card. Follows the device's
 * light/dark choice (light by default) — no decoration, big fields and buttons.
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children, footer }) => {
  const { mode, toggleTheme } = useThemeStore();
  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <Box
        component="main"
        sx={{
          minHeight: "100dvh",
          bgcolor: theme.tokens.surfaceSubtle,
          color: "text.primary",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          px: 2,
          py: { xs: 3, sm: 6 },
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 440, display: "flex", justifyContent: "flex-end" }}>
          <Tooltip title={mode === "light" ? "Dark colours" : "Light colours"}>
            <IconButton onClick={toggleTheme} aria-label={mode === "light" ? "Switch to dark colours" : "Switch to light colours"}>
              {mode === "light" ? <DarkModeOutlined /> : <LightModeOutlined />}
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ width: "100%", maxWidth: 440, my: "auto" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3, justifyContent: "center" }}>
            <Box component="img" src="/logo-96.webp" alt="" sx={{ width: 48, height: 48, borderRadius: "12px" }} />
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: "1.25rem", lineHeight: 1.2 }}>Epic Lounge</Typography>
              <Typography variant="body2" color="text.secondary">
                Point of sale
              </Typography>
            </Box>
          </Box>
          <Card component="section" aria-labelledby="auth-title" sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography id="auth-title" variant="h5" component="h1" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography color="text.secondary" component="div" sx={{ mt: 0.75 }}>
                {subtitle}
              </Typography>
            )}
            <Box sx={{ mt: 3 }}>{children}</Box>
          </Card>
          {footer && (
            <Typography variant="body2" color="text.secondary" component="div" sx={{ textAlign: "center", mt: 3 }}>
              {footer}
            </Typography>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default AuthLayout;
