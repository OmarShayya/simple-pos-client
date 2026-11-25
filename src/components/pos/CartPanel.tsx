import React from "react";
import { Box, Button, CircularProgress, Divider, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { ComputerOutlined, DeleteSweepOutlined, PaymentsOutlined, SaveOutlined, ShoppingCartOutlined, SportsEsportsOutlined } from "@mui/icons-material";
import { CodeText, EmptyState, MoneyText, QuantityStepper, SelectField } from "@/components/ui";
import { formatDuration, formatTime } from "@/utils/format";
import CustomerPicker from "@/components/orders/CustomerPicker";
import { RunningChip } from "@/components/orders/OrderBadges";
import { OrderTotals } from "@/components/orders/OrderLines";
import { liveGamingLine, type LiveTotals } from "@/components/orders/orderMath";
import type { Discount } from "@/types/discount.types";
import type { Money } from "@/types/sale.types";
import type { CartState, DiscountLookup } from "./usePosCart";
import type { CustomerChoice } from "@/components/orders/customerChoice";

export interface CartPanelProps {
  state: CartState;
  discounts: DiscountLookup;
  totals: LiveTotals & { gamingFinal: Record<string, Money> };
  now: number;
  busy: "charge" | "save" | null;
  /** Why the cart can't be saved yet (e.g. a new customer without phone). */
  blocker: string | null;
  onCustomer: (c: CustomerChoice | null) => void;
  onQty: (productId: string, qty: number) => void;
  onLineDiscount: (productId: string, discountId: string) => void;
  onGamingDiscount: (sessionId: string, discountId: string) => void;
  onSaleDiscount: (discountId: string) => void;
  onCharge: () => void;
  onSave: () => void;
  onClear: () => void;
}

const discountOptions = (list: Discount[]) => list.map((d) => ({ value: d.id, label: `${d.name} (${d.value}% off)` }));

/** The cart: customer, station time on a loaded order, products with quantities, discounts, totals, Charge. */
const CartPanel: React.FC<CartPanelProps> = ({
  state,
  discounts,
  totals,
  now,
  busy,
  blocker,
  onCustomer,
  onQty,
  onLineDiscount,
  onGamingDiscount,
  onSaleDiscount,
  onCharge,
  onSave,
  onClear,
}) => {
  const itemCount = state.lines.reduce((n, l) => n + l.quantity, 0) + state.gaming.length;
  const empty = itemCount === 0;
  const running = state.gaming.some((g) => g.isActive);

  return (
    <Box
      component="section"
      aria-label="Cart"
      sx={{ border: 1, borderColor: "divider", borderRadius: "12px", bgcolor: "background.paper", display: "flex", flexDirection: "column", minWidth: 0 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, pt: 1.5, pb: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" component="h3">
            {state.orderId ? (
              <>
                Order <CodeText>{state.invoiceNumber?.slice(-4)}</CodeText>
              </>
            ) : (
              "Cart"
            )}
            {itemCount > 0 && (
              <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
                {" "}
                · {itemCount} {itemCount === 1 ? "item" : "items"}
              </Box>
            )}
          </Typography>
        </Box>
        {(!empty || state.orderId) && (
          <Tooltip title={state.orderId ? "Close this order (it stays open)" : "Clear cart"}>
            <IconButton aria-label={state.orderId ? "Close this order" : "Clear cart"} onClick={onClear}>
              <DeleteSweepOutlined />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Box sx={{ px: 2, pb: 1.5 }}>
        <CustomerPicker value={state.customer} onChange={onCustomer} size="small" />
        {!state.customer && state.orderCustomerName && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Name on this order: {state.orderCustomerName}
          </Typography>
        )}
      </Box>
      <Divider />

      {empty ? (
        <EmptyState compact icon={<ShoppingCartOutlined />} title="Cart is empty" description="Tap a product to add it, or open an order to add to it." />
      ) : (
        <Box sx={{ px: 2, overflowY: { md: "auto" }, maxHeight: { md: "calc(100dvh - 560px)" }, minHeight: { md: 96 }, scrollbarGutter: "stable" }}>
          {state.gaming.map((g) => {
            const live = liveGamingLine(g, now);
            const sessionId = g.gamingSession ?? "";
            const ps = g.station?.type === "playstation";
            return (
              <Box key={sessionId} sx={{ py: 1.5, borderBottom: 1, borderColor: "divider" }}>
                <Box sx={{ display: "flex", gap: 1.25, alignItems: "flex-start" }}>
                  <Box sx={{ color: ps ? "series.playstation" : "series.pc", display: "flex", pt: 0.25 }}>{ps ? <SportsEsportsOutlined /> : <ComputerOutlined />}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Typography sx={{ fontWeight: 600 }}>{g.station ? `${g.station.pcNumber} · ${g.station.name}` : g.productName}</Typography>
                      {g.isActive && <RunningChip />}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {g.sessionData?.startTime ? `From ${formatTime(g.sessionData.startTime)} · ` : ""}
                      {formatDuration(live.minutes)}
                    </Typography>
                  </Box>
                  <MoneyText value={totals.gamingFinal[sessionId]?.usd ?? live.final.usd} sx={{ fontWeight: 600 }} />
                </Box>
                {discounts.gaming.length > 0 && sessionId && (
                  <SelectField
                    label="Gaming discount"
                    size="small"
                    value={state.gamingDiscounts[sessionId] ?? ""}
                    onChange={(v) => onGamingDiscount(sessionId, v)}
                    emptyOption="No discount"
                    options={discountOptions(discounts.gaming)}
                    sx={{ mt: 1.25 }}
                  />
                )}
              </Box>
            );
          })}
          {state.lines.map((l) => {
            const productDiscounts = discounts.product(l.productId);
            const pct = productDiscounts.find((d) => d.id === l.discountId)?.value ?? 0;
            const sub = l.unitPrice.usd * l.quantity;
            return (
              <Box key={l.productId} sx={{ py: 1.25, borderBottom: 1, borderColor: "divider" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 500 }} noWrap>
                      {l.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <MoneyText value={l.unitPrice.usd} /> each
                    </Typography>
                  </Box>
                  <QuantityStepper value={l.quantity} min={0} max={l.max ?? 999} onChange={(q) => onQty(l.productId, q)} label={`Quantity of ${l.name}`} />
                  <Box sx={{ minWidth: 64, textAlign: "right" }}>
                    {pct > 0 && <MoneyText value={sub} strike tone="muted" variant="body2" sx={{ display: "block" }} />}
                    <MoneyText value={sub * (1 - pct / 100)} sx={{ fontWeight: 600 }} />
                  </Box>
                </Box>
                {productDiscounts.length > 0 && (
                  <SelectField
                    label="Item discount"
                    size="small"
                    value={l.discountId}
                    onChange={(v) => onLineDiscount(l.productId, v)}
                    emptyOption="No discount"
                    options={discountOptions(productDiscounts)}
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>
            );
          })}
        </Box>
      )}

      <Box sx={{ p: 2, pt: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {discounts.sale.length > 0 && !empty && (
          <SelectField label="Order discount" size="small" value={state.saleDiscountId} onChange={onSaleDiscount} emptyOption="No order discount" options={discountOptions(discounts.sale)} />
        )}
        <OrderTotals totals={totals} running={running} />
        {blocker && (
          <Typography variant="body2" color="error">
            {blocker}
          </Typography>
        )}
        <Stack spacing={1}>
          <Button
            variant="contained"
            size="large"
            startIcon={busy === "charge" ? <CircularProgress size={18} color="inherit" /> : <PaymentsOutlined />}
            onClick={onCharge}
            disabled={empty || Boolean(busy) || Boolean(blocker)}
            fullWidth
          >
            Charge <MoneyText value={totals.total.usd} sx={{ ml: 0.75 }} />
          </Button>
          <Button
            variant="outlined"
            startIcon={busy === "save" ? <CircularProgress size={18} color="inherit" /> : <SaveOutlined />}
            onClick={onSave}
            disabled={empty || Boolean(busy) || Boolean(blocker)}
            fullWidth
          >
            {state.orderId ? "Save changes" : "Save as open order"}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default CartPanel;
