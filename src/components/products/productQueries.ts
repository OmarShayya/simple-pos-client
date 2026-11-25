import { useQuery } from "@tanstack/react-query";
import { productsApi } from "@/api/products.api";
import { categoriesApi } from "@/api/categories.api";
import { affects, queryKeys } from "@/api/queryKeys";
import { useApiMutation } from "@/hooks/useApiMutation";
import type { CreateProductRequest, Product, UpdateProductRequest } from "@/types/product.types";
import type { Category, CreateCategoryRequest, UpdateCategoryRequest } from "@/types/category.types";

/** The lounge's whole catalogue (a few hundred items at most) — searched and filtered on the device. */
const ALL_PRODUCTS = { limit: 500 } as const;

export const useAllProducts = () =>
  useQuery({
    queryKey: queryKeys.products.list({ ...ALL_PRODUCTS }),
    queryFn: () => productsApi.getAll({ ...ALL_PRODUCTS }).then((r) => r.data),
  });

export const useCategories = (includeInactive = false) =>
  useQuery({
    queryKey: queryKeys.categories.list({ includeInactive }),
    queryFn: () => categoriesApi.getAll(includeInactive),
  });

export const useProductMutations = () => {
  const create = useApiMutation({
    mutationFn: (data: CreateProductRequest) => productsApi.create(data),
    invalidates: affects.product,
    successMessage: (p: Product) => `${p.name} added`,
  });
  const update = useApiMutation({
    mutationFn: (v: { id: string; data: UpdateProductRequest }) => productsApi.update(v.id, v.data),
    invalidates: affects.product,
    successMessage: (p: Product) => `${p.name} saved`,
  });
  const remove = useApiMutation({
    mutationFn: (p: Product) => productsApi.delete(p.id),
    invalidates: affects.product,
    successMessage: (_: void, p: Product) => `${p.name} deleted`,
  });
  return { create, update, remove };
};

export const useCategoryMutations = () => {
  const create = useApiMutation({
    mutationFn: (data: CreateCategoryRequest) => categoriesApi.create(data),
    invalidates: affects.category,
    successMessage: (c: Category) => `${c.name} added`,
  });
  const update = useApiMutation({
    mutationFn: (v: { id: string; data: UpdateCategoryRequest }) => categoriesApi.update(v.id, v.data),
    invalidates: affects.category,
    successMessage: (c: Category) => `${c.name} saved`,
  });
  const remove = useApiMutation({
    mutationFn: (c: Category) => categoriesApi.delete(c.id),
    invalidates: affects.category,
    successMessage: (_: void, c: Category) => `${c.name} deleted`,
  });
  return { create, update, remove };
};
