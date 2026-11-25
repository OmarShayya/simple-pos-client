import React from "react";
import { Box } from "@mui/material";
import { PublicRounded } from "@mui/icons-material";

// One small SVG file per country (from country-flag-icons, MIT). Vite emits them as separate
// assets, so only the flags actually shown are downloaded.
const FLAG_URLS = import.meta.glob("/node_modules/country-flag-icons/3x2/*.svg", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

const urlFor = (code: string) => FLAG_URLS[`/node_modules/country-flag-icons/3x2/${code.toUpperCase()}.svg`];

export interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 code ("LB"). */
  code: string | null | undefined;
  /** Width in px (height is 2/3). Default 20. */
  size?: number;
}

/** A country flag image (3:2), with a neutral globe when the code is unknown. Decorative: pair it with the country name. */
const CountryFlag: React.FC<CountryFlagProps> = ({ code, size = 20 }) => {
  const src = code ? urlFor(code) : undefined;
  const height = Math.round((size * 2) / 3);
  if (!src) {
    return <PublicRounded aria-hidden sx={{ fontSize: height + 2, color: "text.secondary", flexShrink: 0 }} />;
  }
  return (
    <Box
      component="img"
      src={src}
      alt=""
      aria-hidden
      loading="lazy"
      width={size}
      height={height}
      sx={{ width: size, height, flexShrink: 0, borderRadius: "2px", objectFit: "cover", boxShadow: (t) => `0 0 0 1px ${t.tokens.border}` }}
    />
  );
};

export default CountryFlag;
