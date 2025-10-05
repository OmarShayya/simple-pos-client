import { createTheme, ThemeOptions } from "@mui/material/styles";

const getTheme = (mode: "light" | "dark") => {
  const themeOptions: ThemeOptions = {
    palette: {
      mode,
      primary: {
        main: "#2196F3",
        light: "#64B5F6",
        dark: "#1976D2",
        contrastText: "#fff",
      },
      secondary: {
        main: "#42A5F5",
        light: "#90CAF9",
        dark: "#1E88E5",
      },
      background: {
        default: mode === "light" ? "#F5F7FA" : "#0A1929",
        paper: mode === "light" ? "#FFFFFF" : "#132F4C",
      },
      text: {
        primary: mode === "light" ? "#1A2027" : "#FFFFFF",
        secondary: mode === "light" ? "#3E5060" : "#B2BAC2",
      },
      divider: mode === "light" ? "#E7EBF0" : "#1E3A5F",
      error: {
        main: "#F44336",
      },
      warning: {
        main: "#FF9800",
      },
      info: {
        main: "#2196F3",
      },
      success: {
        main: "#4CAF50",
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: "2.5rem",
        fontWeight: 600,
      },
      h2: {
        fontSize: "2rem",
        fontWeight: 600,
      },
      h3: {
        fontSize: "1.75rem",
        fontWeight: 600,
      },
      h4: {
        fontSize: "1.5rem",
        fontWeight: 600,
      },
      h5: {
        fontSize: "1.25rem",
        fontWeight: 600,
      },
      h6: {
        fontSize: "1rem",
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 500,
            borderRadius: 8,
          },
          contained: {
            boxShadow: "none",
            "&:hover": {
              boxShadow: "none",
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow:
              mode === "light"
                ? "0 2px 8px rgba(0,0,0,0.08)"
                : "0 2px 8px rgba(0,0,0,0.4)",
            borderRadius: 12,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: mode === "light" ? "#FFFFFF" : "#0A1929",
            borderRight: `1px solid ${
              mode === "light" ? "#E7EBF0" : "#1E3A5F"
            }`,
          },
        },
      },
    },
  };

  return createTheme(themeOptions);
};

export default getTheme;
