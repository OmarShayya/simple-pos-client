import React from "react";
import { fonts } from "@/theme/tokens";
import { formatDateTime, formatDuration, formatLbp, formatTime, formatUsd } from "@/utils/format";
import { formatPhone } from "@/utils/phone";
import type { GamingLine, Order, ProductLine } from "@/types/sale.types";
import { liveGamingLine, liveOrderTotals } from "./orderMath";
import { customerLabel, paymentMethodLabel } from "./orderMeta";

export type ReceiptFormat = "thermal" | "a4";

export interface OrderReceiptProps {
  order: Order;
  format?: ReceiptFormat;
  /** Price running sessions at this time (defaults to now). */
  now?: number;
}

/*
 * Paper is always black on white, whatever the app theme — these are print colours, not UI colours.
 * Sizes are in pt/mm so the 80 mm thermal roll and an A4 page both come out right.
 */
const INK = "#111";
const MUTED = "#555";
const RULE = `1px dashed #888`;

const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: "4mm", alignItems: "baseline" };
const num: React.CSSProperties = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", textAlign: "right" };
const muted: React.CSSProperties = { color: MUTED };
const section: React.CSSProperties = { borderTop: RULE, paddingTop: "2.5mm", marginTop: "2.5mm" };
const heading: React.CSSProperties = { fontSize: "0.8em", letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED, margin: "0 0 1mm" };

const GamingRow: React.FC<{ line: GamingLine; now?: number }> = ({ line, now }) => {
  const live = liveGamingLine(line, now);
  const start = line.sessionData?.startTime;
  const end = line.sessionData?.endTime;
  const station = line.station ? `${line.station.pcNumber} · ${line.station.name}` : line.productName;
  return (
    <div style={{ marginBottom: "1.5mm" }}>
      <div style={row}>
        <span style={{ fontWeight: 600 }}>{station}</span>
        <span style={num}>{formatUsd(live.subtotal.usd)}</span>
      </div>
      <div style={{ ...row, ...muted }}>
        <span>
          {start ? `${formatTime(start)} – ${line.isActive ? "now" : formatTime(end)}` : "Station time"} · {formatDuration(live.minutes)}
          {line.isActive ? " (running)" : ""}
        </span>
        {line.sessionData?.hourlyRate && <span style={num}>{formatUsd(line.sessionData.hourlyRate.usd)}/h</span>}
      </div>
      {line.discount && line.discount.percentage > 0 && (
        <div style={{ ...row, ...muted }}>
          <span>{line.discount.discountName} ({line.discount.percentage}%)</span>
          <span style={num}>−{formatUsd(live.discount.usd)}</span>
        </div>
      )}
    </div>
  );
};

const ProductRow: React.FC<{ line: ProductLine }> = ({ line }) => (
  <div style={{ marginBottom: "1.5mm" }}>
    <div style={row}>
      <span style={{ fontWeight: 600 }}>{line.productName}</span>
      <span style={num}>{formatUsd(line.subtotal.usd)}</span>
    </div>
    <div style={{ ...row, ...muted }}>
      <span style={num}>
        {line.quantity} × {formatUsd(line.unitPrice.usd)}
      </span>
    </div>
    {line.discount && line.discount.percentage > 0 && (
      <div style={{ ...row, ...muted }}>
        <span>{line.discount.discountName} ({line.discount.percentage}%)</span>
        <span style={num}>−{formatUsd(line.discount.amount.usd)}</span>
      </div>
    )}
  </div>
);

/**
 * The printable receipt (paid) / bill (unpaid) of an order: station time first, then products,
 * discounts, totals in USD + LBP and the payment. Plain markup + inline styles so it prints the same
 * from any screen (see `printReceipt`).
 */
