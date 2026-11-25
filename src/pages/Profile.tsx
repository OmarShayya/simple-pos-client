import React from "react";
import { Avatar, Box, Button, Stack, Typography } from "@mui/material";
import { LogoutRounded, SettingsOutlined } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { InfoList, PageHeader, SectionCard, StatusChip } from "@/components/ui";
import { ROLE_INFO } from "@/components/staff/roles";
import { useAuthStore } from "@/store/authStore";
import { initials } from "@/utils/format";

/** The signed-in staff member's account. */
const Profile: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const role = user?.role ? ROLE_INFO[user.role] : undefined;

  return (
    <Box sx={{ maxWidth: 720 }}>
      <PageHeader
        title="My account"
        subtitle="Your sign-in details on this POS."
        actions={
          <>
            <Button variant="outlined" startIcon={<SettingsOutlined />} onClick={() => navigate("/settings")}>
              Settings
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
          </>
        }
      />
      <SectionCard>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: (t) => t.tokens.primaryTint, color: (t) => t.tokens.primaryText, fontWeight: 600, fontSize: "1.25rem" }}>
            {initials(user?.name)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" component="h3" noWrap>
              {user?.name}
            </Typography>
            {user?.role && <StatusChip status={user.role} kind="role" dot={false} sx={{ mt: 0.5 }} />}
          </Box>
        </Stack>
        <InfoList
          items={[
            { label: "Name", value: user?.name },
            { label: "Email (sign-in)", value: user?.email },
            { label: "Role", value: role?.label },
            { label: "Can use", value: role?.help },
            { label: "Password", value: "To change your name or password, ask an admin." },
          ]}
        />
      </SectionCard>
    </Box>
  );
};

export default Profile;
