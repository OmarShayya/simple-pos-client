import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { gamingApi } from "@/api/gaming.api";
import { salesApi } from "@/api/sales.api";
import { queryKeys } from "@/api/queryKeys";
import { PCStatus, type ActiveSession, type PC } from "@/types/gaming.types";
import type { Order } from "@/types/sale.types";

/** "unavailable" = marked busy/reserved on the station itself without a session we know of. */
export type StationState = "available" | "occupied" | "maintenance" | "unavailable";

export interface StationView {
  pc: PC;
  state: StationState;
  session: ActiveSession | null;
  /** The open order the running session bills to (full order, for the live total). */
  order: Order | null;
  /** Confirmed booking that hasn't checked in yet. */
  booking: PC["upcomingReservation"] | null;
}

const STATIONS_FILTERS = { limit: 100 };
const POLL_MS = 15_000;

/**
 * Everything the stations board shows: stations, their running sessions and the order each session
 * bills to (shared cache with the Orders drawer / payment dialog, so a payment anywhere updates it).
 */
export function useStationBoard() {
  const stations = useQuery({
    queryKey: queryKeys.stations.list(STATIONS_FILTERS),
    queryFn: () => gamingApi.getAllPCs(STATIONS_FILTERS),
    select: (r) => r.data,
    refetchInterval: POLL_MS,
  });
  const sessions = useQuery({
    queryKey: queryKeys.sessions.active(),
    queryFn: gamingApi.getActiveSessions,
    refetchInterval: POLL_MS,
  });

  const orderIds = useMemo(
    () => [...new Set((sessions.data ?? []).map((s) => s.orderId).filter((id): id is string => Boolean(id)))],
    [sessions.data]
  );
  const orders = useQueries({
    queries: orderIds.map((id) => ({
      queryKey: queryKeys.orders.detail(id),
      queryFn: () => salesApi.getById(id),
      refetchInterval: 30_000,
    })),
  });
  const orderById = new Map<string, Order>();
  orders.forEach((q, i) => q.data && orderById.set(orderIds[i], q.data));

  const bySession = new Map((sessions.data ?? []).map((s) => [s.pc.id, s]));
  const views: StationView[] = (stations.data ?? [])
    .filter((pc) => pc.isActive)
    .map((pc) => {
      const session = bySession.get(pc.id) ?? null;
      const state: StationState = session
        ? "occupied"
        : pc.status === PCStatus.MAINTENANCE
          ? "maintenance"
          : pc.status === PCStatus.AVAILABLE
            ? "available"
            : "unavailable";
      const booking = pc.upcomingReservation?.status === "confirmed" ? pc.upcomingReservation : null;
      return { pc, state, session, order: session?.orderId ? orderById.get(session.orderId) ?? null : null, booking };
    })
    .sort((a, b) => a.pc.pcNumber.localeCompare(b.pc.pcNumber, undefined, { numeric: true }));

  return {
    views,
    isLoading: stations.isLoading || sessions.isLoading,
    isFetching: stations.isFetching || sessions.isFetching,
    error: stations.error ?? sessions.error,
    refetch: () => Promise.all([stations.refetch(), sessions.refetch()]),
  };
}

/** Minutes until a time (negative once it has passed). */
export const minutesUntil = (iso: string, now = Date.now()) => Math.round((new Date(iso).getTime() - now) / 60_000);
