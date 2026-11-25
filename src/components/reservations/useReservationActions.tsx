import { useCallback, useState } from "react";
import { TextField, Typography } from "@mui/material";
import { ConfirmDialog, FormDialog } from "@/components/ui";
import { reservationsApi } from "@/api/reservations.api";
import { affects } from "@/api/queryKeys";
import { useApiMutation } from "@/hooks/useApiMutation";
import type { Reservation } from "@/types/reservation.types";

type Pending = { kind: "checkin" | "noshow" | "cancel"; r: Reservation } | null;

const stationList = (r: Reservation) => r.stations.map((s) => s.pcNumber ?? "station").join(", ");

/**
 * Check in / no-show / cancel a booking, each behind a plain-language confirmation.
 * Render `dialogs` once; call `checkIn(r)` etc. from buttons anywhere on the screen.
 */
export function useReservationActions(options: { noShowGraceMinutes?: number; onDone?: (kind: NonNullable<Pending>["kind"], r: Reservation) => void } = {}) {
  const [pending, setPending] = useState<Pending>(null);
  const [reason, setReason] = useState("");

  const run = useApiMutation({
    mutationFn: async (p: NonNullable<Pending> & { reason?: string }) => {
      if (p.kind === "checkin") return reservationsApi.checkIn(p.r.id);
      if (p.kind === "cancel") return reservationsApi.cancel(p.r.id, p.reason?.trim() || undefined);
      return reservationsApi.markNoShow(p.r.id);
    },
    invalidates: affects.reservation,
    successMessage: (r: Reservation, p) =>
      p.kind === "checkin" ? `Checked in — sessions started on ${stationList(r)}` : p.kind === "cancel" ? "Booking cancelled" : "Marked as no-show",
    onSuccess: (_r, p) => {
      setPending(null);
      setReason("");
      options.onDone?.(p.kind, p.r);
    },
  });

  const close = () => !run.isPending && setPending(null);
  const r = pending?.r;

  const dialogs = (
    <>
      <ConfirmDialog
        open={pending?.kind === "checkin"}
        title="Check in and start sessions?"
        message={
          r && (
            <>
              Starts a gaming session for <b>{r.customerName}</b> on <b>{stationList(r)}</b>. Each station gets its own unpaid order; billing
              runs from now.
            </>
          )
        }
        confirmLabel="Check in"
        loading={run.isPending}
        onConfirm={() => pending && run.mutate(pending)}
        onClose={close}
      />
      <ConfirmDialog
        open={pending?.kind === "noshow"}
        title="Mark as no-show?"
        message={
          r && (
            <>
              {r.customerName} didn't come. Their stations are released for walk-ins. (This also happens automatically{" "}
              {options.noShowGraceMinutes ?? 15} min after the start time.)
            </>
          )
        }
        confirmLabel="Mark no-show"
        tone="danger"
        loading={run.isPending}
        onConfirm={() => pending && run.mutate(pending)}
        onClose={close}
      />
      <FormDialog
        open={pending?.kind === "cancel"}
        onClose={close}
        title="Cancel this booking?"
        maxWidth="xs"
        onSubmit={() => pending && run.mutate({ ...pending, reason })}
        submitLabel="Cancel booking"
        cancelLabel="Keep booking"
        destructive
        loading={run.isPending}
      >
        {r && (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {r.customerName}'s booking <b>{r.code}</b> is cancelled and {stationList(r)} become free.
            {r.source === "website" && " They booked online — let them know."}
          </Typography>
        )}
        <TextField label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth autoFocus slotProps={{ htmlInput: { maxLength: 300 } }} />
      </FormDialog>
    </>
  );

  const checkIn = useCallback((res: Reservation) => setPending({ kind: "checkin", r: res }), []);
  const noShow = useCallback((res: Reservation) => setPending({ kind: "noshow", r: res }), []);
  const cancel = useCallback((res: Reservation) => {
    setReason("");
    setPending({ kind: "cancel", r: res });
  }, []);

  return { checkIn, noShow, cancel, dialogs, busy: run.isPending };
}

export default useReservationActions;
