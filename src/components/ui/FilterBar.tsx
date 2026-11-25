import React from "react";
import { Box, Button, type SxProps, type Theme } from "@mui/material";
import { FilterAltOffOutlined } from "@mui/icons-material";

export interface FilterBarProps {
  /** Usually a SearchField (grows to fill the row). */
  search?: React.ReactNode;
  /** Filter controls: SelectField, SegmentedControl, DateRangeField… */
  children?: React.ReactNode;
  /** Right-aligned controls (Refresh, Export, primary action). */
  actions?: React.ReactNode;
  /** How many filters differ from their defaults. Shows "Clear filters" when > 0. */
  activeCount?: number;
  onClear?: () => void;
  sx?: SxProps<Theme>;
}

/**
 * One responsive row of search + filters + actions. Wraps on small screens; on phones each
 * control takes the full width. Renders immediately — it never waits for data.
 */
const FilterBar: React.FC<FilterBarProps> = ({ search, children, actions, activeCount = 0, onClear, sx }) => (
  <Box
    role="search"
    sx={[
      {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 1.5,
        "& > *": { minWidth: 0 },
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {search && <Box sx={{ flex: "1 1 260px", maxWidth: { md: 420 }, width: { xs: "100%", sm: "auto" } }}>{search}</Box>}
    {children && (
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 1.5,
          flex: { xs: "1 1 100%", md: "0 1 auto" },
          "& > *": { flex: { xs: "1 1 160px", md: "0 0 auto" } },
          // Phones: a segmented filter gets its own row and its options share it (none cut off at the edge)
          "& > .MuiToggleButtonGroup-root": {
            flex: { xs: "1 1 100%", md: "0 0 auto" },
            "& .MuiToggleButton-root": { flex: { xs: "1 1 auto", md: "0 0 auto" }, px: { xs: 1.25, md: 1.75 } },
          },
        }}
      >
        {children}
      </Box>
    )}
    {activeCount > 0 && onClear && (
      <Button variant="text" color="inherit" startIcon={<FilterAltOffOutlined />} onClick={onClear} sx={{ color: "text.secondary" }}>
        Clear filters
      </Button>
    )}
    {actions && (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: { xs: 0, md: "auto" }, flexWrap: "wrap", width: { xs: "100%", sm: "auto" }, "& > .MuiButton-root": { flex: { xs: "1 1 auto", sm: "0 0 auto" } } }}>
        {actions}
      </Box>
    )}
  </Box>
);

export default FilterBar;
