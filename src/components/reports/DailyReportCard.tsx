import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Divider,
  Chip,
} from "@mui/material";
import { Today } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { reportApi } from "@/api/report.api";
import LoadingSpinner from "@/components/common/LoadingSpinner";

interface Props {
  date: string;
  onDateChange: (date: string) => void;
}

const DailyReportCard: React.FC<Props> = ({ date, onDateChange }) => {
  const { data: report, isLoading } = useQuery({
    queryKey: ["daily-report", date],
    queryFn: () => reportApi.getDailyReport(date),
  });

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Today sx={{ mr: 1, color: "error.main" }} />
          <Typography variant="h6" fontWeight={600}>
            Daily Report
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            type="date"
            size="small"
            label="Date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        {isLoading ? (
          <LoadingSpinner />
        ) : report ? (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Total Revenue
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="error.main">
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
                color="error"
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

            {report.hourlyBreakdown && report.hourlyBreakdown.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Hourly Breakdown
                </Typography>
                <Box sx={{ maxHeight: 150, overflowY: "auto" }}>
                  {report.hourlyBreakdown.map((hour: any) => (
                    <Box
                      key={hour.hour}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        py: 0.5,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Typography variant="caption">
                        {hour.hour}:00 - {hour.hour}:59
                      </Typography>
                      <Typography variant="caption" fontWeight={600}>
                        ${hour.revenue.usd.toFixed(0)} ({hour.totalSales})
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

export default DailyReportCard;
