import React from "react";
import { Box, Typography, type TypographyProps } from "@mui/material";
import { formatLbp, formatMoney, type Currency } from "@/utils/format";

export interface MoneyTextProps extends Omit<TypographyProps, "children" | "color"> {
  value: number | null | undefined;
  /** Default "USD" → "$12.50"; "LBP" → "1,120,000 LBP". */
  currency?: Currency;
  /** Optional LBP equivalent shown after/under the main amount. */
  lbp?: number | null;
  lbpLayout?: "inline" | "stacked";
  compact?: boolean;
  /** "+$3.00" for positive values. */
  signed?: boolean;
  trimZeros?: boolean;
  /** "sign" colours positive green / negative red; "muted" uses secondary text. */
  tone?: "default" | "sign" | "muted";
  /** Struck-through (original price before a discount). */
  strike?: boolean;
}

/** An amount of money, always tabular and never wrapped. Use it for every price/total in the UI. */
const MoneyText: React.FC<MoneyTextProps> = ({
  value,
  currency = "USD",
  lbp,
  lbpLayout = "inline",
  compact,
  signed,
  trimZeros,
  tone = "default",
  strike,
  variant = "inherit",
  sx,
  ...rest
}) => {
  const color =
    tone === "muted"
      ? "text.secondary"
      : tone === "sign" && typeof value === "number" && value !== 0
        ? value > 0
          ? "success.main"
          : "error.main"
        : undefined;

  const main = formatMoney(value, currency, { compact, signed, trimZeros });
  const showLbp = typeof lbp === "number" && Number.isFinite(lbp);

  return (
    <Typography
      component="span"
      variant={variant}
      sx={[
        {
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
          color,
          textDecoration: strike ? "line-through" : undefined,
          display: showLbp && lbpLayout === "stacked" ? "inline-flex" : undefined,
          flexDirection: showLbp && lbpLayout === "stacked" ? "column" : undefined,
          lineHeight: showLbp && lbpLayout === "stacked" ? 1.3 : undefined,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    >
      {main}
      {showLbp && (
        <Box
          component="span"
          sx={{ color: "text.secondary", fontSize: "0.8125rem", fontWeight: 400, ml: lbpLayout === "inline" ? 0.75 : 0 }}
        >
          {lbpLayout === "inline" ? `· ${formatLbp(lbp)}` : formatLbp(lbp)}
        </Box>
      )}
    </Typography>
  );
};

export default MoneyText;
