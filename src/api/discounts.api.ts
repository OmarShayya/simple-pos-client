import apiClient from "./client";
import { type ApiResponse, type PaginatedResponse } from "../types/api.types";
import {
  type Discount,
  type CreateDiscountRequest,
  type UpdateDiscountRequest,
  type GetDiscountsFilters,
} from "../types/discount.types";
import {
  handleApiResponse,
  handlePaginatedResponse,
} from "../utils/responseHandler";

export const discountsApi = {
  // Get all discounts with optional filters
  getAll: async (filters?: GetDiscountsFilters) => {
    const params = new URLSearchParams();
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.target) params.append("target", filters.target);
    if (filters?.isActive !== undefined)
      params.append("isActive", filters.isActive.toString());
    if (filters?.targetId) params.append("targetId", filters.targetId);

    const response = await apiClient.get<PaginatedResponse<Discount>>(
      `/discounts?${params}`
    );
    return handlePaginatedResponse(response.data);
  },

  // Get discount by ID
  getById: async (id: string): Promise<Discount> => {
    const response = await apiClient.get<ApiResponse<Discount>>(
      `/discounts/${id}`
    );
    return handleApiResponse(response.data);
  },

  // Create new discount
  create: async (data: CreateDiscountRequest): Promise<Discount> => {
    const response = await apiClient.post<ApiResponse<Discount>>(
      "/discounts",
      data
    );
    return handleApiResponse(response.data);
  },

  // Update discount
  update: async (
    id: string,
    data: UpdateDiscountRequest
  ): Promise<Discount> => {
    const response = await apiClient.put<ApiResponse<Discount>>(
      `/discounts/${id}`,
      data
    );
    return handleApiResponse(response.data);
  },

  // Delete discount
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/discounts/${id}`);
  },

  // Get active discounts for a specific product
  getActiveForProduct: async (productId: string): Promise<Discount[]> => {
    const response = await apiClient.get<ApiResponse<Discount[]>>(
      `/discounts/product/${productId}/active`
    );
    return handleApiResponse(response.data);
  },

  // Get active gaming session discounts
  getActiveForGamingSession: async (): Promise<Discount[]> => {
    const response = await apiClient.get<ApiResponse<Discount[]>>(
      "/discounts/gaming-session/active"
    );
    return handleApiResponse(response.data);
  },

  // Get active sale-level discounts
  getActiveForSale: async (): Promise<Discount[]> => {
    const response = await apiClient.get<ApiResponse<Discount[]>>(
      "/discounts/sale/active"
    );
    return handleApiResponse(response.data);
  },
};
