import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  TextField,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  MenuItem,
  Tooltip,
  Alert,
  InputAdornment,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import {
  Payment,
  Cancel,
  Search,
  Print,
  CalendarToday,
} from "@mui/icons-material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesApi } from "@/api/sales.api";
import { exchangeRateApi } from "@/api/exchangeRate.api";
import { Sale, SaleStatus, PaymentMethod, Currency } from "@/types/sale.types";
import { toast } from "react-toastify";
import { handleApiError } from "@/utils/errorHandler";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { format } from "date-fns";
import { useSearchParams } from "react-router-dom";

const SalesHistory: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const paymentForId = searchParams.get("paymentFor");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SaleStatus | "">("");
  const [dateFilterType, setDateFilterType] = useState<"daily" | "range">(
    "daily"
  );
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });
  const [openPayDialog, setOpenPayDialog] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  const [paymentData, setPaymentData] = useState({
    paymentMethod: PaymentMethod.CASH,
    paymentCurrency: Currency.USD,
    amount: 0,
  });

  const { data: exchangeRate } = useQuery({
    queryKey: ["exchange-rate"],
    queryFn: exchangeRateApi.getCurrentRate,
  });

  const getDateFilters = () => {
    if (dateFilterType === "daily") {
      return {
        startDate: selectedDate,
        endDate: selectedDate,
      };
    }
    return dateRange;
  };

  const { data: salesData, isLoading } = useQuery({
    queryKey: [
      "sales",
      paginationModel.page + 1,
      searchQuery,
      statusFilter,
      dateFilterType,
      selectedDate,
      dateRange,
    ],
    queryFn: () =>
      salesApi.getAll({
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        status: statusFilter || undefined,
        ...getDateFilters(),
      }),
  });

  const payMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      salesApi.pay(id, data),
    onSuccess: async (_, variables) => {
      toast.success("Payment processed successfully");
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setOpenPayDialog(false);

      const fullSale = await salesApi.getById(variables.id);
      setTimeout(() => {
        handlePrintReceipt(fullSale);
      }, 500);
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const cancelMutation = useMutation({
    mutationFn: salesApi.cancel,
    onSuccess: () => {
      toast.success("Sale cancelled successfully");
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const calculateChange = () => {
    if (!selectedSale) return { usd: 0, lbp: 0 };

    const rate = exchangeRate?.rate || 89500;

    if (paymentData.paymentCurrency === Currency.USD) {
      const changeUsd = paymentData.amount - selectedSale.totals.usd;
      return {
        usd: changeUsd,
        lbp: changeUsd * rate,
      };
    } else {
      const changeLbp = paymentData.amount - selectedSale.totals.lbp;
      return {
        usd: changeLbp / rate,
        lbp: changeLbp,
      };
    }
  };

  const handleOpenPayDialog = (sale: Sale) => {
    setSelectedSale(sale);
    setPaymentData({
      paymentMethod: PaymentMethod.CASH,
      paymentCurrency: Currency.USD,
      amount: sale.totals.usd,
    });
    setOpenPayDialog(true);
  };

  const handlePay = () => {
    if (!selectedSale) return;

    const totalDue =
      paymentData.paymentCurrency === Currency.USD
        ? selectedSale.totals.usd
        : selectedSale.totals.lbp;

    if (paymentData.amount < totalDue) {
      toast.error("Payment amount is less than total due");
      return;
    }

    payMutation.mutate({
      id: selectedSale.id,
      data: paymentData,
    });
  };

  const handleCancel = (id: string) => {
    if (window.confirm("Are you sure you want to cancel this sale?")) {
      cancelMutation.mutate(id);
    }
  };

  const handlePrintReceipt = (sale: Sale) => {
    if (sale.status !== SaleStatus.PAID) {
      toast.error("Only paid sales can be printed");
      return;
    }

    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Please allow popups to print receipts");
        return;
      }

      const receiptHTML = generateReceiptHTML(sale);
      printWindow.document.write(receiptHTML);
      printWindow.document.close();

      printWindow.onload = () => {
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    } catch (error) {
      toast.error("Failed to print receipt");
      console.error(error);
    }
  };

  useEffect(() => {
    if (paymentForId && salesData?.data) {
      const sale = salesData.data.find((s) => s.id === paymentForId);
      if (sale && sale.status === SaleStatus.PENDING) {
        handleOpenPayDialog(sale);
        setSearchParams({}); // Clear the URL parameter
      }
    }
  }, [paymentForId, salesData]);

  const generateReceiptHTML = (sale: Sale): string => {
    const items = sale.items || [];
    const customer = sale.customer || null;
    const rate = exchangeRate?.rate || 89500;

    const amountPaidUsd = sale.amountPaid?.usd || 0;
    const amountPaidLbp = sale.amountPaid?.lbp || 0;

    const changeUsd =
      sale.paymentCurrency === Currency.USD
        ? amountPaidUsd - sale.totals.usd
        : (amountPaidLbp - sale.totals.lbp) / rate;

    const changeLbp =
      sale.paymentCurrency === Currency.LBP
        ? amountPaidLbp - sale.totals.lbp
        : (amountPaidUsd - sale.totals.usd) * rate;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt ${sale.invoiceNumber}</title>
        <style>
          @media print {
            @page { 
              size: 80mm auto;
              margin: 0; 
            }
            body { 
              margin: 0;
              padding: 0;
            }
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            padding: 10px;
            width: 80mm;
            margin: 0 auto;
          }
          .receipt {
            width: 100%;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .header h1 {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .header p {
            font-size: 11px;
            margin: 2px 0;
          }
          .invoice-info {
            margin-bottom: 15px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .invoice-info p {
            margin: 3px 0;
            font-size: 11px;
          }
          .items {
            margin-bottom: 15px;
          }
          .item {
            margin-bottom: 8px;
          }
          .item-name {
            font-weight: bold;
            margin-bottom: 2px;
          }
          .item-details {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
          }
          .totals {
            border-top: 1px dashed #000;
            padding-top: 10px;
            margin-bottom: 15px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          .total-row.grand {
            font-size: 14px;
            font-weight: bold;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 8px 0;
            margin-top: 10px;
          }
          .payment-info {
            border-top: 1px dashed #000;
            padding-top: 10px;
            margin-bottom: 15px;
          }
          .payment-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            font-size: 12px;
          }
          .payment-row.change {
            font-weight: bold;
            font-size: 13px;
            border-top: 1px dashed #000;
            padding-top: 8px;
            margin-top: 8px;
          }
          .footer {
            text-align: center;
            font-size: 11px;
            border-top: 1px dashed #000;
            padding-top: 10px;
          }
          .footer p {
            margin: 3px 0;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>POS SYSTEM</h1>
            <p>Gaming Network</p>
            <p>Phone: +961 XXX XXX</p>
            <p>Email: info@possystem.com</p>
          </div>

          <div class="invoice-info">
            <p><strong>Invoice:</strong> #${sale.invoiceNumber}</p>
            <p><strong>Date:</strong> ${new Date(
              sale.paidAt || sale.createdAt
            ).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}</p>
            <p><strong>Cashier:</strong> ${sale.cashier?.name || "N/A"}</p>
            ${
              customer
                ? `<p><strong>Customer:</strong> ${customer.name}</p>`
                : ""
            }
            ${
              customer?.phone
                ? `<p><strong>Phone:</strong> ${customer.phone}</p>`
                : ""
            }
          </div>

          <div class="items">
            ${items
              .map(
                (item) => `
              <div class="item">
                <div class="item-name">${item.productName}</div>
                <div class="item-details">
                  <span>${item.quantity} x $${item.unitPrice.usd.toFixed(2)}</span>
                  <span>$${item.subtotal.usd.toFixed(2)}</span>
                </div>
                ${
                  item.discount
                    ? `<div class="item-details" style="color: green; font-size: 10px;">
                         <span>Discount (${item.discount.percentage}%)</span>
                         <span>-$${item.discount.amount.usd.toFixed(2)}</span>
                       </div>
                       <div class="item-details" style="font-weight: bold;">
                         <span>Final:</span>
                         <span>$${(item.finalAmount?.usd || item.subtotal.usd).toFixed(2)}</span>
                       </div>`
                    : ""
                }
              </div>
            `
              )
              .join("")}
          </div>

          <div class="totals">
            ${
              sale.subtotalBeforeDiscount
                ? `<div class="total-row">
                     <span>Subtotal:</span>
                     <span>$${sale.subtotalBeforeDiscount.usd.toFixed(2)}</span>
                   </div>`
                : ""
            }
            ${
              sale.totalItemDiscounts && sale.totalItemDiscounts.usd > 0
                ? `<div class="total-row" style="color: green;">
                     <span>Item Discounts:</span>
                     <span>-$${sale.totalItemDiscounts.usd.toFixed(2)}</span>
                   </div>`
                : ""
            }
            ${
              sale.saleDiscount
                ? `<div class="total-row" style="color: green;">
                     <span>${sale.saleDiscount.discountName} (${sale.saleDiscount.percentage}%):</span>
                     <span>-$${sale.saleDiscount.amount.usd.toFixed(2)}</span>
                   </div>`
                : ""
            }
            ${
              (sale.totalItemDiscounts?.usd || 0) + (sale.saleDiscount?.amount?.usd || 0) > 0
                ? `<div class="total-row" style="font-weight: bold; color: green; border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px;">
                     <span>YOU SAVED:</span>
                     <span>$${((sale.totalItemDiscounts?.usd || 0) + (sale.saleDiscount?.amount?.usd || 0)).toFixed(2)}</span>
                   </div>`
                : ""
            }
            <div class="total-row">
              <span>Total (USD):</span>
              <span>$${sale.totals.usd.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Total (LBP):</span>
              <span>${sale.totals.lbp.toLocaleString()}</span>
            </div>
            <div class="total-row grand">
              <span>TOTAL:</span>
              <span>$${sale.totals.usd.toFixed(2)}</span>
            </div>
          </div>

          <div class="payment-info">
            <div class="payment-row">
              <span>Payment Method:</span>
              <span>${
                sale.paymentMethod?.toUpperCase().replace("_", " ") || "N/A"
              }</span>
            </div>
            <div class="payment-row">
              <span>Amount Paid (${sale.paymentCurrency}):</span>
              <span>${
                sale.paymentCurrency === Currency.USD
                  ? "$" + amountPaidUsd.toFixed(2)
                  : amountPaidLbp.toLocaleString() + " LBP"
              }</span>
            </div>
            ${
              changeUsd > 0.01 || changeLbp > 1
                ? `
              <div class="payment-row change">
                <span>CHANGE (USD):</span>
                <span>$${changeUsd.toFixed(2)}</span>
              </div>
              <div class="payment-row change">
                <span>CHANGE (LBP):</span>
                <span>${Math.round(changeLbp).toLocaleString()} LBP</span>
              </div>
            `
                : ""
            }
          </div>

          ${
            sale.notes
              ? `
            <div style="margin-bottom: 15px; font-size: 11px;">
              <p><strong>Notes:</strong></p>
              <p>${sale.notes}</p>
            </div>
          `
              : ""
          }

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Exchange Rate: 1 USD = ${rate.toLocaleString()} LBP</p>
            <p style="margin-top: 10px;">***</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const change = calculateChange();

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
      field: "discounts",
      headerName: "Savings",
      width: 100,
      renderCell: (params) => {
        const itemDiscounts = params.row.totalItemDiscounts?.usd || 0;
        const saleDiscount = params.row.saleDiscount?.amount?.usd || 0;
        const totalSavings = itemDiscounts + saleDiscount;

        if (totalSavings > 0) {
          return (
            <Chip
              label={`$${totalSavings.toFixed(2)}`}
              color="success"
              size="small"
            />
          );
        }
        return "-";
      },
    },
    {
      field: "totals",
      headerName: "Total (USD)",
      width: 120,
      renderCell: (params) => `$${params.row.totals.usd.toFixed(2)}`,
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
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
      field: "paymentMethod",
      headerName: "Payment",
      width: 120,
      renderCell: (params) => params.row.paymentMethod || "-",
    },
    {
      field: "createdAt",
      headerName: "Date",
      width: 150,
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
      headerName: "Actions",
      width: 150,
      renderCell: (params) => (
        <Box>
          {params.row.status === SaleStatus.PENDING && (
            <>
              <Tooltip title="Process Payment">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => handleOpenPayDialog(params.row)}
                >
                  <Payment fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancel Sale">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleCancel(params.row.id)}
                >
                  <Cancel fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          {params.row.status === SaleStatus.PAID && (
            <Tooltip title="Print Receipt">
              <IconButton
                size="small"
                color="primary"
                onClick={() => handlePrintReceipt(params.row)}
              >
                <Print fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Sales History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and manage all sales transactions
          </Typography>
        </Box>
      </Box>

      <Card sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              placeholder="Search by invoice or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              select
              label="Status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as SaleStatus | "")
              }
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value={SaleStatus.PAID}>Paid</MenuItem>
              <MenuItem value={SaleStatus.PENDING}>Pending</MenuItem>
              <MenuItem value={SaleStatus.CANCELLED}>Cancelled</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <ToggleButtonGroup
                value={dateFilterType}
                exclusive
                onChange={(_, value) => value && setDateFilterType(value)}
                size="small"
              >
                <ToggleButton value="daily">
                  <CalendarToday sx={{ mr: 0.5, fontSize: 18 }} />
                  Daily
                </ToggleButton>
                <ToggleButton value="range">Range</ToggleButton>
              </ToggleButtonGroup>
              {dateFilterType === "daily" ? (
                <TextField
                  type="date"
                  size="small"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  sx={{ flexGrow: 1 }}
                />
              ) : (
                <>
                  <TextField
                    type="date"
                    size="small"
                    value={dateRange.startDate}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, startDate: e.target.value })
                    }
                    sx={{ flexGrow: 1 }}
                  />
                  <TextField
                    type="date"
                    size="small"
                    value={dateRange.endDate}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, endDate: e.target.value })
                    }
                    sx={{ flexGrow: 1 }}
                  />
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </Card>

      <Card>
        <DataGrid
          rows={salesData?.data || []}
          columns={columns}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          rowCount={salesData?.pagination.total || 0}
          pageSizeOptions={[5, 10, 25, 50]}
          paginationMode="server"
          autoHeight
          disableRowSelectionOnClick
        />
      </Card>

      <Dialog
        open={openPayDialog}
        onClose={() => setOpenPayDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Process Payment</DialogTitle>
        <DialogContent>
          {selectedSale && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2" fontWeight={600}>
                  Invoice: {selectedSale.invoiceNumber}
                </Typography>
                <Typography variant="body2">
                  Customer: {selectedSale.customer?.name || "Walk-in"}
                </Typography>
              </Alert>

              <Grid container spacing={2}>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    select
                    label="Payment Method"
                    value={paymentData.paymentMethod}
                    onChange={(e) =>
                      setPaymentData({
                        ...paymentData,
                        paymentMethod: e.target.value as PaymentMethod,
                      })
                    }
                  >
                    <MenuItem value={PaymentMethod.CASH}>Cash</MenuItem>
                    <MenuItem value={PaymentMethod.CARD}>Card</MenuItem>
                    <MenuItem value={PaymentMethod.BANK_TRANSFER}>
                      Bank Transfer
                    </MenuItem>
                  </TextField>
                </Grid>

                <Grid size={12}>
                  <TextField
                    fullWidth
                    select
                    label="Currency"
                    value={paymentData.paymentCurrency}
                    onChange={(e) => {
                      const currency = e.target.value as Currency;
                      setPaymentData({
                        ...paymentData,
                        paymentCurrency: currency,
                        amount:
                          currency === Currency.USD
                            ? selectedSale.totals.usd
                            : selectedSale.totals.lbp,
                      });
                    }}
                  >
                    <MenuItem value={Currency.USD}>USD</MenuItem>
                    <MenuItem value={Currency.LBP}>LBP</MenuItem>
                  </TextField>
                </Grid>

                <Grid size={12}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Amount Received"
                    value={paymentData.amount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      setPaymentData({
                        ...paymentData,
                        amount: Number(e.target.value),
                      })
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          {paymentData.paymentCurrency === Currency.USD
                            ? "$"
                            : "LBP"}
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid size={12}>
                  <Card sx={{ bgcolor: "background.default", p: 2 }}>
                    {(selectedSale.totalItemDiscounts || selectedSale.saleDiscount) && (
                      <>
                        {selectedSale.subtotalBeforeDiscount && (
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              Subtotal:
                            </Typography>
                            <Typography variant="body2">
                              ${selectedSale.subtotalBeforeDiscount.usd.toFixed(2)}
                            </Typography>
                          </Box>
                        )}
                        {selectedSale.totalItemDiscounts && selectedSale.totalItemDiscounts.usd > 0 && (
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                            <Typography variant="body2" color="success.main">
                              Item Discounts:
                            </Typography>
                            <Typography variant="body2" color="success.main">
                              -${selectedSale.totalItemDiscounts.usd.toFixed(2)}
                            </Typography>
                          </Box>
                        )}
                        {selectedSale.saleDiscount && (
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                            <Typography variant="body2" color="success.main">
                              {selectedSale.saleDiscount.discountName}:
                            </Typography>
                            <Typography variant="body2" color="success.main">
                              -${selectedSale.saleDiscount.amount.usd.toFixed(2)}
                            </Typography>
                          </Box>
                        )}
                        <Box sx={{ borderTop: 1, borderColor: "divider", pt: 1, mt: 1, mb: 1 }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Typography variant="body2" fontWeight={600} color="success.main">
                              Total Savings:
                            </Typography>
                            <Typography variant="body2" fontWeight={600} color="success.main">
                              ${((selectedSale.totalItemDiscounts?.usd || 0) + (selectedSale.saleDiscount?.amount?.usd || 0)).toFixed(2)}
                            </Typography>
                          </Box>
                        </Box>
                      </>
                    )}
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Amount Due:
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      ${selectedSale.totals.usd.toFixed(2)} USD
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedSale.totals.lbp.toLocaleString()} LBP
                    </Typography>
                  </Card>
                </Grid>

                {change.usd > 0.01 && (
                  <Grid size={12}>
                    <Card sx={{ bgcolor: "success.light", p: 2 }}>
                      <Typography variant="body2" fontWeight={600} gutterBottom>
                        Change to Return:
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight={700}
                        color="success.dark"
                      >
                        ${change.usd.toFixed(2)} USD
                      </Typography>
                      <Typography
                        variant="body1"
                        fontWeight={600}
                        color="success.dark"
                      >
                        {Math.round(change.lbp).toLocaleString()} LBP
                      </Typography>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPayDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handlePay}
            disabled={payMutation.isPending}
          >
            {payMutation.isPending ? "Processing..." : "Process Payment"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalesHistory;
