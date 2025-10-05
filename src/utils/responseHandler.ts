import { type ApiResponse, type PaginatedResponse } from "../types/api.types";

export const handleApiResponse = <T>(response: ApiResponse<T>): T => {
  if (!response.success) {
    throw new Error(response.message || "An error occurred");
  }
  return response.data as T;
};

export const handlePaginatedResponse = <T>(
  response: PaginatedResponse<T>
): {
  data: T[];
  pagination: PaginatedResponse<T>["pagination"];
} => {
  if (!response.success) {
    throw new Error(response.message || "An error occurred");
  }
  return {
    data: response.data as T[],
    pagination: response.pagination,
  };
};
