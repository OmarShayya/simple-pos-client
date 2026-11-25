import { useQuery } from "@tanstack/react-query";
import { exchangeRateApi } from "@/api/exchangeRate.api";
import { affects, queryKeys } from "@/api/queryKeys";
import { useApiMutation } from "@/hooks/useApiMutation";

/** LBP for 1 USD (used to convert prices). */
export const useCurrentRate = () => useQuery({ queryKey: queryKeys.exchangeRate.current(), queryFn: exchangeRateApi.getCurrentRate });

export const useRateHistory = (enabled = true) =>
  useQuery({ queryKey: queryKeys.exchangeRate.history(), queryFn: () => exchangeRateApi.getHistory(100), enabled });

export const useUpdateRate = () =>
  useApiMutation({
    mutationFn: (v: { rate: number; notes?: string }) => exchangeRateApi.updateRate(v.rate, v.notes),
    invalidates: affects.exchangeRate,
    successMessage: "Exchange rate updated",
  });
