import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, Skeleton, Stack, Typography } from "@mui/material";
import { AccountBalanceOutlined, CheckCircleRounded, CreditCardOutlined, PaymentsOutlined, PrintOutlined } from "@mui/icons-material";
import { FormDialog, MoneyField, MoneyText, SegmentedControl } from "@/components/ui";
import { formatDuration, formatLbp, formatMoney, formatUsd } from "@/utils/format";
import { useNow } from "@/hooks/useNow";
import { Currency, PaymentMethod, type GamingLine, type Money, type Order } from "@/types/sale.types";
import { changeDue, liveGamingLine, liveOrderTotals } from "./orderMath";
import { customerLabel } from "./orderMeta";
import { printReceipt } from "./printReceipt";
import { useEndSession, useExchangeRate, useOrder, usePayOrder } from "./useOrderData";

export interface PaymentDialogProps {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
  /** After a successful payment (e.g. the POS clears its cart). */
  onPaid?: (orderId: string) => void;
}

const METHOD_OPTIONS = [
  { value: PaymentMethod.CASH, label: "Cash", icon: <PaymentsOutlined /> },
  { value: PaymentMethod.CARD, label: "Card", icon: <CreditCardOutlined /> },
  { value: PaymentMethod.BANK_TRANSFER, label: "Transfer", icon: <AccountBalanceOutlined /> },
];

const CURRENCY_OPTIONS = [
  { value: Currency.USD, label: "Dollars ($)" },
  { value: Currency.LBP, label: "Lira (LBP)" },
];

/** Notes people usually hand over for this amount: "Exact" + the next round amounts above it. */
const quickAmounts = (due: number, currency: Currency): number[] => {
  const steps = currency === Currency.USD ? [1, 5, 10, 20, 50, 100] : [50_000, 100_000, 500_000, 1_000_000, 5_000_000];
  const out = new Set<number>();
  for (const step of steps) {
    const up = Math.ceil(due / step) * step;
    if (up > due + 1e-9) out.add(up);
  }
  return [...out].sort((a, b) => a - b).slice(0, 4);
};

const dueIn = (totals: Money, currency: Currency) => (currency === Currency.USD ? totals.usd : totals.lbp);

