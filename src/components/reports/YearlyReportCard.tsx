import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  MenuItem,
  Divider,
  Chip,
} from "@mui/material";
import { Assessment } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { reportApi } from "@/api/report.api";
import LoadingSpinner from "@/components/common/LoadingSpinner";

interface Props {
  year: number;
  onParamsChange: (params: { year: number }) => void;
}

const YearlyReportCard: React.FC<Props> = ({ year, onParamsChange }) => {
  const { data: report, isLoading } = useQuery({
    queryKey: ["yearly-report", year],
    queryFn: () => reportApi.getYearlyReport(year),
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Assessment sx={{ mr: 1, color: "info.main" }} />
          <Typography variant="h6" fontWeight={600}>
            Yearly Report
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            select
            size="small"
            label="Year"
            value={year}
            onChange={(e) => onParamsChange({ year: Number(e.target.value) })}
          >
            {years.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {isLoading ? (
          <LoadingSpinner />
        ) : report ? (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Total Revenue
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="info.main">
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
                color="info"
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

            {report.monthlyBreakdown && report.monthlyBreakdown.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Monthly Breakdown
                </Typography>
                <Box sx={{ maxHeight: 200, overflowY: "auto" }}>
                  {report.monthlyBreakdown.map((month: any) => (
                    <Box
                      key={month.month}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        py: 0.5,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Typography variant="caption">
                        {new Date(2000, month.month - 1).toLocaleString(
                          "default",
                          {
                            month: "short",
                          }
                        )}
                      </Typography>
                      <Typography variant="caption" fontWeight={600}>
                        ${month.revenue.total.usd.toFixed(0)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}
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

export default YearlyReportCard;
