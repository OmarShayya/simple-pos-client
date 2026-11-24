import React from "react";
import { Avatar, Box, Card, CardContent, Divider, Stack, Typography } from "@mui/material";
import { useAuthStore } from "@/store/authStore";
import PageHeader from "@/components/common/PageHeader";
import StatusChip from "@/components/common/StatusChip";

const Field: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography sx={{ fontWeight: 600 }}>{value ?? "—"}</Typography>
  </Box>
);

const Profile: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <Box>
      <PageHeader title="Profile" subtitle="Your account details." />
      <Card sx={{ maxWidth: 640 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ width: 64, height: 64, bgcolor: "primary.main", color: "primary.contrastText", fontSize: "1.6rem", fontWeight: 700 }}>
              {user?.name?.charAt(0)?.toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" noWrap>
                {user?.name}
              </Typography>
              <StatusChip status="active" label={user?.role} dot={false} sx={{ mt: 0.5 }} />
            </Box>
          </Stack>
          <Divider sx={{ my: 2.5 }} />
          <Stack spacing={2}>
            <Field label="Name" value={user?.name} />
            <Field label="Email" value={user?.email} />
            <Field label="Role" value={<Box component="span" sx={{ textTransform: "capitalize" }}>{user?.role}</Box>} />
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Profile;
