import { useQuery } from "@tanstack/react-query";
import { staffApi, type StaffMember } from "@/api/staff.api";
import { affects, queryKeys } from "@/api/queryKeys";
import { useApiMutation } from "@/hooks/useApiMutation";
import type { UserRole } from "@/types/auth.types";

export const useStaffList = () => useQuery({ queryKey: queryKeys.staff.list(), queryFn: staffApi.list });

export const useStaffMutations = () => {
  const create = useApiMutation({
    mutationFn: (data: { name: string; email: string; password: string; role: UserRole }) => staffApi.create(data),
    invalidates: affects.staff,
    successMessage: (u: StaffMember) => `${u.name} can now sign in`,
  });
  const update = useApiMutation({
    mutationFn: async (v: { id: string; name?: string; role?: UserRole; isActive?: boolean }): Promise<void> => {
      const { id, ...data } = v;
      if (data.isActive === false) await staffApi.deactivate(id);
      else await staffApi.update(id, data);
    },
    invalidates: affects.staff,
    successMessage: (_: void, v) => (v.isActive === false ? "Account deactivated" : v.isActive ? "Account reactivated" : "Saved"),
  });
  return { create, update };
};
