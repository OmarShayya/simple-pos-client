import React from "react";
import { Box, Typography } from "@mui/material";

export interface SettingRowProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  /** The control on the right (Switch, SegmentedControl, a button…). */
  children: React.ReactNode;
  /** id of the control, so clicking the label focuses it. */
  htmlFor?: string;
}

/**
 * One setting: label + plain-language description on the left, its control on the right
 * (stacked on phones). Rows in a section are separated by a divider.
 */
const SettingRow: React.FC<SettingRowProps> = ({ label, description, children, htmlFor }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: { xs: "stretch", sm: "center" },
      flexDirection: { xs: "column", sm: "row" },
      justifyContent: "space-between",
      gap: { xs: 1.25, sm: 2 },
      py: 1.75,
      "&:first-of-type": { pt: 0.5 },
      "&:last-of-type": { pb: 0.5 },
      "&:not(:last-of-type)": { borderBottom: 1, borderColor: "divider" },
    }}
  >
    <Box sx={{ minWidth: 0 }}>
      <Typography component={htmlFor ? "label" : "div"} htmlFor={htmlFor} sx={{ fontWeight: 600, display: "block" }}>
        {label}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 0.25 }}>
          {description}
        </Typography>
      )}
    </Box>
    <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>{children}</Box>
  </Box>
);

export default SettingRow;
