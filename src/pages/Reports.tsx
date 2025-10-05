import React from "react";
import { Box, Typography } from "@mui/material";

const Reports: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold">
        Reports
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        View sales reports and analytics
      </Typography>
    </Box>
  );
};

export default Reports;
