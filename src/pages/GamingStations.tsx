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
  Divider,
  InputAdornment,
  Tooltip,
  FormControlLabel,
  Switch,
  Skeleton,
  Stack,
  alpha,
  useTheme,
} from "@mui/material";
import {
  Computer,
  PlayArrow,
  Stop,
  Person,
  Receipt,
  ShoppingCart,
  AccessTime,
  Info,
  Payment,
  SportsEsports,
  History,
  EventAvailable,
} from "@mui/icons-material";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import type { StationType } from "@/types/reservation.types";
import { DEFAULT_TZ, fmtTime } from "@/utils/zonedTime";
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
import PageHeader from "@/components/common/PageHeader";
import StatusChip from "@/components/common/StatusChip";
import EmptyState from "@/components/common/EmptyState";
import { brand } from "@/theme/theme";

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
  const [quickModePCs, setQuickModePCs] = useState<Set<string>>(new Set());
  const [stationFilter, setStationFilter] = useState<"all" | "available" | "occupied" | "maintenance">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | StationType>("all");
  const theme = useTheme();

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
    onSuccess: (response) => {
      // Check if this is a quick mode response
      if ('quickMode' in response && response.quickMode) {
        toast.success("PC unlocked in quick mode!");
        setQuickModePCs((prev) => new Set(prev).add(response.pcId));
        setStartDialog(false);
        resetStartData();
      } else {
        // This is a regular GamingSession - type narrowing
        const session = response as GamingSession;
        const message = session.sale
          ? `Gaming session started! Invoice: ${session.sale.invoiceNumber}`
          : "Gaming session started!";
        toast.success(message);
        setStartDialog(false);
        resetStartData();
      }
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
    mutationFn: ({ saleId, data }: { saleId: string; data: Parameters<typeof salesApi.pay>[1] }) =>
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
      queryClient.invalidateQueries({ queryKey: ["daily-report"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-report"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-report"] });
      queryClient.invalidateQueries({ queryKey: ["yearly-report"] });
      queryClient.invalidateQueries({ queryKey: ["daily-transactions"] });
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
      queryClient.invalidateQueries({ queryKey: ["daily-report"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-report"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-report"] });
      queryClient.invalidateQueries({ queryKey: ["yearly-report"] });
      queryClient.invalidateQueries({ queryKey: ["daily-transactions"] });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const unlockPCMutation = useMutation({
    mutationFn: (pcId: string) => gamingApi.unlockPC(pcId),
    onSuccess: (_, pcId) => {
      toast.success("PC unlocked successfully!");
      setQuickModePCs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(pcId);
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: ["gaming-pcs"] });
      queryClient.invalidateQueries({ queryKey: ["active-gaming-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["gaming-today-stats"] });
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

  const handleEndQuickMode = (pcId: string) => {
    unlockPCMutation.mutate(pcId);
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


  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const change = calculateChange();

  const stationStates = (pcsData?.data || [])
    .filter((pc) => pc.isActive)
    .map((pc) => {
      const { session, status } = getPCStatus(pc);
      const isQuickMode = quickModePCs.has(pc.id);
      const isOccupied = Boolean((status === PCStatus.OCCUPIED && session) || isQuickMode);
      const displayStatus = isQuickMode ? PCStatus.OCCUPIED : status;
      return { pc, session, isQuickMode, isOccupied, displayStatus };
    });

  const typeCounts = {
    pc: stationStates.filter((s) => (s.pc.type ?? "pc") === "pc").length,
    playstation: stationStates.filter((s) => s.pc.type === "playstation").length,
  };
  const typedStations = stationStates.filter((s) => typeFilter === "all" || (s.pc.type ?? "pc") === typeFilter);

  const counts = {
    all: typedStations.length,
    available: typedStations.filter((s) => !s.isOccupied && s.displayStatus === PCStatus.AVAILABLE).length,
    occupied: typedStations.filter((s) => s.isOccupied).length,
    maintenance: typedStations.filter((s) => s.displayStatus === PCStatus.MAINTENANCE).length,
  };

  /** Upcoming (not yet checked-in) booking on a station, if any. */
  const bookingOf = (pc: PC) =>
    pc.upcomingReservation && pc.upcomingReservation.status === "confirmed" ? pc.upcomingReservation : undefined;
  const minutesUntil = (iso: string) => Math.round((new Date(iso).getTime() - Date.now()) / 60_000);

  const visibleStations = typedStations.filter((s) => {
    if (stationFilter === "all") return true;
    if (stationFilter === "occupied") return s.isOccupied;
    if (stationFilter === "available") return !s.isOccupied && s.displayStatus === PCStatus.AVAILABLE;
    return s.displayStatus === PCStatus.MAINTENANCE;
  });

  if (loadingPCs || loadingActiveSessions) {
    return (
      <Box>
        <Skeleton variant="rounded" height={44} sx={{ mb: 2, maxWidth: 420 }} />
        <Grid container spacing={2}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Skeleton variant="rounded" height={230} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  const filterChips: { key: typeof stationFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "available", label: "Free", count: counts.available },
    { key: "occupied", label: "In use", count: counts.occupied },
    { key: "maintenance", label: "Maintenance", count: counts.maintenance },
  ];

  return (
    <Box>
      <PageHeader
        title="Gaming stations"
        subtitle="Start, end and charge sessions. Costs update live."
        actions={
          <>
            <Button variant="outlined" startIcon={<EventAvailable />} onClick={() => navigate("/reservations")}>
              Reservations
            </Button>
            <Button variant="outlined" startIcon={<History />} onClick={() => navigate("/gaming/history")}>
              History
            </Button>
          </>
        }
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          {typeCounts.playstation > 0 && (
            <ToggleButtonGroup
              size="small"
              exclusive
              value={typeFilter}
              onChange={(_, v) => v && setTypeFilter(v)}
              sx={{ order: { xs: 1, sm: 0 } }}
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="pc" sx={{ gap: 0.75 }}>
                <Computer sx={{ fontSize: 18 }} /> PCs · {typeCounts.pc}
              </ToggleButton>
              <ToggleButton value="playstation" sx={{ gap: 0.75 }}>
                <SportsEsports sx={{ fontSize: 18 }} /> PlayStation · {typeCounts.playstation}
              </ToggleButton>
            </ToggleButtonGroup>
          )}
          <Stack
            direction="row"
            spacing={1}
            sx={{ overflowX: "auto", flex: { xs: "1 1 100%", sm: 1 }, minWidth: 0, pb: 0.25, order: { xs: 2, sm: 0 } }}
          >
            {filterChips.map((f) => (
              <Chip
                key={f.key}
                clickable
                onClick={() => setStationFilter(f.key)}
                color={stationFilter === f.key ? "primary" : "default"}
                variant={stationFilter === f.key ? "filled" : "outlined"}
                label={`${f.label} · ${f.count}`}
                sx={{ height: 36, flexShrink: 0 }}
              />
            ))}
          </Stack>
          <Box sx={{ display: "flex", gap: 3 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Active sessions
              </Typography>
              <Typography className="num" sx={{ fontFamily: brand.fontDisplay, fontWeight: 700 }}>
                {todayStats?.activeSessions ?? counts.occupied}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Revenue today
              </Typography>
              <Typography className="num" sx={{ fontFamily: brand.fontDisplay, fontWeight: 700, color: "success.main" }}>
                ${(todayStats?.totalRevenue?.usd || 0).toFixed(2)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </PageHeader>

      {visibleStations.length === 0 ? (
        <Card>
          <EmptyState
            icon={<SportsEsports />}
            title={stationStates.length === 0 ? "No stations yet" : "Nothing here"}
            description={
              stationStates.length === 0
                ? "Add your PCs in Manage stations to start tracking sessions."
                : "No stations match this filter right now."
            }
            action={
              stationStates.length === 0 ? (
                <Button variant="contained" onClick={() => navigate("/gaming/pc-management")}>
                  Manage stations
                </Button>
              ) : (
                <Button onClick={() => setStationFilter("all")}>Show all</Button>
              )
            }
          />
        </Card>
      ) : (
        <Grid container spacing={2}>
          {visibleStations.map(({ pc, session, isQuickMode, isOccupied, displayStatus }) => {
            const tone =
              isOccupied ? "error" : displayStatus === PCStatus.AVAILABLE ? "success" : displayStatus === PCStatus.MAINTENANCE ? "warning" : "secondary";
            const toneColor = theme.palette[tone].main;
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={pc.id}>
                <Card
                  sx={{
                    height: "100%",
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    borderColor: isOccupied ? alpha(toneColor, 0.45) : undefined,
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      inset: "0 0 auto 0",
                      height: 4,
                      bgcolor: toneColor,
                    },
                  }}
                >
                  <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", pt: 2.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: 3,
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                          color: toneColor,
                          bgcolor: alpha(toneColor, theme.palette.mode === "dark" ? 0.16 : 0.1),
                        }}
                      >
                        {pc.type === "playstation" ? <SportsEsports /> : <Computer />}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                          {pc.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap component="div">
                          {pc.pcNumber}
                          {pc.location ? ` · ${pc.location}` : ""}
                        </Typography>
                      </Box>
                      <StatusChip status={displayStatus} />
                    </Box>

                    {bookingOf(pc) && (
                      <Chip
                        clickable
                        size="small"
                        icon={<EventAvailable sx={{ fontSize: 16 }} />}
                        onClick={() => navigate(`/reservations?highlight=${bookingOf(pc)!.id}`)}
                        label={
                          minutesUntil(bookingOf(pc)!.startTime) <= 0
                            ? `Booked now · ${bookingOf(pc)!.customerName} — check in`
                            : `Booked ${fmtTime(bookingOf(pc)!.startTime, DEFAULT_TZ)} · ${bookingOf(pc)!.customerName}`
                        }
                        color={minutesUntil(bookingOf(pc)!.startTime) <= 60 ? "warning" : "secondary"}
                        variant="outlined"
                        sx={{ mt: 1.25, alignSelf: "flex-start", maxWidth: "100%", fontWeight: 600 }}
                      />
                    )}

                    {isQuickMode ? (
                      <Box sx={{ mt: "auto", pt: 2 }}>
                        <Alert severity="info" sx={{ mb: 1.5, py: 0 }}>
                          Quick mode — unlocked without tracking
                        </Alert>
                        <Button
                          fullWidth
                          size="large"
                          variant="contained"
                          color="error"
                          startIcon={<Stop />}
                          onClick={() => handleEndQuickMode(pc.id)}
                          disabled={unlockPCMutation.isPending}
                        >
                          {unlockPCMutation.isPending ? "Ending…" : "End session"}
                        </Button>
                      </Box>
                    ) : isOccupied && session ? (
                      (() => {
                        const { duration, cost } = calculateSessionCost(session);
                        return (
                          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", flex: 1 }}>
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: 3,
                                bgcolor: alpha(toneColor, theme.palette.mode === "dark" ? 0.08 : 0.05),
                                border: 1,
                                borderColor: alpha(toneColor, 0.18),
                              }}
                            >
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                                <Person sx={{ fontSize: 18, color: "text.secondary" }} />
                                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                                  {session.customerName || "Walk-in"}
                                </Typography>
                                {!session.sale && (
                                  <Tooltip title="Paid directly when the session ends (no order)">
                                    <Chip label="Standalone" size="small" variant="outlined" sx={{ height: 20, fontSize: "0.65rem", ml: "auto" }} />
                                  </Tooltip>
                                )}
                              </Box>
                              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1.25 }}>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Time
                                  </Typography>
                                  <Typography className="num" sx={{ fontFamily: brand.fontDisplay, fontWeight: 700, fontSize: "1.3rem" }}>
                                    {formatDuration(duration)}
                                  </Typography>
                                </Box>
                                <Box sx={{ textAlign: "right" }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                                    <Box component="span" sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: toneColor, animation: "pos-pulse 2s infinite" }} />
                                    Live cost
                                  </Typography>
                                  <Typography className="num" sx={{ fontFamily: brand.fontDisplay, fontWeight: 700, fontSize: "1.3rem", color: toneColor }}>
                                    ${cost.usd.toFixed(2)}
                                  </Typography>
                                </Box>
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                Started {formatDistanceToNow(new Date(session.startTime), { addSuffix: true })} · ${pc.hourlyRate.usd.toFixed(2)}/hr
                              </Typography>
                            </Box>
                            <Box sx={{ mt: "auto", pt: 2 }}>
                              <Button
                                fullWidth
                                size="large"
                                variant="contained"
                                color="error"
                                startIcon={<Stop />}
                                onClick={() => handleEndSession(session)}
                              >
                                End session
                              </Button>
                            </Box>
                          </Box>
                        );
                      })()
                    ) : (
                      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", flex: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                          <Typography variant="body2" color="text.secondary">
                            Rate
                          </Typography>
                          <Box sx={{ textAlign: "right" }}>
                            <Typography className="num" sx={{ fontWeight: 700 }}>
                              ${pc.hourlyRate.usd.toFixed(2)}/hr
                            </Typography>
                            <Typography variant="caption" color="text.secondary" className="num">
                              {pc.hourlyRate.lbp.toLocaleString()} LBP/hr
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ mt: "auto", pt: 2 }}>
                          {displayStatus === PCStatus.AVAILABLE ? (
                            <Button
                              fullWidth
                              size="large"
                              variant="contained"
                              color="success"
                              startIcon={<PlayArrow />}
                              onClick={() => {
                                setSelectedPC(pc);
                                setStartDialog(true);
                              }}
                            >
                              Start session
                            </Button>
                          ) : displayStatus === PCStatus.MAINTENANCE ? (
                            <Alert severity="warning" sx={{ py: 0 }}>
                              Under maintenance
                            </Alert>
                          ) : (
                            <Alert severity="info" sx={{ py: 0 }}>
                              Not available right now
                            </Alert>
                          )}
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

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
              {bookingOf(selectedPC) && minutesUntil(bookingOf(selectedPC)!.startTime) <= 120 && (
                <Alert
                  severity="warning"
                  sx={{ mb: 2 }}
                  action={
                    <Button color="inherit" size="small" onClick={() => navigate(`/reservations?highlight=${bookingOf(selectedPC)!.id}`)}>
                      View
                    </Button>
                  }
                >
                  {selectedPC.pcNumber} is booked at <b>{fmtTime(bookingOf(selectedPC)!.startTime, DEFAULT_TZ)}</b> for{" "}
                  {bookingOf(selectedPC)!.customerName}. If this is them, check the booking in from Reservations instead —
                  otherwise keep this session shorter.
                </Alert>
              )}
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
                      const finalAmount = selectedSession.finalAmount || selectedSession.totalCost;
                      setPaymentData({
                        ...paymentData,
                        paymentCurrency: currency,
                        amount:
                          currency === Currency.USD
                            ? finalAmount?.usd || 0
                            : finalAmount?.lbp || 0,
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

                {paymentData.amount > 0 && (
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
                        ${Math.max(0, change.usd).toFixed(2)} USD
                      </Typography>
                      <Typography
                        variant="body1"
                        fontWeight={600}
                        color="success.dark"
                      >
                        {Math.max(0, Math.round(change.lbp)).toLocaleString()} LBP
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
                {(selectedSession.discount?.percentage || 0) > 0 && (
                  <Typography variant="body2" color="success.dark">
                    Discount applied: {selectedSession.discount?.percentage}% off
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
