import React from "react";
import { Typography, type TypographyProps } from "@mui/material";
import { fonts } from "@/theme/tokens";

export interface CodeTextProps extends Omit<TypographyProps, "children"> {
  children: React.ReactNode;
}

/** Invoice numbers, booking codes, SKUs — IBM Plex Mono. Use only for codes people read out or type. */
const CodeText: React.FC<CodeTextProps> = ({ children, sx, variant = "inherit", ...rest }) => (
  <Typography
    component="span"
    variant={variant}
    sx={[{ fontFamily: fonts.mono, fontSize: "0.92em", letterSpacing: 0, whiteSpace: "nowrap" }, ...(Array.isArray(sx) ? sx : [sx])]}
    {...rest}
  >
    {children}
  </Typography>
);

export default CodeText;
