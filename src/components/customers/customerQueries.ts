import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { customersApi } from "@/api/customers.api";
import { affects, queryKeys } from "@/api/queryKeys";
import { useApiMutation } from "@/hooks/useApiMutation";
import type { CreateCustomerRequest, Customer, CustomerFilters } from "@/types/customer.types";

/** Paged, filtered customer list (server side). */
export const useCustomerList = (filters: CustomerFilters) =>
  useQuery({
    queryKey: queryKeys.customers.list({ ...filters }),
    queryFn: () => customersApi.getAll(filters),
    placeholderData: keepPreviousData,
  });

export const useCustomer = (id: string | null | undefined) =>
  useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => customersApi.getById(id!),
    enabled: Boolean(id),
  });

export const useCustomerActivity = (id: string | null | undefined) =>
  useQuery({
    queryKey: queryKeys.customers.activity(id ?? ""),
    queryFn: () => customersApi.getActivity(id!),
    enabled: Boolean(id),
  });

/** Create / edit / deactivate — every customer screen (and orders, bookings, dashboard) refreshes. */
export const useCustomerMutations = () => {
  const create = useApiMutation({
    mutationFn: (data: CreateCustomerRequest) => customersApi.create(data),
    invalidates: affects.customer,
    successMessage: (c: Customer) => `${c.name} added`,
    errorMessage: false,
  });
  const update = useApiMutation({
    mutationFn: (v: { id: string; data: Partial<CreateCustomerRequest> }) => customersApi.update(v.id, v.data),
    invalidates: affects.customer,
    successMessage: "Customer saved",
    errorMessage: false,
  });
  const deactivate = useApiMutation({
    mutationFn: (c: Customer) => customersApi.delete(c.id),
    invalidates: affects.customer,
    successMessage: (_: void, c: Customer) => `${c.name} removed from the list`,
  });
  return { create, update, deactivate };
};
