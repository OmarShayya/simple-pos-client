import apiClient from "./client";
import { type ApiResponse, type PaginatedResponse } from "../types/api.types";
import {
  type Customer,
  type CreateCustomerRequest,
} from "../types/customer.types";
import {
  handleApiResponse,
  handlePaginatedResponse,
} from "../utils/responseHandler";

interface CustomerFilters {
  page?: number;
  limit?: number;
  search?: string;
  hasBalance?: boolean;
}

export const customersApi = {
  getAll: async (filters?: CustomerFilters) => {
    const params = new URLSearchParams();
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.search) params.append("search", filters.search);
    if (filters?.hasBalance) params.append("hasBalance", "true");

    const response = await apiClient.get<PaginatedResponse<Customer>>(
      `/customers?${params}`
    );
    return handlePaginatedResponse(response.data);
  },

  getById: async (id: string): Promise<Customer> => {
    const response = await apiClient.get<ApiResponse<Customer>>(
      `/customers/${id}`
    );
    return handleApiResponse(response.data);
  },

  getByPhone: async (phone: string): Promise<Customer> => {
    const response = await apiClient.get<ApiResponse<Customer>>(
      `/customers/phone/${phone}`
    );
    return handleApiResponse(response.data);
  },

  create: async (data: CreateCustomerRequest): Promise<Customer> => {
    const response = await apiClient.post<ApiResponse<Customer>>(
      "/customers",
      data
    );
    return handleApiResponse(response.data);
  },

  update: async (
    id: string,
    data: Partial<CreateCustomerRequest>
  ): Promise<Customer> => {
    const response = await apiClient.put<ApiResponse<Customer>>(
      `/customers/${id}`,
      data
    );
    return handleApiResponse(response.data);
  },

  updateBalance: async (
    id: string,
    balance: { usd: number; lbp: number }
  ): Promise<Customer> => {
    const response = await apiClient.patch<ApiResponse<Customer>>(
      `/customers/${id}/balance`,
      balance
    );
    return handleApiResponse(response.data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/customers/${id}`);
  },

  getTopCustomers: async (limit = 10): Promise<Customer[]> => {
    const response = await apiClient.get<ApiResponse<Customer[]>>(
      `/customers/top?limit=${limit}`
    );
    return handleApiResponse(response.data);
  },
};
