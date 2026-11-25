import React from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Divider, Drawer, IconButton, Link, Skeleton, Stack, Tooltip, Typography } from "@mui/material";
import {
  AddShoppingCartRounded,
  CloseRounded,
  DeleteOutlineRounded,
  PaymentsOutlined,
  PrintOutlined,
  StopCircleOutlined,
} from "@mui/icons-material";
import { CodeText, ErrorState, StatusChip } from "@/components/ui";
import { useConfirm } from "@/hooks/useConfirm";
import { useNow } from "@/hooks/useNow";
import { formatDateTime, formatLbp, formatUsd } from "@/utils/format";
import { formatPhone, phoneHref } from "@/utils/phone";
import type { GamingLine, Order } from "@/types/sale.types";
import { liveOrderTotals } from "./orderMath";
import { customerLabel, orderKind, paymentMethodLabel, posOrderUrl } from "./orderMeta";
import { OrderKindLabel } from "./OrderBadges";
import { OrderLines, OrderTotals } from "./OrderLines";
import { useCancelOrder, useCanCancel, useEndSession, useOrder } from "./useOrderData";

export interface OrderDrawerProps {
  orderId: string | null;
  onClose: () => void;
  onTakePayment: (orderId: string) => void;
  onPrint: (orderId: string) => void;
}

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="overline" component="h3" color="text.secondary" sx={{ display: "block", mb: 0.75, lineHeight: 1.5 }}>
    {children}
  </Typography>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.25 }}>
    <Typography color="text.secondary">{label}</Typography>
    <Typography component="div" sx={{ textAlign: "right", minWidth: 0 }}>
      {children}
    </Typography>
  </Box>
);

const PaymentInfo: React.FC<{ order: Order }> = ({ order }) => {
  const currency = order.paymentCurrency ?? "USD";
  const received = currency === "LBP" ? order.amountPaid?.lbp : order.amountPaid?.usd;
  const change = typeof received === "number" ? received - (currency === "LBP" ? order.totals.lbp : order.totals.usd) : 0;
  return (
    <Box>
      <Field label="Paid with">
        {paymentMethodLabel(order.paymentMethod)} · {currency}
      </Field>
      <Field label="Received">{currency === "LBP" ? formatLbp(received) : formatUsd(received)}</Field>
      {change > 0.004 && <Field label="Change given">{currency === "LBP" ? formatLbp(change) : formatUsd(change)}</Field>}
      <Field label="Paid at">{formatDateTime(order.paidAt)}</Field>
      <Field label="Payment taken by">{order.paidBy?.name ?? "—"}</Field>
    </Box>
  );
};

const DetailSkeleton = () => (
  <Stack spacing={1.5}>
    <Skeleton width="50%" />
    <Skeleton width="35%" />
    <Divider />
    {[0, 1, 2].map((i) => (
      <Box key={i} sx={{ display: "flex", justifyContent: "space-between" }}>
        <Skeleton width="55%" />
        <Skeleton width={60} />
      </Box>
    ))}
    <Divider />
    <Skeleton width={120} height={40} sx={{ alignSelf: "flex-end" }} />
  </Stack>
);

/**
 * Everything about one order in a side panel: customer, lines (live station time), totals,
 * payment, and the next steps — Take payment, Add items, End session, Print, Cancel.
 */