const OrderReceipt: React.FC<OrderReceiptProps> = ({ order, format = "thermal", now }) => {
  const gaming = order.items.filter((l): l is GamingLine => l.kind === "gaming");
  const products = order.items.filter((l): l is ProductLine => l.kind === "product");
  const totals = liveOrderTotals(order, now);
  const discounts = totals.lineDiscounts.usd + totals.orderDiscount.usd;
  const paid = order.status === "paid";
  const title = paid ? "Receipt" : order.status === "cancelled" ? "Cancelled order" : "Bill — not paid yet";
  const paidCurrency = order.paymentCurrency ?? "USD";
  const received = paidCurrency === "LBP" ? order.amountPaid?.lbp : order.amountPaid?.usd;
  const change = paid && typeof received === "number" ? received - (paidCurrency === "LBP" ? order.totals.lbp : order.totals.usd) : 0;
  const phone = order.customer?.phone ? formatPhone(order.customer.phone) : null;

  return (
    <div
      className="order-receipt"
      style={{
        fontFamily: fonts.sans,
        color: INK,
        background: "#fff",
        fontSize: format === "thermal" ? "9.5pt" : "11pt",
        lineHeight: 1.35,
        width: format === "thermal" ? "72mm" : "100%",
        maxWidth: format === "thermal" ? "72mm" : "170mm",
        margin: "0 auto",
        padding: format === "thermal" ? "2mm 0" : "0",
        boxSizing: "border-box",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "2mm" }}>
        <div style={{ fontSize: "1.45em", fontWeight: 700, letterSpacing: "0.04em" }}>EPIC LOUNGE</div>
        <div style={muted}>Gaming lounge &amp; café</div>
      </div>

      <div style={section}>
        <div style={row}>
          <span style={{ fontWeight: 600 }}>{title}</span>
          <span style={{ fontFamily: fonts.mono, ...num }}>{order.invoiceNumber}</span>
        </div>
        <div style={muted}>{formatDateTime(order.createdAt)}</div>
        <div>
          Customer: {customerLabel(order)}
          {phone ? ` · ${phone}` : ""}
        </div>
        {order.cashier && <div style={muted}>Served by {order.cashier.name}</div>}
        {order.source === "website" && <div style={muted}>Ordered on the website</div>}
      </div>

      {gaming.length > 0 && (
        <div style={section}>
          <p style={heading}>Gaming</p>
          {gaming.map((l, i) => (
            <GamingRow key={l.gamingSession ?? i} line={l} now={now} />
          ))}
        </div>
      )}

      {products.length > 0 && (
        <div style={section}>
          <p style={heading}>Food &amp; drinks</p>
          {products.map((l, i) => (
            <ProductRow key={`${l.productId}-${i}`} line={l} />
          ))}
        </div>
      )}

      <div style={section}>
        {discounts > 0 && (
          <>
            <div style={row}>
              <span>Subtotal</span>
              <span style={num}>{formatUsd(totals.subtotal.usd)}</span>
            </div>
            {order.saleDiscount && order.saleDiscount.percentage > 0 && (
              <div style={{ ...row, ...muted }}>
                <span>
                  {order.saleDiscount.discountName} ({order.saleDiscount.percentage}%)
                </span>
                <span style={num}>−{formatUsd(totals.orderDiscount.usd)}</span>
              </div>
            )}
            <div style={row}>
              <span>You saved</span>
              <span style={num}>−{formatUsd(discounts)}</span>
            </div>
          </>
        )}
        <div style={{ ...row, fontSize: "1.3em", fontWeight: 700, marginTop: "1mm" }}>
          <span>{paid ? "Total" : "Amount due"}</span>
          <span style={num}>{formatUsd(totals.total.usd)}</span>
        </div>
        <div style={{ ...row, ...muted }}>
          <span />
          <span style={num}>{formatLbp(totals.total.lbp)}</span>
        </div>
      </div>

      {paid && (
        <div style={section}>
          <div style={row}>
            <span>
              Paid · {paymentMethodLabel(order.paymentMethod)} ({paidCurrency})
            </span>
            <span style={num}>{paidCurrency === "LBP" ? formatLbp(received) : formatUsd(received)}</span>
          </div>
          {change > 0.004 && (
            <div style={row}>
              <span>Change</span>
              <span style={num}>{paidCurrency === "LBP" ? formatLbp(change) : formatUsd(change)}</span>
            </div>
          )}
          <div style={muted}>
            {formatDateTime(order.paidAt)}
            {order.paidBy ? ` · ${order.paidBy.name}` : ""}
          </div>
        </div>
      )}

      {order.notes && (
        <div style={section}>
          <div style={muted}>Note: {order.notes}</div>
        </div>
      )}

      <div style={{ ...section, textAlign: "center", ...muted }}>Thank you — see you again soon!</div>
    </div>
  );
};

export default OrderReceipt;
