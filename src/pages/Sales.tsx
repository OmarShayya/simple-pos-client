import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { Box, Button, Typography, useMediaQuery, useTheme } from "@mui/material";
import { AddRounded, ReceiptLongOutlined } from "@mui/icons-material";
import { MoneyText, PageHeader } from "@/components/ui";
import { productsApi } from "@/api/products.api";
import { salesApi } from "@/api/sales.api";
import { queryKeys } from "@/api/queryKeys";
import { useConfirm } from "@/hooks/useConfirm";
import { useNow } from "@/hooks/useNow";
import { friendlyError } from "@/utils/apiError";
import { formatLbp } from "@/utils/format";
import type { Order, UpdateSaleRequest } from "@/types/sale.types";
import ProductGrid from "@/components/pos/ProductGrid";
import CartPanel from "@/components/pos/CartPanel";
import OpenOrderPicker from "@/components/pos/OpenOrderPicker";
import { cartTotals, stockOf, usePosCart } from "@/components/pos/usePosCart";
import { useDiscountLookup } from "@/components/pos/useDiscountLookup";
import PaymentDialog from "@/components/orders/PaymentDialog";
import { customerChoiceError, useResolveCustomer } from "@/components/pickers/customerChoice";
import { useCreateOrder, useExchangeRate, useOpenOrders, useUpdateOrder } from "@/components/orders/useOrderData";

const PRODUCT_FILTERS = { limit: 1000 };
const productsQuery = {
  queryKey: queryKeys.products.list(PRODUCT_FILTERS),
  queryFn: () => productsApi.getAll(PRODUCT_FILTERS),
  staleTime: 60_000,
};

/**
 * The counter screen ("New sale"): tap products into the cart, pick or add a customer, apply
 * discounts, then Charge (the one payment dialog) or Save as an open order. Any open order —
 * including a running gaming session's — can be loaded to add drinks to it.
 */
