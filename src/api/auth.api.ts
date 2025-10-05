import apiClient from "./client";
import { type ApiResponse } from "../types/api.types";
import {
  type LoginRequest,
  type RegisterRequest,
  type AuthResponse,
  type User,
} from "../types/auth.types";
import { handleApiResponse } from "../utils/responseHandler";

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
