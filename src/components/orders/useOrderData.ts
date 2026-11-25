import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { salesApi } from "@/api/sales.api";
import { gamingApi } from "@/api/gaming.api";
import { exchangeRateApi } from "@/api/exchangeRate.api";
import { affects, queryKeys } from "@/api/queryKeys";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useAuthStore } from "@/store/authStore";
import { UserRole } from "@/types/auth.types";
import { SaleStatus, type OrderListFilters, type PaySaleRequest, type UpdateSaleRequest, type CreateSaleRequest } from "@/types/sale.types";

/** Fallback when the rate hasn't loaded yet (the API's default). */
export const DEFAULT_RATE = 89_500;

/** Unpaid orders of any day (the "Open now" list, the POS order picker, station cards). */
const OPEN_FILTERS: OrderListFilters = { status: SaleStatus.PENDING, limit: 100 };
export const openOrdersKey = () => queryKeys.orders.list({ ...OPEN_FILTERS, scope: "open" });

export function useOpenOrders(options: { refetchInterval?: number | false } = {}) {
  return useQuery({
    queryKey: openOrdersKey(),
    queryFn: () => salesApi.list(OPEN_FILTERS),
    select: (r) => r.data,
    // Running sessions change the totals every minute
    refetchInterval: options.refetchInterval ?? 30_000,
  });
}

export function useOrdersList(filters: OrderListFilters) {
  return useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => salesApi.list(filters),
    placeholderData: keepPreviousData,
  });
}

/** One full order. Refreshes every 30s while a session on it runs (the UI ticks in between). */
export function useOrder(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => salesApi.getById(id!),
    enabled: Boolean(id),
    refetchInterval: (q) => (q.state.data?.hasActiveSessions ? 30_000 : false),
  });
}

export function useExchangeRate(): number {
  const { data } = useQuery({
    queryKey: queryKeys.exchangeRate.current(),
    queryFn: exchangeRateApi.getCurrentRate,
    staleTime: 5 * 60_000,
  });
  return data?.rate || DEFAULT_RATE;
}

/** Cancelling orders and sessions is for managers/admins (the API enforces it too). */
export function useCanCancel(): boolean {
  const role = useAuthStore((s) => s.user?.role);
  return role === UserRole.ADMIN || role === UserRole.MANAGER;
}

/* ---------------------------------------------------------------- writes */

export function usePayOrder(onPaid?: (orderId: string) => void) {
  return useApiMutation({
    mutationFn: (v: { id: string; data: PaySaleRequest }) => salesApi.pay(v.id, v.data),
    invalidates: affects.order,
    onSuccess: (order) => onPaid?.(order.id),
  });
}

export function useCreateOrder() {
  return useApiMutation({
    mutationFn: (data: CreateSaleRequest) => salesApi.create(data),
    invalidates: affects.order,
  });
}

export function useUpdateOrder() {
  return useApiMutation({
    mutationFn: (v: { id: string; data: UpdateSaleRequest }) => salesApi.update(v.id, v.data),
    invalidates: affects.order,
  });
}

export function useCancelOrder(onDone?: () => void) {
  return useApiMutation({
    mutationFn: (id: string) => salesApi.cancel(id),
    invalidates: affects.order,
    successMessage: "Order cancelled",
    onSuccess: () => onDone?.(),
  });
}

/** Stops a running session. Its order stays open with the final time on it. */
export function useEndSession() {
  return useApiMutation({
    mutationFn: (v: { sessionId: string; discountId?: string }) => gamingApi.endSession(v.sessionId, v.discountId ? { discountId: v.discountId } : undefined),
    invalidates: affects.session,
  });
}
