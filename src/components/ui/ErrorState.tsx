import React from "react";
import { Box, Button, Typography } from "@mui/material";
import { ErrorOutlineRounded, RefreshRounded } from "@mui/icons-material";
import { friendlyError } from "@/utils/apiError";

export interface ErrorStateProps {
  /** Default: "Couldn't load this". */
  title?: string;
  /** The error (its server message is shown) or a custom message. */
  error?: unknown;
  message?: React.ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
  compact?: boolean;
}

/** Inline error for a data area (table body, chart, card) with a Retry button. Never a full page. */
const ErrorState: React.FC<ErrorStateProps> = ({ title = "Couldn't load this", error, message, onRetry, retrying, compact }) => (
  <Box role="alert" sx={{ textAlign: "center", py: compact ? 3 : 5, px: 2 }}>
    <ErrorOutlineRounded aria-hidden sx={{ color: "error.main", fontSize: compact ? 24 : 28, mb: 1 }} />
    <Typography variant="subtitle1">{title}</Typography>
    <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 0.5, maxWidth: 420, mx: "auto" }}>
      {message ?? (error ? friendlyError(error) : "Check the connection and try again.")}
    </Typography>
    {onRetry && (
      <Button variant="outlined" startIcon={<RefreshRounded />} onClick={onRetry} disabled={retrying} sx={{ mt: 2 }}>
        {retrying ? "Retrying…" : "Retry"}
      </Button>
    )}
  </Box>
);

export default ErrorState;
