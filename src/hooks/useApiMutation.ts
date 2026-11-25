import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "react-toastify";
import { friendlyError } from "@/utils/apiError";
import { expandInvalidations, type Invalidation } from "@/api/queryKeys";

export interface ApiMutationOptions<TData, TVariables, TContext = unknown>
  extends Omit<UseMutationOptions<TData, unknown, TVariables, TContext>, "mutationFn"> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  /**
   * What this write changes. Domains (`"orders"`) or exact keys, usually one of the `affects.*`
   * presets from `@/api/queryKeys`. All matching queries refetch after success (and after an error,
   * in case the server applied part of it).
   */
  invalidates?: readonly Invalidation[];
  /** Toast on success. A string, a function of the result, or `false` for none (default: none). */
  successMessage?: string | ((data: TData, variables: TVariables) => string) | false;
  /**
   * Toast on error. Default: the server's message (e.g. "Please enter a valid phone number").
   * A string is used as a prefix: "Couldn't save the product: <server message>". `false` = no toast.
   */
  errorMessage?: string | false;
}

/**
 * `useMutation` with the app's conventions built in: human success/error toasts and cache
 * invalidation of every affected screen.
 *
 *   const pay = useApiMutation({
 *     mutationFn: (v: PayInput) => salesApi.pay(v.id, v.data),
 *     invalidates: affects.order,
 *     successMessage: "Payment saved",
 *   });
 */
export function useApiMutation<TData = unknown, TVariables = void, TContext = unknown>(
  options: ApiMutationOptions<TData, TVariables, TContext>
): UseMutationResult<TData, unknown, TVariables, TContext> {
  const queryClient = useQueryClient();
  const { invalidates = [], successMessage = false, errorMessage, onSuccess, onError, onSettled, ...rest } = options;

  const invalidate = () =>
    Promise.all(expandInvalidations(invalidates).map((queryKey) => queryClient.invalidateQueries({ queryKey })));

  return useMutation<TData, unknown, TVariables, TContext>({
    ...rest,
    onSuccess: async (data, variables, context, mutation) => {
      if (successMessage) {
        toast.success(typeof successMessage === "function" ? successMessage(data, variables) : successMessage);
      }
      // Don't block the caller's onSuccess (e.g. closing a dialog) on the refetches
      void invalidate();
      await onSuccess?.(data, variables, context, mutation);
    },
    onError: async (error, variables, context, mutation) => {
      if (errorMessage !== false) {
        const reason = friendlyError(error);
        toast.error(errorMessage ? `${errorMessage}: ${reason}` : reason);
      }
      if (invalidates.length) void invalidate();
      await onError?.(error, variables, context, mutation);
    },
    onSettled,
  });
}

export default useApiMutation;
