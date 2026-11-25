import { useContext } from "react";
import { ConfirmContext, type ConfirmFn } from "@/components/ui/confirmContext";

/**
 * Ask a yes/no question from an event handler:
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: "Cancel this order?", message: "…", confirmLabel: "Cancel order", tone: "danger" })) cancel.mutate(id);
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider> (mounted in main.tsx)");
  return ctx;
}

export default useConfirm;
