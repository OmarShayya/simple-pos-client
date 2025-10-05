import apiClient from "./client";
import { type ApiResponse } from "../types/api.types";
import { handleApiResponse } from "../utils/responseHandler";

export const dashboardApi = {
  getOverview: async () => {
    const response = await apiClient.get<ApiResponse>("/dashboard/overview");
    return handleApiResponse(response.data);
  },

  getTodayStats: async () => {
    const response = await apiClient.get<ApiResponse>("/dashboard/today");
    return handleApiResponse(response.data);
  },

  getDailySales: async (startDate: string, endDate: string) => {
    const response = await apiClient.get<ApiResponse>(
      `/dashboard/daily-sales?startDate=${startDate}&endDate=${endDate}`
    );
    return handleApiResponse(response.data);
  },

  getWeeklyStats: async () => {
    const response = await apiClient.get<ApiResponse>("/dashboard/weekly");
    return handleApiResponse(response.data);
  },

  getMonthlyStats: async () => {
    const response = await apiClient.get<ApiResponse>("/dashboard/monthly");
    return handleApiResponse(response.data);
  },

  getTopProducts: async (limit = 10) => {
    const response = await apiClient.get<ApiResponse>(
      `/dashboard/top-products?limit=${limit}`
    );
    return handleApiResponse(response.data);
  },

  getLowStock: async () => {
    const response = await apiClient.get<ApiResponse>("/dashboard/low-stock");
    return handleApiResponse(response.data);
  },

  getCustomerStats: async () => {
    const response = await apiClient.get<ApiResponse>("/dashboard/customers");
    return handleApiResponse(response.data);
  },

  getCashierPerformance: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const response = await apiClient.get<ApiResponse>(
      `/dashboard/cashier-performance?${params}`
    );
    return handleApiResponse(response.data);
  },

  getPendingSales: async () => {
    const response = await apiClient.get<ApiResponse>(
      "/dashboard/pending-sales"
    );
    return handleApiResponse(response.data);
  },

  getInventoryValue: async () => {
    const response = await apiClient.get<ApiResponse>(
      "/dashboard/inventory-value"
    );
    return handleApiResponse(response.data);
  },
};
