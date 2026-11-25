import React from "react";
import { Box, Typography } from "@mui/material";
import { LanguageRounded, SportsEsportsOutlined, StorefrontOutlined } from "@mui/icons-material";
import { StatusChip } from "@/components/ui";
import { ORDER_KIND_LABEL, type OrderKind } from "./orderMeta";

const KIND_ICON: Record<OrderKind, React.ReactElement> = {
  counter: <StorefrontOutlined />,
  gaming: <SportsEsportsOutlined />,
  website: <LanguageRounded />,
};

/** "Counter" / "Gaming" / "Website" with its icon. Website orders use the info colour (they need attention). */
export const OrderKindLabel: React.FC<{ kind: OrderKind }> = ({ kind }) => (
  <Box
    component="span"
    sx={{
      display: "inline-flex",
      alignItems: "center",
      gap: 0.75,
      color: kind === "website" ? "info.main" : "text.secondary",
      fontWeight: kind === "website" ? 600 : 400,
      "& svg": { fontSize: 18 },
    }}
  >
    {KIND_ICON[kind]}
    <Typography component="span" variant="body2" sx={{ color: "inherit", fontWeight: "inherit" }}>
      {ORDER_KIND_LABEL[kind]}
    </Typography>
  </Box>
);

/** Pulsing "Running" pill for station time that is still counting. */
export const RunningChip: React.FC<{ label?: React.ReactNode }> = ({ label = "Running" }) => (
  <StatusChip
    status="active"
    kind="session"
    label={label}
    sx={{ "& [aria-hidden]": { animation: "pos-pulse 1.6s ease-in-out infinite" } }}
  />
);
