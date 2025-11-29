import apiClient from "./client";
import { type ApiResponse, type PaginatedResponse } from "../types/api.types";
import {
  handleApiResponse,
  handlePaginatedResponse,
} from "../utils/responseHandler";
import {
  PC,
  GamingSession,
  PCStatus,
  SessionStatus,
  SessionPaymentStatus,
} from "@/types/gaming.types";
import { PaymentMethod, Currency } from "@/types/sale.types";

interface PCFilters {
  status?: PCStatus;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

interface SessionFilters {
  status?: SessionStatus;
  pcId?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  paymentStatus?: SessionPaymentStatus;
  page?: number;
  limit?: number;
}

export const gamingApi = {
  createPC: async (data: {
    pcNumber: string;
    name: string;
    hourlyRateUsd?: number;
    specifications?: any;
    location?: string;
    notes?: string;
  }): Promise<PC> => {
    const response = await apiClient.post<ApiResponse<PC>>("/gaming/pcs", data);
    return handleApiResponse(response.data);
  },

  updatePC: async (
    id: string,
    data: {
      name?: string;
      hourlyRateUsd?: number;
      specifications?: any;
      location?: string;
      notes?: string;
      status?: PCStatus;
      isActive?: boolean;
    }
  ): Promise<PC> => {
    const response = await apiClient.patch<ApiResponse<PC>>(
      `/gaming/pcs/${id}`,
      data
    );
    return handleApiResponse(response.data);
  },

  getPCById: async (id: string): Promise<PC> => {
    const response = await apiClient.get<ApiResponse<PC>>(`/gaming/pcs/${id}`);
    return handleApiResponse(response.data);
  },

  getAllPCs: async (filters: PCFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.isActive !== undefined)
      params.append("isActive", filters.isActive.toString());
    if (filters.page) params.append("page", filters.page.toString());
    if (filters.limit) params.append("limit", filters.limit.toString());

    const response = await apiClient.get<PaginatedResponse<PC>>(
      `/gaming/pcs?${params}`
    );
    return handlePaginatedResponse(response.data);
  },

  getAvailablePCs: async (): Promise<PC[]> => {
    const response = await apiClient.get<ApiResponse<PC[]>>(
      "/gaming/pcs/available"
    );
    return handleApiResponse(response.data);
  },

  deletePC: async (id: string): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/gaming/pcs/${id}`
    );
    return handleApiResponse(response.data);
  },

  startSession: async (data: {
    pcId: string;
    customerId?: string;
    customerName?: string;
    saleId?: string;
    notes?: string;
  }): Promise<GamingSession> => {
    const response = await apiClient.post<ApiResponse<GamingSession>>(
      "/gaming/sessions",
      data
    );
    return handleApiResponse(response.data);
  },

  endSession: async (
    id: string,
    data?: { discountId?: string }
  ): Promise<GamingSession> => {
    // Only send discountId if it's actually provided, otherwise send empty object
    const body = data?.discountId ? { discountId: data.discountId } : {};
    const response = await apiClient.put<ApiResponse<GamingSession>>(
      `/gaming/sessions/${id}/end`,
      body
    );
    return handleApiResponse(response.data);
  },

  processPayment: async (
    id: string,
    data: {
      paymentMethod: PaymentMethod;
      paymentCurrency: Currency;
      amount: number;
    }
  ): Promise<GamingSession> => {
    const response = await apiClient.post<ApiResponse<GamingSession>>(
      `/gaming/sessions/${id}/payment`,
      data
    );
    return handleApiResponse(response.data);
  },

  getSessionById: async (id: string): Promise<GamingSession> => {
    const response = await apiClient.get<ApiResponse<GamingSession>>(
      `/gaming/sessions/${id}`
    );
    return handleApiResponse(response.data);
  },

  getAllSessions: async (filters: SessionFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.pcId) params.append("pcId", filters.pcId);
    if (filters.customerId) params.append("customerId", filters.customerId);
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);
    if (filters.paymentStatus)
      params.append("paymentStatus", filters.paymentStatus);
    if (filters.page) params.append("page", filters.page.toString());
    if (filters.limit) params.append("limit", filters.limit.toString());

    const response = await apiClient.get<PaginatedResponse<GamingSession>>(
      `/gaming/sessions?${params}`
    );
    return handlePaginatedResponse(response.data);
  },

  getActiveSessions: async (): Promise<GamingSession[]> => {
    const response = await apiClient.get<ApiResponse<GamingSession[]>>(
      "/gaming/sessions/active"
    );
    return handleApiResponse(response.data);
  },

  getCurrentCost: async (
    id: string
  ): Promise<{ duration: number; cost: { usd: number; lbp: number } }> => {
    const response = await apiClient.get<
      ApiResponse<{ duration: number; cost: { usd: number; lbp: number } }>
    >(`/gaming/sessions/${id}/current-cost`);
    return handleApiResponse(response.data);
  },

  cancelSession: async (id: string): Promise<void> => {
    const response = await apiClient.patch<ApiResponse<void>>(
      `/gaming/sessions/${id}/cancel`
    );
    return handleApiResponse(response.data);
  },

  getTodayStats: async (): Promise<{
    activeSessions: number;
    completedSessions: number;
    totalRevenue: { usd: number; lbp: number };
    unpaidSessions: number;
  }> => {
    const response = await apiClient.get<ApiResponse<any>>(
      "/gaming/sessions/today-stats"
    );
    return handleApiResponse(response.data);
  },

  // Add to your existing gaming.api.ts

  lockPC: async (
    id: string,
    data?: { customerId?: string; customerName?: string }
  ): Promise<PC> => {
    const response = await apiClient.post<ApiResponse<PC>>(
      `/gaming/pcs/${id}/lock`,
      data
    );
    return handleApiResponse(response.data);
  },

  unlockPC: async (id: string): Promise<PC> => {
    const response = await apiClient.post<ApiResponse<PC>>(
      `/gaming/pcs/${id}/unlock`
    );
    return handleApiResponse(response.data);
  },
};
