import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { PublicRounded } from "@mui/icons-material";

// All flags (country-flag-icons, MIT; ~50 KB gzipped) live in their own chunk that is only
// downloaded the first time a flag is shown (phone / country fields).
type FlagMap = Record<string, string>;
let flagCache: FlagMap | null = null;
let flagPromise: Promise<FlagMap> | null = null;
const loadFlags = () =>
  (flagPromise ??= import("country-flag-icons/string/3x2").then((m) => (flagCache = m as unknown as FlagMap)));

const uriCache = new Map<string, string>();
const flagUri = (flags: FlagMap, code: string) => {
  const key = code.toUpperCase();
  let uri = uriCache.get(key);
  if (!uri && flags[key]) {
    uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(flags[key])}`;
    uriCache.set(key, uri);
  }
  return uri;
};

export interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 code ("LB"). */
  code: string | null | undefined;
  /** Width in px (height is 2/3). Default 20. */
  size?: number;
}

/** A country flag (3:2). Decorative — always show the country name or dial code next to it. */
const CountryFlag: React.FC<CountryFlagProps> = ({ code, size = 20 }) => {
  const [flags, setFlags] = useState<FlagMap | null>(flagCache);
  useEffect(() => {
    if (flags) return;
    let alive = true;
    loadFlags().then((f) => alive && setFlags(f));
    return () => {
      alive = false;
    };
  }, [flags]);

  const height = Math.round((size * 2) / 3);
  const frame = { width: size, height, flexShrink: 0, borderRadius: "2px", boxShadow: (t: { tokens: { border: string } }) => `0 0 0 1px ${t.tokens.border}` };
  const src = flags && code ? flagUri(flags, code) : undefined;

  if (!flags) return <Box aria-hidden sx={{ ...frame, bgcolor: "action.hover" }} />;
  if (!src) return <PublicRounded aria-hidden sx={{ fontSize: height + 2, color: "text.secondary", flexShrink: 0 }} />;
  return <Box component="img" src={src} alt="" aria-hidden width={size} height={height} sx={{ ...frame, objectFit: "cover" }} />;
};

export default CountryFlag;
