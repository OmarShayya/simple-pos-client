import React from "react";
import { Box, Typography } from "@mui/material";
import { ComputerOutlined, SportsEsportsOutlined } from "@mui/icons-material";
import { MoneyText } from "@/components/ui";
import { formatDuration, formatTime, formatUsd } from "@/utils/format";
import type { GamingLine, Money, OrderLine, ProductLine } from "@/types/sale.types";
import { liveGamingLine, type LiveTotals } from "./orderMath";
import { RunningChip } from "./OrderBadges";

const Amount: React.FC<{ final: number; before?: number }> = ({ final, before }) => (
  <Box sx={{ textAlign: "right", flexShrink: 0 }}>
    {before !== undefined && before !== final && (
      <MoneyText value={before} strike tone="muted" variant="body2" sx={{ display: "block" }} />
    )}
    <MoneyText value={final} sx={{ fontWeight: 600 }} />
  </Box>
);

const GamingRow: React.FC<{ line: GamingLine; now: number }> = ({ line, now }) => {
  const live = liveGamingLine(line, now);
  const start = line.sessionData?.startTime;
  const end = line.sessionData?.endTime;
  const ps = line.station?.type === "playstation";
  return (
    <Box sx={{ display: "flex", gap: 1.5, py: 1.5 }}>
      <Box sx={{ color: ps ? "series.playstation" : "series.pc", display: "flex", pt: 0.25, "& svg": { fontSize: 22 } }}>
        {ps ? <SportsEsportsOutlined /> : <ComputerOutlined />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 600 }}>{line.station ? `${line.station.pcNumber} · ${line.station.name}` : line.productName}</Typography>
          {line.isActive && <RunningChip />}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {start ? `${formatTime(start)} – ${line.isActive ? "now" : formatTime(end)}` : "Station time"} · {formatDuration(live.minutes)}
          {line.sessionData?.hourlyRate ? ` · ${formatRateText(line.sessionData.hourlyRate)}` : ""}
        </Typography>
        {line.discount && line.discount.percentage > 0 && (
          <Typography variant="body2" color="success.main">
            {line.discount.discountName} (−{line.discount.percentage}%)
          </Typography>
        )}
      </Box>
      <Amount final={live.final.usd} before={line.discount ? live.subtotal.usd : undefined} />
    </Box>
  );
};

const formatRateText = (rate: Money) => formatUsd(rate.usd) + "/h";

const ProductRow: React.FC<{ line: ProductLine }> = ({ line }) => (
  <Box sx={{ display: "flex", gap: 1.5, py: 1.25 }}>
    <Typography sx={{ minWidth: 28, color: "text.secondary", fontWeight: 600 }}>{line.quantity}×</Typography>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ fontWeight: 500 }}>{line.productName}</Typography>
      <Typography variant="body2" color="text.secondary">
        <MoneyText value={line.unitPrice.usd} /> each
        {line.discount && line.discount.percentage > 0 && (
          <Box component="span" sx={{ color: "success.main" }}>
            {" "}
            · {line.discount.discountName} (−{line.discount.percentage}%)
          </Box>
        )}
      </Typography>
    </Box>
    <Amount final={line.finalAmount.usd} before={line.discount ? line.subtotal.usd : undefined} />
  </Box>
);

/** The lines of an order: station time (with a live cost while running) then products. */
export const OrderLines: React.FC<{ items: OrderLine[]; now: number }> = ({ items, now }) => {
  const gaming = items.filter((l): l is GamingLine => l.kind === "gaming");
  const products = items.filter((l): l is ProductLine => l.kind === "product");
  return (
    <Box sx={{ "& > * + *": { borderTop: 1, borderColor: "divider" } }}>
      {gaming.map((l, i) => (
        <GamingRow key={l.gamingSession ?? `g${i}`} line={l} now={now} />
      ))}
      {products.map((l, i) => (
        <ProductRow key={`${l.productId}-${i}`} line={l} />
      ))}
    </Box>
  );
};

const TotalRow: React.FC<{ label: React.ReactNode; value: number; negative?: boolean; strong?: boolean }> = ({ label, value, negative, strong }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2 }}>
    <Typography color={negative ? "success.main" : strong ? "text.primary" : "text.secondary"} sx={{ fontWeight: strong ? 700 : 400 }}>
      {label}
    </Typography>
    <MoneyText
      value={negative ? -value : value}
      sx={{ fontWeight: strong ? 700 : 500, fontSize: strong ? "1.5rem" : undefined, color: negative ? "success.main" : undefined }}
    />
  </Box>
);

/** Subtotal, discounts and the total in USD + LBP. */
export const OrderTotals: React.FC<{ totals: LiveTotals; orderDiscountLabel?: string; running?: boolean }> = ({ totals, orderDiscountLabel, running }) => {
  const anyDiscount = totals.lineDiscounts.usd > 0 || totals.orderDiscount.usd > 0;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      {anyDiscount && (
        <>
          <TotalRow label="Subtotal" value={totals.subtotal.usd} />
          {totals.lineDiscounts.usd > 0 && <TotalRow label="Item discounts" value={totals.lineDiscounts.usd} negative />}
          {totals.orderDiscount.usd > 0 && <TotalRow label={orderDiscountLabel ?? "Order discount"} value={totals.orderDiscount.usd} negative />}
        </>
      )}
      <TotalRow label={running ? "Total so far" : "Total"} value={totals.total.usd} strong />
      <Box sx={{ textAlign: "right" }}>
        <MoneyText value={totals.total.lbp} currency="LBP" tone="muted" />
      </Box>
    </Box>
  );
};
