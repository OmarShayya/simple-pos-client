import React from "react";
import { Box, Typography } from "@mui/material";

const ExchangeRate: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold">
        Exchange Rate
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Manage USD to LBP exchange rates
      </Typography>
    </Box>
  );
};

export default ExchangeRate;
