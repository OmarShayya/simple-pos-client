import React from "react";
import { IconButton, Tooltip } from "@mui/material";

export interface IconActionProps {
  /** Tooltip: what the button does ("Delete product", or why it's disabled). */
  title: React.ReactNode;
  /** Accessible name including the record ("Delete Pepsi"). Defaults to `title` when it's text. */
  label?: string;
  icon: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  /**
   * "danger" (delete, cancel, deactivate): grey at rest, red on hover/focus. A column of red icons
   * shouts louder than the data — the red belongs to the confirm dialog that follows.
   */
  tone?: "default" | "danger";
  size?: "small" | "medium";
}

/**
 * Icon-only button for table rows and card corners: always a tooltip and an accessible name,
 * and the tooltip still works while the button is disabled (explain why).
 */
const IconAction: React.FC<IconActionProps> = ({ title, label, icon, onClick, disabled, tone = "default", size = "medium" }) => (
  <Tooltip title={title}>
    {/* span: disabled buttons don't fire the events a tooltip needs */}
    <span style={{ display: "inline-flex" }}>
      <IconButton
        aria-label={label ?? (typeof title === "string" ? title : undefined)}
        onClick={onClick}
        disabled={disabled}
        size={size}
        sx={tone === "danger" ? { "&:hover, &:focus-visible": { color: "error.main" } } : undefined}
      >
        {icon}
      </IconButton>
    </span>
  </Tooltip>
);

export default IconAction;
