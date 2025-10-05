import apiClient from "../api/client";
import { type ApiResponse } from "../types/api.types";
import {
  type LoginRequest,
  type RegisterRequest,
  type AuthResponse,
  type User,
} from "../types/auth.types";
import { handleApiResponse } from "../utils/responseHandler";
import { AxiosError } from "axios";
import { ApiError } from "@/types/api.types";

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      "/auth/login",
      credentials
    );
    return handleApiResponse(response.data);
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      "/auth/register",
      data
    );
    return handleApiResponse(response.data);
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>("/auth/profile");
    return handleApiResponse(response.data);
  },

  getAllUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<ApiResponse<User[]>>("/auth/users");
    return handleApiResponse(response.data);
  },
};

export const handleApiError = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiError;
    return apiError?.message || error.message || "An unexpected error occurred";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
};

export const showErrorToast = (error: unknown): void => {
  const message = handleApiError(error);
  console.error("API Error:", message);
};
