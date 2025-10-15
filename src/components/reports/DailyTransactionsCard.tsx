import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Chip,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { Receipt, CalendarToday } from "@mui/icons-material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useQuery } from "@tanstack/react-query";
import { reportApi } from "@/api/report.api";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { format, subDays } from "date-fns";
import { SaleStatus } from "@/types/sale.types";

const DailyTransactionsCard: React.FC = () => {
  const [filterType, setFilterType] = useState<"daily" | "range">("daily");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 7), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 20,
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      "daily-transactions",
      filterType,
      date,
      dateRange,
      paginationModel.page,
    ],
    queryFn: () =>
      reportApi.getDailyTransactions(
        filterType === "daily" ? date : undefined,
        filterType === "range" ? dateRange.startDate : undefined,
        filterType === "range" ? dateRange.endDate : undefined,
        paginationModel.page + 1,
        paginationModel.pageSize
      ),
  });

  const columns: GridColDef[] = [
    {
      field: "invoiceNumber",
      headerName: "Invoice",
      width: 140,
    },
    {
      field: "customer",
      headerName: "Customer",
      flex: 1,
      renderCell: (params) => params.row.customer?.name || "Walk-in",
    },
    {
      field: "totals",
      headerName: "Total (USD)",
      width: 120,
      renderCell: (params) => `$${params.row.totals.usd.toFixed(2)}`,
    },
    {
      field: "paymentCurrency",
      headerName: "Paid In",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.row.paymentCurrency || "-"}
          color={params.row.paymentCurrency === "USD" ? "primary" : "secondary"}
          size="small"
        />
      ),
    },
    {
      field: "amountPaid",
      headerName: "Amount Paid",
      width: 150,
      renderCell: (params) => (
        <Box>
          <Typography variant="caption" display="block">
            ${params.row.amountPaid.usd.toFixed(2)}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {params.row.amountPaid.lbp.toLocaleString()} LBP
          </Typography>
        </Box>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      renderCell: (params) => (
        <Chip
          label={params.row.status.toUpperCase()}
          color={
            params.row.status === SaleStatus.PAID
              ? "success"
              : params.row.status === SaleStatus.PENDING
              ? "warning"
              : "error"
          }
          size="small"
        />
      ),
    },
    {
      field: "cashier",
      headerName: "Cashier",
      width: 130,
    },
    {
      field: "createdAt",
      headerName: "Date & Time",
      width: 160,
      renderCell: (params) =>
        new Date(params.row.createdAt).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
  ];

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Receipt sx={{ mr: 1, color: "primary.main" }} />
          <Typography variant="h6" fontWeight={600}>
            Transaction History
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12 }}>
            <ToggleButtonGroup
              value={filterType}
              exclusive
              onChange={(_, value) => value && setFilterType(value)}
              size="small"
              fullWidth
            >
              <ToggleButton value="daily">
                <CalendarToday sx={{ mr: 1, fontSize: 18 }} />
                Daily
              </ToggleButton>
              <ToggleButton value="range">Date Range</ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          {filterType === "daily" ? (
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                type="date"
                size="small"
                label="Date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          ) : (
            <>
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
            </>
          )}
        </Grid>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <DataGrid
            rows={data?.data || []}
            columns={columns}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            rowCount={data?.pagination.total || 0}
            pageSizeOptions={[10, 20, 50]}
            paginationMode="server"
            autoHeight
            disableRowSelectionOnClick
          />
        )}
      </CardContent>
    </Card>
  );
};

export default DailyTransactionsCard;
