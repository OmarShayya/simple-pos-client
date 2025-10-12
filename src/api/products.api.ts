import apiClient from "./client";
import { type ApiResponse, type PaginatedResponse } from "../types/api.types";
import {
  type Product,
  type MenuProduct,
  type CreateProductRequest,
  type UpdateProductRequest,
} from "../types/product.types";
import {
  handleApiResponse,
  handlePaginatedResponse,
} from "../utils/responseHandler";

interface ProductFilters {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  lowStock?: boolean;
  displayOnMenu?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

export const productsApi = {
  getAll: async (filters?: ProductFilters) => {
    const params = new URLSearchParams();
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.category) params.append("category", filters.category);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.lowStock) params.append("lowStock", "true");
    if (filters?.displayOnMenu !== undefined)
      params.append("displayOnMenu", filters.displayOnMenu.toString());
    if (filters?.minPrice)
      params.append("minPrice", filters.minPrice.toString());
    if (filters?.maxPrice)
      params.append("maxPrice", filters.maxPrice.toString());

    const response = await apiClient.get<PaginatedResponse<Product>>(
      `/products?${params}`
    );
    return handlePaginatedResponse(response.data);
  },

  getMenuProducts: async (): Promise<MenuProduct[]> => {
    const response = await apiClient.get<ApiResponse<MenuProduct[]>>(
      "/products/menu"
    );
    return handleApiResponse(response.data);
  },

  getById: async (id: string): Promise<Product> => {
    const response = await apiClient.get<ApiResponse<Product>>(
      `/products/${id}`
    );
    return handleApiResponse(response.data);
  },

  getBySku: async (sku: string): Promise<Product> => {
    const response = await apiClient.get<ApiResponse<Product>>(
      `/products/sku/${sku}`
    );
    return handleApiResponse(response.data);
  },

  getLowStock: async (): Promise<Product[]> => {
    const response = await apiClient.get<ApiResponse<Product[]>>(
      "/products/low-stock"
    );
    return handleApiResponse(response.data);
  },

  create: async (data: CreateProductRequest): Promise<Product> => {
    if (data.image === "") {
      delete data.image;
    }
    if (data.description === "") {
      delete data.description;
    }
    const response = await apiClient.post<ApiResponse<Product>>(
      "/products",
      data
    );
    return handleApiResponse(response.data);
  },

  update: async (id: string, data: UpdateProductRequest): Promise<Product> => {
    if (data.image === "") {
      delete data.image;
    }
    if (data.description === "") {
      delete data.description;
    }
    const response = await apiClient.put<ApiResponse<Product>>(
      `/products/${id}`,
      data
    );
    return handleApiResponse(response.data);
  },

  updateStock: async (id: string, quantity: number): Promise<Product> => {
    const response = await apiClient.patch<ApiResponse<Product>>(
      `/products/${id}/stock`,
      { quantity }
    );
    return handleApiResponse(response.data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },

  convertPrice: async (amount: number, from: "USD" | "LBP") => {
    const response = await apiClient.get<
      ApiResponse<{ usd: number; lbp: number }>
    >(`/products/convert-price?amount=${amount}&from=${from}`);
    return handleApiResponse(response.data);
  },
};
