import React from "react";
import { Box, CircularProgress } from "@mui/material";

const LoadingSpinner: React.FC = () => (
  <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
    <CircularProgress />
  </Box>
);

export default LoadingSpinner;
