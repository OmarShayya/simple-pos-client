import { AxiosError } from "axios";
import type { PhoneValue } from "@/components/ui";
import { customersApi } from "@/api/customers.api";
import { affects } from "@/api/queryKeys";
import { useApiMutation } from "@/hooks/useApiMutation";
import type { OrderCustomer } from "@/types/sale.types";

export interface PickedCustomer {
  id: string;
  name: string;
  phone?: string;
}

/** Either an existing customer, or a new one typed in (created by whoever submits the form). */
export type CustomerChoice =
  | { mode: "existing"; customer: PickedCustomer }
  | { mode: "new"; name: string; phone: PhoneValue | null };

/** Why the choice can't be saved yet (null = fine). */
export const customerChoiceError = (choice: CustomerChoice | null, nameOnlyOk = false): string | null => {
  if (!choice || choice.mode === "existing") return null;
  const hasPhone = Boolean(choice.phone?.national);
  if (hasPhone && !choice.phone?.isValid) return "Check the phone number";
  if (!nameOnlyOk && !hasPhone) return "Add a phone number to save the customer";
  if (!nameOnlyOk && !choice.name.trim()) return "Add the customer's name";
  return null;
};

/** Existing customer of an order → picker value. */
export const choiceFromOrder = (customer: OrderCustomer | null | undefined): CustomerChoice | null =>
  customer ? { mode: "existing", customer: { id: customer.id, name: customer.name, phone: customer.phone } } : null;

/** Creates the customer (or, if that phone already belongs to a customer, uses that one). */
const createOrFind = async (choice: Extract<CustomerChoice, { mode: "new" }>): Promise<string> => {
  const phone = choice.phone!.e164;
  try {
    return (await customersApi.create({ name: choice.name.trim(), phone })).id;
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 409) return (await customersApi.getByPhone(phone)).id;
    throw error;
  }
};

/**
 * Turns a picker value into a customer id for a counter sale: existing → its id; new with a phone →
 * created (or matched by phone). A name without a phone can't be stored on a counter sale → none.
 */
export function useResolveCustomer() {
  const create = useApiMutation({
    mutationFn: createOrFind,
    invalidates: affects.customer,
    errorMessage: "Couldn't save the customer",
  });
  return async (choice: CustomerChoice | null): Promise<string | undefined> => {
    if (!choice) return undefined;
    if (choice.mode === "existing") return choice.customer.id;
    if (!choice.phone?.e164) return undefined;
    return create.mutateAsync(choice);
  };
}
