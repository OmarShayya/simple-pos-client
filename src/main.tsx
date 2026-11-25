import React, { useMemo } from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enGB } from "date-fns/locale";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import App from "./App";
import getTheme from "./theme/theme";
import { useThemeStore } from "./store/themeStore";
import { queryClient } from "./api/queryClient";
import ConfirmProvider from "./components/ui/ConfirmProvider";
import "./index.css";

function Root() {
  const mode = useThemeStore((s) => s.mode);
  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          {/* en-GB: "25 Nov 2026", weeks start on Monday */}
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
            <CssBaseline />
            <ConfirmProvider>
              <App />
            </ConfirmProvider>
            <ToastContainer
              position="top-right"
              limit={3}
              autoClose={3000}
              hideProgressBar
              newestOnTop
              closeOnClick
              pauseOnFocusLoss={false}
              draggable
              pauseOnHover
              theme={mode}
            />
          </LocalizationProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
