import React from "react";
import { Box, Button, ButtonBase, Skeleton, Stack, Typography } from "@mui/material";
import { CheckCircleOutlineRounded } from "@mui/icons-material";
import { CodeText, EmptyState, ErrorState, FormDialog, MoneyText } from "@/components/ui";
import { formatRelative, plural } from "@/utils/format";
import { customerLabel, orderKind } from "@/components/orders/orderMeta";
import { OrderKindLabel, RunningChip } from "@/components/orders/OrderBadges";
import { useOpenOrders } from "@/components/orders/useOrderData";

export interface OpenOrderPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (orderId: string) => void;
  /** The order already in the cart (marked). */
  currentId?: string | null;
}

/** Choose an unpaid order (a gaming session's order, a saved tab, a website order) to add items to it. */
const OpenOrderPicker: React.FC<OpenOrderPickerProps> = ({ open, onClose, onPick, currentId }) => {
  const orders = useOpenOrders({ refetchInterval: open ? 30_000 : false });
  const rows = orders.data ?? [];

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Add to an open order"
      subtitle="Pick the order to add drinks or food to. Gaming sessions keep running."
      actions={
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
      }
    >
      {orders.error && !rows.length ? (
        <ErrorState compact error={orders.error} onRetry={() => orders.refetch()} />
      ) : orders.isLoading ? (
        <Stack spacing={1}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={72} />
          ))}
        </Stack>
      ) : rows.length === 0 ? (
        <EmptyState compact icon={<CheckCircleOutlineRounded />} title="No open orders" description="Orders waiting for payment show up here." />
      ) : (
        <Stack component="ul" spacing={1} sx={{ listStyle: "none", m: 0, p: 0 }}>
          {rows.map((o) => (
            <li key={o.id}>
              <ButtonBase
                onClick={() => onPick(o.id)}
                disabled={o.id === currentId}
                sx={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: 1.5,
                  border: 1,
                  borderColor: o.id === currentId ? "primary.main" : "divider",
                  borderRadius: "12px",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography sx={{ fontWeight: 600 }}>{customerLabel(o)}</Typography>
                    {o.hasActiveSessions && <RunningChip />}
                  </Box>
                  <Typography variant="body2" color="text.secondary" component="div" sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <OrderKindLabel kind={orderKind(o)} /> · <CodeText>{o.invoiceNumber.slice(-4)}</CodeText> · {formatRelative(o.createdAt)} · {plural(o.itemCount, "item")}
                  </Typography>
                </Box>
                <MoneyText value={o.totals.usd} sx={{ fontWeight: 700, flexShrink: 0 }} />
              </ButtonBase>
            </li>
          ))}
        </Stack>
      )}
    </FormDialog>
  );
};

export default OpenOrderPicker;
