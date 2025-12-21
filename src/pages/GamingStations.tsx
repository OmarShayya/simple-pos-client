import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Autocomplete,
  Alert,
  CircularProgress,
  Divider,
  InputAdornment,
  Tooltip,
  FormControlLabel,
  Switch,
} from "@mui/material";
import {
  Computer,
  PlayArrow,
  Stop,
  Timer,
  AttachMoney,
  Person,
  Receipt,
  ShoppingCart,
  AccessTime,
  Info,
  Payment,
  SportsEsports,
  History,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { gamingApi } from "@/api/gaming.api";
import { customersApi } from "@/api/customers.api";
import { exchangeRateApi } from "@/api/exchangeRate.api";
import { discountsApi } from "@/api/discounts.api";
import { salesApi } from "@/api/sales.api";
import { PC, PCStatus, GamingSession } from "@/types/gaming.types";
import { Customer } from "@/types/customer.types";
import { PaymentMethod, Currency } from "@/types/sale.types";
import { Discount } from "@/types/discount.types";
import { toast } from "react-toastify";
import { handleApiError } from "@/utils/errorHandler";
import { formatDistanceToNow } from "date-fns";

const calculateSessionCost = (session: GamingSession) => {
  const now = new Date();
  const startTime = new Date(session.startTime);
  const durationMs = now.getTime() - startTime.getTime();
  const durationMinutes = Math.floor(durationMs / (1000 * 60));
  const durationHours = durationMs / (1000 * 60 * 60);

  // Handle case where hourlyRate might be undefined
  const hourlyRate = session.hourlyRate || { usd: 0, lbp: 0 };

  return {
    duration: durationMinutes,
    cost: {
      usd: Math.round(hourlyRate.usd * durationHours * 100) / 100,
      lbp: Math.round(hourlyRate.lbp * durationHours),
    },
  };
};

const GamingStations: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [startDialog, setStartDialog] = useState(false);
  const [endDialog, setEndDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [postSessionDialog, setPostSessionDialog] = useState(false);
  const [selectedPC, setSelectedPC] = useState<PC | null>(null);
  const [selectedSession, setSelectedSession] = useState<GamingSession | null>(
    null
  );
  const [, setUpdateTrigger] = useState(0);

  const [startData, setStartData] = useState({
    selectedCustomer: null as Customer | null,
    customerName: "",
    notes: "",
    createSale: true,
  });

  const [paymentData, setPaymentData] = useState({
    paymentMethod: PaymentMethod.CASH,
    paymentCurrency: Currency.USD,
    amount: 0,
  });

  const [selectedDiscountId, setSelectedDiscountId] = useState<string>("");
  const [gamingDiscounts, setGamingDiscounts] = useState<Discount[]>([]);

  const { data: pcsData, isLoading: loadingPCs } = useQuery({
    queryKey: ["gaming-pcs"],
    queryFn: () => gamingApi.getAllPCs({ limit: 100 }),
    refetchInterval: 5000,
  });

  const { data: activeSessions, isLoading: loadingActiveSessions } = useQuery({
    queryKey: ["active-gaming-sessions"],
    queryFn: gamingApi.getActiveSessions,
    refetchInterval: 5000,
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-all"],
    queryFn: () => customersApi.getAll({ limit: 1000 }),
  });

  const { data: exchangeRate } = useQuery({
    queryKey: ["exchange-rate"],
    queryFn: exchangeRateApi.getCurrentRate,
  });

  const { data: todayStats } = useQuery({
    queryKey: ["gaming-today-stats"],
    queryFn: gamingApi.getTodayStats,
    refetchInterval: 10000,
  });

  useEffect(() => {
    const fetchGamingDiscounts = async () => {
      try {
        const discounts = await discountsApi.getActiveForGamingSession();
        setGamingDiscounts(discounts);
      } catch (error) {
        console.error("Failed to fetch gaming discounts:", error);
      }
    };
    fetchGamingDiscounts();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateTrigger(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const startSessionMutation = useMutation({
    mutationFn: gamingApi.startSession,
    onSuccess: (session) => {
      const message = session.sale
        ? `Gaming session started! Invoice: ${session.sale.invoiceNumber}`
        : "Gaming session started!";
      toast.success(message);
      setStartDialog(false);
      resetStartData();
      queryClient.invalidateQueries({ queryKey: ["gaming-pcs"] });
      queryClient.invalidateQueries({ queryKey: ["active-gaming-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["gaming-today-stats"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const endSessionMutation = useMutation({
    mutationFn: ({ sessionId, discountId }: { sessionId: string; discountId?: string }) =>
      gamingApi.endSession(sessionId, discountId ? { discountId } : undefined),
    onSuccess: (session) => {
      toast.success(
        `Session ended! Duration: ${Math.floor(session.duration! / 60)}h ${
          session.duration! % 60
        }m - Total: $${(session.finalAmount || session.totalCost)?.usd.toFixed(2)}`
      );
      setEndDialog(false);
      setSelectedDiscountId("");
      setSelectedSession(session);
      const finalAmount = session.finalAmount || session.totalCost!;
      setPaymentData({
        paymentMethod: PaymentMethod.CASH,
        paymentCurrency: Currency.USD,
        amount: finalAmount.usd,
      });
      setPostSessionDialog(true);
      queryClient.invalidateQueries({ queryKey: ["gaming-pcs"] });
      queryClient.invalidateQueries({ queryKey: ["active-gaming-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["gaming-today-stats"] });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const paymentMutation = useMutation({
    mutationFn: ({ saleId, data }: { saleId: string; data: any }) =>
      salesApi.pay(saleId, data),
    onSuccess: () => {
      toast.success("Payment processed successfully!");
      setPaymentDialog(false);
      setSelectedSession(null);
      queryClient.invalidateQueries({ queryKey: ["gaming-pcs"] });
      queryClient.invalidateQueries({ queryKey: ["active-gaming-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["gaming-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["gaming-today-stats"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const standalonePaymentMutation = useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: { paymentMethod: PaymentMethod; paymentCurrency: Currency; amount: number } }) =>
      gamingApi.processPayment(sessionId, data),
    onSuccess: () => {
      toast.success("Payment processed successfully!");
      setPaymentDialog(false);
      setSelectedSession(null);
      queryClient.invalidateQueries({ queryKey: ["gaming-pcs"] });
      queryClient.invalidateQueries({ queryKey: ["active-gaming-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["gaming-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["gaming-today-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const resetStartData = () => {
    setStartData({
      selectedCustomer: null,
      customerName: "",
      notes: "",
      createSale: true,
    });
    setSelectedPC(null);
  };

  const handleStartSession = () => {
    if (!selectedPC) return;

    startSessionMutation.mutate({
      pcId: selectedPC.id,
      customerId: startData.selectedCustomer?.id,
      customerName:
        startData.selectedCustomer?.name || startData.customerName || "Walk-in",
      createSale: startData.createSale,
      notes: startData.notes,
    });
  };

  const handleEndSession = (session: GamingSession) => {
    console.log("Ending session", session);
    setSelectedSession(session);
    setEndDialog(true);
  };

  const confirmEndSession = () => {
    if (!selectedSession) return;
    endSessionMutation.mutate({
      sessionId: selectedSession.id,
      discountId: selectedDiscountId || undefined,
    });
  };

  const handleProcessPayment = () => {
    if (!selectedSession) {
      toast.error("No session selected");
      return;
    }

    const amountDue = selectedSession.finalAmount || selectedSession.totalCost!;
    const totalDue =
      paymentData.paymentCurrency === Currency.USD
        ? amountDue.usd
        : amountDue.lbp;

    if (paymentData.amount < totalDue) {
      toast.error("Payment amount is less than total due");
      return;
    }

    if (selectedSession.sale) {
      // Session with linked sale - pay via sales API
      paymentMutation.mutate({
        saleId: selectedSession.sale.id,
        data: paymentData,
      });
    } else {
      // Standalone session - pay via gaming API
      standalonePaymentMutation.mutate({
        sessionId: selectedSession.id,
        data: paymentData,
      });
    }
  };

  const calculateChange = () => {
    if (!selectedSession || !selectedSession.totalCost)
      return { usd: 0, lbp: 0 };

    const rate = exchangeRate?.rate || 89500;
    const amountDue = selectedSession.finalAmount || selectedSession.totalCost;

    if (paymentData.paymentCurrency === Currency.USD) {
      console.log("Calculating USD change", selectedSession);
      const changeUsd = paymentData.amount - amountDue.usd;
      return {
        usd: changeUsd,
        lbp: changeUsd * rate,
      };
    } else {
      const changeLbp = paymentData.amount - amountDue.lbp;
      return {
        usd: changeLbp / rate,
        lbp: changeLbp,
      };
    }
  };

  const getPCStatus = (pc: PC) => {
    const activeSession = activeSessions?.find((s) => s.pc.id === pc.id);
    if (activeSession) {
      return { session: activeSession, status: PCStatus.OCCUPIED };
    }
    return { session: null, status: pc.status };
  };

  const getStatusColor = (status: PCStatus) => {
    switch (status) {
      case PCStatus.AVAILABLE:
        return "success";
      case PCStatus.OCCUPIED:
        return "error";
      case PCStatus.MAINTENANCE:
        return "warning";
      default:
        return "default";
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const change = calculateChange();

  if (loadingPCs || loadingActiveSessions) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Gaming Stations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor and manage PC gaming sessions
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Card sx={{ px: 3, py: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              Active Sessions
            </Typography>
            <Typography variant="h6" fontWeight="bold" color="primary">
              {todayStats?.activeSessions || 0}
            </Typography>
          </Card>
          <Card sx={{ px: 3, py: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              Today's Revenue
            </Typography>
            <Typography variant="h6" fontWeight="bold" color="success.main">
              ${(todayStats?.totalRevenue.usd || 0).toFixed(2)}
            </Typography>
          </Card>
          <Button
            variant="outlined"
            startIcon={<History />}
            onClick={() => navigate("/gaming/history")}
          >
            History
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {pcsData?.data
          .filter((pc) => pc.isActive)
          .map((pc) => {
            const { session, status } = getPCStatus(pc);
            const isOccupied = status === PCStatus.OCCUPIED && session;

            return (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={pc.id}>
                <Card
                  sx={{
                    height: "100%",
                    border: 2,
                    borderColor: isOccupied
                      ? "error.main"
                      : status === PCStatus.AVAILABLE
                      ? "success.main"
                      : "warning.main",
                    position: "relative",
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "start",
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Computer
                          sx={{
                            fontSize: 32,
                            color: isOccupied ? "error.main" : "text.secondary",
                          }}
                        />
                        <Box>
                          <Typography variant="h6" fontWeight="bold">
                            {pc.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {pc.pcNumber}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={status.toUpperCase()}
                        color={getStatusColor(status) as any}
                        size="small"
                      />
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {isOccupied && session ? (
                      (() => {
                        const { duration, cost } = calculateSessionCost(session);
                        return (
                          <Box>
                            <Box sx={{ mb: 2 }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                  mb: 1,
                                }}
                              >
                                <Person sx={{ fontSize: 18 }} />
                                <Typography variant="body2" fontWeight={600}>
                                  {session.customerName}
                                </Typography>
                                {!session.sale && (
                                  <Chip
                                    label="Standalone"
                                    size="small"
                                    color="info"
                                    variant="outlined"
                                    sx={{ ml: 0.5, height: 20, fontSize: "0.65rem" }}
                                  />
                                )}
                              </Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                  mb: 1,
                                }}
                              >
                                <Timer sx={{ fontSize: 18 }} />
                                <Typography variant="body2">
                                  {formatDuration(duration)}
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <AttachMoney sx={{ fontSize: 18 }} />
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <Typography
                                    variant="body2"
                                    color="error"
                                    fontWeight={600}
                                  >
                                    ${cost.usd.toFixed(2)} USD
                                  </Typography>
                                  <Tooltip title="Live cost - updating every second">
                                    <AccessTime
                                      sx={{
                                        fontSize: 14,
                                        color: "error.main",
                                        animation: "pulse 2s ease-in-out infinite",
                                        "@keyframes pulse": {
                                          "0%, 100%": { opacity: 1 },
                                          "50%": { opacity: 0.4 },
                                        },
                                      }}
                                    />
                                  </Tooltip>
                                </Box>
                              </Box>
                            </Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              mb={1}
                            >
                              Started{" "}
                              {formatDistanceToNow(new Date(session.startTime), {
                                addSuffix: true,
                              })}
                            </Typography>
                            <Button
                              fullWidth
                              variant="contained"
                              color="error"
                              startIcon={<Stop />}
                              onClick={() => handleEndSession(session)}
                            >
                              End Session
                            </Button>
                          </Box>
                        );
                      })()
                    ) : (
                      <Box>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Hourly Rate:
                          </Typography>
                          <Typography
                            variant="h6"
                            color="primary"
                            fontWeight={600}
                          >
                            ${pc.hourlyRate.usd.toFixed(2)}/hr
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {pc.hourlyRate.lbp.toLocaleString()} LBP/hr
                          </Typography>
                        </Box>
                        {status === PCStatus.AVAILABLE && (
                          <Button
                            fullWidth
                            variant="contained"
                            color="success"
                            startIcon={<PlayArrow />}
                            onClick={() => {
                              setSelectedPC(pc);
                              setStartDialog(true);
                            }}
                          >
                            Start Session
                          </Button>
                        )}
                        {status === PCStatus.MAINTENANCE && (
                          <Alert severity="warning" sx={{ mt: 1 }}>
                            Under Maintenance
                          </Alert>
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
      </Grid>

      <Dialog
        open={startDialog}
        onClose={() => setStartDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Start Gaming Session</DialogTitle>
        <DialogContent>
          {selectedPC && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight={600}>
                  {selectedPC.name} ({selectedPC.pcNumber})
                </Typography>
                <Typography variant="body2">
                  Rate: ${selectedPC.hourlyRate.usd}/hr |{" "}
                  {selectedPC.hourlyRate.lbp.toLocaleString()} LBP/hr
                </Typography>
              </Alert>

              <Box sx={{ mb: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={startData.createSale}
                      onChange={(e) =>
                        setStartData({ ...startData, createSale: e.target.checked })
                      }
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Create Order
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Create a sale invoice for this session
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              {startData.createSale ? (
                <Alert severity="success" icon={<Receipt />} sx={{ mb: 3 }}>
                  <Typography variant="caption" fontWeight={600}>
                    A sale invoice will be created when you start this session.
                  </Typography>
                  <Typography variant="caption" display="block">
                    You can add items to the sale during gameplay and pay everything together.
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="info" icon={<SportsEsports />} sx={{ mb: 3 }}>
                  <Typography variant="caption" fontWeight={600}>
                    Standalone gaming session (no order).
                  </Typography>
                  <Typography variant="caption" display="block">
                    Payment will be processed directly when the session ends.
                  </Typography>
                </Alert>
              )}

              <Grid container spacing={2}>
                <Grid size={12}>
                  <Autocomplete
                    options={customers?.data || []}
                    getOptionLabel={(option) =>
                      `${option.name} (${option.phone})`
                    }
                    value={startData.selectedCustomer}
                    onChange={(_, value) =>
                      setStartData({ ...startData, selectedCustomer: value })
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Customer (Optional)"
                        fullWidth
                      />
                    )}
                  />
                </Grid>

                {!startData.selectedCustomer && (
                  <Grid size={12}>
                    <TextField
                      fullWidth
                      label="Customer Name (Walk-in)"
                      value={startData.customerName}
                      onChange={(e) =>
                        setStartData({
                          ...startData,
                          customerName: e.target.value,
                        })
                      }
                      placeholder="Enter customer name or leave blank"
                    />
                  </Grid>
                )}

                <Grid size={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Notes (Optional)"
                    value={startData.notes}
                    onChange={(e) =>
                      setStartData({ ...startData, notes: e.target.value })
                    }
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStartDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleStartSession}
            disabled={startSessionMutation.isPending}
          >
            {startSessionMutation.isPending ? "Starting..." : "Start Session"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={endDialog}
        onClose={() => setEndDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>End Gaming Session</DialogTitle>
        <DialogContent>
          {selectedSession && (() => {
            const { cost } = calculateSessionCost(selectedSession);
            return (
              <Box sx={{ mt: 2 }}>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2" fontWeight={600}>
                    PC: {selectedSession.pc.name}
                  </Typography>
                  <Typography variant="body2">
                    Customer: {selectedSession.customerName}
                  </Typography>
                  <Typography variant="body2">
                    Started:{" "}
                    {formatDistanceToNow(new Date(selectedSession.startTime), {
                      addSuffix: true,
                    })}
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="primary" sx={{ mt: 1 }}>
                    Estimated Cost: ${cost.usd.toFixed(2)}
                  </Typography>
                </Alert>

              {gamingDiscounts.length > 0 && (
                <TextField
                  select
                  fullWidth
                  label="Apply Discount (Optional)"
                  value={selectedDiscountId}
                  onChange={(e) => setSelectedDiscountId(e.target.value)}
                  sx={{ mb: 2 }}
                >
                  <MenuItem value="">No Discount</MenuItem>
                  {gamingDiscounts.map(discount => (
                    <MenuItem key={discount.id} value={discount.id}>
                      {discount.name} ({discount.value}% off)
                    </MenuItem>
                  ))}
                </TextField>
              )}

                {selectedDiscountId && (
                  <Box sx={{ bgcolor: "success.light", p: 2, borderRadius: 1, mb: 2 }}>
                    <Typography variant="body2" fontWeight={600} color="success.dark">
                      Discount Applied: {gamingDiscounts.find(d => d.id === selectedDiscountId)?.name}
                    </Typography>
                    <Typography variant="body2" color="success.dark">
                      You save: {gamingDiscounts.find(d => d.id === selectedDiscountId)?.value}%
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="success.dark" sx={{ mt: 1 }}>
                      Final Cost: ${(cost.usd * (1 - (gamingDiscounts.find(d => d.id === selectedDiscountId)?.value || 0) / 100)).toFixed(2)}
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEndDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmEndSession}
            disabled={endSessionMutation.isPending}
          >
            {endSessionMutation.isPending ? "Ending..." : "End Session"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={paymentDialog}
        onClose={() => setPaymentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Process Payment</DialogTitle>
        <DialogContent>
          {selectedSession && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2" fontWeight={600}>
                  Session: {selectedSession.sessionNumber}
                </Typography>
                {selectedSession.sale && (
                  <Typography variant="body2" fontWeight={600}>
                    Invoice: {selectedSession.sale.invoiceNumber}
                  </Typography>
                )}
                <Typography variant="body2">
                  Duration: {formatDuration(selectedSession.duration!)}
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
                            ? selectedSession.totalCost?.usd || 0
                            : selectedSession.totalCost?.lbp || 0,
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
                    {selectedSession.discount && (
                      <>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Original Cost:
                        </Typography>
                        <Typography variant="body2" sx={{ textDecoration: "line-through" }}>
                          ${(selectedSession.totalCost?.usd || 0).toFixed(2)} USD
                        </Typography>
                        <Typography variant="body2" color="success.main" gutterBottom>
                          Discount ({selectedSession.discount.percentage}%): -${(selectedSession.discount.amount?.usd || 0).toFixed(2)}
                        </Typography>
                        <Divider sx={{ my: 1 }} />
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
                      ${(selectedSession.finalAmount?.usd || selectedSession.totalCost?.usd || 0).toFixed(2)} USD
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {(selectedSession.finalAmount?.lbp || selectedSession.totalCost?.lbp || 0).toLocaleString()} LBP
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
          <Button onClick={() => setPaymentDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleProcessPayment}
            disabled={paymentMutation.isPending || standalonePaymentMutation.isPending}
          >
            {paymentMutation.isPending || standalonePaymentMutation.isPending ? "Processing..." : "Process Payment"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={postSessionDialog}
        onClose={() => setPostSessionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Receipt color="primary" />
            Session Ended Successfully
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedSession && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="success" sx={{ mb: 3 }}>
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
                {selectedSession.sale ? (
                  <Typography variant="body2">
                    Invoice: {selectedSession.sale.invoiceNumber}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No order linked
                  </Typography>
                )}
                <Typography variant="body2">
                  Duration: {formatDuration(selectedSession.duration!)}
                </Typography>
                <Typography variant="body2" fontWeight={600} color="success.dark" sx={{ mt: 1 }}>
                  Amount: ${(selectedSession.finalAmount || selectedSession.totalCost)?.usd.toFixed(2)} USD
                </Typography>
                {selectedSession.discount && (
                  <Typography variant="body2" color="success.dark">
                    Discount Applied: {selectedSession.discount.percentage}% off
                  </Typography>
                )}
              </Alert>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                What would you like to do next?
              </Typography>

              <Grid container spacing={2}>
                <Grid size={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    size="large"
                    startIcon={<Payment />}
                    onClick={() => {
                      setPostSessionDialog(false);
                      setPaymentDialog(true);
                    }}
                  >
                    Pay Now
                  </Button>
                </Grid>
                {selectedSession.sale && (
                  <Grid size={12}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="primary"
                      size="large"
                      startIcon={<ShoppingCart />}
                      onClick={() => {
                        setPostSessionDialog(false);
                        navigate(`/sales?loadSale=${selectedSession.sale!.id}`);
                        toast.info(`Opening sale ${selectedSession.sale!.invoiceNumber}. Add items and complete payment.`);
                      }}
                    >
                      Add Items to Sale
                    </Button>
                  </Grid>
                )}
                <Grid size={12}>
                  <Button
                    fullWidth
                    variant="text"
                    size="large"
                    startIcon={<AccessTime />}
                    onClick={() => {
                      setPostSessionDialog(false);
                      setSelectedSession(null);
                      toast.info(
                        selectedSession.sale
                          ? "Sale saved as pending. You can process payment later."
                          : "Session saved as unpaid. You can process payment from Gaming History."
                      );
                    }}
                  >
                    Pay Later
                  </Button>
                </Grid>
              </Grid>

              <Alert severity="info" icon={<Info />} sx={{ mt: 3 }}>
                <Typography variant="caption">
                  {selectedSession.sale
                    ? `This session is linked to sale ${selectedSession.sale.invoiceNumber}. You can add items to the sale before payment or pay it later from the Sales page.`
                    : "This is a standalone session. You can process payment now or later from Gaming History."}
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default GamingStations;
