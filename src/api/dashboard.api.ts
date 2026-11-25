import apiClient from "./client";
import type { ApiResponse } from "@/types/api.types";
import type { DashboardOverview } from "@/types/dashboard.types";
import { handleApiResponse } from "@/utils/responseHandler";

export const dashboardApi = {
  /** The shift at a glance: today vs yesterday, stations, running sessions, open orders, bookings, stock. */
  getOverview: async (): Promise<DashboardOverview> => {
    const response = await apiClient.get<ApiResponse<DashboardOverview>>("/dashboard/overview");
    return handleApiResponse(response.data);
  },
};