const OrderDrawer: React.FC<OrderDrawerProps> = ({ orderId, onClose, onTakePayment, onPrint }) => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const canCancel = useCanCancel();
  const query = useOrder(orderId);
  const order = query.data;
  const running = (order?.items ?? []).filter((l): l is GamingLine => l.kind === "gaming" && l.isActive);
  const now = useNow(1000, running.length > 0);
  const endSession = useEndSession();
  const cancel = useCancelOrder(onClose);
  const pending = order?.status === "pending";

  const stopSessions = async () => {
    const names = running.map((l) => l.station?.pcNumber ?? "station").join(", ");
    const ok = await confirm({
      title: `End the session on ${names}?`,
      message: "The time stops now and the final amount stays on this order. You can take payment right after.",
      confirmLabel: "End session",
    });
    if (!ok) return;
    for (const l of running) if (l.gamingSession) await endSession.mutateAsync({ sessionId: l.gamingSession }).catch(() => undefined);
  };

  const cancelOrder = async () => {
    if (!order) return;
    const ok = await confirm({
      title: `Cancel order ${order.invoiceNumber}?`,
      message: running.length
        ? "The running session is stopped and nothing is charged. Products go back to stock. This can't be undone."
        : "Nothing is charged and products go back to stock. This can't be undone.",
      confirmLabel: "Cancel order",
      cancelLabel: "Keep order",
      tone: "danger",
    });
    if (ok) cancel.mutate(order.id);
  };

  return (
    <Drawer
      anchor="right"
      open={Boolean(orderId)}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 480 }, display: "flex", flexDirection: "column" }, "aria-label": "Order details" } }}
    >
      {/* Header renders immediately; only values wait for data */}
      <Box sx={{ px: 2.5, pt: 2, pb: 1.5, display: "flex", alignItems: "flex-start", gap: 1, borderBottom: 1, borderColor: "divider" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" component="h2" sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            Order {order ? <CodeText>{order.invoiceNumber}</CodeText> : <Skeleton width={130} sx={{ display: "inline-block" }} />}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mt: 0.75, flexWrap: "wrap" }}>
            {order ? (
              <>
                <StatusChip status={order.status} kind="order" />
                <OrderKindLabel kind={orderKind(order)} />
                <Typography variant="body2" color="text.secondary">
                  {formatDateTime(order.createdAt)}
                </Typography>
              </>
            ) : (
              <Skeleton width={200} />
            )}
          </Box>
        </Box>
        <Tooltip title="Close">
          <IconButton onClick={onClose} aria-label="Close order details">
            <CloseRounded />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 2, scrollbarGutter: "stable" }}>
        {query.error ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : !order ? (
          <DetailSkeleton />
        ) : (
          <Stack spacing={2.5} divider={<Divider flexItem />}>
            <Box>
              <Label>Customer</Label>
              <Typography sx={{ fontWeight: 600, fontSize: "1.0625rem" }}>{customerLabel(order)}</Typography>
              {order.customer?.phone && (
                <Link href={phoneHref(order.customer.phone) ?? undefined} underline="hover" color="text.secondary">
                  {formatPhone(order.customer.phone)}
                </Link>
              )}
              {order.notes && (
                <Alert severity={order.source === "website" ? "info" : "warning"} sx={{ mt: 1.5 }}>
                  {order.notes}
                </Alert>
              )}
            </Box>

            <Box>
              <Label>Items</Label>
              {order.items.length ? <OrderLines items={order.items} now={now} /> : <Typography color="text.secondary">No items.</Typography>}
            </Box>

            <OrderTotals
              totals={liveOrderTotals(order, now)}
              running={running.length > 0}
              orderDiscountLabel={order.saleDiscount ? `${order.saleDiscount.discountName} (−${order.saleDiscount.percentage}%)` : undefined}
            />

            {order.status === "paid" ? (
              <Box>
                <Label>Payment</Label>
                <PaymentInfo order={order} />
              </Box>
            ) : null}

            <Box>
              <Label>Details</Label>
              <Field label="Taken by">{order.cashier?.name ?? (order.source === "website" ? "Website" : "—")}</Field>
              <Field label="Items">{order.itemCount}</Field>
              <Field label="Last change">{formatDateTime(order.updatedAt)}</Field>
            </Box>
          </Stack>
        )}
      </Box>

      {/* Next steps, always at the bottom */}
      {order && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: "divider", display: "flex", flexDirection: "column", gap: 1 }}>
          {pending && (
            <Button variant="contained" size="large" startIcon={<PaymentsOutlined />} onClick={() => onTakePayment(order.id)} fullWidth>
              Take payment
            </Button>
          )}
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 1 }}>
            {pending && (
              <Button variant="outlined" startIcon={<AddShoppingCartRounded />} onClick={() => navigate(posOrderUrl(order.id))}>
                Add items
              </Button>
            )}
            {pending && running.length > 0 && (
              <Button variant="outlined" startIcon={<StopCircleOutlined />} onClick={stopSessions} disabled={endSession.isPending}>
                End session
              </Button>
            )}
            {order.status !== "cancelled" && (
              <Button variant={pending ? "outlined" : "contained"} startIcon={<PrintOutlined />} onClick={() => onPrint(order.id)}>
                {pending ? "Print bill" : "Print receipt"}
              </Button>
            )}
          </Box>
          {pending && canCancel && (
            <Button color="error" startIcon={<DeleteOutlineRounded />} onClick={cancelOrder} disabled={cancel.isPending} sx={{ alignSelf: "flex-start" }}>
              Cancel order
            </Button>
          )}
        </Box>
      )}
    </Drawer>
  );
};

export default OrderDrawer;
