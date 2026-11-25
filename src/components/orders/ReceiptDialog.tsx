import React, { useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Skeleton, Stack, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import { CloseRounded, PrintOutlined } from "@mui/icons-material";
import { ErrorState, SegmentedControl } from "@/components/ui";
import OrderReceipt, { type ReceiptFormat } from "./OrderReceipt";
import { getReceiptFormat, printReceipt, setReceiptFormat } from "./printReceipt";
import { useOrder } from "./useOrderData";

export interface ReceiptDialogProps {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
}

/** On-screen preview of the receipt / bill with the paper size choice, then the browser print dialog. */
const ReceiptDialog: React.FC<ReceiptDialogProps> = ({ orderId, open, onClose }) => {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const [format, setFormat] = useState<ReceiptFormat>(getReceiptFormat);
  const order = useOrder(open ? orderId : null);
  const paid = order.data?.status === "paid";

  const changeFormat = (f: ReceiptFormat) => {
    setFormat(f);
    setReceiptFormat(f);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={format === "a4" ? "md" : "xs"} fullScreen={phone} aria-labelledby="receipt-title">
      <DialogTitle id="receipt-title" sx={{ display: "flex", alignItems: "center", gap: 1, pr: 1.5 }}>
        <Box sx={{ flex: 1 }}>{order.data && !paid ? "Print bill" : "Print receipt"}</Box>
        <Tooltip title="Close">
          <IconButton onClick={onClose} aria-label="Close">
            <CloseRounded />
          </IconButton>
        </Tooltip>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: "action.hover", display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
        <SegmentedControl<ReceiptFormat>
          aria-label="Paper size"
          value={format}
          onChange={changeFormat}
          options={[
            { value: "thermal", label: "Receipt printer (80 mm)" },
            { value: "a4", label: "A4 page" },
          ]}
        />
        <Box
          sx={{
            bgcolor: "#fff", // paper preview: always white, like the printout
            border: 1,
            borderColor: "divider",
            borderRadius: "4px",
            p: format === "thermal" ? "4mm" : "12mm",
            width: format === "thermal" ? "calc(80mm + 2px)" : "100%",
            maxWidth: "100%",
            minHeight: 240,
          }}
        >
          {order.isLoading ? (
            <Stack spacing={1}>
              {[70, 50, 90, 60, 80, 40].map((w, i) => (
                <Skeleton key={i} width={`${w}%`} sx={{ bgcolor: "rgba(0,0,0,0.08)" }} />
              ))}
            </Stack>
          ) : order.error ? (
            <ErrorState compact error={order.error} onRetry={() => order.refetch()} />
          ) : order.data ? (
            <OrderReceipt order={order.data} format={format} />
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
        <Button variant="contained" startIcon={<PrintOutlined />} disabled={!order.data} onClick={() => order.data && printReceipt(order.data, format)}>
          Print
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReceiptDialog;
