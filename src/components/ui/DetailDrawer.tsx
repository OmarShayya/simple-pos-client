import React from "react";
import { Box, Drawer, IconButton, Tooltip, Typography } from "@mui/material";
import { CloseRounded } from "@mui/icons-material";

export interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Buttons in the header row, before the close button (e.g. "Edit"). */
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  /** Pinned row at the bottom (main actions). */
  footer?: React.ReactNode;
  /** Desktop width in px (default 560). Phones always get the full width. */
  width?: number;
}

/**
 * Side panel for "details of one record" (a customer, an order…): opens from the right, keeps
 * the list visible behind it on desktop, full screen on phones. Header + close stay pinned while
 * the body scrolls. Use `FormDialog` for editing; this is for looking things up.
 */
const DetailDrawer: React.FC<DetailDrawerProps> = ({ open, onClose, title, subtitle, headerActions, children, footer, width = 560 }) => {
  const titleId = React.useId();
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          role: "dialog",
          "aria-labelledby": titleId,
          sx: { width: { xs: "100%", sm: width }, maxWidth: "100%", display: "flex", flexDirection: "column", borderRadius: 0 },
        },
      }}
    >
      <Box
        component="header"
        sx={{ display: "flex", alignItems: "flex-start", gap: 1, px: { xs: 2, sm: 3 }, pt: 2, pb: 1.75, borderBottom: 1, borderColor: "divider", flexShrink: 0 }}
      >
        <Box sx={{ flex: 1, minWidth: 0, pt: 0.5 }}>
          <Typography id={titleId} variant="h6" component="h2" sx={{ fontSize: "1.1875rem", lineHeight: 1.3 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {headerActions && <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>{headerActions}</Box>}
        <Tooltip title="Close">
          <IconButton onClick={onClose} aria-label="Close" sx={{ mt: -0.25, flexShrink: 0 }}>
            <CloseRounded />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", scrollbarGutter: "stable", px: { xs: 2, sm: 3 }, py: 2.5 }}>{children}</Box>
      {footer && (
        <Box
          component="footer"
          sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end", px: { xs: 2, sm: 3 }, py: 1.5, borderTop: 1, borderColor: "divider", flexShrink: 0 }}
        >
          {footer}
        </Box>
      )}
    </Drawer>
  );
};

export default DetailDrawer;
