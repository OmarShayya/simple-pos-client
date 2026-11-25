import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reservationsApi, type ReservationFilters } from "@/api/reservations.api";
import { queryKeys } from "@/api/queryKeys";
import type { StationType } from "@/types/reservation.types";

/** Booking rules + opening hours (rarely change). */
export const useReservationSettings = () =>
  useQuery({ queryKey: queryKeys.reservations.settings(), queryFn: reservationsApi.getSettings, staleTime: 5 * 60_000 });

export const useReservationList = (filters: ReservationFilters, options: { refetchInterval?: number } = {}) =>
  useQuery({
    queryKey: queryKeys.reservations.list({ ...filters }),
    queryFn: () => reservationsApi.list(filters),
    placeholderData: keepPreviousData,
    refetchInterval: options.refetchInterval,
  });

export const useAvailability = (params: { type: StationType; date: string; durationMinutes: number }, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.reservations.availability({ ...params }),
    queryFn: () => reservationsApi.availability(params),
    enabled,
    refetchInterval: enabled ? 30_000 : false,
    placeholderData: keepPreviousData,
  });
