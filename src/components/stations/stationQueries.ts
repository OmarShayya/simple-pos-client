import { useQuery } from "@tanstack/react-query";
import { gamingApi, type UpdateStationPayload } from "@/api/gaming.api";
import { affects, queryKeys } from "@/api/queryKeys";
import { useApiMutation } from "@/hooks/useApiMutation";
import type { PC } from "@/types/gaming.types";

const ALL_STATIONS = { limit: 200 } as const;

/** Every station (PCs + PlayStation rooms) — shared by the reservations and station screens. */
export const useAllStations = (options: { refetchInterval?: number } = {}) =>
  useQuery({
    queryKey: queryKeys.stations.list({ ...ALL_STATIONS }),
    queryFn: () => gamingApi.getAllPCs({ ...ALL_STATIONS }),
    refetchInterval: options.refetchInterval,
  });

export type CreateStationPayload = Parameters<typeof gamingApi.createPC>[0];

export const useStationMutations = () => {
  const create = useApiMutation({
    mutationFn: (data: CreateStationPayload) => gamingApi.createPC(data),
    invalidates: affects.station,
    successMessage: (s: PC) => `${s.pcNumber} added`,
  });
  const update = useApiMutation({
    mutationFn: (v: { id: string; data: UpdateStationPayload }) => gamingApi.updatePC(v.id, v.data),
    invalidates: affects.station,
    successMessage: (s: PC) => `${s.pcNumber} saved`,
  });
  const remove = useApiMutation({
    mutationFn: (s: PC) => gamingApi.deletePC(s.id),
    invalidates: affects.station,
    successMessage: (_: void, s: PC) => `${s.pcNumber} deleted`,
  });
  return { create, update, remove };
};
