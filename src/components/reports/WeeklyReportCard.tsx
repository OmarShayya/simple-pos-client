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
import { CalendarToday } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { reportApi } from "@/api/report.api";
import LoadingSpinner from "@/components/common/LoadingSpinner";

interface Props {
  week: number;
  month: number;
  year: number;
  onParamsChange: (params: {
    week: number;
    month: number;
    year: number;
  }) => void;
}

const WeeklyReportCard: React.FC<Props> = ({
  week,
  month,
  year,
  onParamsChange,
}) => {
  const { data: report, isLoading } = useQuery({
    queryKey: ["weekly-report", week, month, year],
    queryFn: () => reportApi.getWeeklyReport(week, month, year),
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const weeks = Array.from({ length: 5 }, (_, i) => i + 1);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <CalendarToday sx={{ mr: 1, color: "primary.main" }} />
          <Typography variant="h6" fontWeight={600}>
            Weekly Report
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 4 }}>
            <TextField
              fullWidth
              select
              size="small"
              label="Week"
              value={week}
              onChange={(e) =>
                onParamsChange({ week: Number(e.target.value), month, year })
              }
            >
              {weeks.map((w) => (
                <MenuItem key={w} value={w}>
                  Week {w}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField
              fullWidth
              select
              size="small"
              label="Month"
              value={month}
              onChange={(e) =>
                onParamsChange({ week, month: Number(e.target.value), year })
              }
            >
              {months.map((m) => (
                <MenuItem key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString("default", {
                    month: "short",
                  })}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField
              fullWidth
              select
              size="small"
              label="Year"
              value={year}
              onChange={(e) =>
                onParamsChange({ week, month, year: Number(e.target.value) })
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
              <Typography variant="h4" fontWeight="bold" color="primary">
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
                color="primary"
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

export default WeeklyReportCard;
