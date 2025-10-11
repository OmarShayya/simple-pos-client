import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  MenuItem,
  Grid,
} from "@mui/material";
import {
  Assessment,
  Download,
  CalendarToday,
  AttachMoney,
  TrendingUp,
} from "@mui/icons-material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useQuery } from "@tanstack/react-query";
import { salesApi } from "@/api/sales.api";
import { dashboardApi } from "@/api/dashboard.api";
import { SaleStatus } from "@/types/sale.types";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

const Reports: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });
  const [statusFilter, setStatusFilter] = useState<SaleStatus | "">("");
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 20,
  });

  const { data: salesData, isLoading } = useQuery({
    queryKey: [
      "sales-report",
      paginationModel.page + 1,
      dateRange,
      statusFilter,
    ],
    queryFn: () =>
      salesApi.getAll({
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        status: statusFilter || undefined,
      }),
  });

  const { data: dailySales } = useQuery({
    queryKey: ["daily-sales", dateRange],
    queryFn: () =>
      dashboardApi.getDailySales(dateRange.startDate, dateRange.endDate),
  });

  const { data: topProducts } = useQuery({
    queryKey: ["top-products-report"],
    queryFn: () => dashboardApi.getTopProducts(10),
  });

  const calculateTotals = () => {
    if (!salesData?.data) return { usd: 0, lbp: 0, count: 0 };

    return salesData.data.reduce(
      (acc, sale) => ({
        usd: acc.usd + sale.totals.usd,
        lbp: acc.lbp + sale.totals.lbp,
        count: acc.count + 1,
      }),
      { usd: 0, lbp: 0, count: 0 }
    );
  };

  const totals = calculateTotals();

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
      field: "status",
      headerName: "Status",
      width: 120,
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
      field: "paymentMethod",
      headerName: "Payment",
      width: 120,
      renderCell: (params) => params.row.paymentMethod || "-",
    },
    {
      field: "cashier",
      headerName: "Cashier",
      width: 150,
      renderCell: (params) => params.row.cashier?.name || "-",
    },
    {
      field: "createdAt",
      headerName: "Date",
      width: 150,
      renderCell: (params) =>
        new Date(params.row.createdAt).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Sales Reports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and analyze sales data
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<Download />}>
          Export CSV
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography color="text.secondary" variant="body2">
                  Total Revenue (USD)
                </Typography>
                <AttachMoney sx={{ color: "success.main" }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">
                ${totals.usd.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {totals.lbp.toLocaleString()} LBP
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography color="text.secondary" variant="body2">
                  Total Sales
                </Typography>
                <TrendingUp sx={{ color: "primary.main" }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {totals.count}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                transactions
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography color="text.secondary" variant="body2">
                  Average Sale
                </Typography>
                <Assessment sx={{ color: "info.main" }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">
                $
                {totals.count > 0
                  ? (totals.usd / totals.count).toFixed(2)
                  : "0.00"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                per transaction
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="date"
              label="End Date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              select
              label="Status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as SaleStatus | "")
              }
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value={SaleStatus.PAID}>Paid</MenuItem>
              <MenuItem value={SaleStatus.PENDING}>Pending</MenuItem>
              <MenuItem value={SaleStatus.CANCELLED}>Cancelled</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Card>

      {/* Top Products */}
      {topProducts && topProducts.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Top Selling Products (Period)
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell align="right">Quantity Sold</TableCell>
                  <TableCell align="right">Revenue (USD)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topProducts.map((product: any) => (
                  <TableRow key={product.productId}>
                    <TableCell>{product.productName}</TableCell>
                    <TableCell>{product.productSku}</TableCell>
                    <TableCell align="right">
                      {product.totalQuantitySold}
                    </TableCell>
                    <TableCell align="right">
                      ${product.totalRevenue.usd.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Sales Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Sales Transactions
          </Typography>
          <DataGrid
            rows={salesData?.data || []}
            columns={columns}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            rowCount={salesData?.pagination.total || 0}
            pageSizeOptions={[10, 20, 50, 100]}
            paginationMode="server"
            autoHeight
            disableRowSelectionOnClick
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default Reports;
