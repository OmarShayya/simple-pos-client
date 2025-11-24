import apiClient from "./client";
import { type ApiResponse, type PaginatedResponse } from "../types/api.types";
import {
  handleApiResponse,
  handlePaginatedResponse,
} from "../utils/responseHandler";
import {
  type DiscountUsageReport,
  type CustomerDiscountReport,
} from "../types/discount.types";

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

  // Gaming Revenue Reports
  getGamingRevenue: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const response = await apiClient.get<ApiResponse>(
      `/reports/gaming-revenue?${params}`
    );
    return handleApiResponse(response.data);
  },

  getGamingRevenueByPC: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const response = await apiClient.get<ApiResponse>(
      `/reports/gaming-revenue-by-pc?${params}`
    );
    return handleApiResponse(response.data);
  },

  getDailyGamingReport: async (date: string) => {
    const response = await apiClient.get<ApiResponse>(
      `/reports/gaming/daily?date=${date}`
    );
    return handleApiResponse(response.data);
  },

  getMonthlyGamingReport: async (month: number, year: number) => {
    const response = await apiClient.get<ApiResponse>(
      `/reports/gaming/monthly?month=${month}&year=${year}`
    );
    return handleApiResponse(response.data);
  },

  // Discount Reports
  getDiscountUsage: async (
    startDate?: string,
    endDate?: string
  ): Promise<DiscountUsageReport[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const response = await apiClient.get<ApiResponse<DiscountUsageReport[]>>(
      `/reports/discount-usage?${params}`
    );
    return handleApiResponse(response.data);
  },

  getCustomerDiscounts: async (
    customerId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<CustomerDiscountReport[]> => {
    const params = new URLSearchParams();
    if (customerId) params.append("customerId", customerId);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const response = await apiClient.get<
      ApiResponse<CustomerDiscountReport[]>
    >(`/reports/customer-discounts?${params}`);
    return handleApiResponse(response.data);
  },
};
