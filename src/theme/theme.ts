import { createTheme, alpha, type ThemeOptions } from "@mui/material/styles";
import type {} from "@mui/x-data-grid/themeAugmentation";

/** Brand + font tokens shared by the theme and a few custom components. */
export const brand = {
  cyan: "#00CED1",
  cyanDark: "#00A3A6",
  purple: "#9B51E0",
  purpleLight: "#B57CFF",
  gradient: "linear-gradient(135deg, #00CED1 0%, #9B51E0 100%)",
  fontBody: '"Space Grotesk", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
  /** Display font — use only for the logo and big numbers. */
  fontDisplay: '"Orbitron", "Space Grotesk", system-ui, sans-serif',
};

const getTheme = (mode: "light" | "dark") => {
  const dark = mode === "dark";

  const c = dark
    ? {
        bg: "#07070A",
        paper: "#0F0F14",
        raised: "#16161D",
        border: "rgba(255,255,255,0.08)",
        borderStrong: "rgba(255,255,255,0.14)",
        text: "#F4F4F6",
        textMuted: "#A1A1AE",
        primary: brand.cyan,
        primaryContrast: "#001A1B",
        secondary: brand.purpleLight,
        success: "#2EE59D",
        error: "#FF5C7A",
        warning: "#FFB547",
        info: "#5AA9FF",
      }
    : {
        bg: "#F5F6FA",
        paper: "#FFFFFF",
        raised: "#F9FAFC",
        border: "#E6E8EF",
        borderStrong: "#D5D8E2",
        text: "#12131A",
        textMuted: "#5F6475",
        primary: brand.cyanDark,
        primaryContrast: "#FFFFFF",
        secondary: brand.purple,
        success: "#16A34A",
        error: "#DC2626",
        warning: "#D97706",
        info: "#2563EB",
      };

  const options: ThemeOptions = {
    palette: {
      mode,
      primary: { main: c.primary, contrastText: c.primaryContrast },
      secondary: { main: c.secondary, contrastText: "#FFFFFF" },
      success: { main: c.success, contrastText: dark ? "#00140B" : "#FFFFFF" },
      error: { main: c.error, contrastText: "#FFFFFF" },
      warning: { main: c.warning, contrastText: dark ? "#1A0F00" : "#FFFFFF" },
      info: { main: c.info, contrastText: "#FFFFFF" },
      background: { default: c.bg, paper: c.paper },
      text: { primary: c.text, secondary: c.textMuted },
      divider: c.border,
      action: {
        hover: alpha(dark ? "#FFFFFF" : "#12131A", 0.04),
        selected: alpha(c.primary, dark ? 0.14 : 0.1),
      },
    },
    typography: {
      fontFamily: brand.fontBody,
      h1: { fontSize: "2.25rem", fontWeight: 700, letterSpacing: "-0.01em" },
      h2: { fontSize: "1.9rem", fontWeight: 700, letterSpacing: "-0.01em" },
      h3: { fontSize: "1.6rem", fontWeight: 700 },
      h4: { fontSize: "1.45rem", fontWeight: 700, letterSpacing: "-0.01em" },
      h5: { fontSize: "1.2rem", fontWeight: 700 },
      h6: { fontSize: "1.02rem", fontWeight: 600 },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
      overline: { fontWeight: 600, letterSpacing: "0.12em" },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: c.bg,
            WebkitTapHighlightColor: "transparent",
          },
          "::selection": { background: alpha(brand.cyan, 0.3) },
          "*::-webkit-scrollbar": { width: 10, height: 10 },
          "*::-webkit-scrollbar-thumb": {
            background: dark ? "#24242E" : "#CDD1DC",
            borderRadius: 10,
            border: `2px solid ${c.bg}`,
          },
          "*::-webkit-scrollbar-track": { background: "transparent" },
          // DataGrid already draws its own frame — avoid a double border when wrapped in a Card
          ".MuiCard-root > .MuiDataGrid-root": { border: 0, borderRadius: 0 },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 10, minHeight: 40, paddingInline: 16 },
          sizeLarge: { minHeight: 48, fontSize: "1rem", paddingInline: 22 },
          sizeSmall: { minHeight: 32, paddingInline: 12 },
          outlined: { borderColor: c.borderStrong },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { borderRadius: 10 } },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: 14,
            border: `1px solid ${c.border}`,
            boxShadow: dark ? "none" : "0 1px 2px rgba(16,24,40,0.04)",
          },
        },
      },
      MuiCardContent: {
        styleOverrides: { root: { "&:last-child": { paddingBottom: 16 } } },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 8 },
          sizeSmall: { height: 24, fontSize: "0.74rem" },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: dark ? c.raised : c.paper,
            "& .MuiOutlinedInput-notchedOutline": { borderColor: c.borderStrong },
          },
        },
      },
      MuiTextField: { defaultProps: { variant: "outlined" } },
      MuiAutocomplete: {
        styleOverrides: {
          paper: { border: `1px solid ${c.border}`, borderRadius: 12 },
          option: { minHeight: 44 },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: { border: `1px solid ${c.border}`, borderRadius: 12 },
        },
      },
      MuiMenuItem: {
        styleOverrides: { root: { minHeight: 40 } },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 18,
            border: `1px solid ${c.border}`,
            // Fit dialogs on phones
            "@media (max-width:599.95px)": {
              margin: 12,
              width: "calc(100% - 24px)",
              maxWidth: "calc(100% - 24px) !important",
              maxHeight: "calc(100% - 24px)",
              borderRadius: 16,
            },
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: { root: { fontWeight: 700, fontSize: "1.15rem", padding: "18px 24px 10px" } },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            "@media (max-width:599.95px)": { paddingLeft: 16, paddingRight: 16 },
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: "12px 24px 18px",
            gap: 8,
            "@media (max-width:599.95px)": { padding: "12px 16px 16px" },
          },
        },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: 12, alignItems: "center" } },
      },
      MuiTabs: {
        styleOverrides: {
          root: { minHeight: 44 },
          indicator: { height: 3, borderRadius: 3 },
        },
      },
      MuiTab: {
        styleOverrides: { root: { minHeight: 44, textTransform: "none", fontWeight: 600 } },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: dark ? "#1E1E27" : "#1F2230",
            fontSize: "0.78rem",
            borderRadius: 8,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: c.border },
          head: { fontWeight: 600, color: c.textMuted },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: { backgroundColor: dark ? "#0B0B0F" : c.paper, borderColor: c.border },
        },
      },
      MuiAppBar: {
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiLinearProgress: {
        styleOverrides: { root: { borderRadius: 4 } },
      },
      MuiDataGrid: {
        defaultProps: {
          disableRowSelectionOnClick: true,
          rowHeight: 52,
          columnHeaderHeight: 48,
        },
        styleOverrides: {
          root: {
            border: `1px solid ${c.border}`,
            borderRadius: 14,
            backgroundColor: c.paper,
            "--DataGrid-containerBackground": dark ? c.raised : "#F8F9FC",
            "--DataGrid-rowBorderColor": c.border,
            "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 600, color: c.textMuted },
            "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within":
              { outline: "none" },
            "& .MuiDataGrid-row:hover": { backgroundColor: alpha(c.primary, dark ? 0.06 : 0.04) },
            "& .MuiDataGrid-cell": { display: "flex", alignItems: "center" },
          },
        },
      },
    },
  };

  return createTheme(options);
};

export default getTheme;
