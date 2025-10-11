import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Alert,
  InputAdornment,
  Grid,
} from "@mui/material";
import {
  AttachMoney,
  TrendingUp,
  TrendingDown,
  Edit,
  History,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { exchangeRateApi } from "@/api/exchangeRate.api";
import { toast } from "react-toastify";
import { handleApiError } from "@/utils/errorHandler";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const ExchangeRate: React.FC = () => {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [newRate, setNewRate] = useState(0);
  const [notes, setNotes] = useState("");
  const [convertAmount, setConvertAmount] = useState(100);
  const [convertFrom, setConvertFrom] = useState<"USD" | "LBP">("USD");

  const { data: currentRate, isLoading } = useQuery({
    queryKey: ["exchange-rate"],
    queryFn: exchangeRateApi.getCurrentRate,
  });

  const { data: history } = useQuery({
    queryKey: ["exchange-rate-history"],
    queryFn: () => exchangeRateApi.getHistory(20),
  });

  const { data: conversion } = useQuery({
    queryKey: ["convert", convertAmount, convertFrom],
    queryFn: () => exchangeRateApi.convert(convertAmount, convertFrom),
    enabled: convertAmount > 0,
  });

  const updateRateMutation = useMutation({
    mutationFn: (data: { rate: number; notes?: string }) =>
      exchangeRateApi.updateRate(data.rate, data.notes),
    onSuccess: () => {
      toast.success("Exchange rate updated successfully");
      queryClient.invalidateQueries({ queryKey: ["exchange-rate"] });
      queryClient.invalidateQueries({ queryKey: ["exchange-rate-history"] });
      setOpenDialog(false);
      setNotes("");
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const handleOpenDialog = () => {
    setNewRate(currentRate?.rate || 0);
    setOpenDialog(true);
  };

  const handleUpdateRate = () => {
    if (newRate <= 0) {
      toast.error("Please enter a valid rate");
      return;
    }
    updateRateMutation.mutate({ rate: newRate, notes });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Exchange Rate Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage USD to LBP exchange rates
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Edit />}
          onClick={handleOpenDialog}
        >
          Update Rate
        </Button>
      </Box>

      {/* Current Rate Card */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <AttachMoney sx={{ color: "primary.main", mr: 1 }} />
                <Typography variant="h6" fontWeight={600}>
                  Current Rate
                </Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold" color="primary">
                {currentRate?.rate.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                1 USD = {currentRate?.rate.toLocaleString()} LBP
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Quick Converter
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Amount"
                    value={convertAmount}
                    onChange={(e) => setConvertAmount(Number(e.target.value))}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <Button
                    fullWidth
                    variant={convertFrom === "USD" ? "contained" : "outlined"}
                    onClick={() => setConvertFrom("USD")}
                  >
                    USD
                  </Button>
                </Grid>
                <Grid size={{ xs: 12, sm: 5 }}>
                  {conversion && (
                    <Card sx={{ bgcolor: "background.default", p: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Equals
                      </Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {convertFrom === "USD"
                          ? `${
                              conversion?.result?.lbp?.toLocaleString() || 0
                            } LBP`
                          : `$${conversion?.result?.usd?.toFixed(2) || 0} USD`}
                      </Typography>
                    </Card>
                  )}
                </Grid>
              </Grid>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() =>
                    setConvertFrom(convertFrom === "USD" ? "LBP" : "USD")
                  }
                >
                  Switch Currency
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Rate History */}
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            <History sx={{ mr: 1 }} />
            <Typography variant="h6" fontWeight={600}>
              Rate History
            </Typography>
          </Box>

          {history && history.length > 0 ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Rate (LBP)</TableCell>
                  <TableCell>Previous Rate</TableCell>
                  <TableCell>Change</TableCell>
                  <TableCell>Updated By</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((record: any, index: number) => {
                  const change = record.previousRate
                    ? ((record.rate - record.previousRate) /
                        record.previousRate) *
                      100
                    : 0;

                  return (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(record.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {record.rate.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {record.previousRate
                          ? record.previousRate.toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {record.previousRate && (
                          <Chip
                            label={`${change > 0 ? "+" : ""}${change.toFixed(
                              2
                            )}%`}
                            color={
                              change > 0
                                ? "success"
                                : change < 0
                                ? "error"
                                : "default"
                            }
                            size="small"
                            icon={
                              change > 0 ? (
                                <TrendingUp />
                              ) : change < 0 ? (
                                <TrendingDown />
                              ) : undefined
                            }
                          />
                        )}
                      </TableCell>
                      <TableCell>{record.updatedBy.name}</TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {record.notes || "-"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <Alert severity="info">No rate history available</Alert>
          )}
        </CardContent>
      </Card>

      {/* Update Rate Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Update Exchange Rate</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            Updating the exchange rate will affect all future transactions and
            price calculations.
          </Alert>

          <TextField
            fullWidth
            type="number"
            label="New Rate (LBP per 1 USD)"
            value={newRate}
            onChange={(e) => setNewRate(Number(e.target.value))}
            margin="normal"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">1 USD =</InputAdornment>
              ),
              endAdornment: <InputAdornment position="end">LBP</InputAdornment>,
            }}
          />

          <TextField
            fullWidth
            label="Notes (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            margin="normal"
            multiline
            rows={3}
            placeholder="Reason for rate change..."
          />

          {currentRate && (
            <Card sx={{ mt: 2, bgcolor: "background.default", p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Current Rate: {currentRate.rate.toLocaleString()} LBP
              </Typography>
              <Typography variant="body2" color="text.secondary">
                New Rate: {newRate.toLocaleString()} LBP
              </Typography>
              {newRate > 0 && (
                <Typography
                  variant="body2"
                  color={
                    newRate > currentRate.rate ? "success.main" : "error.main"
                  }
                  fontWeight={600}
                >
                  Change:{" "}
                  {(
                    ((newRate - currentRate.rate) / currentRate.rate) *
                    100
                  ).toFixed(2)}
                  %
                </Typography>
              )}
            </Card>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpdateRate}
            disabled={updateRateMutation.isPending}
          >
            Update Rate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExchangeRate;
