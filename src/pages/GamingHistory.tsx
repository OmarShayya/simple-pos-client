import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  TextField,
  MenuItem,
  Chip,
  InputAdornment,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
} from "@mui/material";
import { Search, CalendarToday, Payment, SportsEsports } from "@mui/icons-material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gamingApi } from "@/api/gaming.api";
import { exchangeRateApi } from "@/api/exchangeRate.api";
import { salesApi } from "@/api/sales.api";
import { GamingSession, SessionStatus, SessionPaymentStatus } from "@/types/gaming.types";
import { PaymentMethod, Currency } from "@/types/sale.types";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { handleApiError } from "@/utils/errorHandler";

const GamingHistory: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SessionStatus | "">("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
    SessionPaymentStatus | ""
  >("");
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
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  // Payment dialog state
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<GamingSession | null>(null);
  const [paymentData, setPaymentData] = useState({
    paymentMethod: PaymentMethod.CASH,
    paymentCurrency: Currency.USD,
    amount: 0,
  });

  // Exchange rate query
  const { data: exchangeRate } = useQuery({
    queryKey: ["exchange-rate"],
    queryFn: exchangeRateApi.getCurrentRate,
  });

  // Payment mutation for sessions with linked sale
  const paymentMutation = useMutation({
    mutationFn: ({ saleId, data }: { saleId: string; data: typeof paymentData }) =>
      salesApi.pay(saleId, data),
    onSuccess: () => {
      toast.success("Payment processed successfully!");
      setPaymentDialog(false);
      setSelectedSession(null);
      queryClient.invalidateQueries({ queryKey: ["gaming-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["daily-report"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-report"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-report"] });
      queryClient.invalidateQueries({ queryKey: ["yearly-report"] });
      queryClient.invalidateQueries({ queryKey: ["daily-transactions"] });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  // Payment mutation for standalone sessions
  const standalonePaymentMutation = useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: { paymentMethod: PaymentMethod; paymentCurrency: Currency; amount: number } }) =>
      gamingApi.processPayment(sessionId, data),
    onSuccess: () => {
      toast.success("Payment processed successfully!");
      setPaymentDialog(false);
      setSelectedSession(null);
      queryClient.invalidateQueries({ queryKey: ["gaming-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["daily-report"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-report"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-report"] });
      queryClient.invalidateQueries({ queryKey: ["yearly-report"] });
      queryClient.invalidateQueries({ queryKey: ["daily-transactions"] });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const handleOpenPayment = (session: GamingSession) => {
    setSelectedSession(session);
    const amount = session.finalAmount || session.totalCost;
    setPaymentData({
      paymentMethod: PaymentMethod.CASH,
      paymentCurrency: Currency.USD,
      amount: amount?.usd || 0,
    });
    setPaymentDialog(true);
  };

  const handleProcessPayment = () => {
    if (!selectedSession) return;

    const amountDue = selectedSession.finalAmount || selectedSession.totalCost;
    const totalDue =
      paymentData.paymentCurrency === Currency.USD
        ? amountDue?.usd || 0
        : amountDue?.lbp || 0;

    if (paymentData.amount < totalDue) {
      toast.error("Payment amount is less than total due");
      return;
    }

    if (selectedSession.sale) {
      paymentMutation.mutate({
        saleId: selectedSession.sale.id,
        data: paymentData,
      });
    } else {
      standalonePaymentMutation.mutate({
        sessionId: selectedSession.id,
        data: paymentData,
      });
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getDateFilters = () => {
    if (dateFilterType === "daily") {
      return {
        startDate: selectedDate,
        endDate: selectedDate,
      };
    }
    return dateRange;
  };

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: [
      "gaming-sessions",
      paginationModel.page + 1,
      statusFilter,
      paymentStatusFilter,
      dateFilterType,
      selectedDate,
      dateRange,
    ],
    queryFn: () =>
      gamingApi.getAllSessions({
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        status: statusFilter || undefined,
        paymentStatus: paymentStatusFilter || undefined,
        ...getDateFilters(),
      }),
  });

  const columns: GridColDef[] = [
    {
      field: "sessionNumber",
      headerName: "Session #",
      width: 140,
    },
    {
      field: "sale",
      headerName: "Invoice",
      width: 140,
      renderCell: (params) =>
        params.row.sale ? params.row.sale.invoiceNumber : "-",
    },
    {
      field: "pc",
      headerName: "PC",
      width: 150,
      renderCell: (params) =>
        `${params.row.pc.name} (${params.row.pc.pcNumber})`,
    },
    {
      field: "customerName",
      headerName: "Customer",
      flex: 1,
    },
    {
      field: "duration",
      headerName: "Duration",
      width: 100,
      renderCell: (params) => formatDuration(params.row.duration),
    },
    {
      field: "discount",
      headerName: "Discount",
      width: 100,
      renderCell: (params) =>
        params.row.discount ? (
          <Chip
            label={`${params.row.discount.percentage}%`}
            color="success"
            size="small"
          />
        ) : (
          "-"
        ),
    },
    {
      field: "totalCost",
      headerName: "Amount (USD)",
      width: 120,
      renderCell: (params) => {
        const amount = params.row.finalAmount || params.row.totalCost;
        return amount ? `$${amount.usd.toFixed(2)}` : "-";
      },
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.row.status.toUpperCase()}
          color={
            params.row.status === SessionStatus.COMPLETED
              ? "success"
              : params.row.status === SessionStatus.ACTIVE
              ? "primary"
              : "default"
          }
          size="small"
        />
      ),
    },
    {
      field: "paymentStatus",
      headerName: "Payment",
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.row.paymentStatus.toUpperCase()}
          color={
            params.row.paymentStatus === SessionPaymentStatus.PAID
              ? "success"
              : "warning"
          }
          size="small"
        />
      ),
    },
    {
      field: "startTime",
      headerName: "Start Time",
      width: 150,
      renderCell: (params) =>
        new Date(params.row.startTime).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    {
      field: "actions",
      headerName: "",
      width: 80,
      sortable: false,
      renderCell: (params) => {
        const session = params.row as GamingSession;
        const canPay =
          session.status === SessionStatus.COMPLETED &&
          session.paymentStatus === SessionPaymentStatus.UNPAID;

        if (!canPay) return null;

        return (
          <Tooltip title="Process Payment">
            <IconButton
              size="small"
              color="success"
              onClick={() => handleOpenPayment(session)}
            >
              <Payment fontSize="small" />
            </IconButton>
          </Tooltip>
        );
      },
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Gaming Sessions History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View all gaming sessions and payments
          </Typography>
        </Box>
      </Box>

      <Card sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              placeholder="Search sessions..."
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
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              fullWidth
              select
              label="Status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as SessionStatus | "")
              }
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value={SessionStatus.ACTIVE}>Active</MenuItem>
              <MenuItem value={SessionStatus.COMPLETED}>Completed</MenuItem>
              <MenuItem value={SessionStatus.CANCELLED}>Cancelled</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              fullWidth
              select
              label="Payment"
              value={paymentStatusFilter}
              onChange={(e) =>
                setPaymentStatusFilter(
                  e.target.value as SessionPaymentStatus | ""
                )
              }
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value={SessionPaymentStatus.PAID}>Paid</MenuItem>
              <MenuItem value={SessionPaymentStatus.UNPAID}>Unpaid</MenuItem>
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
                      setDateRange({
                        ...dateRange,
                        startDate: e.target.value,
                      })
                    }
                    sx={{ flexGrow: 1 }}
                  />
                  <TextField
                    type="date"
                    size="small"
                    value={dateRange.endDate}
                    onChange={(e) =>
                      setDateRange({
                        ...dateRange,
                        endDate: e.target.value,
                      })
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
          rows={sessionsData?.data || []}
          columns={columns}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          rowCount={sessionsData?.pagination.total || 0}
          pageSizeOptions={[5, 10, 25, 50]}
          paginationMode="server"
          autoHeight
          disableRowSelectionOnClick
        />
      </Card>

      {/* Payment Dialog */}
      <Dialog
        open={paymentDialog}
        onClose={() => setPaymentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Payment color="success" />
            <Typography variant="h6">Process Payment</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedSession && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" icon={<SportsEsports />} sx={{ mb: 3 }}>
                <Typography variant="body2" fontWeight={600}>
                  Session: {selectedSession.sessionNumber}
                  {!selectedSession.sale && (
                    <Chip
                      label="Standalone"
                      size="small"
                      color="info"
                      sx={{ ml: 1, height: 18, fontSize: "0.65rem" }}
                    />
                  )}
                </Typography>
                <Typography variant="body2">
                  PC: {selectedSession.pc.name} ({selectedSession.pc.pcNumber})
                </Typography>
                <Typography variant="body2">
                  Duration: {formatDuration(selectedSession.duration)}
                </Typography>
                {selectedSession.discount && (
                  <Typography variant="body2" color="success.main">
                    Discount: {selectedSession.discount.percentage}% off
                  </Typography>
                )}
              </Alert>

              <Box
                sx={{
                  p: 2,
                  bgcolor: "success.50",
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "success.200",
                  mb: 3,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Amount Due
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  $
                  {(
                    selectedSession.finalAmount || selectedSession.totalCost
                  )?.usd.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {(
                    selectedSession.finalAmount || selectedSession.totalCost
                  )?.lbp.toLocaleString()}{" "}
                  LBP
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid size={6}>
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
                  </TextField>
                </Grid>
                <Grid size={6}>
                  <TextField
                    fullWidth
                    select
                    label="Currency"
                    value={paymentData.paymentCurrency}
                    onChange={(e) => {
                      const currency = e.target.value as Currency;
                      const amount =
                        selectedSession.finalAmount || selectedSession.totalCost;
                      setPaymentData({
                        ...paymentData,
                        paymentCurrency: currency,
                        amount:
                          currency === Currency.USD
                            ? amount?.usd || 0
                            : amount?.lbp || 0,
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
              </Grid>

              {paymentData.amount > 0 && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: "grey.100", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Change Due
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {paymentData.paymentCurrency === Currency.USD ? (
                      <>
                        $
                        {Math.max(
                          0,
                          paymentData.amount -
                            ((selectedSession.finalAmount ||
                              selectedSession.totalCost)?.usd || 0)
                        ).toFixed(2)}
                      </>
                    ) : (
                      <>
                        {Math.max(
                          0,
                          paymentData.amount -
                            ((selectedSession.finalAmount ||
                              selectedSession.totalCost)?.lbp || 0)
                        ).toLocaleString()}{" "}
                        LBP
                      </>
                    )}
                  </Typography>
                  {exchangeRate && paymentData.paymentCurrency === Currency.USD && (
                    <Typography variant="caption" color="text.secondary">
                      ~
                      {Math.max(
                        0,
                        (paymentData.amount -
                          ((selectedSession.finalAmount ||
                            selectedSession.totalCost)?.usd || 0)) *
                          exchangeRate.rate
                      ).toLocaleString()}{" "}
                      LBP
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleProcessPayment}
            disabled={paymentMutation.isPending || standalonePaymentMutation.isPending}
          >
            {paymentMutation.isPending || standalonePaymentMutation.isPending
              ? "Processing..."
              : "Process Payment"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GamingHistory;
