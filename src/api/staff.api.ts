import apiClient from "./client";
import { type ApiResponse } from "../types/api.types";
import { handleApiResponse } from "../utils/responseHandler";
import type { UserRole } from "@/types/auth.types";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
}

export const staffApi = {
  /** True only while no accounts exist (first-run setup). */
  setupStatus: async (): Promise<{ needsSetup: boolean }> => {
    const response = await apiClient.get<ApiResponse<{ needsSetup: boolean }>>("/auth/setup-status");
    return handleApiResponse(response.data);
  },

  list: async (): Promise<StaffMember[]> => {
    const response = await apiClient.get<ApiResponse<StaffMember[]>>("/auth/users?includeInactive=true");
    return handleApiResponse(response.data);
  },

  /** Creates an account WITHOUT signing the current user out (the returned token is ignored). */
  create: async (data: { name: string; email: string; password: string; role: UserRole }): Promise<StaffMember> => {
    const response = await apiClient.post<ApiResponse<{ user: StaffMember }>>("/auth/register", data);
    const { user } = handleApiResponse(response.data);
    return { ...user, isActive: true };
  },

  update: async (id: string, data: { name?: string; role?: UserRole; isActive?: boolean }): Promise<StaffMember> => {
    const response = await apiClient.put<ApiResponse<StaffMember>>(`/auth/users/${id}`, data);
    return handleApiResponse(response.data);
  },

  deactivate: async (id: string): Promise<void> => {
    await apiClient.delete(`/auth/users/${id}`);
  },
};
