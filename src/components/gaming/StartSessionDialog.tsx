import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { FormDialog } from "@/components/ui";
import { gamingApi } from "@/api/gaming.api";
import { affects } from "@/api/queryKeys";
import { useApiMutation } from "@/hooks/useApiMutation";
import { formatTime, formatUsd } from "@/utils/format";
import type { StartSessionRequest } from "@/types/gaming.types";
import CustomerPicker from "@/components/pickers/CustomerPicker";
import { customerChoiceError, type CustomerChoice } from "@/components/pickers/customerChoice";
import { minutesUntil, type StationView } from "./useStationBoard";

export interface StartSessionDialogProps {
  view: StationView | null;
  onClose: () => void;
  onOpenBooking: (reservationId: string) => void;
}

/** Booking within this many minutes → warn before starting a walk-in session. */
const BOOKING_WARNING_MIN = 120;

const toRequest = (pcId: string, choice: CustomerChoice | null): StartSessionRequest => {
  if (choice?.mode === "existing") return { pcId, customerId: choice.customer.id };
  const name = choice?.name.trim() || undefined;
  const phone = choice?.phone?.isValid ? choice.phone : null;
  return {
    pcId,
    customerName: name ?? (phone ? undefined : "Walk-in"),
    ...(phone ? { customerPhone: phone.e164, phoneCountry: phone.country } : {}),
  };
};

/**
 * Start the clock on a station. The only question is who's playing (optional). The API always
 * opens an order for the session, so drinks can be added and everything is paid together.
 */
const StartSessionDialog: React.FC<StartSessionDialogProps> = ({ view, onClose, onOpenBooking }) => {
  const [customer, setCustomer] = useState<CustomerChoice | null>(null);
  useEffect(() => setCustomer(null), [view?.pc.id]);

  const start = useApiMutation({
    mutationFn: gamingApi.startSession,
    invalidates: affects.session,
    successMessage: (s) => `${s.pc.pcNumber} started${s.sale?.invoiceNumber ? ` — order ${s.sale.invoiceNumber.slice(-4)} opened` : ""}`,
    onSuccess: onClose,
  });

  const pc = view?.pc;
  const booking = view?.booking;
  const bookingIn = booking ? minutesUntil(booking.startTime) : null;
  const error = customerChoiceError(customer, true);

  return (
    <FormDialog
      open={Boolean(view)}
      onClose={onClose}
      title={pc ? `Start session on ${pc.pcNumber}` : "Start session"}
      subtitle={pc ? `${pc.name} · ${formatUsd(pc.hourlyRate.usd)} per hour` : undefined}
      onSubmit={() => pc && start.mutate(toRequest(pc.id, customer))}
      submitLabel="Start session"
      submitDisabled={Boolean(error)}
      loading={start.isPending}
    >
      <Stack spacing={2.5}>
        {booking && bookingIn !== null && bookingIn <= BOOKING_WARNING_MIN && (
          <Alert severity="warning">
            {pc?.pcNumber} is booked {bookingIn <= 0 ? "now" : `at ${formatTime(booking.startTime)}`} for <b>{booking.customerName}</b>. If this is them,
            check the booking in from Reservations instead — otherwise keep this session short.
            <Box sx={{ mt: 1 }}>
              <Button variant="outlined" color="inherit" size="small" onClick={() => onOpenBooking(booking.id)}>
                View booking
              </Button>
            </Box>
          </Alert>
        )}
        <CustomerPicker value={customer} onChange={setCustomer} nameOnlyOk autoFocus />
        <Typography variant="body2" color="text.secondary">
          An order opens automatically. Add drinks to it any time and take payment when they finish.
        </Typography>
      </Stack>
    </FormDialog>
  );
};

export default StartSessionDialog;
