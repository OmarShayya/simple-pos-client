import { useQuery } from "@tanstack/react-query";
import { staffApi } from "@/api/staff.api";
import { queryKeys } from "@/api/queryKeys";

/** `needsSetup` is true only while no account exists yet (first run). */
export const useSetupStatus = () =>
  useQuery({ queryKey: [...queryKeys.staff.all, "setup-status"], queryFn: staffApi.setupStatus, retry: 1 });
