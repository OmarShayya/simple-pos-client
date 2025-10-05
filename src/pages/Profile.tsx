import React from "react";
import { Box, Typography, Card, CardContent } from "@mui/material";
import { useAuthStore } from "@/store/authStore";

const Profile: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Profile
      </Typography>

      <Card sx={{ mt: 3, maxWidth: 600 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            User Information
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Name
            </Typography>
            <Typography variant="body1" fontWeight={500} gutterBottom>
              {user?.name}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Email
            </Typography>
            <Typography variant="body1" fontWeight={500} gutterBottom>
              {user?.email}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Role
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {user?.role.toUpperCase()}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Profile;
