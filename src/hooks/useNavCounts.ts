import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { queryKeys } from "@/api/queryKeys";
import { useAuthStore } from "@/store/authStore";

/** Sidebar badge numbers. Keys match `SidebarItem.badge` in the sidebar config. */
export interface NavCounts {
  /** Open (unpaid) orders. */
  open?: number;
  /** Website orders waiting for staff. */
  websiteOpen?: number;
  /** Reservations needing attention (late / arriving soon) — shown if the API provides it. */
  reservationsAttention?: number;
}

/**
 * Polls `GET /sales/counts` for the sidebar badges. Fails silently: if the endpoint is missing
 * (older API) or errors, the badges just don't show — the shell never breaks or toasts.
 */
export function useNavCounts(): NavCounts {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data } = useQuery({
    queryKey: queryKeys.counts.nav(),
    queryFn: async () => {
      const res = await apiClient.get<{ data?: NavCounts }>("/sales/counts");
      return res.data?.data ?? {};
    },
    enabled: isAuthenticated,
    retry: false,
    staleTime: 15_000,
    // Keep polling only while the endpoint works
    refetchInterval: (query) => (query.state.status === "error" ? false : 30_000),
    refetchOnWindowFocus: (query) => query.state.status !== "error",
    meta: { silent: true },
  });
  return data ?? {};
}

export default useNavCounts;
