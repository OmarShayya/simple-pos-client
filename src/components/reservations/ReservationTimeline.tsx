import React, { useMemo } from "react";
import { Box, Tooltip, Typography, alpha, useTheme } from "@mui/material";
import { Computer, SportsEsports } from "@mui/icons-material";
import type { PC } from "@/types/gaming.types";
import type { Reservation } from "@/types/reservation.types";
import { fmtTime } from "@/utils/zonedTime";

interface Props {
  stations: PC[];
  reservations: Reservation[];
  window: { start: Date; end: Date };
  tz: string;
  now: number;
  onSelect: (r: Reservation) => void;
  onEmptyClick?: (station: PC, at: Date) => void;
}

const ROW_H = 44;
const LABEL_W = 92;

/** One row per station across the business night; booked blocks are clickable. */
const ReservationTimeline: React.FC<Props> = ({ stations, reservations, window, tz, now, onSelect, onEmptyClick }) => {
  const theme = useTheme();
  const start = window.start.getTime();
  const end = window.end.getTime();
  const span = Math.max(end - start, 1);

  const hours = useMemo(() => {
    const out: number[] = [];
    const first = Math.ceil(start / 3_600_000) * 3_600_000;
    for (let t = first; t <= end; t += 3_600_000) out.push(t);
    return out;
  }, [start, end]);

  const pct = (t: number) => `${((Math.min(Math.max(t, start), end) - start) / span) * 100}%`;

  const blocksFor = (stationId: string) =>
    reservations.filter(
      (r) =>
        (r.status === "confirmed" || r.status === "checked_in") &&
        r.stations.some((s) => s.id === stationId) &&
        new Date(r.endTime).getTime() > start &&
        new Date(r.startTime).getTime() < end
    );

  const colorFor = (r: Reservation) =>
    r.status === "checked_in"
      ? theme.palette.success.main
      : now > new Date(r.startTime).getTime()
        ? theme.palette.warning.main
        : r.type === "playstation"
          ? theme.tokens.series.playstation
          : theme.tokens.series.pc;

  const showNow = now > start && now < end;

  return (
    <Box sx={{ overflowX: "auto", pb: 1 }}>
      <Box sx={{ minWidth: 760, position: "relative" }}>
        {/* Hour ruler */}
        <Box sx={{ display: "flex", height: 28, alignItems: "flex-end", borderBottom: 1, borderColor: "divider" }}>
          <Box sx={{ width: LABEL_W, flexShrink: 0 }} />
          <Box sx={{ position: "relative", flex: 1, height: "100%" }}>
            {hours.map((h) => (
              <Typography
                key={h}
                variant="caption"
                color="text.secondary"
                sx={{ position: "absolute", left: pct(h), bottom: 4, transform: "translateX(-50%)", whiteSpace: "nowrap", fontSize: "0.8125rem", fontVariantNumeric: "tabular-nums" }}
              >
                {fmtTime(new Date(h), tz).replace(":00", "")}
              </Typography>
            ))}
          </Box>
        </Box>

        {stations.map((st, i) => {
          const Icon = st.type === "playstation" ? SportsEsports : Computer;
          return (
            <Box
              key={st.id}
              sx={{
                display: "flex",
                height: ROW_H,
                alignItems: "center",
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: i % 2 ? alpha(theme.palette.text.primary, 0.015) : "transparent",
              }}
            >
              <Box sx={{ width: LABEL_W, flexShrink: 0, display: "flex", alignItems: "center", gap: 0.75, pl: 0.5 }}>
                <Icon sx={{ fontSize: 16, color: st.type === "playstation" ? theme.tokens.series.playstation : theme.tokens.series.pc }} />
                <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }} noWrap>
                  {st.pcNumber}
                </Typography>
              </Box>
              <Box
                sx={{ position: "relative", flex: 1, height: "100%", cursor: onEmptyClick ? "copy" : "default" }}
                onClick={(e) => {
                  if (!onEmptyClick || e.target !== e.currentTarget) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const at = start + ((e.clientX - rect.left) / rect.width) * span;
                  onEmptyClick(st, new Date(Math.floor(at / 1_800_000) * 1_800_000));
                }}
              >
                {hours.map((h) => (
                  <Box key={h} sx={{ position: "absolute", left: pct(h), top: 0, bottom: 0, borderLeft: 1, borderColor: "divider", opacity: 0.6, pointerEvents: "none" }} />
                ))}
                {blocksFor(st.id).map((r) => {
                  const s = new Date(r.startTime).getTime();
                  const e = new Date(r.endTime).getTime();
                  const c = colorFor(r);
                  return (
                    <Tooltip
                      key={r.id}
                      title={`${r.customerName} · ${fmtTime(r.startTime, tz)}–${fmtTime(r.endTime, tz)} · ${r.code}`}
                    >
                      <Box
                        role="button"
                        tabIndex={0}
                        aria-label={`${r.customerName}, ${fmtTime(r.startTime, tz)} to ${fmtTime(r.endTime, tz)}. Open booking`}
                        onClick={() => onSelect(r)}
                        onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && onSelect(r)}
                        sx={{
                          position: "absolute",
                          top: 6,
                          bottom: 6,
                          left: pct(s),
                          width: `calc(${((Math.min(e, end) - Math.max(s, start)) / span) * 100}% - 2px)`,
                          borderRadius: "8px",
                          bgcolor: alpha(c, 0.22),
                          border: `1px solid ${alpha(c, 0.6)}`,
                          color: theme.palette.text.primary,
                          px: 1,
                          display: "flex",
                          alignItems: "center",
                          overflow: "hidden",
                          cursor: "pointer",
                          transition: "background-color .2s ease",
                          "&:hover, &:focus-visible": { bgcolor: alpha(c, 0.36), outline: "none" },
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: "nowrap", fontSize: "0.8125rem" }} noWrap>
                          {r.customerName}
                        </Typography>
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>
          );
        })}

        {showNow && (
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              top: 22,
              bottom: 0,
              left: `calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${(now - start) / span})`,
              width: 2,
              bgcolor: "error.main",
              pointerEvents: "none",
              "&::before": {
                content: '""',
                position: "absolute",
                top: -4,
                left: -4,
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: "error.main",
              },
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export default ReservationTimeline;
