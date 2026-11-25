import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { discountsApi } from "@/api/discounts.api";
import { queryKeys } from "@/api/queryKeys";
import type { Discount } from "@/types/discount.types";
import type { DiscountLookup } from "./usePosCart";

const active = (...rest: string[]) => [...queryKeys.discounts.all, "active", ...rest] as const;
const NONE: Discount[] = [];

/** Active discounts the cart can offer: per product in the cart, gaming time, and whole order. */
export function useDiscountLookup(productIds: string[], hasGaming: boolean): DiscountLookup {
  const sale = useQuery({ queryKey: active("sale"), queryFn: discountsApi.getActiveForSale, staleTime: 5 * 60_000 });
  const gaming = useQuery({ queryKey: active("gaming_session"), queryFn: discountsApi.getActiveForGamingSession, staleTime: 5 * 60_000, enabled: hasGaming });
  const ids = useMemo(() => [...new Set(productIds)].sort(), [productIds]);
  const perProduct = useQueries({
    queries: ids.map((id) => ({
      queryKey: active("product", id),
      queryFn: () => discountsApi.getActiveForProduct(id),
      staleTime: 5 * 60_000,
    })),
  });
  const byProduct = new Map<string, Discount[]>();
  perProduct.forEach((q, i) => byProduct.set(ids[i], q.data ?? NONE));

  return {
    product: (id) => byProduct.get(id) ?? NONE,
    gaming: gaming.data ?? NONE,
    sale: sale.data ?? NONE,
  };
}
