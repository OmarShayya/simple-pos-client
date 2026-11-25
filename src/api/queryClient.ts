import { QueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

/**
 * The app's single QueryClient — defaults live here and nowhere else.
 *
 * - staleTime 30s: screens open instantly from cache, then refresh in the background.
 * - refetchOnWindowFocus: coming back to the POS tab refreshes stale data (counter screens sit
 *   open for hours; mutations also invalidate everything they touch — see `useApiMutation`).
 * - retry: network/5xx errors retry twice with backoff; 4xx (validation, auth, not found) never do.
 * - List queries that page/filter should add `placeholderData: keepPreviousData` (see README) so the
 *   table keeps its rows while the next page loads. Not a global default: a detail view must never
 *   show the previous record's data.
 */

const isClientError = (error: unknown) => {
  const status = error instanceof AxiosError ? error.response?.status : undefined;
  return typeof status === "number" && status >= 400 && status < 500;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) => !isClientError(error) && failureCount < 2,
    },
    mutations: {
      retry: false,
    },
  },
});
