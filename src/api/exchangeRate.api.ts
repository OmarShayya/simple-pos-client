import apiClient from "./client";
import { type ApiResponse } from "../types/api.types";
import { handleApiResponse } from "../utils/responseHandler";
import type { CurrentRate, ExchangeRateRecord, ExchangeRateResult } from "@/types/exchangeRate.types";

export const exchangeRateApi = {
  getCurrentRate: async (): Promise<CurrentRate> => {
    const response = await apiClient.get<ApiResponse<CurrentRate>>("/exchange-rate/current");
    return handleApiResponse(response.data);
  },

  updateRate: async (rate: number, notes?: string) => {
    const response = await apiClient.post<ApiResponse>("/exchange-rate/update", { rate, notes });
    return handleApiResponse(response.data);
  },

  getHistory: async (limit = 20): Promise<ExchangeRateRecord[]> => {
    const response = await apiClient.get<ApiResponse<ExchangeRateRecord[]>>(`/exchange-rate/history?limit=${limit}`);
    return handleApiResponse(response.data);
  },

  convert: async (amount: number, from: "USD" | "LBP") => {
    const response = await apiClient.get<ApiResponse<ExchangeRateResult>>(`/exchange-rate/convert?amount=${amount}&from=${from}`);
    return handleApiResponse(response.data);
  },
};
