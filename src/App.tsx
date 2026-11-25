import React, { lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material";
import getTheme from "./theme/theme";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuthStore } from "./store/authStore";

// Screens are code-split: each page loads on first visit (the shell shows a thin progress bar meanwhile)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const Sales = lazy(() => import("./pages/Sales"));
const Categories = lazy(() => import("./pages/Categories"));
const Customers = lazy(() => import("./pages/Customers"));
const Reports = lazy(() => import("./pages/Reports"));
const ExchangeRate = lazy(() => import("./pages/ExchangeRate"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const SalesHistory = lazy(() => import("./pages/SalesHistory"));
const GamingStations = lazy(() => import("./pages/GamingStations"));
const GamingHistory = lazy(() => import("./pages/GamingHistory"));
const PCManagement = lazy(() => import("./pages/PCManagement"));
const Discounts = lazy(() => import("./pages/Discounts"));
const Reservations = lazy(() => import("./pages/Reservations"));
const ReservationSettings = lazy(() => import("./pages/ReservationSettings"));
const Staff = lazy(() => import("./pages/Staff"));

// Dev-only UI kit preview (not part of production builds)
const UiKitPage = import.meta.env.DEV ? lazy(() => import("./dev/UiKitPage")) : null;

// Sign-in screens are always dark (brand look), regardless of the app theme
const authTheme = getTheme("dark");
const AuthScreen: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={authTheme}>{children}</ThemeProvider>
);

const App: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <AuthScreen><Login /></AuthScreen>}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <AuthScreen><Register /></AuthScreen>}
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="sales" element={<Sales />} />
        <Route path="sales/history" element={<SalesHistory />} />
        {/* One place for orders — the Orders page replaces this temporary mapping */}
        <Route path="orders" element={<SalesHistory />} />
        <Route path="products" element={<Products />} />
        <Route path="categories" element={<Categories />} />
        <Route path="customers" element={<Customers />} />
        <Route path="discounts" element={<Discounts />} />
        <Route path="reports" element={<Reports />} />
        <Route path="exchange-rate" element={<ExchangeRate />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
        <Route path="gaming" element={<GamingStations />} />
        <Route path="gaming/history" element={<GamingHistory />} />
        <Route path="reservations" element={<Reservations />} />
        <Route path="reservations/settings" element={<ReservationSettings />} />
        <Route path="staff" element={<Staff />} />
        {UiKitPage && (
          <Route path="ui-kit" element={<UiKitPage />} />
        )}
        <Route
          path="/gaming/pc-management"
          element={
            <ProtectedRoute>
              <PCManagement />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
};

export default App;
