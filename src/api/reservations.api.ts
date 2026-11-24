import apiClient from "./client";
import { type ApiResponse } from "../types/api.types";
import { handleApiResponse } from "../utils/responseHandler";
import type {
  Availability,
  CreateReservationPayload,
  Reservation,
  ReservationSettings,
  ReservationStatus,
  StationType,
  UpdateReservationPayload,
} from "@/types/reservation.types";

export interface ReservationFilters {
  date?: string;
  from?: string;
  to?: string;
  status?: ReservationStatus[];
  type?: StationType;
  search?: string;
}

export const reservationsApi = {
  list: async (filters: ReservationFilters = {}): Promise<Reservation[]> => {
    const params = new URLSearchParams();
    if (filters.date) params.append("date", filters.date);
    if (filters.from) params.append("from", filters.from);
    if (filters.to) params.append("to", filters.to);
    if (filters.status?.length) params.append("status", filters.status.join(","));
    if (filters.type) params.append("type", filters.type);
    if (filters.search) params.append("search", filters.search);
    const response = await apiClient.get<ApiResponse<Reservation[]>>(`/reservations?${params.toString()}`);
    return handleApiResponse(response.data);
  },

  get: async (id: string): Promise<Reservation> => {
    const response = await apiClient.get<ApiResponse<Reservation>>(`/reservations/${id}`);
    return handleApiResponse(response.data);
  },

  availability: async (params: { type: StationType; date: string; durationMinutes: number }): Promise<Availability> => {
    const q = new URLSearchParams({ type: params.type, date: params.date, duration: String(params.durationMinutes) });
    const response = await apiClient.get<ApiResponse<Availability>>(`/reservations/availability?${q.toString()}`);
    return handleApiResponse(response.data);
  },

  create: async (payload: CreateReservationPayload): Promise<Reservation> => {
    const response = await apiClient.post<ApiResponse<Reservation>>("/reservations", payload);
    return handleApiResponse(response.data);
  },

  update: async (id: string, payload: UpdateReservationPayload): Promise<Reservation> => {
    const response = await apiClient.patch<ApiResponse<Reservation>>(`/reservations/${id}`, payload);
    return handleApiResponse(response.data);
  },

  cancel: async (id: string, reason?: string): Promise<Reservation> => {
    const response = await apiClient.patch<ApiResponse<Reservation>>(`/reservations/${id}/cancel`, { reason });
    return handleApiResponse(response.data);
  },

  markNoShow: async (id: string): Promise<Reservation> => {
    const response = await apiClient.patch<ApiResponse<Reservation>>(`/reservations/${id}/no-show`);
    return handleApiResponse(response.data);
  },

  checkIn: async (id: string, createSale?: boolean): Promise<Reservation> => {
    const response = await apiClient.post<ApiResponse<Reservation>>(`/reservations/${id}/check-in`, { createSale });
    return handleApiResponse(response.data);
  },

  getSettings: async (): Promise<ReservationSettings> => {
    const response = await apiClient.get<ApiResponse<ReservationSettings>>("/reservations/settings");
    return handleApiResponse(response.data);
  },

  updateSettings: async (settings: Partial<ReservationSettings>): Promise<ReservationSettings> => {
    // Only send editable fields (the API rejects unknown ones)
    const {
      enabled,
      timezone,
      schedule,
      slotMinutes,
      minDurationMinutes,
      maxDurationMinutes,
      maxAdvanceDays,
      minLeadMinutes,
      noShowGraceMinutes,
      bufferMinutes,
      maxStationsPerBooking,
      bookableTypes,
    } = settings;
    const body = {
      enabled,
      timezone,
      schedule: schedule?.map(({ day, closed, open, close }) => ({ day, closed, open, close })),
      slotMinutes,
      minDurationMinutes,
      maxDurationMinutes,
      maxAdvanceDays,
      minLeadMinutes,
      noShowGraceMinutes,
      bufferMinutes,
      maxStationsPerBooking,
      bookableTypes,
    };
    const response = await apiClient.put<ApiResponse<ReservationSettings>>("/reservations/settings", body);
    return handleApiResponse(response.data);
  },
};
