import React from "react";
import { Box, Button, Chip, Skeleton, Typography, alpha, useTheme } from "@mui/material";
import {
  ComputerOutlined,
  EventAvailableOutlined,
  PlayArrowRounded,
  ReceiptLongOutlined,
  SportsEsportsOutlined,
  StopCircleOutlined,
} from "@mui/icons-material";
import { CodeText, MoneyText, StatusChip } from "@/components/ui";
import { formatDuration, formatTime, formatUsd, plural } from "@/utils/format";
import { billableMinutes, liveOrderTotals } from "@/components/orders/orderMath";
import { minutesUntil, type StationView } from "./useStationBoard";

export interface StationCardProps {
  view: StationView;
  now: number;
  onStart: (view: StationView) => void;
  onEnd: (view: StationView) => void;
  onOpenOrder: (orderId: string) => void;
  onOpenBooking: (reservationId: string) => void;
}

const STATE_STATUS: Record<StationView["state"], string> = {
  available: "available",
  occupied: "occupied",
  maintenance: "maintenance",
  unavailable: "reserved",
};

/** One station: free (Start session), in use (live time + its order's running total), or out of service. */
const StationCard: React.FC<StationCardProps> = ({ view, now, onStart, onEnd, onOpenOrder, onOpenBooking }) => {
  const theme = useTheme();
  const { pc, state, session, order, booking } = view;
  const ps = pc.type === "playstation";
  const accent = ps ? theme.palette.series.playstation : theme.palette.series.pc;
  const bookingIn = booking ? minutesUntil(booking.startTime, now) : null;
  const productCount = order?.items.filter((l) => l.kind === "product").reduce((n, l) => n + l.quantity, 0) ?? 0;

  return (
    <Box
      component="li"
      aria-label={`${pc.pcNumber}, ${pc.name}, ${state === "occupied" ? "in use" : state}`}
      sx={{
        border: 1,
        borderColor: state === "occupied" ? alpha(theme.palette.error.main, 0.35) : "divider",
        borderRadius: "12px",
        bgcolor: "background.paper",
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        minWidth: 0,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "8px",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            color: accent,
            bgcolor: alpha(accent, theme.palette.mode === "dark" ? 0.16 : 0.1),
          }}
        >
          {ps ? <SportsEsportsOutlined /> : <ComputerOutlined />}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "1.0625rem", lineHeight: 1.25 }} noWrap>
            {pc.pcNumber}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap title={[pc.name, pc.location].filter(Boolean).join(" · ")}>
            {pc.name}
            {pc.location ? ` · ${pc.location}` : ""}
          </Typography>
        </Box>
        <StatusChip status={STATE_STATUS[state]} kind="station" />
      </Box>

      {booking && bookingIn !== null && (
        <Chip
          clickable
          onClick={() => onOpenBooking(booking.id)}
          icon={<EventAvailableOutlined />}
          color={bookingIn <= 60 ? "warning" : "default"}
          variant="outlined"
          label={bookingIn <= 0 ? `Booked now · ${booking.customerName} — check in` : `Booked ${formatTime(booking.startTime)} · ${booking.customerName}`}
          sx={{ alignSelf: "flex-start", maxWidth: "100%", fontWeight: 500 }}
        />
      )}

      {state === "occupied" && session ? (
        <>
          <Box sx={{ borderRadius: "8px", bgcolor: "action.hover", p: 1.5 }}>
            <Typography sx={{ fontWeight: 600 }} noWrap>
              {session.customer?.name || session.customerName || "Walk-in"}
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 1, mt: 1 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Time
                </Typography>
                <Typography sx={{ fontSize: "1.375rem", fontWeight: 700, lineHeight: 1.2 }}>{formatDuration(billableMinutes(session.startTime, now))}</Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="body2" color="text.secondary" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                  <Box component="span" aria-hidden sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "primary.main", animation: "pos-pulse 1.6s ease-in-out infinite" }} />
                  Order total
                </Typography>
                {order ? (
                  <MoneyText value={liveOrderTotals(order, now).total.usd} sx={{ fontSize: "1.375rem", fontWeight: 700, lineHeight: 1.2, display: "block" }} />
                ) : (
                  <Skeleton width={72} height={30} sx={{ ml: "auto" }} />
                )}
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }} noWrap>
              {order ? (
                <>
                  Order <CodeText>{order.invoiceNumber.slice(-4)}</CodeText>
                  {productCount ? ` · ${plural(productCount, "item")}` : ""} · {formatUsd(pc.hourlyRate.usd)}/h
                </>
              ) : (
                `${formatUsd(pc.hourlyRate.usd)}/h`
              )}
            </Typography>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: "auto" }}>
            <Button variant="outlined" startIcon={<ReceiptLongOutlined />} disabled={!session.orderId} onClick={() => session.orderId && onOpenOrder(session.orderId)}>
              Open order
            </Button>
            <Button variant="outlined" color="error" startIcon={<StopCircleOutlined />} onClick={() => onEnd(view)}>
              End session
            </Button>
          </Box>
        </>
      ) : (
        <>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Typography color="text.secondary">Rate</Typography>
            <Typography sx={{ fontWeight: 600 }}>
              {formatUsd(pc.hourlyRate.usd)}
              <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
                {" "}
                / hour
              </Box>
            </Typography>
          </Box>
          <Box sx={{ mt: "auto" }}>
            {state === "available" ? (
              <Button fullWidth variant="outlined" size="large" startIcon={<PlayArrowRounded sx={{ color: "primary.main" }} />} onClick={() => onStart(view)}>
                Start session
              </Button>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ minHeight: 52, display: "flex", alignItems: "center" }}>
                {state === "maintenance" ? "Under maintenance — can't be used right now." : "Not available right now."}
              </Typography>
            )}
          </Box>
        </>
      )}
    </Box>
  );
};

export default StationCard;
