import { createTheme, alpha, type ThemeOptions, type Theme } from "@mui/material/styles";
import type {} from "@mui/x-data-grid/themeAugmentation";
import type {} from "@mui/x-date-pickers/themeAugmentation";
import type {} from "@mui/x-charts/themeAugmentation";
import { fonts, getTokens, radii, type ColorMode, type ModeTokens, type SeriesColors } from "./tokens";

declare module "@mui/material/styles" {
  interface Theme {
    /** Raw design tokens for the active mode (surfaces, borders, series colours…). */
    tokens: ModeTokens;
  }
  interface ThemeOptions {
    tokens?: ModeTokens;
  }
  interface Palette {
    series: SeriesColors;
  }
  interface PaletteOptions {
    series?: SeriesColors;
  }
}

/**
 * @deprecated Kept so older pages keep compiling. Use the theme (`theme.palette`, `theme.tokens`)
 * or `fonts` from `@/theme/tokens` instead. There is no display font any more.
 */
export const brand = {
  cyan: "#0A8486",
  cyanDark: "#087173",
  fontBody: fonts.sans,
  fontDisplay: fonts.sans,
  fontMono: fonts.mono,
};

const PHONE = "@media (max-width:599.95px)";
const COARSE = "@media (pointer: coarse)";

const getTheme = (mode: ColorMode): Theme => {
  const t = getTokens(mode);
  const dark = mode === "dark";

  // Focus ring shared by inputs (on the outline) and buttons (as an outline).
  const ring = `0 0 0 3px ${t.focusRing}`;
  const focusOutline = { outline: `2px solid ${t.primary}`, outlineOffset: 2 };

  const shadows = Array.from({ length: 25 }, (_, i) => {
    if (i === 0) return "none";
    if (i <= 4) return "none"; // in-page surfaces are flat: borders, not shadows
    if (i <= 12) return t.shadowPopover; // menus, popovers, snackbars
    return t.shadowDialog; // drawers, dialogs
  }) as ThemeOptions["shadows"];

  const options: ThemeOptions = {
    tokens: t,
    palette: {
      mode,
      primary: { main: t.primary, dark: t.primaryHover, light: dark ? "#7FE0E1" : "#3FA5A7", contrastText: t.primaryContrast },
      // Secondary = PlayStation blue (also the "PS" data series). Never violet.
      secondary: { main: t.series.playstation, contrastText: dark ? "#0B1B33" : "#FFFFFF" },
      success: { main: t.success, contrastText: dark ? "#052E16" : "#FFFFFF" },
      warning: { main: t.warning, contrastText: dark ? "#2A1A00" : "#FFFFFF" },
      error: { main: t.error, contrastText: dark ? "#2A0A0A" : "#FFFFFF" },
      info: { main: t.info, contrastText: dark ? "#0B1B33" : "#FFFFFF" },
      background: { default: t.canvas, paper: t.surface },
      text: { primary: t.text, secondary: t.textMuted, disabled: t.textDisabled },
      divider: t.border,
      grey: {
        50: "#FAFAFA",
        100: "#F4F4F5",
        200: "#E4E4E7",
        300: "#D4D4D8",
        400: "#A1A1AA",
        500: "#71717A",
        600: "#52525B",
        700: "#3F3F46",
        800: "#27272A",
        900: "#18181B",
      },
      action: {
        active: t.textMuted,
        hover: t.hover,
        hoverOpacity: dark ? 0.08 : 0.05,
        selected: t.primaryTint,
        selectedOpacity: dark ? 0.14 : 0.1,
        disabled: t.textDisabled,
        disabledBackground: dark ? "#1F1F23" : "#F4F4F5",
        focus: t.focusRing,
      },
      series: t.series,
    },
    shape: { borderRadius: radii.control },
    shadows,
    typography: {
      fontFamily: fonts.sans,
      htmlFontSize: 16,
      fontSize: 15,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 600,
      h1: { fontSize: "2rem", fontWeight: 600, lineHeight: 1.2, letterSpacing: "-0.015em" },
      h2: { fontSize: "1.75rem", fontWeight: 600, lineHeight: 1.25, letterSpacing: "-0.015em" },
      h3: { fontSize: "1.5rem", fontWeight: 600, lineHeight: 1.3, letterSpacing: "-0.01em" },
      h4: { fontSize: "1.375rem", fontWeight: 600, lineHeight: 1.3, letterSpacing: "-0.01em" },
      h5: { fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.4 },
      h6: { fontSize: "1rem", fontWeight: 600, lineHeight: 1.45 },
      subtitle1: { fontSize: "0.9375rem", fontWeight: 600, lineHeight: 1.5 },
      subtitle2: { fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.45 },
      body1: { fontSize: "0.9375rem", lineHeight: 1.55 },
      body2: { fontSize: "0.875rem", lineHeight: 1.5 },
      caption: { fontSize: "0.8125rem", lineHeight: 1.45 },
      overline: { fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.06em", lineHeight: 1.6 },
      button: { fontSize: "0.9375rem", fontWeight: 600, textTransform: "none", letterSpacing: 0 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ":root": {
            colorScheme: mode,
            "--app-canvas": t.canvas,
            "--app-surface": t.surface,
            "--app-surface-raised": t.surfaceRaised,
            "--app-border": t.border,
            "--app-text": t.text,
            "--app-text-muted": t.textMuted,
            "--app-primary": t.primary,
            "--app-success": t.success,
            "--app-warning": t.warning,
            "--app-error": t.error,
            "--app-info": t.info,
            "--app-shadow-popover": t.shadowPopover,
            "--app-scrollbar": t.scrollbar,
            "--app-scrollbar-hover": t.scrollbarHover,
            "--app-font-mono": fonts.mono,
          },
          html: { scrollbarGutter: "stable" },
          body: {
            backgroundColor: t.canvas,
            color: t.text,
            fontVariantNumeric: "tabular-nums",
            WebkitTapHighlightColor: "transparent",
            textRendering: "optimizeLegibility",
          },
          "::selection": { background: alpha(t.primary, 0.22) },
          // Professional scrollbars: thin, rounded thumb, transparent track
          "*": { scrollbarWidth: "thin", scrollbarColor: `${t.scrollbar} transparent` },
          "*::-webkit-scrollbar": { width: 8, height: 8 },
          "*::-webkit-scrollbar-track": { background: "transparent" },
          "*::-webkit-scrollbar-corner": { background: "transparent" },
          "*::-webkit-scrollbar-thumb": {
            backgroundColor: t.scrollbar,
            borderRadius: 8,
            border: "2px solid transparent",
            backgroundClip: "content-box",
            minHeight: 32,
          },
          "*::-webkit-scrollbar-thumb:hover": { backgroundColor: t.scrollbarHover },
          "code, kbd, samp, .mono": { fontFamily: fonts.mono },
          // DataGrid already draws its own frame — avoid a double border when wrapped in a Card
          ".MuiCard-root > .MuiDataGrid-root": { border: 0, borderRadius: 0 },
          // Native date inputs (until every page uses DateField) follow the colour mode
          'input[type="date"]::-webkit-calendar-picker-indicator': {
            filter: dark ? "invert(0.8)" : "none",
            cursor: "pointer",
            opacity: 0.7,
          },
        },
      },

      /* ---------------------------------------------------------------- Buttons */
      MuiButtonBase: {
        defaultProps: { disableRipple: false },
        styleOverrides: { root: { "&.Mui-focusVisible": focusOutline } },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: radii.control,
            minHeight: 44,
            padding: "9px 16px",
            gap: 2,
            whiteSpace: "nowrap",
            "&.Mui-focusVisible": focusOutline,
          },
          sizeSmall: { minHeight: 36, padding: "5px 12px", fontSize: "0.875rem" },
          sizeLarge: { minHeight: 52, padding: "12px 22px", fontSize: "1rem" },
          startIcon: { marginRight: 6, "& > *:nth-of-type(1)": { fontSize: 20 } },
          endIcon: { marginLeft: 6, "& > *:nth-of-type(1)": { fontSize: 20 } },
          containedPrimary: {
            "&:hover": { backgroundColor: t.primaryHover },
          },
          // Outlined primary = neutral secondary action (keeps the teal accent for the main action)
          outlinedPrimary: {
            color: t.text,
            borderColor: t.borderStrong,
            backgroundColor: t.surface,
            "&:hover": { borderColor: dark ? "#52525B" : "#A1A1AA", backgroundColor: t.hover },
          },
          outlinedInherit: { borderColor: t.borderStrong },
          textPrimary: { color: t.primaryText, "&:hover": { backgroundColor: t.primaryTint } },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: radii.control,
            color: t.textMuted,
            "&:hover": { backgroundColor: t.hover, color: t.text },
          },
          sizeMedium: { width: 44, height: 44 },
          sizeSmall: { width: 36, height: 36, "& .MuiSvgIcon-root": { fontSize: 20 } },
          sizeLarge: { width: 52, height: 52 },
          colorPrimary: { color: t.primaryText, "&:hover": { backgroundColor: t.primaryTint } },
        },
      },
      MuiFab: {
        styleOverrides: { root: { boxShadow: t.shadowPopover } },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            backgroundColor: dark ? zincBg(dark) : "#F4F4F5",
            borderRadius: radii.control,
            padding: 3,
            gap: 2,
          },
          grouped: {
            border: 0,
            borderRadius: `${radii.control - 2}px !important`,
            margin: "0 !important",
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 500,
            fontSize: "0.875rem",
            color: t.textMuted,
            minHeight: 38,
            padding: "6px 14px",
            border: 0,
            gap: 6,
            "&:hover": { backgroundColor: dark ? "#27272A" : "#E4E4E7", color: t.text },
            "&.Mui-selected, &.Mui-selected:hover": {
              backgroundColor: t.surface,
              color: t.text,
              fontWeight: 600,
              boxShadow: `0 0 0 1px ${t.border}`,
            },
            "&.Mui-focusVisible": focusOutline,
          },
          sizeSmall: { minHeight: 32, padding: "4px 10px", fontSize: "0.8125rem" },
          sizeLarge: { minHeight: 46, padding: "10px 18px", fontSize: "0.9375rem" },
        },
      },

      /* ---------------------------------------------------------------- Inputs */
      MuiTextField: { defaultProps: { variant: "outlined" } },
      MuiFormControl: { defaultProps: { variant: "outlined" } },
      MuiInputLabel: {
        // Labels always sit on the outline (never hide inside as a placeholder)
        defaultProps: { shrink: true },
        styleOverrides: {
          root: {
            color: t.textMuted,
            fontWeight: 500,
            "&.Mui-focused": { color: t.primaryText },
            "&.Mui-error": { color: t.error },
            "&.Mui-disabled": { color: t.textDisabled },
          },
          outlined: {
            "&.MuiInputLabel-shrink": { transform: "translate(13px, -9px) scale(0.867)" },
          },
          asterisk: { color: t.error },
        },
      },
      MuiOutlinedInput: {
        defaultProps: { notched: true },
        styleOverrides: {
          root: {
            borderRadius: radii.control,
            backgroundColor: t.surface,
            transition: "box-shadow 120ms ease, border-color 120ms ease",
            "& .MuiOutlinedInput-notchedOutline": { borderColor: t.borderStrong, "& legend": { fontSize: "0.867em" } },
            "&:hover:not(.Mui-disabled):not(.Mui-focused):not(.Mui-error) .MuiOutlinedInput-notchedOutline": {
              borderColor: dark ? "#52525B" : "#A1A1AA",
            },
            "&.Mui-focused": { boxShadow: ring },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderWidth: 1.5, borderColor: t.primary },
            "&.Mui-error.Mui-focused": { boxShadow: `0 0 0 3px ${alpha(t.error, 0.2)}` },
            "&.Mui-disabled": { backgroundColor: dark ? "#141416" : "#FAFAFA" },
          },
          input: {
            padding: "12.5px 14px",
            "&::placeholder": { color: t.textMuted, opacity: 0.8 },
          },
          inputSizeSmall: { padding: "10.5px 12px" },
          multiline: { padding: 0 },
          inputMultiline: { padding: "12.5px 14px" },
          adornedStart: { paddingLeft: 12 },
          adornedEnd: { paddingRight: 8 },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: { fontSize: "0.9375rem" },
          input: { "&::placeholder": { opacity: 0.8 } },
        },
      },
      MuiInputAdornment: {
        styleOverrides: {
          root: { color: t.textMuted, "& .MuiTypography-root": { color: t.textMuted, fontSize: "0.9375rem" } },
        },
      },
      MuiFormHelperText: {
        styleOverrides: { root: { fontSize: "0.8125rem", marginLeft: 2, marginRight: 2, marginTop: 6, lineHeight: 1.4 } },
      },
      MuiFormLabel: {
        styleOverrides: { root: { fontSize: "0.9375rem" } },
      },
      MuiSelect: {
        // Show the "" option's label (e.g. "All statuses") instead of an empty box
        defaultProps: { displayEmpty: true, MenuProps: { slotProps: { paper: { sx: { mt: 0.5 } } } } },
        styleOverrides: { icon: { color: t.textMuted }, iconOutlined: { right: 10 } },
      },
      MuiNativeSelect: { styleOverrides: { icon: { color: t.textMuted } } },
      MuiAutocomplete: {
        styleOverrides: {
          paper: {
            border: `1px solid ${t.border}`,
            borderRadius: radii.card,
            boxShadow: t.shadowPopover,
            backgroundColor: t.surfaceRaised,
            marginTop: 4,
          },
          listbox: {
            padding: 4,
            "& .MuiAutocomplete-option": {
              minHeight: 40,
              borderRadius: radii.control - 2,
              fontSize: "0.9375rem",
              [COARSE]: { minHeight: 44 },
              '&[aria-selected="true"]': { backgroundColor: t.primaryTint, fontWeight: 500 },
              '&[aria-selected="true"].Mui-focused': { backgroundColor: t.primaryTint },
              "&.Mui-focused": { backgroundColor: t.hover },
            },
          },
          groupLabel: {
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: t.textMuted,
            lineHeight: "32px",
            backgroundColor: t.surfaceRaised,
          },
          noOptions: { fontSize: "0.875rem" },
          loading: { fontSize: "0.875rem" },
          tag: { margin: 2 },
          inputRoot: {
            '&.MuiOutlinedInput-root': { paddingTop: 5, paddingBottom: 5, paddingLeft: 8 },
            '&.MuiOutlinedInput-root.MuiInputBase-sizeSmall': { paddingTop: 4, paddingBottom: 4 },
            '&.MuiOutlinedInput-root .MuiAutocomplete-input': { padding: "7.5px 6px" },
          },
          endAdornment: { right: 10 },
        },
      },
      MuiCheckbox: {
        defaultProps: { color: "primary" },
        styleOverrides: { root: { color: t.borderStrong, padding: 10, "&:hover": { backgroundColor: t.hover } } },
      },
      MuiRadio: {
        styleOverrides: { root: { color: t.borderStrong, padding: 10 } },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            width: 46,
            height: 26,
            padding: 0,
            margin: 9,
            overflow: "visible",
          },
          switchBase: {
            padding: 3,
            "&.Mui-checked": {
              transform: "translateX(20px)",
              color: "#FFFFFF",
              "& + .MuiSwitch-track": { backgroundColor: t.primary, opacity: 1, border: 0 },
            },
            "&.Mui-focusVisible + .MuiSwitch-track": { outline: `2px solid ${t.primary}`, outlineOffset: 2 },
            "&.Mui-disabled + .MuiSwitch-track": { opacity: 0.4 },
            "&.Mui-disabled .MuiSwitch-thumb": { opacity: 0.8 },
            "&:hover": { backgroundColor: "transparent" },
          },
          thumb: {
            width: 20,
            height: 20,
            boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
            backgroundColor: "#FFFFFF",
          },
          track: {
            borderRadius: 13,
            opacity: 1,
            backgroundColor: dark ? "#3F3F46" : "#D4D4D8",
          },
          sizeSmall: {
            width: 36,
            height: 20,
            "& .MuiSwitch-switchBase": { padding: 2, "&.Mui-checked": { transform: "translateX(16px)" } },
            "& .MuiSwitch-thumb": { width: 16, height: 16 },
          },
        },
      },
      MuiFormControlLabel: {
        styleOverrides: { label: { fontSize: "0.9375rem" } },
      },
      MuiSlider: { styleOverrides: { thumb: { boxShadow: "none" } } },

      /* ---------------------------------------------------------------- Surfaces */
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: "none" },
          rounded: { borderRadius: radii.card },
          elevation0: {},
          outlined: { borderColor: t.border },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: radii.card,
            border: `1px solid ${t.border}`,
            backgroundColor: t.surface,
            boxShadow: "none",
          },
        },
      },
      MuiCardHeader: {
        styleOverrides: {
          root: { padding: "16px 20px 8px" },
          title: { fontSize: "0.9375rem", fontWeight: 600 },
          subheader: { fontSize: "0.8125rem", color: t.textMuted },
        },
      },
      MuiCardContent: {
        styleOverrides: { root: { padding: 20, "&:last-child": { paddingBottom: 20 } } },
      },
      MuiCardActionArea: {
        styleOverrides: { root: { borderRadius: radii.card }, focusHighlight: { backgroundColor: "transparent" } },
      },
      MuiDivider: { styleOverrides: { root: { borderColor: t.border } } },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: "inherit" },
        styleOverrides: { root: { backgroundImage: "none", boxShadow: "none" } },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: { backgroundColor: t.sidebar, borderColor: t.border, backgroundImage: "none" },
        },
      },
      MuiBackdrop: {
        styleOverrides: {
          root: { backgroundColor: dark ? "rgba(0,0,0,0.6)" : "rgba(9,9,11,0.4)" },
          invisible: { backgroundColor: "transparent" },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            border: `1px solid ${t.border}`,
            borderRadius: radii.card,
            backgroundColor: t.surfaceRaised,
            boxShadow: t.shadowPopover,
          },
        },
      },
      MuiPopper: { styleOverrides: { root: { zIndex: 1300 } } },
      MuiMenu: {
        styleOverrides: {
          paper: { minWidth: 180 },
          list: { padding: 4 },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            minHeight: 40,
            borderRadius: radii.control - 2,
            fontSize: "0.9375rem",
            gap: 4,
            [COARSE]: { minHeight: 44 },
            "&:hover": { backgroundColor: t.hover },
            "&.Mui-selected": { backgroundColor: t.primaryTint, fontWeight: 500 },
            "&.Mui-selected:hover": { backgroundColor: t.primaryTint },
            "&.Mui-focusVisible": { backgroundColor: t.hover, outline: "none" },
          },
        },
      },
      MuiListItemIcon: { styleOverrides: { root: { minWidth: 34, color: t.textMuted } } },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: radii.control,
            "&:hover": { backgroundColor: t.hover },
            "&.Mui-selected": { backgroundColor: t.primaryTint },
            "&.Mui-selected:hover": { backgroundColor: t.primaryTint },
          },
        },
      },
      MuiListSubheader: {
        styleOverrides: {
          root: { backgroundColor: "transparent", fontSize: "0.8125rem", fontWeight: 600, color: t.textMuted, lineHeight: "32px" },
        },
      },

      /* ---------------------------------------------------------------- Dialogs */
      MuiDialog: {
        styleOverrides: {
          paper: ({ ownerState }) => ({
            borderRadius: radii.card,
            border: dark ? `1px solid ${t.border}` : "none",
            backgroundColor: t.surfaceRaised,
            boxShadow: t.shadowDialog,
            // Phones: full screen, except compact (maxWidth="xs") confirmations
            [PHONE]: ownerState.fullScreen
              ? {}
              : ownerState.maxWidth === "xs"
                ? { margin: 16, width: "calc(100% - 32px)", maxWidth: "calc(100% - 32px)" }
                : {
                    margin: 0,
                    width: "100%",
                    maxWidth: "100%",
                    height: "100%",
                    maxHeight: "100%",
                    borderRadius: 0,
                    border: 0,
                  },
          }),
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontSize: "1.125rem",
            fontWeight: 600,
            lineHeight: 1.4,
            padding: "20px 24px 8px",
            [PHONE]: { padding: "16px 16px 8px" },
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: "8px 24px 16px",
            [PHONE]: { padding: "8px 16px 16px" },
            // Labels sit on the outline: leave room above the first field
            ".MuiDialogTitle-root + &": { paddingTop: 12 },
          },
          dividers: { padding: "16px 24px", borderColor: t.border, [PHONE]: { padding: "16px" } },
        },
      },
      MuiDialogContentText: {
        styleOverrides: { root: { color: t.textMuted, fontSize: "0.9375rem" } },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: "12px 24px 20px",
            gap: 8,
            "& > :not(style) ~ :not(style)": { marginLeft: 0 },
            [PHONE]: {
              padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
              borderTop: `1px solid ${t.border}`,
              "& > .MuiButton-root": { flex: 1 },
            },
          },
        },
      },

      /* ---------------------------------------------------------------- Feedback */
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: radii.control,
            alignItems: "flex-start",
            fontSize: "0.875rem",
            padding: "8px 14px",
            border: "1px solid transparent",
          },
          icon: { padding: "8px 0", marginRight: 10, opacity: 1, "& .MuiSvgIcon-root": { fontSize: 20 } },
          message: { padding: "8px 0", overflow: "visible" },
          action: { paddingTop: 2, marginRight: -6 },
          standardSuccess: softAlert(t.success, dark),
          standardInfo: softAlert(t.info, dark),
          standardWarning: softAlert(t.warning, dark),
          standardError: softAlert(t.error, dark),
          outlined: { backgroundColor: t.surface },
        },
      },
      MuiAlertTitle: {
        styleOverrides: { root: { fontWeight: 600, fontSize: "0.9375rem", marginBottom: 2, marginTop: 0 } },
      },
      MuiSnackbarContent: {
        styleOverrides: {
          root: { backgroundColor: dark ? "#27272A" : "#18181B", color: "#FAFAFA", borderRadius: radii.control, fontSize: "0.9375rem" },
        },
      },
      MuiTooltip: {
        defaultProps: { arrow: false, enterDelay: 300 },
        styleOverrides: {
          tooltip: {
            backgroundColor: t.tooltip,
            color: "#FAFAFA",
            fontSize: "0.8125rem",
            fontWeight: 500,
            lineHeight: 1.4,
            padding: "6px 10px",
            borderRadius: 6,
            maxWidth: 280,
          },
          arrow: { color: t.tooltip },
        },
      },
      MuiSkeleton: {
        defaultProps: { animation: "wave" },
        styleOverrides: {
          root: { backgroundColor: dark ? "#1F1F23" : "#F0F0F2", "&::after": { background: `linear-gradient(90deg, transparent, ${dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.7)"}, transparent)` } },
          text: { borderRadius: 4 },
          rounded: { borderRadius: radii.control },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { height: 4, borderRadius: 2, backgroundColor: dark ? "#27272A" : "#E4E4E7" },
          bar: { borderRadius: 2 },
        },
      },
      MuiCircularProgress: { defaultProps: { thickness: 4.2 } },
      MuiBadge: {
        styleOverrides: {
          badge: { fontWeight: 600, fontSize: "0.75rem", height: 20, minWidth: 20, borderRadius: 10, padding: "0 6px" },
        },
      },

      /* ---------------------------------------------------------------- Data display */
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 500,
            fontSize: "0.8125rem",
            height: 30,
            "&.Mui-focusVisible": focusOutline,
          },
          sizeSmall: { height: 24, fontSize: "0.8125rem", borderRadius: 6 },
          label: { paddingLeft: 10, paddingRight: 10 },
          labelSmall: { paddingLeft: 8, paddingRight: 8 },
          icon: { fontSize: 18, marginLeft: 8, marginRight: -2 },
          iconSmall: { fontSize: 16, marginLeft: 6 },
          deleteIcon: { fontSize: 18 },
          filled: ({ ownerState }) => softChip(ownerState.color, t, dark),
          outlined: ({ ownerState }) => ({
            borderColor: ownerState.color && ownerState.color !== "default" ? alpha(chipColor(ownerState.color, t), 0.5) : t.borderStrong,
            backgroundColor: t.surface,
            color: ownerState.color && ownerState.color !== "default" ? chipText(ownerState.color, t) : t.text,
          }),
          clickable: {
            "&:hover": { filter: "none" },
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: { fontWeight: 600, fontSize: "0.9375rem" },
          colorDefault: { backgroundColor: t.primaryTint, color: t.primaryText },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: { minHeight: 44, borderBottom: `1px solid ${t.border}` },
          indicator: { height: 2, borderRadius: 2, backgroundColor: t.primary },
          flexContainer: { gap: 4 },
          scrollButtons: { "&.Mui-disabled": { opacity: 0.3 } },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 44,
            minWidth: 0,
            padding: "10px 12px",
            textTransform: "none",
            fontWeight: 500,
            fontSize: "0.9375rem",
            color: t.textMuted,
            "&:hover": { color: t.text },
            "&.Mui-selected": { color: t.text, fontWeight: 600 },
            "&.Mui-focusVisible": { ...focusOutline, outlineOffset: -2, borderRadius: radii.control },
          },
        },
      },
      MuiTableContainer: { styleOverrides: { root: { borderRadius: 0 } } },
      MuiTableHead: {
        styleOverrides: { root: { "& .MuiTableCell-root": { backgroundColor: t.surfaceSubtle } } },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: t.border, padding: "12px 16px", fontSize: "0.875rem", fontVariantNumeric: "tabular-nums" },
          head: { fontWeight: 600, fontSize: "0.8125rem", color: t.textMuted, lineHeight: 1.4, whiteSpace: "nowrap" },
          sizeSmall: { padding: "8px 12px" },
          stickyHeader: { backgroundColor: t.surfaceSubtle },
          footer: { color: t.text, fontWeight: 600 },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            "&:last-child > .MuiTableCell-body": { borderBottom: 0 },
            "&.MuiTableRow-hover:hover": { backgroundColor: t.surfaceSubtle },
            "&.Mui-selected, &.Mui-selected:hover": { backgroundColor: t.primaryTint },
          },
        },
      },
      MuiTablePagination: {
        styleOverrides: {
          root: { borderTop: 0, color: t.textMuted },
          selectLabel: { fontSize: "0.8125rem" },
          displayedRows: { fontSize: "0.8125rem" },
          select: { fontSize: "0.875rem" },
          toolbar: { minHeight: 52 },
        },
      },
      MuiLink: {
        defaultProps: { underline: "hover" },
        styleOverrides: { root: { color: t.primaryText, fontWeight: 500 } },
      },
      MuiAccordion: {
        defaultProps: { disableGutters: true, elevation: 0 },
        styleOverrides: { root: { border: `1px solid ${t.border}`, borderRadius: radii.card, "&::before": { display: "none" } } },
      },
      MuiPaginationItem: { styleOverrides: { root: { borderRadius: radii.control } } },

      /* ---------------------------------------------------------------- MUI X: DataGrid */
      MuiDataGrid: {
        defaultProps: {
          disableRowSelectionOnClick: true,
          rowHeight: 52,
          columnHeaderHeight: 44,
          disableColumnMenu: true,
        },
        styleOverrides: {
          root: {
            border: `1px solid ${t.border}`,
            borderRadius: radii.card,
            backgroundColor: t.surface,
            fontSize: "0.875rem",
            fontVariantNumeric: "tabular-nums",
            "--DataGrid-containerBackground": t.surfaceSubtle,
            "--DataGrid-rowBorderColor": t.border,
            "--DataGrid-pinnedBackground": t.surface,
            "--unstable_DataGrid-overlayBackground": alpha(t.surface, 0.6),
            "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within":
              { outline: "none" },
            "& .MuiDataGrid-cell": { display: "flex", alignItems: "center" },
            "& .MuiDataGrid-row:hover": { backgroundColor: t.surfaceSubtle },
            "& .MuiDataGrid-row.Mui-selected, & .MuiDataGrid-row.Mui-selected:hover": { backgroundColor: t.primaryTint },
          },
          columnHeader: { paddingLeft: 16, paddingRight: 16 },
          columnHeaderTitle: { fontWeight: 600, fontSize: "0.8125rem", color: t.textMuted },
          columnSeparator: { color: t.border },
          cell: { paddingLeft: 16, paddingRight: 16, borderColor: t.border },
          footerContainer: { borderTop: `1px solid ${t.border}`, minHeight: 52 },
          overlay: { backgroundColor: "transparent", color: t.textMuted },
          sortIcon: { color: t.textMuted, fontSize: 18 },
          iconButtonContainer: { "& .MuiIconButton-root": { width: 28, height: 28 } },
          withBorderColor: { borderColor: t.border },
        },
      },

      /* ---------------------------------------------------------------- MUI X: Date pickers */
      MuiPickerPopper: {
        styleOverrides: {
          paper: {
            border: `1px solid ${t.border}`,
            borderRadius: radii.card,
            boxShadow: t.shadowPopover,
            backgroundColor: t.surfaceRaised,
          },
        },
      },
      MuiPickersOutlinedInput: {
        defaultProps: { notched: true },
        styleOverrides: {
          root: {
            borderRadius: radii.control,
            backgroundColor: t.surface,
            "& .MuiPickersOutlinedInput-notchedOutline": { borderColor: t.borderStrong, "& legend": { fontSize: "0.867em" } },
            "&:hover:not(.Mui-disabled):not(.Mui-focused):not(.Mui-error) .MuiPickersOutlinedInput-notchedOutline": {
              borderColor: dark ? "#52525B" : "#A1A1AA",
            },
            "&.Mui-focused": { boxShadow: ring },
            "&.Mui-focused .MuiPickersOutlinedInput-notchedOutline": { borderWidth: 1.5, borderColor: t.primary },
            "&.Mui-error.Mui-focused": { boxShadow: `0 0 0 3px ${alpha(t.error, 0.2)}` },
          },
        },
      },
      MuiPickersInputBase: {
        styleOverrides: {
          root: { fontSize: "0.9375rem" },
          sectionsContainer: { padding: "12.5px 0" },
          inputSizeSmall: { padding: "10.5px 0" },
        },
      },
      MuiPickersSectionList: {
        styleOverrides: { root: { fontVariantNumeric: "tabular-nums" } },
      },
      MuiDateCalendar: {
        styleOverrides: { root: { width: 336, maxHeight: 392, height: "auto" } },
      },
      MuiDayCalendar: {
        styleOverrides: {
          weekDayLabel: { width: 42, height: 36, margin: "0 2px", fontSize: "0.8125rem", fontWeight: 600, color: t.textMuted },
          slideTransition: { minHeight: 6 * 44 + 8 },
          monthContainer: { position: "relative" },
        },
      },
      MuiPickersDay: {
        styleOverrides: {
          root: {
            width: 42,
            height: 42,
            margin: "1px 2px",
            fontSize: "0.9375rem",
            borderRadius: radii.control,
            fontVariantNumeric: "tabular-nums",
            "&:hover": { backgroundColor: t.hover },
            "&.Mui-selected": {
              backgroundColor: t.primary,
              color: t.primaryContrast,
              fontWeight: 600,
              "&:hover, &:focus": { backgroundColor: t.primaryHover },
            },
            "&.MuiPickersDay-today:not(.Mui-selected)": { borderColor: t.primary, fontWeight: 600 },
          },
        },
      },
      MuiPickersCalendarHeader: {
        styleOverrides: {
          root: { paddingLeft: 20, paddingRight: 8, marginTop: 12, marginBottom: 8, minHeight: 40 },
          label: { fontSize: "0.9375rem", fontWeight: 600 },
        },
      },
      MuiPickersArrowSwitcher: {
        styleOverrides: { button: { width: 40, height: 40 } },
      },
      MuiYearCalendar: {
        styleOverrides: {
          root: { width: 336 },
          button: {
            fontSize: "0.9375rem",
            borderRadius: radii.control,
            "&.Mui-selected": { backgroundColor: t.primary, color: t.primaryContrast },
          },
        },
      },
      MuiMonthCalendar: {
        styleOverrides: {
          root: { width: 336 },
          button: {
            fontSize: "0.9375rem",
            borderRadius: radii.control,
            "&.Mui-selected": { backgroundColor: t.primary, color: t.primaryContrast },
          },
        },
      },
      MuiPickersLayout: {
        styleOverrides: { actionBar: { padding: "8px 12px 12px", gap: 8, "& > *": { marginLeft: "0 !important" } } },
      },
      MuiMultiSectionDigitalClockSection: {
        styleOverrides: {
          item: {
            borderRadius: radii.control - 2,
            fontSize: "0.9375rem",
            minHeight: 40,
            "&.Mui-selected": { backgroundColor: t.primary, color: t.primaryContrast },
          },
        },
      },
      MuiDigitalClock: {
        styleOverrides: {
          item: { borderRadius: radii.control - 2, "&.Mui-selected": { backgroundColor: t.primary, color: t.primaryContrast } },
        },
      },

      /* ---------------------------------------------------------------- MUI X: Charts */
      MuiChartsAxis: {
        styleOverrides: {
          root: {
            "& .MuiChartsAxis-line": { stroke: t.border },
            "& .MuiChartsAxis-tick": { stroke: t.border },
            "& .MuiChartsAxis-tickLabel": { fill: t.textMuted, fontSize: 13, fontFamily: fonts.sans },
            "& .MuiChartsAxis-label": { fill: t.textMuted, fontSize: 13 },
          },
        },
      },
      MuiChartsGrid: {
        styleOverrides: { line: { stroke: t.border, strokeDasharray: "0" } },
      },
      MuiChartsLegend: {
        styleOverrides: { root: { fontSize: 13, color: t.textMuted } },
      },
    },
  };

  return createTheme(options);
};

