import apiClient from "./client";
import { type ApiResponse, type PaginatedResponse } from "../types/api.types";
import {
  type Sale,
  type CreateSaleRequest,
  type PaySaleRequest,
  SaleStatus,
} from "../types/sale.types";
import {
  handleApiResponse,
  handlePaginatedResponse,
} from "../utils/responseHandler";

interface SaleFilters {
  page?: number;
  limit?: number;
  status?: SaleStatus;
  customerId?: string;
  cashierId?: string;
  startDate?: string;
  endDate?: string;
}

export const salesApi = {
  getAll: async (filters?: SaleFilters) => {
    const params = new URLSearchParams();
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.status) params.append("status", filters.status);
    if (filters?.customerId) params.append("customerId", filters.customerId);
    if (filters?.cashierId) params.append("cashierId", filters.cashierId);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);

    const response = await apiClient.get<PaginatedResponse<Sale>>(
      `/sales?${params}`
    );
    return handlePaginatedResponse(response.data);
  },

  getById: async (id: string): Promise<Sale> => {
    const response = await apiClient.get<ApiResponse<Sale>>(`/sales/${id}`);
    return handleApiResponse(response.data);
  },

  getByInvoice: async (invoiceNumber: string): Promise<Sale> => {
    const response = await apiClient.get<ApiResponse<Sale>>(
      `/sales/invoice/${invoiceNumber}`
    );
    return handleApiResponse(response.data);
  },

  create: async (data: CreateSaleRequest): Promise<Sale> => {
    const response = await apiClient.post<ApiResponse<Sale>>("/sales", data);
    return handleApiResponse(response.data);
  },

  update: async (id: string, data: CreateSaleRequest): Promise<Sale> => {
    const response = await apiClient.patch<ApiResponse<Sale>>(
      `/sales/${id}`,
      data
    );
    return handleApiResponse(response.data);
  },

  pay: async (id: string, data: PaySaleRequest): Promise<Sale> => {
    const response = await apiClient.post<ApiResponse<Sale>>(
      `/sales/${id}/pay`,
      data
    );
    return handleApiResponse(response.data);
  },

  cancel: async (id: string): Promise<void> => {
    await apiClient.patch(`/sales/${id}/cancel`);
  },

  getTodayStats: async () => {
    const response = await apiClient.get<
      ApiResponse<{
        totalSales: number;
        revenue: { usd: number; lbp: number };
        pendingSales: number;
        paidSales: number;
        itemsSold: number;
      }>
    >("/sales/today");
    return handleApiResponse(response.data);
  },
};
