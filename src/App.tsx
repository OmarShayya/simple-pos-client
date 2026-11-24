import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material";
import getTheme from "./theme/theme";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Sales from "./pages/Sales";
import Categories from "./pages/Categories";
import Customers from "./pages/Customers";
import Reports from "./pages/Reports";
import ExchangeRate from "./pages/ExchangeRate";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import { useAuthStore } from "./store/authStore";
import SalesHistory from "./pages/SalesHistory";
import GamingStations from "./pages/GamingStations";
import GamingHistory from "./pages/GamingHistory";
import PCManagement from "./pages/PCManagement";
import Discounts from "./pages/Discounts";

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
