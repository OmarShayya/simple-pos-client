import apiClient from "./client";
import type { ApiResponse } from "@/types/api.types";
import type { ReportPeriod, ReportSummary } from "@/types/report.types";
import { handleApiResponse } from "@/utils/responseHandler";

export const reportApi = {
  /** Everything one report needs: KPIs vs the previous period, chart buckets and breakdowns. */
  getSummary: async (period: ReportPeriod, date: string): Promise<ReportSummary> => {
    const response = await apiClient.get<ApiResponse<ReportSummary>>("/reports/summary", { params: { period, date } });
    return handleApiResponse(response.data);
  },
};
