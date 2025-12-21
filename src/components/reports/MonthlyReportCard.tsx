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
  IconButton,
} from "@mui/material";
import { DateRange, Print, ShoppingCart, SportsEsports } from "@mui/icons-material";
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

  const handlePrint = () => {
    if (!report) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const monthName = new Date(2000, month - 1).toLocaleString("default", { month: "long" });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Monthly Report - ${monthName} ${year}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header h1 { margin: 0; font-size: 20px; }
          .header p { margin: 5px 0; color: #666; }
          .section { margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 4px; }
          .row { display: flex; justify-content: space-between; margin: 8px 0; }
          .row.total { font-weight: bold; font-size: 18px; border-top: 2px solid #000; padding-top: 10px; margin-top: 15px; }
          .label { color: #666; }
          h3 { margin: 15px 0 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Epic Lounge - Monthly Report</h1>
          <p>${monthName} ${year}</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>

        <div class="row total">
          <span>Total Revenue:</span>
          <span>$${report.revenue.total.usd.toFixed(2)}</span>
        </div>
        <div class="row">
          <span class="label">In LBP:</span>
          <span>${report.revenue.total.lbp.toLocaleString()} LBP</span>
        </div>

        <h3>Revenue Breakdown</h3>
        <div class="section">
          <div class="row">
            <span style="color: #2e7d32;">Products Revenue:</span>
            <span>$${report.revenue.products.usd.toFixed(2)} (${report.revenue.products.lbp.toLocaleString()} LBP)</span>
          </div>
          <div class="row">
            <span style="color: #7b1fa2;">Gaming Revenue:</span>
            <span>$${report.revenue.gaming.usd.toFixed(2)} (${report.revenue.gaming.lbp.toLocaleString()} LBP)</span>
          </div>
        </div>

        <h3>Payment Breakdown</h3>
        <div class="section">
          <div class="row">
            <span>USD Payments:</span>
            <span>$${report.revenue.usdPayments.usd.toFixed(2)}</span>
          </div>
          <div class="row">
            <span>LBP Payments:</span>
            <span>$${report.revenue.lbpPayments.usd.toFixed(2)} (${report.revenue.lbpPayments.lbp.toLocaleString()} LBP)</span>
          </div>
        </div>

        <h3>Statistics</h3>
        <div class="section">
          <div class="row">
            <span>Total Sales:</span>
            <span>${report.revenue.totalSales}</span>
          </div>
          <div class="row">
            <span>Average Sale:</span>
            <span>$${report.revenue.averageSale.usd.toFixed(2)}</span>
          </div>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <DateRange sx={{ mr: 1, color: "success.main" }} />
            <Typography variant="h6" fontWeight={600}>
              Monthly Report
            </Typography>
          </Box>
          {report && (
            <IconButton size="small" onClick={handlePrint} title="Print Report" color="success">
              <Print />
            </IconButton>
          )}
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

            {/* Revenue Breakdown: Products vs Gaming */}
            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid size={{ xs: 6 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: "success.50",
                    border: "1px solid",
                    borderColor: "success.200",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                    <ShoppingCart sx={{ fontSize: 16, color: "success.main", mr: 0.5 }} />
                    <Typography variant="caption" color="success.main" fontWeight={600}>
                      Products
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight="bold" color="success.main">
                    ${report.revenue.products.usd.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {report.revenue.products.lbp.toLocaleString()} LBP
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: "secondary.50",
                    border: "1px solid",
                    borderColor: "secondary.200",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                    <SportsEsports sx={{ fontSize: 16, color: "secondary.main", mr: 0.5 }} />
                    <Typography variant="caption" color="secondary.main" fontWeight={600}>
                      Gaming
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight="bold" color="secondary.main">
                    ${report.revenue.gaming.usd.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {report.revenue.gaming.lbp.toLocaleString()} LBP
                  </Typography>
                </Box>
              </Grid>
            </Grid>

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
