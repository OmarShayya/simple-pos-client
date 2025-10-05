import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  InputAdornment,
  Grid,
} from "@mui/material";

import {
  AttachMoney,
  ShoppingCart,
  TrendingUp,
  Warning,
  PersonAdd,
  Search,
  AccountBalance,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dashboardApi } from "@/api/dashboard.api";
import { customersApi } from "@/api/customers.api";
import { CreateCustomerRequest } from "@/types/customer.types";
import { toast } from "react-toastify";
import { handleApiError } from "@/utils/errorHandler";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography color="text.secondary" variant="body2">
          {title}
        </Typography>
        <Box
          sx={{
            bgcolor: `${color}.light`,
            borderRadius: 2,
            p: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          {icon}
        </Box>
      </Box>
      <Typography variant="h4" fontWeight="bold">
        {value}
      </Typography>
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [openAddCustomer, setOpenAddCustomer] = useState(false);
  const [openCustomerLookup, setOpenCustomerLookup] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [newCustomer, setNewCustomer] = useState<CreateCustomerRequest>({
    name: "",
    phone: "",
    email: undefined,
  });

  const {
    data: todayStats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["dashboard", "today"],
    queryFn: dashboardApi.getTodayStats,
  });

  const { data: lowStock } = useQuery({
    queryKey: ["dashboard", "low-stock"],
    queryFn: dashboardApi.getLowStock,
  });

  const { data: topProducts } = useQuery({
    queryKey: ["dashboard", "top-products"],
    queryFn: () => dashboardApi.getTopProducts(5),
  });

  const { data: pendingSales } = useQuery({
    queryKey: ["dashboard", "pending-sales"],
    queryFn: dashboardApi.getPendingSales,
  });

  const createCustomerMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      toast.success("Customer added successfully");
      setOpenAddCustomer(false);
      setNewCustomer({ name: "", phone: "", email: "" });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const { data: customerLookupData, refetch: lookupCustomer } = useQuery({
    queryKey: ["customer-lookup", customerPhone],
    queryFn: () => customersApi.getByPhone(customerPhone),
    enabled: false,
  });

  const handleAddCustomer = () => {
    createCustomerMutation.mutate(newCustomer);
  };

  const handleLookupCustomer = () => {
    if (customerPhone) {
      lookupCustomer();
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load dashboard data. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Overview of your POS system today
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Search />}
            onClick={() => setOpenCustomerLookup(true)}
          >
            Customer Lookup
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setOpenAddCustomer(true)}
          >
            Add Customer
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Revenue (USD)"
            value={`$${todayStats?.revenue.usd.toFixed(2) || 0}`}
            icon={<AttachMoney sx={{ color: "success.main" }} />}
            color="success"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Sales"
            value={todayStats?.totalSales || 0}
            icon={<ShoppingCart sx={{ color: "primary.main" }} />}
            color="primary"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Items Sold"
            value={todayStats?.itemsSold || 0}
            icon={<TrendingUp sx={{ color: "info.main" }} />}
            color="info"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Pending Sales"
            value={todayStats?.pendingSales || 0}
            icon={<Warning sx={{ color: "warning.main" }} />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Revenue & New Customers */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Revenue (LBP)
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {todayStats?.revenue.lbp.toLocaleString()} LBP
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                New Customers Today
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {todayStats?.newCustomers || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pending Sales */}
      {pendingSales && pendingSales.totalPending > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <AccountBalance sx={{ color: "warning.main", mr: 1 }} />
              <Typography variant="h6" fontWeight={600}>
                Pending Payments ({pendingSales.totalPending})
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Total Value: ${pendingSales.totalValue.usd.toFixed(2)} USD /{" "}
              {pendingSales.totalValue.lbp.toLocaleString()} LBP
            </Typography>
            <Table size="small" sx={{ mt: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell align="right">Amount (USD)</TableCell>
                  <TableCell align="right">Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingSales.pendingSales.slice(0, 5).map((sale: any) => (
                  <TableRow key={sale.invoiceNumber}>
                    <TableCell>{sale.invoiceNumber}</TableCell>
                    <TableCell>{sale.customer || "Walk-in"}</TableCell>
                    <TableCell align="right">
                      ${sale.total.usd.toFixed(2)}
                    </TableCell>
                    <TableCell align="right">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Low Stock Alert */}
      {lowStock && lowStock.length > 0 && (
        <Card sx={{ mt: 3, bgcolor: "warning.lighter" }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Warning sx={{ color: "warning.main", mr: 1 }} />
              <Typography variant="h6" fontWeight={600} color="warning.dark">
                Low Stock Alert
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {lowStock.length} product(s) are running low on stock
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Top Products */}
      {topProducts && topProducts.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Top Selling Products
            </Typography>
            <Box sx={{ mt: 2 }}>
              {topProducts.map((product: any, index: number) => (
                <Box
                  key={product.productId}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    py: 1.5,
                    borderBottom: index < topProducts.length - 1 ? 1 : 0,
                    borderColor: "divider",
                  }}
                >
                  <Box>
                    <Typography variant="body1" fontWeight={500}>
                      {product.productName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      SKU: {product.productSku}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="body1" fontWeight={600}>
                      {product.totalQuantitySold} sold
                    </Typography>
                    <Typography variant="caption" color="success.main">
                      ${product.totalRevenue.usd.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Add Customer Dialog */}
      <Dialog
        open={openAddCustomer}
        onClose={() => setOpenAddCustomer(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Customer</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={newCustomer.name}
            onChange={(e) =>
              setNewCustomer({ ...newCustomer, name: e.target.value })
            }
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Phone"
            value={newCustomer.phone}
            onChange={(e) =>
              setNewCustomer({ ...newCustomer, phone: e.target.value })
            }
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Email (Optional)"
            value={newCustomer.email}
            onChange={(e) =>
              setNewCustomer({ ...newCustomer, email: e.target.value })
            }
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddCustomer(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddCustomer}>
            Add Customer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Customer Lookup Dialog */}
      <Dialog
        open={openCustomerLookup}
        onClose={() => setOpenCustomerLookup(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Customer Balance Lookup</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Phone Number"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            margin="normal"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Button variant="contained" onClick={handleLookupCustomer}>
                    Search
                  </Button>
                </InputAdornment>
              ),
            }}
          />

          {customerLookupData && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  {customerLookupData.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {customerLookupData.phone}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Balance (USD):
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={600}
                    color={
                      customerLookupData.balance.usd > 0
                        ? "error.main"
                        : "success.main"
                    }
                  >
                    ${customerLookupData.balance.usd.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {customerLookupData.balance.lbp.toLocaleString()} LBP
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 2 }}
                  >
                    Total Purchases: $
                    {customerLookupData.totalPurchases.toFixed(2)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCustomerLookup(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
