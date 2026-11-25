import React from "react";
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";

export interface ConfirmDialogProps {
  open: boolean;
  title: React.ReactNode;
  /** What will happen, in plain words: "Order 20261125-0014 will be cancelled. This can't be undone." */
  message?: React.ReactNode;
  /** Verb for the action: "Cancel order", "Delete product". Default "Confirm". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" = red confirm button. */
  tone?: "default" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Small yes/no dialog. Prefer `useConfirm()` for one-off questions inside handlers. */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Go back",
  tone = "default",
  loading,
  onConfirm,
  onClose,
}) => {
  const titleId = React.useId();
  return (
    <Dialog open={open} onClose={() => !loading && onClose()} maxWidth="xs" fullWidth aria-labelledby={titleId}>
      <DialogTitle id={titleId}>{title}</DialogTitle>
      {message && (
        <DialogContent sx={{ pt: "0 !important" }}>
          <Typography color="text.secondary" component="div">
            {message}
          </Typography>
        </DialogContent>
      )}
      <DialogActions sx={{ borderTop: 0 }}>
        <Button variant="outlined" onClick={onClose} disabled={loading} autoFocus={tone === "danger"}>
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          color={tone === "danger" ? "error" : "primary"}
          onClick={onConfirm}
          disabled={loading}
          autoFocus={tone !== "danger"}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
