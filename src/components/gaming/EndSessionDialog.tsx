import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Button, CircularProgress, Divider, Stack, Typography } from "@mui/material";
import { FormDialog, MoneyText, SelectField } from "@/components/ui";
import { discountsApi } from "@/api/discounts.api";
import { gamingApi } from "@/api/gaming.api";
import { affects, queryKeys } from "@/api/queryKeys";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useConfirm } from "@/hooks/useConfirm";
import { useNow } from "@/hooks/useNow";
import { formatDuration, formatTime } from "@/utils/format";
import { billableMinutes, costForMinutes, liveOrderTotals, percentOf } from "@/components/orders/orderMath";
import { useCanCancel, useEndSession } from "@/components/orders/useOrderData";
import type { StationView } from "./useStationBoard";

export interface EndSessionDialogProps {
  view: StationView | null;
  onClose: () => void;
  /** "End and charge": the session ended, now take payment on its order. */
  onCharge: (orderId: string) => void;
}

const Row: React.FC<{ label: React.ReactNode; children: React.ReactNode; strong?: boolean }> = ({ label, children, strong }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2 }}>
    <Typography color={strong ? "text.primary" : "text.secondary"} sx={{ fontWeight: strong ? 600 : 400 }}>
      {label}
    </Typography>
    <Box sx={{ fontWeight: strong ? 700 : 500, fontSize: strong ? "1.25rem" : undefined }}>{children}</Box>
  </Box>
);

/**
 * Stop the clock. Two clear ways out: "End and charge" (payment dialog on the order) or
 * "End — pay later" (the order stays open to add drinks / pay at the end of the night).
 */
const EndSessionDialog: React.FC<EndSessionDialogProps> = ({ view, onClose, onCharge }) => {
  const confirm = useConfirm();
  const canCancel = useCanCancel();
  const [discountId, setDiscountId] = useState("");
  const [pending, setPending] = useState<"charge" | "later" | null>(null);
  useEffect(() => setDiscountId(""), [view?.session?.id]);
  const now = useNow(1000, Boolean(view));

  const discounts = useQuery({
    queryKey: [...queryKeys.discounts.all, "active", "gaming_session"],
    queryFn: discountsApi.getActiveForGamingSession,
    enabled: Boolean(view),
    staleTime: 5 * 60_000,
  });
  const end = useEndSession();
  const cancel = useApiMutation({
    mutationFn: (id: string) => gamingApi.cancelSession(id),
    invalidates: affects.session,
    successMessage: "Session cancelled — nothing was charged for it",
    onSuccess: onClose,
  });

  const session = view?.session;
  const order = view?.order;
  const minutes = session ? billableMinutes(session.startTime, now) : 0;
  const cost = session ? costForMinutes(session.hourlyRate, minutes) : null;
  const discount = discounts.data?.find((d) => d.id === discountId);
  const discounted = cost && discount ? percentOf(cost, discount.value).usd : 0;
  const otherItems = order ? liveOrderTotals(order, now).total.usd - (cost?.usd ?? 0) : 0;

  const finish = (mode: "charge" | "later") => {
    if (!session) return;
    setPending(mode);
    end.mutate(
      { sessionId: session.id, discountId: discountId || undefined },
      {
        onSuccess: (ended) => {
          onClose();
          if (mode === "charge" && ended.orderId) onCharge(ended.orderId);
        },
        onSettled: () => setPending(null),
      }
    );
  };

  const cancelSession = async () => {
    if (!session) return;
    const ok = await confirm({
      title: `Cancel the session on ${view?.pc.pcNumber}?`,
      message: "Use this only if it was started by mistake. The time is removed from the order and nothing is charged for it.",
      confirmLabel: "Cancel session",
      cancelLabel: "Keep it",
      tone: "danger",
    });
    if (ok) cancel.mutate(session.id);
  };

  const busy = end.isPending || cancel.isPending;

  return (
    <FormDialog
      open={Boolean(view)}
      onClose={onClose}
      loading={busy}
      title={view ? `End session on ${view.pc.pcNumber}` : "End session"}
      subtitle={session ? `${session.customer?.name || session.customerName || "Walk-in"} · started ${formatTime(session.startTime)}` : undefined}
      actions={
        <Box sx={{ display: "flex", gap: 1, width: "100%", flexWrap: "wrap" }}>
          {canCancel && (
            <Button color="error" onClick={cancelSession} disabled={busy} sx={{ mr: "auto" }}>
              Cancel session
            </Button>
          )}
          <Button variant="outlined" onClick={() => finish("later")} disabled={busy} startIcon={pending === "later" ? <CircularProgress size={18} color="inherit" /> : undefined} sx={{ ml: canCancel ? 0 : "auto" }}>
            End — pay later
          </Button>
          <Button variant="contained" onClick={() => finish("charge")} disabled={busy} startIcon={pending === "charge" ? <CircularProgress size={18} color="inherit" /> : undefined}>
            End and charge
          </Button>
        </Box>
      }
    >
      <Stack spacing={1.25}>
        <Row label="Time played">{formatDuration(minutes)}</Row>
        <Row label="Station time">
          <MoneyText value={cost?.usd} />
        </Row>
        {discount && (
          <Row label={`${discount.name} (−${discount.value}%)`}>
            <MoneyText value={-discounted} sx={{ color: "success.main" }} />
          </Row>
        )}
        {otherItems > 0.004 && (
          <Row label="Drinks & other items">
            <MoneyText value={otherItems} />
          </Row>
        )}
        <Divider />
        <Row label="Order total" strong>
          <MoneyText value={(order ? liveOrderTotals(order, now).total.usd : cost?.usd ?? 0) - discounted} />
        </Row>
        {(discounts.data?.length ?? 0) > 0 && (
          <Box sx={{ pt: 1.5 }}>
            <SelectField
              label="Gaming discount"
              value={discountId}
              onChange={setDiscountId}
              emptyOption="No discount"
              options={(discounts.data ?? []).map((d) => ({ value: d.id, label: `${d.name} (${d.value}% off)` }))}
            />
          </Box>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>
          “Pay later” keeps the order open — you'll find it under Orders → Open now.
        </Typography>
      </Stack>
    </FormDialog>
  );
};

export default EndSessionDialog;
