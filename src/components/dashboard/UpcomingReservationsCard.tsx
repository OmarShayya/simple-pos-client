import React from "react";
import { Box, Button, Typography } from "@mui/material";
import { EventAvailableOutlined } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { EmptyState, SectionCard, StatusChip } from "@/components/ui";
import { formatRelative, formatTime } from "@/utils/format";
import { STATION_TYPE_LABEL } from "@/types/reservation.types";
import type { UpcomingReservationRow } from "@/types/dashboard.types";
import { reservationHref } from "@/components/reservations/reservationDates";
import { useReservationSettings } from "@/components/reservations/reservationQueries";
import { DashboardList, DashboardListRow, DashboardListSkeleton } from "./DashboardList";

/** Confirmed bookings starting in the next 6 hours (or already started). A row opens that booking. */
const UpcomingReservationsCard: React.FC<{ rows: UpcomingReservationRow[] | undefined; loading: boolean; now: Date }> = ({ rows, loading, now }) => {
  // Opening hours decide which night a booking after midnight belongs to
  const settings = useReservationSettings().data;
  return (
    <SectionCard
      title="Coming up"
      subtitle="Bookings in the next 6 hours"
      flush
      divider
      action={
        <Button component={RouterLink} to="/reservations" variant="text">
          Reservations
        </Button>
      }
    >
      {loading ? (
        <DashboardListSkeleton rows={3} />
      ) : !rows || rows.length === 0 ? (
        <EmptyState compact icon={<EventAvailableOutlined />} title="No bookings coming up" description="Walk-ins only for the next few hours." />
      ) : (
        <DashboardList label="Upcoming bookings">
          {rows.map((r) => {
            const started = new Date(r.startTime) <= now;
            return (
              <DashboardListRow
                key={r.id}
                to={reservationHref(r, settings?.schedule, settings?.timezone)}
                ariaLabel={`Booking ${r.code} for ${r.customerName} at ${formatTime(r.startTime)}`}
                leading={
                  <Box sx={{ width: 76 }}>
                    <Typography sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{formatTime(r.startTime)}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {started ? "now" : formatRelative(r.startTime, now)}
                    </Typography>
                  </Box>
                }
                title={r.customerName}
                subtitle={<span>{r.stations.join(", ") || STATION_TYPE_LABEL[r.type]}</span>}
                trailing={started ? <StatusChip status="late" kind="generic" label="Due now" tone="warning" /> : undefined}
              />
            );
          })}
        </DashboardList>
      )}
    </SectionCard>
  );
};

export default UpcomingReservationsCard;
