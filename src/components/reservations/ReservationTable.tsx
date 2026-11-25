import React, { useMemo } from "react";
import { Box, Button, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { EditOutlined, EventBusyOutlined, LoginRounded, PersonOffOutlined } from "@mui/icons-material";
import { CodeText, DataTable, StatusChip } from "@/components/ui";
import type { DataTableColumn, DataTableProps } from "@/components/ui";
import { formatDate, formatTime } from "@/utils/format";
import { formatPhone } from "@/utils/phone";
import { CHECKIN_EARLY_MIN, attentionRank, getTiming, timingBadge } from "@/utils/reservationTiming";
import { STATION_TYPE_LABEL, type Reservation } from "@/types/reservation.types";

export interface ReservationTableProps
  extends Pick<DataTableProps<Reservation>, "loading" | "refreshing" | "error" | "onRetry" | "onRefresh" | "empty" | "title" | "toolbarExtra"> {
  rows: Reservation[] | undefined;
  now: number;
  /** Add a Date column (search results across nights). */
  showDate?: boolean;
  onOpen: (r: Reservation) => void;
  onCheckIn: (r: Reservation) => void;
  onNoShow: (r: Reservation) => void;
  onCancel: (r: Reservation) => void;
}

/** A night's bookings (or search results) — late and arriving-soon first, with the actions staff need. */
const ReservationTable: React.FC<ReservationTableProps> = ({ rows, now, showDate, onOpen, onCheckIn, onNoShow, onCancel, ...table }) => {
  const sorted = useMemo(
    () =>
      rows
        ? [...rows].sort((a, b) =>
            showDate
              ? new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
              : attentionRank(a, now) - attentionRank(b, now) || new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          )
        : rows,
    [rows, now, showDate]
  );

  const columns = useMemo<DataTableColumn<Reservation>[]>(
    () => [
      ...(showDate ? [{ field: "date", header: "Date", type: "date", value: (r: Reservation) => r.startTime, width: 120, mobile: "meta" } as DataTableColumn<Reservation>] : []),
      {
        field: "startTime",
        header: "Time",
        width: 170,
        value: (r) => r.startTime,
        sortable: false,
        render: (r) => (
          <Box sx={{ lineHeight: 1.25, py: 0.5 }}>
            <Box sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
              {formatTime(r.startTime)} – {formatTime(r.endTime)}
            </Box>
            <CodeText>{r.code}</CodeText>
          </Box>
        ),
        csv: (r) => `${formatDate(r.startTime)} ${formatTime(r.startTime)}–${formatTime(r.endTime)} (${r.code})`,
        mobile: "title",
      },
      {
        field: "customerName",
        header: "Customer",
        flex: 1.2,
        minWidth: 170,
        sortable: false,
        render: (r) => (
          <Box sx={{ lineHeight: 1.25, py: 0.5 }}>
            <Typography component="div" sx={{ fontWeight: 500 }} noWrap>
              {r.customerName}
            </Typography>
            <Typography component="div" variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }} noWrap>
              {formatPhone(r.customerPhone, r.phoneCountry)}
            </Typography>
          </Box>
        ),
        value: (r) => `${r.customerName} ${r.customerPhone}`,
        csv: (r) => r.customerName,
        mobile: "subtitle",
      },
      {
        field: "stations",
        header: "Stations",
        sortable: false,
        minWidth: 140,
        value: (r) => `${r.stations.map((s) => s.pcNumber).join(", ")}`,
        render: (r) => (
          <Box component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {r.stations.map((s) => s.pcNumber).join(", ")}
            <Box component="span" sx={{ color: "text.secondary" }}>
              {" "}
              · {STATION_TYPE_LABEL[r.type]}
            </Box>
          </Box>
        ),
      },
      {
        field: "status",
        header: "Status",
        width: 150,
        sortable: false,
        value: (r) => timingBadge(r, now)?.label ?? r.status,
        render: (r) => {
          const badge = timingBadge(r, now);
          return badge ? <StatusChip status={r.status} kind="reservation" label={badge.label} tone={badge.tone} /> : <StatusChip status={r.status} kind="reservation" />;
        },
        mobile: "end",
      },
      { field: "source", header: "Booked on", type: "status", statusKind: "source", width: 120, hideBelow: "lg", sortable: false, mobile: "meta" },
      {
        field: "actions",
        header: "Actions",
        type: "actions",
        width: 264,
        render: (r) => {
          if (r.status !== "confirmed") return null;
          const t = getTiming(r, now);
          return (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Tooltip title={t.canCheckIn ? "Start their sessions now" : `Check-in opens ${CHECKIN_EARLY_MIN} min before ${formatTime(r.startTime)}`}>
                <span>
                  <Button variant="outlined" size="small" startIcon={<LoginRounded />} disabled={!t.canCheckIn} onClick={() => onCheckIn(r)}>
                    Check in
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Edit booking">
                <IconButton aria-label={`Edit booking ${r.code}`} onClick={() => onOpen(r)}>
                  <EditOutlined />
                </IconButton>
              </Tooltip>
              {t.isLate && (
                <Tooltip title="Mark as no-show">
                  <IconButton aria-label={`Mark ${r.customerName} as no-show`} onClick={() => onNoShow(r)}>
                    <PersonOffOutlined />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Cancel booking">
                <IconButton aria-label={`Cancel booking ${r.code}`} onClick={() => onCancel(r)} sx={{ color: "error.main" }}>
                  <EventBusyOutlined />
                </IconButton>
              </Tooltip>
            </Stack>
          );
        },
      },
    ],
    [now, showDate, onOpen, onCheckIn, onNoShow, onCancel]
  );

  return (
    <DataTable<Reservation>
      label="Bookings"
      rows={sorted}
      columns={columns}
      onRowClick={onOpen}
      pageSize={50}
      {...table}
    />
  );
};

export default ReservationTable;
