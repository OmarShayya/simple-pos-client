import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Chip,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Tooltip,
  Menu,
  MenuItem as MuiMenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { Receipt, CalendarToday, Print, Download, MoreVert } from "@mui/icons-material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useQuery } from "@tanstack/react-query";
import { reportApi } from "@/api/report.api";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { format, subDays } from "date-fns";
import { SaleStatus } from "@/types/sale.types";
import { DailyTransaction } from "@/types/report.types";
import html2pdf from "html2pdf.js";

const DailyTransactionsCard: React.FC = () => {
  const [filterType, setFilterType] = useState<"daily" | "range">("daily");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 7), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 20,
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<DailyTransaction | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: [
      "daily-transactions",
      filterType,
      date,
      dateRange,
      paginationModel.page,
    ],
    queryFn: () =>
      reportApi.getDailyTransactions(
        filterType === "daily" ? date : undefined,
        filterType === "range" ? dateRange.startDate : undefined,
        filterType === "range" ? dateRange.endDate : undefined,
        paginationModel.page + 1,
        paginationModel.pageSize
      ),
  });

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const handlePrintReceipt = (transaction: DailyTransaction) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const formattedDate = new Date(transaction.createdAt).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const itemsHtml = transaction.items?.map((item) => `
      <div class="item">
        <div class="item-header">
          <span class="item-name">${item.productName}${item.isGamingSession ? " (Gaming)" : ""}</span>
          <span class="item-qty">x${item.quantity}</span>
        </div>
        ${item.isGamingSession && item.gamingSessionDetails ? `
          <div class="gaming-details">
            <span>PC: ${item.gamingSessionDetails.pcName} (#${item.gamingSessionDetails.pcNumber})</span>
            <span>Duration: ${formatDuration(item.gamingSessionDetails.duration)}</span>
            <span>Time: ${new Date(item.gamingSessionDetails.startTime).toLocaleTimeString()} - ${new Date(item.gamingSessionDetails.endTime).toLocaleTimeString()}</span>
          </div>
        ` : ""}
        <div class="item-row">
          <span class="label">Unit Price:</span>
          <span>$${item.unitPrice.usd.toFixed(2)}</span>
        </div>
        <div class="item-row">
          <span class="label">Subtotal:</span>
          <span>$${item.subtotal.usd.toFixed(2)}</span>
        </div>
        ${item.discount && item.discount.usd > 0 ? `
          <div class="item-row discount">
            <span class="label">Discount:</span>
            <span>-$${item.discount.usd.toFixed(2)}</span>
          </div>
        ` : ""}
        <div class="item-row item-total">
          <span class="label">Item Total:</span>
          <span>$${item.finalAmount.usd.toFixed(2)}</span>
        </div>
      </div>
    `).join("") || "<p>No items</p>";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${transaction.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; font-size: 12px; }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header h1 { margin: 0; font-size: 18px; }
          .header p { margin: 3px 0; color: #666; font-size: 11px; }
          .invoice-info { margin: 10px 0; padding: 8px; background: #f5f5f5; border-radius: 4px; }
          .invoice-info .row { display: flex; justify-content: space-between; margin: 4px 0; }
          .section-title { font-weight: bold; margin: 15px 0 8px; padding-bottom: 5px; border-bottom: 1px solid #ccc; }
          .item { margin: 10px 0; padding: 8px; background: #fafafa; border-radius: 4px; border-left: 3px solid #1976d2; }
          .item-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; }
          .item-name { color: #1976d2; }
          .item-qty { color: #666; }
          .item-row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 11px; }
          .item-row .label { color: #666; }
          .item-row.discount { color: #d32f2f; }
          .item-row.item-total { font-weight: bold; border-top: 1px dashed #ccc; padding-top: 5px; margin-top: 5px; }
          .gaming-details { background: #e3f2fd; padding: 5px; margin: 5px 0; border-radius: 3px; font-size: 10px; }
          .gaming-details span { display: block; color: #1565c0; }
          .summary { margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 4px; }
          .summary .row { display: flex; justify-content: space-between; margin: 5px 0; }
          .summary .row.products { color: #2e7d32; }
          .summary .row.gaming { color: #7b1fa2; }
          .totals { margin: 15px 0; padding: 10px; border: 2px solid #000; border-radius: 4px; }
          .totals .row { display: flex; justify-content: space-between; margin: 5px 0; }
          .totals .row.discount { color: #d32f2f; }
          .totals .row.grand-total { font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 8px; margin-top: 8px; }
          .payment-info { margin: 15px 0; padding: 10px; background: #e8f5e9; border-radius: 4px; }
          .payment-info .row { display: flex; justify-content: space-between; margin: 5px 0; }
          .notes { margin: 15px 0; padding: 10px; background: #fff3e0; border-radius: 4px; font-style: italic; }
          .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 10px; color: #666; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Epic Lounge</h1>
          <p>Receipt</p>
          <p>${formattedDate}</p>
        </div>

        <div class="invoice-info">
          <div class="row">
            <span>Invoice #:</span>
            <strong>${transaction.invoiceNumber}</strong>
          </div>
          <div class="row">
            <span>Customer:</span>
            <span>${transaction.customer?.name || "Walk-in"}</span>
          </div>
          ${transaction.customer?.phone ? `
            <div class="row">
              <span>Phone:</span>
              <span>${transaction.customer.phone}</span>
            </div>
          ` : ""}
          <div class="row">
            <span>Cashier:</span>
            <span>${transaction.cashier}</span>
          </div>
          <div class="row">
            <span>Status:</span>
            <span>${transaction.status.toUpperCase()}</span>
          </div>
        </div>

        <div class="section-title">Items (${transaction.itemsSummary?.totalItems || transaction.items?.length || 0})</div>
        ${itemsHtml}

        ${transaction.itemsSummary ? `
          <div class="summary">
            <div class="row products">
              <span>Products (${transaction.itemsSummary.productCount}):</span>
              <span>$${transaction.itemsSummary.productTotal.usd.toFixed(2)}</span>
            </div>
            <div class="row gaming">
              <span>Gaming (${transaction.itemsSummary.gamingCount}):</span>
              <span>$${transaction.itemsSummary.gamingTotal.usd.toFixed(2)}</span>
            </div>
          </div>
        ` : ""}

        <div class="totals">
          <div class="row">
            <span>Subtotal:</span>
            <span>$${transaction.subtotalBeforeDiscount.usd.toFixed(2)}</span>
          </div>
          ${transaction.discounts.totalDiscounts.usd > 0 ? `
            <div class="row discount">
              <span>Total Discounts:</span>
              <span>-$${transaction.discounts.totalDiscounts.usd.toFixed(2)}</span>
            </div>
          ` : ""}
          <div class="row grand-total">
            <span>TOTAL:</span>
            <span>$${transaction.totals.usd.toFixed(2)}</span>
          </div>
          <div class="row" style="font-size: 11px; color: #666;">
            <span></span>
            <span>${transaction.totals.lbp.toLocaleString()} LBP</span>
          </div>
        </div>

        <div class="payment-info">
          <div class="row">
            <span>Payment Method:</span>
            <strong>${transaction.paymentMethod}</strong>
          </div>
          <div class="row">
            <span>Paid In:</span>
            <strong>${transaction.paymentCurrency}</strong>
          </div>
          <div class="row">
            <span>Amount Paid:</span>
            <strong>${transaction.paymentCurrency === "USD" ? `$${transaction.amountPaid.usd.toFixed(2)}` : `${transaction.amountPaid.lbp.toLocaleString()} LBP`}</strong>
          </div>
        </div>

        ${transaction.notes ? `
          <div class="notes">
            <strong>Notes:</strong> ${transaction.notes}
          </div>
        ` : ""}

        <div class="footer">
          <p>Thank you for your visit!</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = (transaction: DailyTransaction) => {
    const formattedDate = new Date(transaction.createdAt).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const itemsHtml = transaction.items?.map((item) => `
      <div class="item">
        <div class="item-header">
          <span class="item-name">${item.productName}${item.isGamingSession ? " (Gaming)" : ""}</span>
          <span class="item-qty">x${item.quantity}</span>
        </div>
        ${item.isGamingSession && item.gamingSessionDetails ? `
          <div class="gaming-details">
            <span>PC: ${item.gamingSessionDetails.pcName} (#${item.gamingSessionDetails.pcNumber})</span>
            <span>Duration: ${formatDuration(item.gamingSessionDetails.duration)}</span>
            <span>Time: ${new Date(item.gamingSessionDetails.startTime).toLocaleTimeString()} - ${new Date(item.gamingSessionDetails.endTime).toLocaleTimeString()}</span>
          </div>
        ` : ""}
        <div class="item-row">
          <span class="label">Unit Price:</span>
          <span>$${item.unitPrice.usd.toFixed(2)}</span>
        </div>
        <div class="item-row">
          <span class="label">Subtotal:</span>
          <span>$${item.subtotal.usd.toFixed(2)}</span>
        </div>
        ${item.discount && item.discount.usd > 0 ? `
          <div class="item-row discount">
            <span class="label">Discount:</span>
            <span>-$${item.discount.usd.toFixed(2)}</span>
          </div>
        ` : ""}
        <div class="item-row item-total">
          <span class="label">Item Total:</span>
          <span>$${item.finalAmount.usd.toFixed(2)}</span>
        </div>
      </div>
    `).join("") || "<p>No items</p>";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; font-size: 12px;">
        <div style="text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px;">
          <h1 style="margin: 0; font-size: 18px;">Epic Lounge</h1>
          <p style="margin: 3px 0; color: #666; font-size: 11px;">Receipt</p>
          <p style="margin: 3px 0; color: #666; font-size: 11px;">${formattedDate}</p>
        </div>

        <div style="margin: 10px 0; padding: 8px; background: #f5f5f5; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; margin: 4px 0;">
            <span>Invoice #:</span>
            <strong>${transaction.invoiceNumber}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 4px 0;">
            <span>Customer:</span>
            <span>${transaction.customer?.name || "Walk-in"}</span>
          </div>
          ${transaction.customer?.phone ? `
            <div style="display: flex; justify-content: space-between; margin: 4px 0;">
              <span>Phone:</span>
              <span>${transaction.customer.phone}</span>
            </div>
          ` : ""}
          <div style="display: flex; justify-content: space-between; margin: 4px 0;">
            <span>Cashier:</span>
            <span>${transaction.cashier}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 4px 0;">
            <span>Status:</span>
            <span>${transaction.status.toUpperCase()}</span>
          </div>
        </div>

        <div style="font-weight: bold; margin: 15px 0 8px; padding-bottom: 5px; border-bottom: 1px solid #ccc;">Items (${transaction.itemsSummary?.totalItems || transaction.items?.length || 0})</div>
        ${itemsHtml}

        ${transaction.itemsSummary ? `
          <div style="margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; margin: 5px 0; color: #2e7d32;">
              <span>Products (${transaction.itemsSummary.productCount}):</span>
              <span>$${transaction.itemsSummary.productTotal.usd.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 5px 0; color: #7b1fa2;">
              <span>Gaming (${transaction.itemsSummary.gamingCount}):</span>
              <span>$${transaction.itemsSummary.gamingTotal.usd.toFixed(2)}</span>
            </div>
          </div>
        ` : ""}

        <div style="margin: 15px 0; padding: 10px; border: 2px solid #000; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; margin: 5px 0;">
            <span>Subtotal:</span>
            <span>$${transaction.subtotalBeforeDiscount.usd.toFixed(2)}</span>
          </div>
          ${transaction.discounts.totalDiscounts.usd > 0 ? `
            <div style="display: flex; justify-content: space-between; margin: 5px 0; color: #d32f2f;">
              <span>Total Discounts:</span>
              <span>-$${transaction.discounts.totalDiscounts.usd.toFixed(2)}</span>
            </div>
          ` : ""}
          <div style="display: flex; justify-content: space-between; margin: 5px 0; font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 8px; margin-top: 8px;">
            <span>TOTAL:</span>
            <span>$${transaction.totals.usd.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 5px 0; font-size: 11px; color: #666;">
            <span></span>
            <span>${transaction.totals.lbp.toLocaleString()} LBP</span>
          </div>
        </div>

        <div style="margin: 15px 0; padding: 10px; background: #e8f5e9; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; margin: 5px 0;">
            <span>Payment Method:</span>
            <strong>${transaction.paymentMethod}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 5px 0;">
            <span>Paid In:</span>
            <strong>${transaction.paymentCurrency}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 5px 0;">
            <span>Amount Paid:</span>
            <strong>${transaction.paymentCurrency === "USD" ? `$${transaction.amountPaid.usd.toFixed(2)}` : `${transaction.amountPaid.lbp.toLocaleString()} LBP`}</strong>
          </div>
        </div>

        ${transaction.notes ? `
          <div style="margin: 15px 0; padding: 10px; background: #fff3e0; border-radius: 4px; font-style: italic;">
            <strong>Notes:</strong> ${transaction.notes}
          </div>
        ` : ""}

        <div style="text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 10px; color: #666;">
          <p>Thank you for your visit!</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = htmlContent;

    const opt = {
      margin: 10,
      filename: `receipt-${transaction.invoiceNumber}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save();
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, transaction: DailyTransaction) => {
    setAnchorEl(event.currentTarget);
    setSelectedTransaction(transaction);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTransaction(null);
  };

  const handlePrint = () => {
    if (selectedTransaction) {
      handlePrintReceipt(selectedTransaction);
    }
    handleMenuClose();
  };

  const handleDownload = () => {
    if (selectedTransaction) {
      handleDownloadPDF(selectedTransaction);
    }
    handleMenuClose();
  };

  const columns: GridColDef[] = [
    {
      field: "invoiceNumber",
      headerName: "Invoice",
      width: 140,
    },
    {
      field: "customer",
      headerName: "Customer",
      flex: 1,
      renderCell: (params) => params.row.customer?.name || "Walk-in",
    },
    {
      field: "totals",
      headerName: "Total (USD)",
      width: 120,
      renderCell: (params) => `$${params.row.totals.usd.toFixed(2)}`,
    },
    {
      field: "paymentCurrency",
      headerName: "Paid In",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.row.paymentCurrency || "-"}
          color={params.row.paymentCurrency === "USD" ? "primary" : "secondary"}
          size="small"
        />
      ),
    },
    {
      field: "amountPaid",
      headerName: "Amount Paid",
      width: 150,
      renderCell: (params) => (
        <Box>
          <Typography variant="caption" display="block">
            ${params.row.amountPaid.usd.toFixed(2)}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {params.row.amountPaid.lbp.toLocaleString()} LBP
          </Typography>
        </Box>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      renderCell: (params) => (
        <Chip
          label={params.row.status.toUpperCase()}
          color={
            params.row.status === SaleStatus.PAID
              ? "success"
              : params.row.status === SaleStatus.PENDING
              ? "warning"
              : "error"
          }
          size="small"
        />
      ),
    },
    {
      field: "cashier",
      headerName: "Cashier",
      width: 130,
    },
    {
      field: "createdAt",
      headerName: "Date & Time",
      width: 160,
      renderCell: (params) =>
        new Date(params.row.createdAt).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    {
      field: "actions",
      headerName: "",
      width: 60,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="Print / Download">
          <IconButton
            size="small"
            onClick={(e) => handleMenuOpen(e, params.row as DailyTransaction)}
            color="primary"
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Receipt sx={{ mr: 1, color: "primary.main" }} />
            <Typography variant="h6" fontWeight={600}>
              Transaction History
            </Typography>
          </Box>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12 }}>
              <ToggleButtonGroup
                value={filterType}
                exclusive
                onChange={(_, value) => value && setFilterType(value)}
                size="small"
                fullWidth
              >
                <ToggleButton value="daily">
                  <CalendarToday sx={{ mr: 1, fontSize: 18 }} />
                  Daily
                </ToggleButton>
                <ToggleButton value="range">Date Range</ToggleButton>
              </ToggleButtonGroup>
            </Grid>

            {filterType === "daily" ? (
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  type="date"
                  size="small"
                  label="Date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            ) : (
              <>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    type="date"
                    size="small"
                    label="Start Date"
                    value={dateRange.startDate}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, startDate: e.target.value })
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    type="date"
                    size="small"
                    label="End Date"
                    value={dateRange.endDate}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, endDate: e.target.value })
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}
          </Grid>

          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <DataGrid
              rows={data?.data || []}
              columns={columns}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              rowCount={data?.pagination.total || 0}
              pageSizeOptions={[10, 20, 50]}
              paginationMode="server"
              autoHeight
              disableRowSelectionOnClick
            />
          )}
        </CardContent>
      </Card>

      {/* Menu for Print/Download */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MuiMenuItem onClick={handlePrint}>
          <ListItemIcon>
            <Print fontSize="small" />
          </ListItemIcon>
          <ListItemText>Print Receipt</ListItemText>
        </MuiMenuItem>
        <MuiMenuItem onClick={handleDownload}>
          <ListItemIcon>
            <Download fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download PDF</ListItemText>
        </MuiMenuItem>
      </Menu>
    </>
  );
};

export default DailyTransactionsCard;
