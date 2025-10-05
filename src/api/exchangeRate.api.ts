import apiClient from "./client";
import { type ApiResponse } from "../types/api.types";
import { handleApiResponse } from "../utils/responseHandler";

export const exchangeRateApi = {
  getCurrentRate: async (): Promise<{ rate: number; currency: string }> => {
    const response = await apiClient.get<
      ApiResponse<{ rate: number; currency: string }>
    >("/exchange-rate/current");
    return handleApiResponse(response.data);
  },

  updateRate: async (rate: number, notes?: string) => {
    const response = await apiClient.post<ApiResponse>(
      "/exchange-rate/update",
      { rate, notes }
    );
    return handleApiResponse(response.data);
  },

  getHistory: async (limit = 20) => {
    const response = await apiClient.get<ApiResponse>(
      `/exchange-rate/history?limit=${limit}`
    );
    return handleApiResponse(response.data);
  },

  convert: async (amount: number, from: "USD" | "LBP") => {
    const response = await apiClient.get<
      ApiResponse<{ usd: number; lbp: number }>
    >(`/exchange-rate/convert?amount=${amount}&from=${from}`);
    return handleApiResponse(response.data);
  },
};
