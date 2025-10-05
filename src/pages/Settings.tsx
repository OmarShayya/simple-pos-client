import React from "react";
import { Box, Typography } from "@mui/material";

const Settings: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold">
        Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        System settings and configuration
      </Typography>
    </Box>
  );
};

export default Settings;
