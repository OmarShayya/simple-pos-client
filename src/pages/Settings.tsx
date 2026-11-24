import React from "react";
import {
  Box,
  Button,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  DarkModeOutlined,
  LightModeOutlined,
  PaletteOutlined,
  PersonOutline,
  CurrencyExchangeOutlined,
  InfoOutlined,
  Logout,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/common/PageHeader";
import SectionCard from "@/components/common/SectionCard";
import { useThemeStore } from "@/store/themeStore";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { exchangeRateApi } from "@/api/exchangeRate.api";
import { UserRole } from "@/types/auth.types";

const Row: React.FC<{ label: string; description?: string; children: React.ReactNode }> = ({ label, description, children }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: { xs: "flex-start", sm: "center" },
      flexDirection: { xs: "column", sm: "row" },
      justifyContent: "space-between",
      gap: 1.5,
      py: 1.5,
      "&:not(:last-of-type)": { borderBottom: 1, borderColor: "divider" },
    }}
  >
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontWeight: 600 }}>{label}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      )}
    </Box>
    <Box sx={{ flexShrink: 0 }}>{children}</Box>
  </Box>
);

/** App preferences. Sections are plain SectionCards so new ones are easy to add. */
const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { mode, setTheme } = useThemeStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isManager = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER;

  const { data: rate } = useQuery({
    queryKey: ["exchange-rate"],
    queryFn: exchangeRateApi.getCurrentRate,
  });

  return (
    <Box>
      <PageHeader title="Settings" subtitle="Preferences for this device and your account." />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title="Appearance" icon={<PaletteOutlined />}>
            <Row label="Theme" description="Dark mode is easier on the eyes in the lounge.">
              <ToggleButtonGroup
                exclusive
                size="small"
                value={mode}
                onChange={(_, v) => v && setTheme(v)}
                aria-label="Theme"
              >
                <ToggleButton value="light" sx={{ px: 2, gap: 0.75 }}>
                  <LightModeOutlined fontSize="small" /> Light
                </ToggleButton>
                <ToggleButton value="dark" sx={{ px: 2, gap: 0.75 }}>
                  <DarkModeOutlined fontSize="small" /> Dark
                </ToggleButton>
              </ToggleButtonGroup>
            </Row>
            <Row label="Compact sidebar" description="Show only icons in the sidebar on large screens.">
              <FormControlLabel
                control={<Switch checked={sidebarCollapsed} onChange={toggleSidebar} />}
                label={sidebarCollapsed ? "On" : "Off"}
              />
            </Row>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title="Account" icon={<PersonOutline />}>
            <Row label={user?.name ?? "—"} description={user?.email}>
              <Typography variant="body2" sx={{ textTransform: "capitalize", fontWeight: 600 }} color="primary">
                {user?.role}
              </Typography>
            </Row>
            <Row label="Session" description="Sign out of this device.">
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={() => navigate("/profile")}>
                  Profile
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Logout />}
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                >
                  Log out
                </Button>
              </Stack>
            </Row>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title="Exchange rate" icon={<CurrencyExchangeOutlined />}>
            <Row
              label={rate ? `1 USD = ${rate.rate.toLocaleString()} LBP` : "Loading…"}
              description="Used to convert prices and totals to LBP."
            >
              {isManager && (
                <Button variant="outlined" onClick={() => navigate("/exchange-rate")}>
                  Manage
                </Button>
              )}
            </Row>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title="About" icon={<InfoOutlined />}>
            <Row label="Epic Lounge POS" description="Sales, gaming stations and reports for Epic Lounge.">
              <Typography variant="body2" color="text.secondary">
                v1.0
              </Typography>
            </Row>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;
