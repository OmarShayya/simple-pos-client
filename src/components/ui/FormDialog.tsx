import React from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
  type DialogProps,
} from "@mui/material";
import { CloseRounded } from "@mui/icons-material";

export interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  /** Submit handler — the content is a real <form>, so Enter submits. */
  onSubmit?: () => void;
  /** Primary button label (default "Save"). Use a verb: "Save product", "Charge $12.50". */
  submitLabel?: React.ReactNode;
  cancelLabel?: string;
  /** Shows a spinner on the primary button and blocks closing. */
  loading?: boolean;
  submitDisabled?: boolean;
  /** Red primary button (deleting, cancelling an order). */
  destructive?: boolean;
  /** Extra buttons on the left of the action row (e.g. "Delete"). */
  secondaryActions?: React.ReactNode;
  /** Replace the default action row entirely. */
  actions?: React.ReactNode;
  /** Default "sm" (600px). Full screen on phones automatically. */
  maxWidth?: DialogProps["maxWidth"];
  /** Lines between title / content / actions — use for long, scrolling forms. */
  dividers?: boolean;
}

/**
 * The standard dialog for forms and detail views: title + close button, scrollable content,
 * Cancel / primary action. Phones get it full screen with the actions pinned at the bottom.
 */
const FormDialog: React.FC<FormDialogProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  onSubmit,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  loading,
  submitDisabled,
  destructive,
  secondaryActions,
  actions,
  maxWidth = "sm",
  dividers,
}) => {
  const titleId = React.useId();
  const close = () => {
    if (!loading) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      maxWidth={maxWidth}
      fullWidth
      aria-labelledby={titleId}
    >
      <Box
        component={onSubmit ? "form" : "div"}
        noValidate={onSubmit ? true : undefined}
        onSubmit={
          onSubmit
            ? (e: React.FormEvent) => {
                e.preventDefault();
                if (!loading && !submitDisabled) onSubmit();
              }
            : undefined
        }
        sx={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0 }}
      >
      <DialogTitle id={titleId} sx={{ display: "flex", alignItems: "flex-start", gap: 1, pr: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 0, pt: 0.5 }}>
          {title}
          {subtitle && (
            <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 0.25, fontWeight: 400 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Tooltip title="Close">
          <span>
            <IconButton onClick={close} aria-label="Close" disabled={loading} sx={{ mt: -0.5 }}>
              <CloseRounded />
            </IconButton>
          </span>
        </Tooltip>
      </DialogTitle>
      <DialogContent dividers={dividers}>{children}</DialogContent>
      {actions !== undefined ? (
        actions && <DialogActions>{actions}</DialogActions>
      ) : (
        <DialogActions>
          {secondaryActions && <Box sx={{ display: "flex", gap: 1, mr: "auto", flexWrap: "wrap" }}>{secondaryActions}</Box>}
          <Button variant="outlined" onClick={close} disabled={loading}>
            {cancelLabel}
          </Button>
          {onSubmit && (
            <Button
              type="submit"
              variant="contained"
              color={destructive ? "error" : "primary"}
              disabled={loading || submitDisabled}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {submitLabel}
            </Button>
          )}
        </DialogActions>
      )}
      </Box>
    </Dialog>
  );
};

export default FormDialog;
