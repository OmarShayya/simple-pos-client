import { useQuery } from "@tanstack/react-query";
import { discountsApi } from "@/api/discounts.api";
import { affects, queryKeys } from "@/api/queryKeys";
import { useApiMutation } from "@/hooks/useApiMutation";
import type { CreateDiscountRequest, Discount, UpdateDiscountRequest } from "@/types/discount.types";

const ALL = { limit: 200 } as const;

/** Every discount (a short list) — filtered and searched on the device. */
export const useAllDiscounts = () =>
  useQuery({ queryKey: queryKeys.discounts.list({ ...ALL }), queryFn: () => discountsApi.getAll({ ...ALL }).then((r) => r.data) });

export const useDiscountMutations = () => {
  const create = useApiMutation({
    mutationFn: (data: CreateDiscountRequest) => discountsApi.create(data),
    invalidates: affects.discount,
    successMessage: (d: Discount) => `${d.name} created`,
  });
  const update = useApiMutation({
    mutationFn: (v: { id: string; data: UpdateDiscountRequest }) => discountsApi.update(v.id, v.data),
    invalidates: affects.discount,
    successMessage: (d: Discount) => `${d.name} saved`,
  });
  const remove = useApiMutation({
    mutationFn: (d: Discount) => discountsApi.delete(d.id),
    invalidates: affects.discount,
    successMessage: (_: void, d: Discount) => `${d.name} deleted`,
  });
  return { create, update, remove };
};
