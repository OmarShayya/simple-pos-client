import React from "react";
import { Box, Stack, Typography } from "@mui/material";

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Buttons / controls shown on the right (wrap under the title on phones). */
  actions?: React.ReactNode;
  /** Optional row under the title (chips, tabs, filters…). */
  children?: React.ReactNode;
}

/** Consistent page title + actions row used at the top of every screen. */
const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, children }) => (
  <Box sx={{ mb: { xs: 2, md: 3 } }}>
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "stretch", sm: "center" }}
      justifyContent="space-between"
      spacing={{ xs: 1.5, sm: 2 }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: "1.35rem", sm: "1.5rem", md: "1.65rem" } }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          flexWrap="wrap"
          alignItems="center"
          sx={{ flexShrink: 0, "& > *": { flexGrow: { xs: 1, sm: 0 } } }}
        >
          {actions}
        </Stack>
      )}
    </Stack>
    {children && <Box sx={{ mt: 2 }}>{children}</Box>}
  </Box>
);

export default PageHeader;
