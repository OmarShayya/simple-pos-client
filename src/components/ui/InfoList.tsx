import React from "react";
import { Box, Skeleton, Typography } from "@mui/material";

export interface InfoItem {
  label: string;
  value: React.ReactNode;
  /** Hide the row when there is nothing to show (instead of "—"). */
  hideEmpty?: boolean;
}

export interface InfoListProps {
  items: InfoItem[];
  /** Labels stay, values show skeletons. */
  loading?: boolean;
  /** "rows" = label left / value right; "stacked" = label above value. Default rows (stacked on phones). */
  layout?: "rows" | "stacked";
}

const isEmpty = (v: React.ReactNode) => v === null || v === undefined || v === "" || v === false;

/** Read-only "label: value" pairs for detail panels (contact details, address, notes…). */
const InfoList: React.FC<InfoListProps> = ({ items, loading, layout = "rows" }) => (
  <Box
    component="dl"
    sx={{
      m: 0,
      display: "grid",
      gridTemplateColumns: layout === "rows" ? { xs: "1fr", sm: "140px minmax(0, 1fr)" } : "1fr",
      columnGap: 2,
      rowGap: { xs: 0.25, sm: 1.25 },
    }}
  >
    {items
      .filter((i) => loading || !(i.hideEmpty && isEmpty(i.value)))
      .map((i) => (
        <React.Fragment key={i.label}>
          <Typography component="dt" variant="body2" color="text.secondary" sx={{ pt: { xs: 1, sm: 0 } }}>
            {i.label}
          </Typography>
          <Typography component="dd" sx={{ m: 0, minWidth: 0, overflowWrap: "anywhere" }}>
            {loading ? <Skeleton width="60%" /> : isEmpty(i.value) ? <Box component="span" sx={{ color: "text.disabled" }}>—</Box> : i.value}
          </Typography>
        </React.Fragment>
      ))}
  </Box>
);

export default InfoList;
