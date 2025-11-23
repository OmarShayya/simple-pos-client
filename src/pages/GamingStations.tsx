import React, { useState } from "react";
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
} from "@mui/material";
import {
  Computer,
  PlayArrow,
  Stop,
  Timer,
  AttachMoney,
  Person,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gamingApi } from "@/api/gaming.api";
import { customersApi } from "@/api/customers.api";
import { exchangeRateApi } from "@/api/exchangeRate.api";
import { PC, PCStatus, GamingSession } from "@/types/gaming.types";
import { Customer } from "@/types/customer.types";
import { PaymentMethod, Currency } from "@/types/sale.types";
import { toast } from "react-toastify";
import { handleApiError } from "@/utils/errorHandler";
import { formatDistanceToNow } from "date-fns";

const GamingStations: React.FC = () => {
  const queryClient = useQueryClient();
  const [startDialog, setStartDialog] = useState(false);
  const [endDialog, setEndDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [selectedPC, setSelectedPC] = useState<PC | null>(null);
  const [selectedSession, setSelectedSession] = useState<GamingSession | null>(
    null
  );

  const [startData, setStartData] = useState({
    selectedCustomer: null as Customer | null,
    customerName: "",
    notes: "",
  });

  const [paymentData, setPaymentData] = useState({
    paymentMethod: PaymentMethod.CASH,
    paymentCurrency: Currency.USD,
    amount: 0,
  });

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

  const startSessionMutation = useMutation({
    mutationFn: gamingApi.startSession,
    onSuccess: () => {
      toast.success("Gaming session started!");
      setStartDialog(false);
      resetStartData();
      queryClient.invalidateQueries({ queryKey: ["gaming-pcs"] });
      queryClient.invalidateQueries({ queryKey: ["active-gaming-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["gaming-today-stats"] });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const endSessionMutation = useMutation({
    mutationFn: gamingApi.endSession,
    onSuccess: (session) => {
      toast.success(
        `Session ended! Duration: ${Math.floor(session.duration! / 60)}h ${
          session.duration! % 60
        }m`
      );
      setEndDialog(false);
      setSelectedSession(session);
      setPaymentData({
        paymentMethod: PaymentMethod.CASH,
        paymentCurrency: Currency.USD,
        amount: session.totalCost!.usd,
      });
      setPaymentDialog(true);
      queryClient.invalidateQueries({ queryKey: ["gaming-pcs"] });
      queryClient.invalidateQueries({ queryKey: ["active-gaming-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["gaming-today-stats"] });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      gamingApi.processPayment(id, data),
    onSuccess: () => {
      toast.success("Payment processed successfully!");
      setPaymentDialog(false);
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
    endSessionMutation.mutate(selectedSession.id);
  };

  const handleProcessPayment = () => {
    if (!selectedSession) return;

    const totalDue =
      paymentData.paymentCurrency === Currency.USD
        ? selectedSession.totalCost!.usd
        : selectedSession.totalCost!.lbp;

    if (paymentData.amount < totalDue) {
      toast.error("Payment amount is less than total due");
      return;
    }

    paymentMutation.mutate({
      id: selectedSession.id,
      data: paymentData,
    });
  };

  const calculateChange = () => {
    if (!selectedSession || !selectedSession.totalCost)
      return { usd: 0, lbp: 0 };

    const rate = exchangeRate?.rate || 89500;

    if (paymentData.paymentCurrency === Currency.USD) {
      console.log("Calculating USD change", selectedSession);
      const changeUsd = paymentData.amount - selectedSession.totalCost.usd;
      return {
        usd: changeUsd,
        lbp: changeUsd * rate,
      };
    } else {
      const changeLbp = paymentData.amount - selectedSession.totalCost.lbp;
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
        <Box sx={{ display: "flex", gap: 2 }}>
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
                              {formatDuration(session.currentDuration!)}
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
                            <Typography
                              variant="body2"
                              color="error"
                              fontWeight={600}
                            >
                              ${session.currentCost!.usd.toFixed(2)} USD
                            </Typography>
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
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2" fontWeight={600}>
                  {selectedPC.name} ({selectedPC.pcNumber})
                </Typography>
                <Typography variant="body2">
                  Rate: ${selectedPC.hourlyRate.usd}/hr |{" "}
                  {selectedPC.hourlyRate.lbp.toLocaleString()} LBP/hr
                </Typography>
              </Alert>

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
          {selectedSession && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Are you sure you want to end this session?
                </Typography>
              </Alert>

              <Box
                sx={{ bgcolor: "background.default", p: 2, borderRadius: 1 }}
              >
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  PC: {selectedSession.pc.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Customer: {selectedSession.customerName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Started:{" "}
                  {formatDistanceToNow(new Date(selectedSession.startTime), {
                    addSuffix: true,
                  })}
                </Typography>
              </Box>
            </Box>
          )}
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
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Amount Due:
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      ${(selectedSession.totalCost?.usd || 0).toFixed(2)} USD
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {(selectedSession.totalCost?.lbp || 0).toLocaleString()} LBP
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
            disabled={paymentMutation.isPending}
          >
            {paymentMutation.isPending ? "Processing..." : "Process Payment"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GamingStations;
