import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  MenuItem,
  Grid,
  Divider,
  Chip,
} from "@mui/material";
import { DateRange } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { reportApi } from "@/api/report.api";
import LoadingSpinner from "@/components/common/LoadingSpinner";

interface Props {
  month: number;
  year: number;
  onParamsChange: (params: { month: number; year: number }) => void;
}

const MonthlyReportCard: React.FC<Props> = ({
  month,
  year,
  onParamsChange,
}) => {
  const { data: report, isLoading } = useQuery({
    queryKey: ["monthly-report", month, year],
    queryFn: () => reportApi.getMonthlyReport(month, year),
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <DateRange sx={{ mr: 1, color: "success.main" }} />
          <Typography variant="h6" fontWeight={600}>
            Monthly Report
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              select
              size="small"
              label="Month"
              value={month}
              onChange={(e) =>
                onParamsChange({ month: Number(e.target.value), year })
              }
            >
              {months.map((m) => (
                <MenuItem key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString("default", {
                    month: "long",
                  })}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              select
              size="small"
              label="Year"
              value={year}
              onChange={(e) =>
                onParamsChange({ month, year: Number(e.target.value) })
              }
            >
              {years.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        {isLoading ? (
          <LoadingSpinner />
        ) : report ? (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Total Revenue
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                ${report.revenue.total.usd.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {report.revenue.total.lbp.toLocaleString()} LBP
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                USD Payments
              </Typography>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" fontWeight={600}>
                  ${report.revenue.usdPayments.usd.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {report.revenue.usdPayments.lbp.toLocaleString()} LBP
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                LBP Payments
              </Typography>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" fontWeight={600}>
                  ${report.revenue.lbpPayments.usd.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {report.revenue.lbpPayments.lbp.toLocaleString()} LBP
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Total Sales
              </Typography>
              <Chip
                label={report.revenue.totalSales}
                color="success"
                size="small"
              />
            </Box>

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mt: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Average Sale
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                ${report.revenue.averageSale.usd.toFixed(2)}
              </Typography>
            </Box>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No data available
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyReportCard;
