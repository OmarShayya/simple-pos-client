import apiClient from "./client";
import { type ApiResponse, type PaginatedResponse } from "../types/api.types";
import {
  handleApiResponse,
  handlePaginatedResponse,
} from "../utils/responseHandler";

export const reportApi = {
  getDailyReport: async (date: string) => {
    const response = await apiClient.get<ApiResponse>(
      `/reports/daily?date=${date}`
    );
    return handleApiResponse(response.data);
  },

  getWeeklyReport: async (week: number, month: number, year: number) => {
    const response = await apiClient.get<ApiResponse>(
      `/reports/weekly?week=${week}&month=${month}&year=${year}`
    );
    return handleApiResponse(response.data);
  },

  getMonthlyReport: async (month: number, year: number) => {
    const response = await apiClient.get<ApiResponse>(
      `/reports/monthly?month=${month}&year=${year}`
    );
    return handleApiResponse(response.data);
  },

  getYearlyReport: async (year: number) => {
    const response = await apiClient.get<ApiResponse>(
      `/reports/yearly?year=${year}`
    );
    return handleApiResponse(response.data);
  },

  getSalesByCategory: async (
    categoryId?: string,
    startDate?: string,
    endDate?: string
  ) => {
    const params = new URLSearchParams();
    if (categoryId) params.append("categoryId", categoryId);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const response = await apiClient.get<ApiResponse>(
      `/reports/by-category?${params}`
    );
    return handleApiResponse(response.data);
  },

  getSalesByProduct: async (
    productId?: string,
    startDate?: string,
    endDate?: string
  ) => {
    const params = new URLSearchParams();
    if (productId) params.append("productId", productId);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const response = await apiClient.get<ApiResponse>(
      `/reports/by-product?${params}`
    );
    return handleApiResponse(response.data);
  },

  getDailyTransactions: async (
    date?: string,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    limit: number = 50
  ) => {
    const params = new URLSearchParams();
    if (date) params.append("date", date);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    params.append("page", page.toString());
    params.append("limit", limit.toString());

    const response = await apiClient.get<PaginatedResponse<any>>(
      `/reports/transactions/daily?${params}`
    );
    return handlePaginatedResponse(response.data);
  },

  exportReport: async (type: string, startDate: string, endDate: string) => {
    const response = await apiClient.get(
      `/reports/export?type=${type}&startDate=${startDate}&endDate=${endDate}`,
      { responseType: "blob" }
    );
    return response.data;
  },
};
