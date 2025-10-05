import apiClient from "./client";
import { type ApiResponse } from "../types/api.types";
import {
  type Category,
  type CreateCategoryRequest,
  type UpdateCategoryRequest,
} from "../types/category.types";
import { handleApiResponse } from "../utils/responseHandler";

export const categoriesApi = {
  getAll: async (includeInactive = false): Promise<Category[]> => {
    const response = await apiClient.get<ApiResponse<Category[]>>(
      `/categories?includeInactive=${includeInactive}`
    );
    return handleApiResponse(response.data);
  },

  getById: async (id: string): Promise<Category> => {
    const response = await apiClient.get<ApiResponse<Category>>(
      `/categories/${id}`
    );
    return handleApiResponse(response.data);
  },

  create: async (data: CreateCategoryRequest): Promise<Category> => {
    if (data.image === "") {
      delete data.image;
    }
    if (data.description === "") {
      delete data.description;
    }
    const response = await apiClient.post<ApiResponse<Category>>(
      "/categories",
      data
    );
    return handleApiResponse(response.data);
  },

  update: async (
    id: string,
    data: UpdateCategoryRequest
  ): Promise<Category> => {
    const response = await apiClient.put<ApiResponse<Category>>(
      `/categories/${id}`,
      data
    );
    return handleApiResponse(response.data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/categories/${id}`);
  },
};
