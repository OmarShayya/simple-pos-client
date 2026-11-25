import apiClient from "./client";
import { type ApiResponse, type PaginatedResponse } from "../types/api.types";
import type {
  CreateSaleRequest,
  Order,
  OrderCounts,
  OrderListFilters,
  OrderRow,
  PaidOrder,
  PaySaleRequest,
  UpdateSaleRequest,
} from "../types/sale.types";
import { handleApiResponse, handlePaginatedResponse } from "../utils/responseHandler";

const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(",") : v);

/** Query string of `GET /sales` (empty values are left out). */
const toParams = (f: OrderListFilters = {}) => {
  const params = new URLSearchParams();
  const entries: [string, string | number | undefined][] = [
    ["status", list(f.status)],
    ["source", f.source],
    ["type", list(f.type)],
    ["search", f.search?.trim() || undefined],
    ["from", f.from],
    ["to", f.to],
    ["customerId", f.customerId],
    ["cashierId", f.cashierId],
    ["page", f.page],
    ["limit", f.limit],
  ];
  for (const [key, value] of entries) if (value !== undefined && value !== "") params.append(key, String(value));
  return params;
};

/** Orders (= sales): counter sales, gaming orders and website orders. */
export const salesApi = {
  /** Orders list, newest first. */
  list: async (filters?: OrderListFilters) => {
    const response = await apiClient.get<PaginatedResponse<OrderRow>>(`/sales?${toParams(filters)}`);
    return handlePaginatedResponse(response.data);
  },

  /** Full order incl. gaming lines (live cost while a session runs). */
  getById: async (id: string): Promise<Order> => {
    const response = await apiClient.get<ApiResponse<Order>>(`/sales/${id}`);
    return handleApiResponse(response.data);
  },

  getByInvoice: async (invoiceNumber: string): Promise<Order> => {
    const response = await apiClient.get<ApiResponse<Order>>(`/sales/invoice/${encodeURIComponent(invoiceNumber)}`);
    return handleApiResponse(response.data);
  },

  /** Sidebar badges: open orders / website orders waiting. */
  counts: async (): Promise<OrderCounts> => {
    const response = await apiClient.get<ApiResponse<OrderCounts>>("/sales/counts");
    return handleApiResponse(response.data);
  },

  create: async (data: CreateSaleRequest): Promise<Order> => {
    const response = await apiClient.post<ApiResponse<Order>>("/sales", data);
    return handleApiResponse(response.data);
  },

  /** Edit an open order. `items` replaces the product lines; gaming lines stay. */
  update: async (id: string, data: UpdateSaleRequest): Promise<Order> => {
    const response = await apiClient.patch<ApiResponse<Order>>(`/sales/${id}`, data);
    return handleApiResponse(response.data);
  },

  /** Take payment. Running sessions on the order are stopped and billed first. */
  pay: async (id: string, data: PaySaleRequest): Promise<PaidOrder> => {
    const response = await apiClient.post<ApiResponse<PaidOrder>>(`/sales/${id}/pay`, data);
    return handleApiResponse(response.data);
  },

  /** Managers/admins only. */
  cancel: async (id: string): Promise<void> => {
    await apiClient.patch(`/sales/${id}/cancel`);
  },
};

export default salesApi;
