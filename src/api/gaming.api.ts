import apiClient from "./client";
import { type ApiResponse, type PaginatedResponse } from "../types/api.types";
import { handleApiResponse, handlePaginatedResponse } from "../utils/responseHandler";
import type { ActiveSession, GamingSession, PC, PCStatus, StartSessionRequest } from "@/types/gaming.types";
import type { StationType } from "@/types/reservation.types";

interface PCFilters {
  status?: PCStatus;
  type?: StationType;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

type StationSpecs = { cpu?: string; gpu?: string; ram?: string; monitor?: string };

export type UpdateStationPayload = Parameters<typeof updateStation>[1];
// Declared separately so its payload type can be reused by pages
async function updateStation(
  id: string,
  data: {
    type?: StationType;
    pcNumber?: string;
    name?: string;
    hourlyRateUsd?: number;
    specifications?: StationSpecs;
    location?: string;
    notes?: string;
    status?: PCStatus;
    isActive?: boolean;
  }
): Promise<PC> {
  const response = await apiClient.patch<ApiResponse<PC>>(`/gaming/pcs/${id}`, data);
  return handleApiResponse(response.data);
}

/** Gaming stations (PCs + PlayStation rooms) and their sessions. Every session bills to an order. */
export const gamingApi = {
  /* ---------------------------------------------------------------- stations */
  createPC: async (data: {
    type?: StationType;
    pcNumber: string;
    name: string;
    hourlyRateUsd?: number;
    specifications?: StationSpecs;
    location?: string;
    notes?: string;
  }): Promise<PC> => {
    const response = await apiClient.post<ApiResponse<PC>>("/gaming/pcs", data);
    return handleApiResponse(response.data);
  },

  updatePC: updateStation,

  getPCById: async (id: string): Promise<PC> => {
    const response = await apiClient.get<ApiResponse<PC>>(`/gaming/pcs/${id}`);
    return handleApiResponse(response.data);
  },

  getAllPCs: async (filters: PCFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.type) params.append("type", filters.type);
    if (filters.isActive !== undefined) params.append("isActive", filters.isActive.toString());
    if (filters.page) params.append("page", filters.page.toString());
    if (filters.limit) params.append("limit", filters.limit.toString());
    const response = await apiClient.get<PaginatedResponse<PC>>(`/gaming/pcs?${params}`);
    return handlePaginatedResponse(response.data);
  },

  deletePC: async (id: string): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/gaming/pcs/${id}`);
    return handleApiResponse(response.data);
  },

  /** Admin buttons on Manage stations: start / end a real (billed) session. */
  lockPC: async (id: string, data?: { customerId?: string; customerName?: string }): Promise<PC> => {
    const response = await apiClient.post<ApiResponse<PC>>(`/gaming/pcs/${id}/lock`, data);
    return handleApiResponse(response.data);
  },

  unlockPC: async (id: string): Promise<PC> => {
    const response = await apiClient.post<ApiResponse<PC>>(`/gaming/pcs/${id}/unlock`);
    return handleApiResponse(response.data);
  },

  /* ---------------------------------------------------------------- sessions */
  /** Starts the clock and ALWAYS opens (or joins, with `saleId`) an order. */
  startSession: async (data: StartSessionRequest): Promise<GamingSession> => {
    const response = await apiClient.post<ApiResponse<GamingSession>>("/gaming/sessions", data);
    return handleApiResponse(response.data);
  },

  /** Stops the clock and finalizes the order line. The order stays unpaid. */
  endSession: async (id: string, data?: { discountId?: string }): Promise<GamingSession> => {
    const body = data?.discountId ? { discountId: data.discountId } : {};
    const response = await apiClient.put<ApiResponse<GamingSession>>(`/gaming/sessions/${id}/end`, body);
    return handleApiResponse(response.data);
  },

  getActiveSessions: async (): Promise<ActiveSession[]> => {
    const response = await apiClient.get<ApiResponse<ActiveSession[]>>("/gaming/sessions/active");
    return handleApiResponse(response.data);
  },

  /** Managers/admins only. Removes the line from its order. */
  cancelSession: async (id: string): Promise<void> => {
    const response = await apiClient.patch<ApiResponse<void>>(`/gaming/sessions/${id}/cancel`);
    return handleApiResponse(response.data);
  },
};

export default gamingApi;
