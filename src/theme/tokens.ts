/**
 * Design tokens for the Epic Lounge POS.
 *
 * One neutral scale (zinc) for surfaces and text, ONE brand accent (Epic Lounge teal),
 * semantic colours only when they carry meaning, and fixed series colours for charts.
 * Components read these through the MUI theme (`theme.palette.*`, `theme.tokens`), so
 * avoid importing hex values directly in pages.
 */

export type ColorMode = "light" | "dark";

export const fonts = {
  sans: '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  /** Only for codes: invoice numbers, booking codes, SKUs. */
  mono: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
} as const;

export const radii = {
  /** Buttons, inputs, chips, menu items. */
  control: 8,
  /** Cards, dialogs, popovers. */
  card: 12,
} as const;

export const zinc = {
  50: "#FAFAFA",
  100: "#F4F4F5",
  200: "#E4E4E7",
  300: "#D4D4D8",
  400: "#A1A1AA",
  500: "#71717A",
  600: "#52525B",
  700: "#3F3F46",
  800: "#27272A",
  850: "#1F1F23",
  900: "#18181B",
  925: "#111113",
  950: "#09090B",
} as const;

export interface ModeTokens {
  /** App canvas (behind pages). */
  canvas: string;
  /** Cards, tables, inputs. */
  surface: string;
  /** Subtle surface: table headers, toolbars, hovered rows. */
  surfaceSubtle: string;
  /** Menus, dialogs, popovers. */
  surfaceRaised: string;
  sidebar: string;
  border: string;
  /** Input outlines, outlined buttons. */
  borderStrong: string;
  text: string;
  textMuted: string;
  textDisabled: string;
  hover: string;
  primary: string;
  primaryHover: string;
  /** Teal text on light/tinted backgrounds (meets 4.5:1). */
  primaryText: string;
  primaryTint: string;
  primaryContrast: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  scrollbar: string;
  scrollbarHover: string;
  tooltip: string;
  focusRing: string;
  shadowPopover: string;
  shadowDialog: string;
  /** Data series (charts, station types). */
  series: SeriesColors;
}

export interface SeriesColors {
  /** Gaming / PC. */
  pc: string;
  playstation: string;
  /** Products / food & drinks. */
  products: string;
  other: string;
}

const light: ModeTokens = {
  canvas: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceSubtle: zinc[50],
  surfaceRaised: "#FFFFFF",
  sidebar: zinc[50],
  border: zinc[200],
  borderStrong: zinc[300],
  text: zinc[900],
  textMuted: zinc[600],
  textDisabled: zinc[400],
  hover: zinc[100],
  // ≈ #0B8A8C, nudged 2% darker so white button text passes WCAG AA (4.5:1)
  primary: "#0A8486",
  primaryHover: "#087173",
  primaryText: "#087173",
  primaryTint: "#E7F5F5",
  primaryContrast: "#FFFFFF",
  success: "#15803D",
  warning: "#B45309",
  error: "#DC2626",
  info: "#2563EB",
  scrollbar: zinc[300],
  scrollbarHover: zinc[400],
  tooltip: zinc[900],
  focusRing: "rgba(10, 132, 134, 0.28)",
  shadowPopover: "0 1px 2px rgba(9, 9, 11, 0.04), 0 8px 24px -4px rgba(9, 9, 11, 0.12)",
  shadowDialog: "0 2px 4px rgba(9, 9, 11, 0.04), 0 24px 48px -12px rgba(9, 9, 11, 0.24)",
  series: { pc: "#0A8486", playstation: "#2563EB", products: "#D97706", other: "#64748B" },
};

const dark: ModeTokens = {
  canvas: zinc[950],
  surface: zinc[925],
  surfaceSubtle: "#141416",
  surfaceRaised: zinc[900],
  sidebar: zinc[925],
  border: zinc[800],
  borderStrong: zinc[700],
  text: zinc[50],
  textMuted: zinc[400],
  textDisabled: zinc[600],
  hover: zinc[850],
  primary: "#2CC5C7",
  primaryHover: "#5CD5D6",
  primaryText: "#2CC5C7",
  primaryTint: "rgba(44, 197, 199, 0.14)",
  primaryContrast: "#04272A",
  success: "#4ADE80",
  warning: "#FBBF24",
  error: "#F87171",
  info: "#60A5FA",
  scrollbar: zinc[700],
  scrollbarHover: zinc[600],
  tooltip: zinc[700],
  focusRing: "rgba(44, 197, 199, 0.35)",
  shadowPopover: "0 8px 24px -4px rgba(0, 0, 0, 0.6)",
  shadowDialog: "0 24px 48px -12px rgba(0, 0, 0, 0.7)",
  series: { pc: "#2CC5C7", playstation: "#60A5FA", products: "#F59E0B", other: "#94A3B8" },
};

export const getTokens = (mode: ColorMode): ModeTokens => (mode === "dark" ? dark : light);