/* ---------------------------------------------------------------- helpers */

function zincBg(dark: boolean) {
  return dark ? "#1F1F23" : "#F4F4F5";
}

function softAlert(color: string, dark: boolean) {
  return {
    backgroundColor: alpha(color, dark ? 0.12 : 0.07),
    borderColor: alpha(color, dark ? 0.3 : 0.25),
    color: dark ? color : undefined,
    "& .MuiAlert-icon": { color },
  };
}

type ChipColorName = "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" | string | undefined;

function chipColor(color: ChipColorName, t: ModeTokens): string {
  switch (color) {
    case "primary":
      return t.primary;
    case "secondary":
      return t.series.playstation;
    case "error":
      return t.error;
    case "info":
      return t.info;
    case "success":
      return t.success;
    case "warning":
      return t.warning;
    default:
      return t.textMuted;
  }
}

function chipText(color: ChipColorName, t: ModeTokens): string {
  return color === "primary" ? t.primaryText : chipColor(color, t);
}

/** Filled chips are soft (tinted background + coloured text) — one solid accent per screen is enough. */
function softChip(color: ChipColorName, t: ModeTokens, dark: boolean) {
  if (!color || color === "default") {
    return { backgroundColor: dark ? "#27272A" : "#F4F4F5", color: t.text };
  }
  const c = chipColor(color, t);
  return {
    backgroundColor: color === "primary" ? t.primaryTint : alpha(c, dark ? 0.16 : 0.1),
    color: chipText(color, t),
    "&.MuiChip-clickable:hover": { backgroundColor: alpha(c, dark ? 0.24 : 0.16) },
    "& .MuiChip-icon": { color: "inherit" },
    "& .MuiChip-deleteIcon": { color: alpha(c, 0.7), "&:hover": { color: c } },
  };
}

export default getTheme;
