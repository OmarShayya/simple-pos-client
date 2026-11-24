import React from "react";
import { Box, Button, Card, Chip, IconButton, Stack, Tooltip, Typography, alpha, useTheme } from "@mui/material";
import {
  Computer,
  SportsEsports,
  Phone,
  WhatsApp,
  Login,
  EditOutlined,
  EventBusy,
  PersonOff,
  Language,
  Storefront,
} from "@mui/icons-material";
import StatusChip from "@/components/common/StatusChip";
import type { Reservation } from "@/types/reservation.types";
import { fmtDuration, fmtTime } from "@/utils/zonedTime";
import { CHECKIN_EARLY_MIN, getTiming } from "@/utils/reservationTiming";


interface Props {
  reservation: Reservation;
  tz: string;
  now: number;
  highlighted?: boolean;
  onCheckIn: (r: Reservation) => void;
  onEdit: (r: Reservation) => void;
  onCancel: (r: Reservation) => void;
  onNoShow: (r: Reservation) => void;
}

const ReservationCard: React.FC<Props> = ({ reservation: r, tz, now, highlighted, onCheckIn, onEdit, onCancel, onNoShow }) => {
  const theme = useTheme();
  const t = getTiming(r, now);
  const inactive = r.status === "cancelled" || r.status === "no_show";
  const accent =
    r.status === "checked_in"
      ? theme.palette.success.main
      : inactive
        ? theme.palette.text.disabled
        : t.isLate
          ? theme.palette.warning.main
          : r.type === "playstation"
            ? theme.palette.secondary.main
            : theme.palette.primary.main;
  const TypeIcon = r.type === "playstation" ? SportsEsports : Computer;
  const waDigits = r.customerPhone.replace(/\D/g, "");

  let timingNote: React.ReactNode = null;
  if (r.status === "confirmed") {
    if (t.isLate) timingNote = <Box component="span" sx={{ color: "warning.main" }}>Late by {Math.abs(t.minsToStart)} min</Box>;
    else if (t.soon) timingNote = <Box component="span" sx={{ color: "info.main" }}>Starts in {t.minsToStart} min</Box>;
  } else if (r.status === "checked_in" && r.checkedInAt) {
    timingNote = `Checked in at ${fmtTime(r.checkedInAt, tz)}`;
  } else if (r.status === "cancelled") {
    timingNote = `Cancelled by ${r.cancelledBy ?? "staff"}${r.cancelReason ? ` — ${r.cancelReason}` : ""}`;
  }

  return (
    <Card
      id={`reservation-${r.id}`}
      sx={{
        position: "relative",
        overflow: "hidden",
        opacity: inactive ? 0.62 : 1,
        borderColor: highlighted ? accent : undefined,
        boxShadow: highlighted ? `0 0 0 2px ${alpha(accent, 0.45)}` : undefined,
        transition: "box-shadow .3s ease, border-color .3s ease",
        "&::before": { content: '""', position: "absolute", left: 0, top: 0, bottom: 0, width: 4, bgcolor: accent },
      }}
    >
      <Box sx={{ p: { xs: 1.75, sm: 2 }, pl: { xs: 2.25, sm: 2.5 } }}>
        {/* Time + status */}
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>
              {fmtTime(r.startTime, tz)} – {fmtTime(r.endTime, tz)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {fmtDuration(r.durationMinutes)} · est. ${r.estimatedCost.usd.toFixed(2)}
              {timingNote ? <> · {timingNote}</> : null}
            </Typography>
          </Box>
          <StatusChip status={r.status} />
        </Stack>

        {/* Customer */}
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1.25 }}>
          <Typography sx={{ fontWeight: 700, flex: 1, minWidth: 0 }} noWrap>
            {r.customerName}
          </Typography>
          <Tooltip title={`Call ${r.customerPhone}`}>
            <IconButton size="small" component="a" href={`tel:${r.customerPhone}`} aria-label={`Call ${r.customerName}`}>
              <Phone fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="WhatsApp">
            <IconButton
              size="small"
              component="a"
              href={`https://wa.me/${waDigits.length <= 8 ? `961${waDigits}` : waDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`WhatsApp ${r.customerName}`}
              sx={{ color: "#25D366" }}
            >
              <WhatsApp fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: -0.25 }}>
          {r.customerPhone}
        </Typography>

        {/* Stations + meta */}
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} sx={{ mt: 1.25 }}>
          {r.stations.map((s) => (
            <Chip
              key={s.id}
              size="small"
              icon={<TypeIcon sx={{ fontSize: 16 }} />}
              label={s.pcNumber ?? "Station"}
              sx={{ fontWeight: 700, bgcolor: alpha(accent, 0.12), color: inactive ? "text.secondary" : accent, "& .MuiChip-icon": { color: "inherit" } }}
            />
          ))}
          <Chip
            size="small"
            variant="outlined"
            icon={r.source === "website" ? <Language sx={{ fontSize: 15 }} /> : <Storefront sx={{ fontSize: 15 }} />}
            label={r.source === "website" ? "Website" : "Counter"}
          />
          <Chip size="small" variant="outlined" label={r.code} sx={{ fontFamily: "monospace", letterSpacing: "0.08em" }} />
        </Stack>

        {r.notes && (
          <Typography variant="body2" sx={{ mt: 1, color: "text.secondary", fontStyle: "italic" }}>
            “{r.notes}”
          </Typography>
        )}

        {/* Actions */}
        {r.status === "confirmed" && (
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mt: 1.75 }}>
            <Tooltip title={t.canCheckIn ? "" : `Check-in opens ${CHECKIN_EARLY_MIN} min before ${fmtTime(r.startTime, tz)}`}>
              <span>
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={<Login />}
                  disabled={!t.canCheckIn}
                  onClick={() => onCheckIn(r)}
                >
                  Check in
                </Button>
              </span>
            </Tooltip>
            <Button size="small" variant="outlined" startIcon={<EditOutlined />} onClick={() => onEdit(r)}>
              Edit
            </Button>
            {t.isLate && (
              <Button size="small" color="warning" startIcon={<PersonOff />} onClick={() => onNoShow(r)}>
                No-show
              </Button>
            )}
            <Button size="small" color="error" startIcon={<EventBusy />} onClick={() => onCancel(r)} sx={{ ml: { sm: "auto" } }}>
              Cancel
            </Button>
          </Stack>
        )}
      </Box>
    </Card>
  );
};

export default ReservationCard;
