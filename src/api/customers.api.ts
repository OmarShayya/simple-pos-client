import apiClient from "./client";
import { type ApiResponse, type PaginatedResponse } from "../types/api.types";
import type { Customer, CustomerActivity, CustomerFilters, CreateCustomerRequest } from "../types/customer.types";
import { handleApiResponse, handlePaginatedResponse } from "../utils/responseHandler";

/** Drop empty optional strings the API would reject (e.g. `email: ""` on create). */
const clean = <T extends Partial<CreateCustomerRequest>>(data: T): T => {
  const out = { ...data };
  if (out.email === "") delete out.email;
  if (out.notes === "") delete out.notes;
  return out;
};

export const customersApi = {
  getAll: async (filters: CustomerFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.append("page", String(filters.page));
    if (filters.limit) params.append("limit", String(filters.limit));
    if (filters.search?.trim()) params.append("search", filters.search.trim());
    if (filters.hasBalance) params.append("hasBalance", "true");
    if (filters.source?.length) params.append("source", filters.source.join(","));
    if (filters.lastVisitFrom) params.append("lastVisitFrom", filters.lastVisitFrom);
    if (filters.lastVisitTo) params.append("lastVisitTo", filters.lastVisitTo);
    if (filters.sort) params.append("sort", filters.sort);
    if (filters.order) params.append("order", filters.order);

    const response = await apiClient.get<PaginatedResponse<Customer>>(`/customers?${params}`);
    return handlePaginatedResponse(response.data);
  },

  getById: async (id: string): Promise<Customer> => {
    const response = await apiClient.get<ApiResponse<Customer>>(`/customers/${id}`);
    return handleApiResponse(response.data);
  },

  /** Recent orders, bookings and sessions + lifetime totals. */
  getActivity: async (id: string): Promise<CustomerActivity> => {
    const response = await apiClient.get<ApiResponse<CustomerActivity>>(`/customers/${id}/activity`);
    return handleApiResponse(response.data);
  },

  /** Any phone format; `country` (ISO-2) is used for national numbers. 404 when there is no match. */
  getByPhone: async (phone: string, country?: string): Promise<Customer> => {
    const query = country ? `?country=${encodeURIComponent(country)}` : "";
    const response = await apiClient.get<ApiResponse<Customer>>(`/customers/phone/${encodeURIComponent(phone)}${query}`);
    return handleApiResponse(response.data);
  },

  create: async (data: CreateCustomerRequest): Promise<Customer> => {
    const response = await apiClient.post<ApiResponse<Customer>>("/customers", clean(data));
    return handleApiResponse(response.data);
  },

  update: async (id: string, data: Partial<CreateCustomerRequest>): Promise<Customer> => {
    const response = await apiClient.put<ApiResponse<Customer>>(`/customers/${id}`, data);
    return handleApiResponse(response.data);
  },

  updateBalance: async (id: string, balance: { usd: number; lbp: number }): Promise<Customer> => {
    const response = await apiClient.patch<ApiResponse<Customer>>(`/customers/${id}/balance`, balance);
    return handleApiResponse(response.data);
  },

  /** Deactivates the customer (history is kept; adding the same phone again brings them back). */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/customers/${id}`);
  },

  getTopCustomers: async (limit = 10): Promise<Customer[]> => {
    const response = await apiClient.get<ApiResponse<Customer[]>>(`/customers/top?limit=${limit}`);
    return handleApiResponse(response.data);
  },
};
