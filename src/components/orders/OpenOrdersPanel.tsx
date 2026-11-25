import React, { useState } from "react";
import { Box, Button, ButtonBase, Skeleton, Typography, useMediaQuery, useTheme } from "@mui/material";
import { CheckCircleOutlineRounded, PaymentsOutlined } from "@mui/icons-material";
import { CodeText, EmptyState, ErrorState, MoneyText, SectionCard, StatusChip } from "@/components/ui";
import { formatRelative, plural } from "@/utils/format";
import { useNow } from "@/hooks/useNow";
import type { OrderRow } from "@/types/sale.types";
import { customerLabel, NEW_WEBSITE_ORDER_MS, orderKind } from "./orderMeta";
import { OrderKindLabel, RunningChip } from "./OrderBadges";
import { useOpenOrders } from "./useOrderData";

export interface OpenOrdersPanelProps {
  onOpen: (orderId: string) => void;
  onTakePayment: (orderId: string) => void;
}

const cardSx = {
  border: 1,
  borderColor: "divider",
  borderRadius: "12px",
  bgcolor: "background.paper",
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
} as const;

const OpenOrderCard: React.FC<{ order: OrderRow; now: number } & OpenOrdersPanelProps> = ({ order, now, onOpen, onTakePayment }) => {
  const isNewWebsite = order.source === "website" && now - new Date(order.createdAt).getTime() < NEW_WEBSITE_ORDER_MS;
  return (
    <Box component="li" sx={{ ...cardSx, borderColor: order.source === "website" ? "info.main" : "divider" }}>
      <ButtonBase
        onClick={() => onOpen(order.id)}
        aria-label={`Open order ${order.invoiceNumber} for ${customerLabel(order)}`}
        sx={{ display: "block", textAlign: "left", p: 2, pb: 1.25, borderRadius: "12px 12px 0 0", "&:hover": { bgcolor: "action.hover" } }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 24, flexWrap: "wrap" }}>
          <OrderKindLabel kind={orderKind(order)} />
          {isNewWebsite && <StatusChip status="new" tone="info" label="New" dot={false} />}
          {order.hasActiveSessions && <RunningChip />}
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, mt: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600, fontSize: "1.0625rem" }} noWrap>
              {customerLabel(order)}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              <CodeText>{order.invoiceNumber.slice(-4)}</CodeText> · {formatRelative(order.createdAt, new Date(Math.max(now, Date.parse(order.createdAt))))}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right", flexShrink: 0 }}>
            <MoneyText value={order.totals.usd} sx={{ fontWeight: 700, fontSize: "1.125rem", display: "block" }} />
            <MoneyText value={order.totals.lbp} currency="LBP" tone="muted" variant="body2" sx={{ display: "block" }} />
          </Box>
        </Box>
      </ButtonBase>
      <Box sx={{ px: 2, pb: 2, pt: 0.5, mt: "auto" }}>
        <Button variant="outlined" fullWidth startIcon={<PaymentsOutlined />} onClick={() => onTakePayment(order.id)}>
          Take payment
        </Button>
      </Box>
    </Box>
  );
};

const GRID = { display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", listStyle: "none", m: 0, p: 0 } as const;

/**
 * "Open now": every unpaid order of any day (website orders, running sessions, saved tabs) as big
 * cards with a Take payment button. This is what counter staff check first, so it sits above
 * the full orders history.
 */
const OpenOrdersPanel: React.FC<OpenOrdersPanelProps> = ({ onOpen, onTakePayment }) => {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const [expanded, setExpanded] = useState(false);
  const open = useOpenOrders();
  const now = useNow(30_000);
  const rows = open.data ?? [];
  const website = rows.filter((o) => o.source === "website").length;
  const limit = phone ? 3 : 8;
  const shown = expanded ? rows : rows.slice(0, limit);

  const subtitle = open.isLoading
    ? "Loading…"
    : open.error && !rows.length
      ? "Couldn't load the open orders"
      : rows.length
      ? `${plural(rows.length, "unpaid order")}${website ? ` · ${website} from the website` : ""}`
      : "Nothing waiting for payment";

  return (
    <SectionCard
      variant="plain"
      title="Open now"
      subtitle={subtitle}
      action={
        rows.length > limit ? (
          <Button variant="text" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Show fewer" : `Show all ${rows.length}`}
          </Button>
        ) : undefined
      }
    >
      {open.error && !rows.length ? (
        <ErrorState compact error={open.error} onRetry={() => open.refetch()} />
      ) : open.isLoading ? (
        <Box component="ul" sx={GRID} aria-busy>
          {Array.from({ length: phone ? 2 : 4 }).map((_, i) => (
            <Box component="li" key={i} sx={{ ...cardSx, p: 2, gap: 0.75 }}>
              <Skeleton width="40%" />
              <Skeleton width="70%" height={28} />
              <Skeleton width="55%" />
              <Skeleton variant="rounded" height={40} sx={{ mt: 1 }} />
            </Box>
          ))}
        </Box>
      ) : rows.length === 0 ? (
        <Box sx={{ ...cardSx }}>
          <EmptyState
            compact
            icon={<CheckCircleOutlineRounded />}
            title="All paid up"
            description="Unpaid orders — website orders, running sessions and saved tabs — show up here."
          />
        </Box>
      ) : (
        <Box component="ul" sx={GRID} aria-label="Unpaid orders">
          {shown.map((o) => (
            <OpenOrderCard key={o.id} order={o} now={now} onOpen={onOpen} onTakePayment={onTakePayment} />
          ))}
        </Box>
      )}
    </SectionCard>
  );
};

export default OpenOrdersPanel;
