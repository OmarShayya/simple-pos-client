import React, { useMemo } from "react";
import { Box, GlobalStyles, ThemeProvider, Typography, useTheme } from "@mui/material";
import getTheme from "@/theme/theme";
import { formatDateTime } from "@/utils/format";

const printCss = (
  <GlobalStyles
    styles={{
      "@media print": {
        "@page": { size: "A4 portrait", margin: "12mm" },
        "html, body, #root, #main": { background: "#fff !important" },
        ".MuiDrawer-root, header.MuiAppBar-root, [data-print-hide], .MuiDataGrid-footerContainer, .report-content .MuiButton-root, .report-content .MuiIconButton-root, .report-content .MuiToggleButtonGroup-root, .MuiLinearProgress-root":
          { display: "none !important" },
        "#main": { padding: "0 !important", maxWidth: "none !important" },
        "[data-print-only]": { display: "block !important" },
        ".report-content .MuiCard-root, .report-content section": { breakInside: "avoid", boxShadow: "none !important" },
        "*": { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" },
      },
    }}
  />
);

/**
 * Wraps the printable report (no html2pdf): light theme while printing (`usePrintMode`), print CSS
 * that hides the app shell and buttons, and a header only paper shows.
 */
export const PrintableReport: React.FC<{ printing: boolean; title: string; children: React.ReactNode }> = ({ printing, title, children }) => {
  const outer = useTheme();
  const light = useMemo(() => getTheme("light"), []);
  return (
    <ThemeProvider theme={printing ? light : outer}>
      {printCss}
      <Box data-print-only sx={{ display: "none", mb: 2, pb: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <Typography sx={{ fontWeight: 600, fontSize: "1.25rem" }}>Epic Lounge — {title}</Typography>
        <Typography variant="body2" color="text.secondary">
          Printed {formatDateTime(new Date())}
        </Typography>
      </Box>
      <Box className="report-content">{children}</Box>
    </ThemeProvider>
  );
};
