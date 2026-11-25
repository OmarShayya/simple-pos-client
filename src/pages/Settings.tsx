import React from "react";
import { Box, Button, Switch, Typography } from "@mui/material";
import { DarkModeOutlined, LightModeOutlined, LogoutRounded } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { PageHeader, SectionCard, SegmentedControl, SettingRow, StatusChip } from "@/components/ui";
import { useCurrentRate } from "@/components/exchange/exchangeQueries";
import { useThemeStore } from "@/store/themeStore";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { formatLbp } from "@/utils/format";

/** Preferences for this device and the signed-in account. */
const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { mode, setTheme } = useThemeStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isManager = user?.role === "admin" || user?.role === "manager";
  const rate = useCurrentRate();

  return (
    <Box sx={{ maxWidth: 880 }}>
      <PageHeader title="Settings" subtitle="Preferences for this device and your account." />
      <Box sx={{ display: "grid", gap: 2.5 }}>
        <SectionCard title="This device" divider>
          <SettingRow label="Colours" description="Light is easiest to read in daylight; dark is calmer at night.">
            <SegmentedControl<"light" | "dark">
              aria-label="Colours"
              value={mode}
              onChange={setTheme}
              options={[
                { value: "light", label: "Light", icon: <LightModeOutlined /> },
                { value: "dark", label: "Dark", icon: <DarkModeOutlined /> },
              ]}
            />
          </SettingRow>
          <SettingRow label="Compact menu" description="Show only icons in the side menu on big screens (hover an icon to see its name).">
            <Switch checked={sidebarCollapsed} onChange={toggleSidebar} slotProps={{ input: { role: "switch", "aria-label": "Compact menu" } }} />
          </SettingRow>
        </SectionCard>

        <SectionCard title="Account" divider>
          <SettingRow
            label={user?.name ?? "—"}
            description={
              <>
                {user?.email}
                {user?.role && <StatusChip status={user.role} kind="role" dot={false} sx={{ ml: 1 }} />}
              </>
            }
          >
            <Button variant="outlined" onClick={() => navigate("/profile")}>
              My account
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<LogoutRounded />}
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Sign out
            </Button>
          </SettingRow>
        </SectionCard>

        <SectionCard title="Money" divider>
          <SettingRow label="Exchange rate" description="Used to show LBP prices and take LBP payments.">
            <Typography sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{rate.data ? `1 USD = ${formatLbp(rate.data.rate)}` : "—"}</Typography>
            {isManager && (
              <Button variant="outlined" onClick={() => navigate("/exchange-rate")}>
                Change
              </Button>
            )}
          </SettingRow>
        </SectionCard>

        <SectionCard title="About" divider>
          <SettingRow label="Epic Lounge POS" description="Sales, gaming stations, bookings and reports for Epic Lounge.">
            <Typography variant="body2" color="text.secondary">
              Version 2.0
            </Typography>
          </SettingRow>
        </SectionCard>
      </Box>
    </Box>
  );
};

export default Settings;
