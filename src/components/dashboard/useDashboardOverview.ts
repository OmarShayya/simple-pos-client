import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { dashboardApi } from "@/api/dashboard.api";

/** How often the dashboard refreshes itself while it's open (mutations also invalidate it at once). */
export const DASHBOARD_REFRESH_MS = 30_000;

/** `GET /dashboard/overview`, refreshed every 30 s while the page is visible. */
export function useDashboardOverview() {
  return useQuery({
    queryKey: queryKeys.dashboard.overview(),
    queryFn: dashboardApi.getOverview,
    refetchInterval: DASHBOARD_REFRESH_MS,
    refetchIntervalInBackground: false,
  });
}

/** The current time, re-rendering every `everyMs` (live timers, greetings). */
export function useNow(everyMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), everyMs);
    return () => window.clearInterval(id);
  }, [everyMs]);
  return now;
}
