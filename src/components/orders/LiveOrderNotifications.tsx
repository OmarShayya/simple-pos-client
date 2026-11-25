import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import { Box, Button, Typography } from "@mui/material";
import apiClient from "@/api/client";
import { expandInvalidations, type QueryDomain } from "@/api/queryKeys";
import { useAuthStore } from "@/store/authStore";
import { formatUsd, plural } from "@/utils/format";
import type { NewOrderEvent } from "@/types/sale.types";
import { orderUrl } from "./orderMeta";

/** What a new website order changes: the lists, badges, dashboard, the linked customer and reserved stock. */
const AFFECTED: QueryDomain[] = ["orders", "counts", "dashboard", "customers", "products"];

/** Socket server = the API's origin ("https://api.example.com/api/v1" → "https://api.example.com"). */
const socketOrigin = () => {
  try {
    return new URL(apiClient.defaults.baseURL ?? "", window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
};

/** A short two-note chime so a busy counter hears it. Silently skipped if the browser blocks audio. */
const chime = () => {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [880, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + i * 0.16;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
    window.setTimeout(() => void ctx.close(), 1000);
  } catch {
    /* no sound — the toast is still there */
  }
};

const NewOrderToast: React.FC<{ order: NewOrderEvent; onView: () => void }> = ({ order, onView }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
    <Typography sx={{ fontWeight: 600, lineHeight: 1.35 }}>
      New website order #{order.invoiceNumber.slice(-4)} from {order.customerName || "a customer"} — {formatUsd(order.totals?.usd)}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {plural(order.itemCount ?? 0, "item")} · waiting to be prepared
    </Typography>
    <Box>
      <Button variant="contained" size="small" onClick={onView}>
        View order
      </Button>
    </Box>
  </Box>
);

/**
 * Live connection to the POS API (mounted once in App). While someone is signed in it joins the
 * staff room with the current token; a website order (`order:new`) refreshes orders, badges and the
 * dashboard and shows a toast that stays until someone looks at it. Reconnects on its own; after a
 * reconnect it refreshes the same data in case an order arrived while offline.
 */
const LiveOrderNotifications: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  // useNavigate() changes on every route change; keep the socket alive across navigation
  const navigateFn = useNavigate();
  const navigate = useRef(navigateFn);
  useEffect(() => {
    navigate.current = navigateFn;
  }, [navigateFn]);

  useEffect(() => {
    if (!token) return;
    const refresh = () => {
      for (const queryKey of expandInvalidations(AFFECTED)) void queryClient.invalidateQueries({ queryKey });
    };

    const socket = io(socketOrigin(), {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30_000,
    });

    let connectedBefore = false;
    socket.on("connect", () => {
      if (connectedBefore) refresh();
      connectedBefore = true;
    });

    socket.on("order:new", (order: NewOrderEvent) => {
      refresh();
      chime();
      const toastId = `order-new-${order.id}`;
      toast.info(
        <NewOrderToast
          order={order}
          onView={() => {
            toast.dismiss(toastId);
            navigate.current(orderUrl(order.id));
          }}
        />,
        { toastId, autoClose: false, closeOnClick: false, draggable: false }
      );
    });

    // connect_error (server down, expired token…) is retried by socket.io; nothing to show
    socket.on("connect_error", () => undefined);

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [token, queryClient]);

  return null;
};

export default LiveOrderNotifications;
