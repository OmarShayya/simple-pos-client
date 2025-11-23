import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Grid,
} from "@mui/material";
import { SportsEsports } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { reportApi } from "@/api/report.api";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { format, subDays } from "date-fns";

const GamingRevenueCard: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });

  const { data: revenue, isLoading: loadingRevenue } = useQuery({
    queryKey: ["gaming-revenue", dateRange],
    queryFn: () =>
      reportApi.getGamingRevenue(dateRange.startDate, dateRange.endDate),
  });

  const { data: pcRevenue, isLoading: loadingPCRevenue } = useQuery({
    queryKey: ["gaming-revenue-by-pc", dateRange],
    queryFn: () =>
      reportApi.getGamingRevenueByPC(dateRange.startDate, dateRange.endDate),
  });

  const isLoading = loadingRevenue || loadingPCRevenue;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <SportsEsports sx={{ mr: 1, color: "primary.main" }} />
          <Typography variant="h6" fontWeight={600}>
            Gaming Revenue
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
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
        </Grid>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Summary Stats */}
            {revenue && (
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  bgcolor: "background.default",
                  borderRadius: 1,
                }}
              >
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Total Revenue
                    </Typography>
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      color="success.main"
                    >
                      ${revenue.totalRevenue.usd.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {revenue.totalRevenue.lbp.toLocaleString()} LBP
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Total Sessions
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {revenue.totalSessions}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Avg Session
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      ${revenue.averageRevenue.usd.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Avg Duration
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {Math.floor(revenue.averageSessionDuration / 60)}h{" "}
                      {revenue.averageSessionDuration % 60}m
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Revenue by PC */}
            {pcRevenue && pcRevenue.length > 0 && (
              <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Revenue by PC
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>PC</TableCell>
                      <TableCell align="right">Sessions</TableCell>
                      <TableCell align="right">Revenue (USD)</TableCell>
                      <TableCell align="right">Avg Duration</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pcRevenue.map((pc: any) => (
                      <TableRow key={pc.pcId}>
                        <TableCell>
                          {pc.pcName}
                          <Typography
                            variant="caption"
                            display="block"
                            color="text.secondary"
                          >
                            {pc.pcNumber}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{pc.totalSessions}</TableCell>
                        <TableCell align="right">
                          ${pc.totalRevenue.usd.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          {Math.floor(pc.averageDuration / 60)}h{" "}
                          {pc.averageDuration % 60}m
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            {(!pcRevenue || pcRevenue.length === 0) && (
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
              >
                No gaming data available for this period
              </Typography>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default GamingRevenueCard;
