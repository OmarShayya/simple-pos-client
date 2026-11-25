import React from "react";
import { Box, Card, Divider, Typography, type SxProps, type Theme } from "@mui/material";

export interface SectionCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Small muted icon before the title (optional — don't add one just for decoration). */
  icon?: React.ReactNode;
  /** Right side of the header: a "View all" link, a SegmentedControl, a menu… */
  action?: React.ReactNode;
  children: React.ReactNode;
  /** Remove inner padding (full-bleed tables/lists). */
  flush?: boolean;
  /** Divider between header and body (good above lists/tables). */
  divider?: boolean;
  /** Optional footer row (totals, "Show more"). */
  footer?: React.ReactNode;
  /** "card" = bordered surface (default); "plain" = just a titled section, no border. */
  variant?: "card" | "plain";
  sx?: SxProps<Theme>;
}

/**
 * A titled group of content. The header renders immediately; skeleton only the values inside.
 * Prefer one level of cards — don't put a SectionCard inside another card.
 */
const SectionCard: React.FC<SectionCardProps> = ({ title, subtitle, icon, action, children, flush, divider, footer, variant = "card", sx }) => {
  const hasHeader = Boolean(title || action);
  const header = hasHeader && (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: variant === "plain" ? 0 : 2.5, pt: variant === "plain" ? 0 : 2, pb: divider ? 1.75 : flush ? 1.5 : 0.5, minHeight: 44 }}>
      {icon && <Box sx={{ display: "flex", color: "text.secondary", "& svg": { fontSize: 20 } }}>{icon}</Box>}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {title && (
          <Typography variant="subtitle1" component="h3" noWrap>
            {title}
          </Typography>
        )}
        {subtitle && (
          <Typography variant="body2" color="text.secondary" component="div">
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 1 }}>{action}</Box>}
    </Box>
  );

  const body = (
    <Box sx={{ flex: 1, minWidth: 0, p: flush ? 0 : variant === "plain" ? 0 : 2.5, pt: flush ? 0 : hasHeader && !divider ? 1.5 : variant === "plain" ? 1.5 : 2.5 }}>
      {children}
    </Box>
  );

  if (variant === "plain") {
    return (
      <Box component="section" sx={{ display: "flex", flexDirection: "column", ...sx }}>
        {header}
        {divider && <Divider sx={{ mb: 1.5 }} />}
        {body}
        {footer && <Box sx={{ pt: 1.5 }}>{footer}</Box>}
      </Box>
    );
  }

  return (
    <Card component="section" sx={{ height: "100%", display: "flex", flexDirection: "column", ...sx }}>
      {header}
      {divider && <Divider />}
      {body}
      {footer && (
        <>
          <Divider />
          <Box sx={{ px: 2.5, py: 1.5 }}>{footer}</Box>
        </>
      )}
    </Card>
  );
};

export default SectionCard;