const Sales: React.FC = () => {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("md"));
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [state, dispatch] = usePosCart();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [payFor, setPayFor] = useState<string | null>(null);
  const [busy, setBusy] = useState<"charge" | "save" | null>(null);
  const paidRef = useRef(false);
  const cartRef = useRef<HTMLDivElement>(null);

  const products = useQuery(productsQuery);
  const openOrders = useOpenOrders();
  const rate = useExchangeRate();
  const now = useNow(1000, state.gaming.some((g) => g.isActive));
  const discounts = useDiscountLookup(
    state.lines.map((l) => l.productId),
    state.gaming.length > 0
  );
  const totals = cartTotals(state, discounts, now);
  const create = useCreateOrder();
  const update = useUpdateOrder();
  const resolveCustomer = useResolveCustomer();

  const inCart = Object.fromEntries(state.lines.map((l) => [l.productId, l.quantity]));
  const itemCount = state.lines.reduce((n, l) => n + l.quantity, 0) + state.gaming.length;
  const blocker = customerChoiceError(state.customer, false);

  /** Put an open order into the cart (only unpaid orders can change). */
  const loadOrder = useCallback(
    async (id: string) => {
      try {
        const order: Order = await queryClient.fetchQuery({ queryKey: queryKeys.orders.detail(id), queryFn: () => salesApi.getById(id), staleTime: 0 });
        if (order.status !== "pending") {
          toast.error(order.status === "paid" ? "This order is already paid." : "This order was cancelled.");
          return;
        }
        const list = await queryClient.ensureQueryData(productsQuery);
        dispatch({ type: "load", order, stock: Object.fromEntries(list.data.map((p) => [p.id, stockOf(p)])) });
        setPickerOpen(false);
      } catch (error) {
        toast.error(friendlyError(error));
      }
    },
    [queryClient, dispatch]
  );

  // /sales?order=<id> (from Orders / stations) — legacy ?loadSale=<id> too
  useEffect(() => {
    const id = params.get("order") ?? params.get("loadSale");
    if (!id) return;
    setParams({}, { replace: true });
    void loadOrder(id);
  }, [params, setParams, loadOrder]);

  /** Create or update the order on the server; returns the saved order. */
  const persist = async (): Promise<Order> => {
    const customerId = await resolveCustomer(state.customer);
    const items = state.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, ...(l.discountId ? { discountId: l.discountId } : {}) }));
    if (state.orderId) {
      const data: UpdateSaleRequest = { items, saleDiscountId: state.saleDiscountId };
      if (state.customerChanged) data.customerId = customerId ?? "";
      const gaming = state.gaming.filter((g) => g.gamingSession);
      if (gaming.length) {
        data.sessionDiscounts = gaming.map((g) => {
          const discountId = state.gamingDiscounts[g.gamingSession!];
          return discountId ? { gamingSessionId: g.gamingSession!, discountId } : { gamingSessionId: g.gamingSession! };
        });
      }
      return update.mutateAsync({ id: state.orderId, data });
    }
    return create.mutateAsync({ items, ...(customerId ? { customerId } : {}), ...(state.saleDiscountId ? { saleDiscountId: state.saleDiscountId } : {}) });
  };

  const charge = async () => {
    setBusy("charge");
    try {
      const saved = await persist();
      // Keep the saved order in the cart, so closing the payment dialog doesn't lose anything
      await loadOrder(saved.id);
      paidRef.current = false;
      setPayFor(saved.id);
    } catch {
      /* useApiMutation already explained the error */
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setBusy("save");
    try {
      const saved = await persist();
      toast.success(state.orderId ? `Order ${saved.invoiceNumber.slice(-4)} updated` : `Saved — order ${saved.invoiceNumber.slice(-4)} is open (see Orders)`);
      dispatch({ type: "reset" });
    } catch {
      /* already shown */
    } finally {
      setBusy(null);
    }
  };

  const clear = async () => {
    if (!state.orderId && state.lines.length > 0) {
      const ok = await confirm({ title: "Clear the cart?", message: "The products you added will be removed.", confirmLabel: "Clear cart" });
      if (!ok) return;
    }
    dispatch({ type: "reset" });
  };

  const openCount = openOrders.data?.length ?? 0;

  return (
    <Box sx={{ pb: { xs: itemCount ? 11 : 0, md: 0 } }}>
      <PageHeader
        title={state.orderId ? `Add to order ${state.invoiceNumber?.slice(-4) ?? ""}` : "New sale"}
        subtitle={`1 USD = ${formatLbp(rate)}`}
        actions={
          <>
            {state.orderId && (
              <Button variant="outlined" startIcon={<AddRounded />} onClick={() => dispatch({ type: "reset" })}>
                New sale
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={() => setPickerOpen(true)}
              startIcon={<ReceiptLongOutlined />}
              endIcon={
                openCount > 0 ? (
                  <Box component="span" sx={{ px: 0.75, minWidth: 22, height: 22, borderRadius: "11px", bgcolor: "warning.main", color: "warning.contrastText", fontSize: "0.8125rem !important", fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    {openCount}
                  </Box>
                ) : undefined
              }
            >
              Open orders
            </Button>
          </>
        }
      />

      <Box sx={{ display: "grid", gap: 2, alignItems: "start", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 7fr) minmax(320px, 5fr)", lg: "minmax(0, 2fr) minmax(360px, 1fr)" } }}>
        <ProductGrid
          products={products.data?.data}
          loading={products.isLoading}
          error={products.error}
          onRetry={() => products.refetch()}
          inCart={inCart}
          onAdd={(p) => dispatch({ type: "add", product: p })}
        />
        <Box ref={cartRef} sx={{ position: { md: "sticky" }, top: { md: 88 }, scrollMarginTop: 80 }}>
          <CartPanel
            state={state}
            discounts={discounts}
            totals={totals}
            now={now}
            busy={busy}
            blocker={blocker}
            onCustomer={(customer) => dispatch({ type: "customer", customer })}
            onQty={(productId, quantity) => dispatch({ type: "qty", productId, quantity })}
            onLineDiscount={(productId, discountId) => dispatch({ type: "lineDiscount", productId, discountId })}
            onGamingDiscount={(sessionId, discountId) => dispatch({ type: "gamingDiscount", sessionId, discountId })}
            onSaleDiscount={(discountId) => dispatch({ type: "saleDiscount", discountId })}
            onCharge={charge}
            onSave={save}
            onClear={clear}
          />
        </Box>
      </Box>

      {/* Phones: the cart is below the products — keep the total and the way to it always visible */}
      {isPhone && itemCount > 0 && (
        <Box
          sx={{
            position: "fixed",
            left: 12,
            right: 12,
            bottom: "calc(12px + env(safe-area-inset-bottom))",
            zIndex: (t) => t.zIndex.appBar,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 1,
            pl: 2,
            borderRadius: "12px",
            border: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            boxShadow: (t) => t.tokens.shadowPopover,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </Typography>
            <MoneyText value={totals.total.usd} sx={{ fontWeight: 700, fontSize: "1.125rem" }} />
          </Box>
          <Button variant="contained" onClick={() => cartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            Review & charge
          </Button>
        </Box>
      )}

      <OpenOrderPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={(id) => void loadOrder(id)} currentId={state.orderId} />
      <PaymentDialog
        orderId={payFor}
        open={Boolean(payFor)}
        onPaid={() => {
          paidRef.current = true;
          dispatch({ type: "reset" });
        }}
        onClose={() => {
          if (!paidRef.current && payFor) toast.info("Not paid yet — the order stays open in the cart and under Orders.");
          setPayFor(null);
        }}
      />
    </Box>
  );
};

export default Sales;