const AmountDue: React.FC<{ totals?: Money; label?: string }> = ({ totals, label = "Amount due" }) => (
  <Box sx={{ textAlign: "center", py: 1 }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    {totals ? (
      <>
        <Typography sx={{ fontSize: "2.25rem", fontWeight: 700, lineHeight: 1.15 }}>
          <MoneyText value={totals.usd} />
        </Typography>
        <Typography color="text.secondary">
          <MoneyText value={totals.lbp} currency="LBP" />
        </Typography>
      </>
    ) : (
      <>
        <Skeleton width={140} height={48} sx={{ mx: "auto" }} />
        <Skeleton width={110} sx={{ mx: "auto" }} />
      </>
    )}
  </Box>
);

/**
 * THE payment dialog (Orders, POS, stations): method, currency, amount received with change due,
 * then a "Paid" screen with Print receipt. If station time is still running on the order, staff stop
 * it first so the amount can't change while they count the money.
 */
const PaymentDialog: React.FC<PaymentDialogProps> = ({ orderId, open, onClose, onPaid }) => {
  const order = useOrder(open ? orderId : null);
  const rate = useExchangeRate();
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [currency, setCurrency] = useState<Currency>(Currency.USD);
  const [received, setReceived] = useState<number | null>(null);
  const [paid, setPaid] = useState<{ order: Order; change: Money | null; currency: Currency } | null>(null);
  const [stopping, setStopping] = useState(false);
  /** "Amount received" starts at the exact amount once per payment (clearing the field must stay possible). */
  const prefilled = useRef(false);
  const endSession = useEndSession();
  const pay = usePayOrder();

  const data = order.data;
  const running = useMemo(() => (data?.items ?? []).filter((l): l is GamingLine => l.kind === "gaming" && l.isActive), [data]);
  const now = useNow(1000, open && running.length > 0);
  const totals = data ? liveOrderTotals(data, now).total : undefined;
  const due = totals ? dueIn(totals, currency) : 0;

  // Fresh form each time the dialog opens
  useEffect(() => {
    if (!open) return;
    setMethod(PaymentMethod.CASH);
    setCurrency(Currency.USD);
    setReceived(null);
    setPaid(null);
    prefilled.current = false;
  }, [open, orderId]);

  // Default "received" = exact amount, once the order is loaded (and after the time was stopped)
  useEffect(() => {
    if (!open || !data || running.length > 0 || prefilled.current) return;
    prefilled.current = true;
    setReceived(dueIn(data.totals, currency));
  }, [open, data, running.length, currency]);

  const isCash = method === PaymentMethod.CASH;
  const amount = isCash ? received : due;
  const change = totals && amount !== null ? changeDue(amount, currency, totals, rate) : null;
  const short = Boolean(change?.short);

  const stopTime = async () => {
    setStopping(true);
    try {
      for (const line of running) {
        if (line.gamingSession) await endSession.mutateAsync({ sessionId: line.gamingSession });
      }
      await order.refetch();
      prefilled.current = false;
    } catch {
      /* the mutation already showed the reason */
    } finally {
      setStopping(false);
    }
  };

  const submit = () => {
    if (!data || amount === null || short) return;
    pay.mutate(
      { id: data.id, data: { paymentMethod: method, paymentCurrency: currency, amount } },
      {
        onSuccess: async () => {
          const fresh = await order.refetch();
          setPaid({ order: fresh.data ?? data, change: change && !change.short ? change : null, currency });
          onPaid?.(data.id);
        },
      }
    );
  };

  const subtitle = data ? `Order ${data.invoiceNumber} · ${customerLabel(data)}` : undefined;

  /* ------------------------------ paid */
  if (paid) {
    const giveBack = paid.change && (paid.change.usd > 0.004 || paid.change.lbp > 0);
    return (
      <FormDialog
        open={open}
        onClose={onClose}
        title="Payment saved"
        subtitle={subtitle}
        actions={
          <>
            <Button variant="outlined" onClick={onClose}>
              Done
            </Button>
            <Button variant="contained" startIcon={<PrintOutlined />} onClick={() => printReceipt(paid.order)} autoFocus>
              Print receipt
            </Button>
          </>
        }
      >
        <Stack alignItems="center" spacing={1.5} sx={{ py: 2, textAlign: "center" }}>
          <CheckCircleRounded color="success" sx={{ fontSize: 56 }} />
          <Typography variant="h5" component="p">
            Paid {formatUsd(paid.order.totals.usd)}
          </Typography>
          {giveBack ? (
            <Box>
              <Typography color="text.secondary">Give back</Typography>
              <Typography sx={{ fontSize: "2rem", fontWeight: 700 }}>
                {paid.currency === Currency.USD ? formatUsd(paid.change!.usd) : formatLbp(paid.change!.lbp)}
              </Typography>
              <Typography color="text.secondary">
                or {paid.currency === Currency.USD ? formatLbp(paid.change!.lbp) : formatUsd(paid.change!.usd)}
              </Typography>
            </Box>
          ) : (
            <Typography color="text.secondary">No change to give back.</Typography>
          )}
        </Stack>
      </FormDialog>
    );
  }

  /* ------------------------------ station time still running */
  if (running.length > 0) {
    return (
      <FormDialog
        open={open}
        onClose={onClose}
        title="Take payment"
        subtitle={subtitle}
        onSubmit={stopTime}
        submitLabel={running.length > 1 ? "Stop all and continue" : "Stop time and continue"}
        loading={stopping}
      >
        <AmountDue totals={totals} label="Amount so far" />
        <Alert severity="info" sx={{ mt: 1 }}>
          The time is still running on {running.map((l) => l.station?.pcNumber ?? "a station").join(", ")}. Stop it first so the total
          doesn't change while you take the money.
        </Alert>
        <Stack spacing={0.5} sx={{ mt: 2 }}>
          {running.map((l) => {
            const live = liveGamingLine(l, now);
            return (
              <Box key={l.gamingSession} sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography>{l.station ? `${l.station.pcNumber} · ${l.station.name}` : l.productName}</Typography>
                <Typography color="text.secondary">
                  {formatDuration(live.minutes)} · <MoneyText value={live.final.usd} />
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </FormDialog>
    );
  }

  /* ------------------------------ payment form */
  const quick = totals ? quickAmounts(due, currency) : [];
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Take payment"
      subtitle={subtitle}
      onSubmit={submit}
      submitLabel={totals ? `Charge ${formatMoney(due, currency)}` : "Charge"}
      submitDisabled={!data || amount === null || short || data.status !== "pending"}
      loading={pay.isPending}
    >
      <Stack spacing={2.5}>
        <AmountDue totals={totals} />
        {data && data.status !== "pending" && (
          <Alert severity="warning">This order is already {data.status === "paid" ? "paid" : "cancelled"}.</Alert>
        )}

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            How is the customer paying?
          </Typography>
          <SegmentedControl aria-label="Payment method" size="large" fullWidth value={method} onChange={setMethod} options={METHOD_OPTIONS} />
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Currency
          </Typography>
          <SegmentedControl
            aria-label="Currency"
            size="large"
            fullWidth
            value={currency}
            onChange={(c) => {
              setCurrency(c);
              setReceived(data ? dueIn(totals ?? data.totals, c) : null);
            }}
            options={CURRENCY_OPTIONS}
          />
        </Box>

        {isCash ? (
          <Box>
            <MoneyField
              label="Amount received"
              currency={currency}
              value={received}
              onChange={setReceived}
              error={short}
              helperText={short && change ? `Short by ${formatMoney(Math.abs(currency === Currency.USD ? change.usd : change.lbp), currency)}` : undefined}
            />
            <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1.25, flexWrap: "wrap" }}>
              <Button variant="outlined" onClick={() => setReceived(due)} disabled={!totals}>
                Exact
              </Button>
              {quick.map((v) => (
                <Button key={v} variant="outlined" onClick={() => setReceived(v)}>
                  {formatMoney(v, currency, { trimZeros: true })}
                </Button>
              ))}
            </Stack>
          </Box>
        ) : (
          <Typography color="text.secondary">
            {method === PaymentMethod.CARD ? "Charge the card" : "Confirm the transfer"} for exactly{" "}
            <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>
              {formatMoney(due, currency)}
            </Box>
            .
          </Typography>
        )}

        {isCash && change && !short && (
          <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "action.hover", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
            <Typography sx={{ fontWeight: 600 }}>Change to give back</Typography>
            <Box sx={{ textAlign: "right" }}>
              <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.2 }}>
                {currency === Currency.USD ? formatUsd(change.usd) : formatLbp(change.lbp)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                or {currency === Currency.USD ? formatLbp(change.lbp) : formatUsd(change.usd)}
              </Typography>
            </Box>
          </Box>
        )}
      </Stack>
    </FormDialog>
  );
};

export default PaymentDialog;
