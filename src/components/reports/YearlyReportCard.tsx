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
  IconButton,
} from "@mui/material";
import { Assessment, Print } from "@mui/icons-material";
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

  const handlePrint = () => {
    if (!report) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Yearly Report - ${year}</title>
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
          <h1>Epic Lounge - Yearly Report</h1>
          <p>Year ${year}</p>
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

        ${report.monthlyBreakdown?.length ? `
          <h3>Monthly Breakdown</h3>
          <div class="section">
            ${report.monthlyBreakdown.map((m: any) => `
              <div class="row">
                <span>${new Date(2000, m.month - 1).toLocaleString("default", { month: "short" })}</span>
                <span>$${m.revenue.total.usd.toFixed(0)}</span>
              </div>
            `).join("")}
          </div>
        ` : ""}

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
            <Assessment sx={{ mr: 1, color: "info.main" }} />
            <Typography variant="h6" fontWeight={600}>
              Yearly Report
            </Typography>
          </Box>
          {report && (
            <IconButton size="small" onClick={handlePrint} title="Print Report" color="info">
              <Print />
            </IconButton>
          )}
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
