import React from "react";
import { Box, Stack, Typography } from "@mui/material";

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Buttons on the right (they wrap under the title on phones). Put the primary action last. */
  actions?: React.ReactNode;
  /** Optional row under the title: tabs, a FilterBar, a DateRangeField… */
  children?: React.ReactNode;
}

/**
 * Title + subtitle + actions at the top of every screen. Renders immediately — never wait for
 * data before showing it (put counts in the subtitle once they arrive, not instead of it).
 */
const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, children }) => (
  <Box component="header" sx={{ mb: { xs: 2, md: 3 } }}>
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "stretch", sm: "flex-start" }}
      justifyContent="space-between"
      spacing={{ xs: 1.5, sm: 2 }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h4" component="h2" sx={{ fontSize: { xs: "1.25rem", sm: "1.375rem" } }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
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
          sx={{ flexShrink: 0, "& > .MuiButton-root": { flexGrow: { xs: 1, sm: 0 } } }}
        >
          {actions}
        </Stack>
      )}
    </Stack>
    {children && <Box sx={{ mt: 2 }}>{children}</Box>}
  </Box>
);

export default PageHeader;
