import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  AttachMoney,
  ShoppingCartOutlined,
  Inventory2Outlined,
  SportsEsportsOutlined,
  PersonAddAlt1Outlined,
  Search,
  PointOfSaleOutlined,
  WarningAmberRounded,
  ReceiptLongOutlined,
  EmojiEventsOutlined,
} from "@mui/icons-material";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { dashboardApi } from "@/api/dashboard.api";
import { customersApi } from "@/api/customers.api";
import type { CreateCustomerRequest } from "@/types/customer.types";
import { toast } from "react-toastify";
import { handleApiError } from "@/utils/errorHandler";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import SectionCard from "@/components/common/SectionCard";
import EmptyState from "@/components/common/EmptyState";
import StatusChip from "@/components/common/StatusChip";
import { useAuthStore } from "@/store/authStore";

interface Money {
  usd: number;
  lbp: number;
}
interface TodayStats {
  revenue?: { total?: Money; products?: Money; gaming?: Money };
  totalSales?: number;
  pendingSales?: number;
  paidSales?: number;
  itemsSold?: number;
  newCustomers?: number;
  gamingSessions?: number;
}
interface PendingSaleRow {
  invoiceNumber: string;
  customer: string | null;
  total: Money;
  createdAt: string;
}
interface TopProduct {
  productId: string;
  productName: string;
  productSku: string;
  totalQuantitySold: number;
  totalRevenue: Money;
}
interface LowStockRow {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  minStockLevel: number;
  category?: string;
}

const usd = (n?: number) => `$${(n ?? 0).toFixed(2)}`;
const lbp = (n?: number) => `${Math.round(n ?? 0).toLocaleString()} LBP`;

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const emptyCustomer: CreateCustomerRequest = { name: "", phone: "", email: "" };

const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [openAddCustomer, setOpenAddCustomer] = useState(false);
  const [openCustomerLookup, setOpenCustomerLookup] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [newCustomer, setNewCustomer] = useState<CreateCustomerRequest>(emptyCustomer);

  const [today, gaming, lowStockQ, topProductsQ, pendingQ] = useQueries({
    queries: [
      { queryKey: ["dashboard", "today"], queryFn: dashboardApi.getTodayStats },
      { queryKey: ["dashboard", "gaming-stats"], queryFn: dashboardApi.getGamingStats },
      { queryKey: ["dashboard", "low-stock"], queryFn: dashboardApi.getLowStock },
      { queryKey: ["dashboard", "top-products"], queryFn: () => dashboardApi.getTopProducts(5) },
      { queryKey: ["dashboard", "pending-sales"], queryFn: dashboardApi.getPendingSales },
    ],
  });

  const todayStats = today.data as TodayStats | undefined;
  const gamingStats = gaming.data as
    | { todayRevenue?: Money; activeSessions?: number; completedToday?: number; unpaidSessions?: number }
    | undefined;
  const lowStock = (lowStockQ.data as LowStockRow[] | undefined) ?? [];
  const topProducts = (topProductsQ.data as TopProduct[] | undefined) ?? [];
  const pending = pendingQ.data as
    | { totalPending: number; totalValue: Money; pendingSales: PendingSaleRow[] }
    | undefined;

  const revenue = todayStats?.revenue;

  const createCustomerMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      toast.success("Customer added");
      setOpenAddCustomer(false);
      setNewCustomer(emptyCustomer);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const {
    data: customerLookupData,
    refetch: lookupCustomer,
    isFetching: lookingUp,
    isError: lookupError,
    isFetched: lookupDone,
  } = useQuery({
    queryKey: ["customer-lookup", customerPhone],
    queryFn: () => customersApi.getByPhone(customerPhone.trim()),
    enabled: false,
    retry: false,
  });

  const handleAddCustomer = () => {
    // Don't send an empty email (the API validates the format)
    const email = newCustomer.email?.trim();
    createCustomerMutation.mutate({
      ...newCustomer,
      name: newCustomer.name.trim(),
      phone: newCustomer.phone.trim(),
      email: email ? email : undefined,
    });
  };

  const handleLookupCustomer = () => {
    if (customerPhone.trim()) lookupCustomer();
  };

  if (today.error) {
    return <Alert severity="error">Failed to load dashboard data. Please try again.</Alert>;
  }

  const loading = today.isLoading;

  return (
    <Box>
      <PageHeader
        title={`${greeting()}, ${user?.name?.split(" ")[0] ?? "there"}`}
        subtitle="Here's what's happening at the lounge today."
        actions={
          <>
            <Button variant="outlined" startIcon={<Search />} onClick={() => setOpenCustomerLookup(true)}>
              Find customer
            </Button>
            <Button variant="outlined" startIcon={<PersonAddAlt1Outlined />} onClick={() => setOpenAddCustomer(true)}>
              Add customer
            </Button>
            <Button variant="contained" startIcon={<PointOfSaleOutlined />} onClick={() => navigate("/sales")}>
              New sale
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <Grid container spacing={{ xs: 1.5, md: 2 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Revenue today"
            value={usd(revenue?.total?.usd)}
            icon={<AttachMoney />}
            tone="success"
            loading={loading}
            hint={
              <>
                Products {usd(revenue?.products?.usd)} · Gaming {usd(revenue?.gaming?.usd)}
                <br />
                {lbp(revenue?.total?.lbp)}
              </>
            }
          />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <StatCard
            label="Sales today"
            value={todayStats?.totalSales ?? 0}
            icon={<ShoppingCartOutlined />}
            tone="primary"
            loading={loading}
            hint={`${todayStats?.paidSales ?? 0} paid · ${todayStats?.pendingSales ?? 0} pending`}
            onClick={() => navigate("/sales/history")}
          />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <StatCard
            label="Items sold"
            value={todayStats?.itemsSold ?? 0}
            icon={<Inventory2Outlined />}
            tone="info"
            loading={loading}
            hint={`${todayStats?.newCustomers ?? 0} new customer${todayStats?.newCustomers === 1 ? "" : "s"}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Gaming now"
            value={`${gamingStats?.activeSessions ?? 0} active`}
            icon={<SportsEsportsOutlined />}
            tone="secondary"
            loading={gaming.isLoading}
            hint={`${gamingStats?.completedToday ?? 0} completed · ${gamingStats?.unpaidSessions ?? 0} unpaid`}
            onClick={() => navigate("/gaming")}
          />
        </Grid>
      </Grid>

      <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ mt: { xs: 0.5, md: 1 } }}>
        {/* Pending payments */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <SectionCard
            title={`Pending payments${pending ? ` (${pending.totalPending})` : ""}`}
            subtitle={
              pending && pending.totalPending > 0
                ? `${usd(pending.totalValue.usd)} · ${lbp(pending.totalValue.lbp)} outstanding`
                : undefined
            }
            icon={<ReceiptLongOutlined />}
            action={
              <Button size="small" onClick={() => navigate("/sales/history")}>
                View all
              </Button>
            }
            flush
          >
            {pendingQ.isLoading ? (
              <Box sx={{ px: 2.25, pb: 2 }}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} height={44} />
                ))}
              </Box>
            ) : !pending || pending.totalPending === 0 ? (
              <EmptyState compact title="All settled" description="No sales are waiting for payment." />
            ) : (
              <List disablePadding>
                {pending.pendingSales.slice(0, 6).map((sale) => (
                  <ListItem
                    key={sale.invoiceNumber}
                    divider
                    sx={{ px: 2.25, py: 1.1, "&:last-of-type": { borderBottom: 0 } }}
                    secondaryAction={
                      <Typography className="num" sx={{ fontWeight: 700 }}>
                        {usd(sale.total?.usd)}
                      </Typography>
                    }
                  >
                    <ListItemText
                      primary={sale.customer || "Walk-in"}
                      secondary={`${sale.invoiceNumber} · ${new Date(sale.createdAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}`}
                      slotProps={{ primary: { sx: { fontWeight: 600 } } }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={{ xs: 1.5, md: 2 }} sx={{ height: "100%" }}>
            {/* Top products */}
            <SectionCard title="Top sellers" icon={<EmojiEventsOutlined />} flush>
              {topProductsQ.isLoading ? (
                <Box sx={{ px: 2.25, pb: 2 }}>
                  <Skeleton height={40} />
                  <Skeleton height={40} />
                </Box>
              ) : topProducts.length === 0 ? (
                <EmptyState compact title="No sales yet" description="Top products will show up here." />
              ) : (
                <List disablePadding>
                  {topProducts.map((p, i) => (
                    <ListItem
                      key={p.productId}
                      divider={i < topProducts.length - 1}
                      sx={{ px: 2.25, py: 1 }}
                      secondaryAction={
                        <Box sx={{ textAlign: "right" }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }} className="num">
                            {p.totalQuantitySold} sold
                          </Typography>
                          <Typography variant="caption" color="success.main" className="num">
                            {usd(p.totalRevenue?.usd)}
                          </Typography>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={`${i + 1}. ${p.productName}`}
                        secondary={p.productSku}
                        slotProps={{ primary: { sx: { fontWeight: 600 } } }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </SectionCard>

            {/* Low stock */}
            <SectionCard
              title={`Low stock${lowStock.length ? ` (${lowStock.length})` : ""}`}
              icon={<WarningAmberRounded />}
              action={
                lowStock.length > 0 && (
                  <Button size="small" onClick={() => navigate("/products")}>
                    Restock
                  </Button>
                )
              }
              flush
            >
              {lowStock.length === 0 ? (
                <EmptyState compact title="Stock looks good" />
              ) : (
                <List disablePadding>
                  {lowStock.slice(0, 5).map((p, i) => (
                    <ListItem
                      key={p.id}
                      divider={i < Math.min(lowStock.length, 5) - 1}
                      sx={{ px: 2.25, py: 0.75 }}
                      secondaryAction={
                        <StatusChip
                          status={p.currentStock === 0 ? "cancelled" : "pending"}
                          label={p.currentStock === 0 ? "Out" : `${p.currentStock} left`}
                        />
                      }
                    >
                      <ListItemText
                        primary={p.name}
                        secondary={p.category}
                        slotProps={{ primary: { sx: { fontWeight: 600 } } }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>

      {/* Add Customer Dialog */}
      <Dialog open={openAddCustomer} onClose={() => setOpenAddCustomer(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add customer</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              required
              autoFocus
            />
            <TextField
              fullWidth
              label="Phone"
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              required
              inputMode="tel"
              helperText="At least 8 digits"
            />
            <TextField
              fullWidth
              label="Email (optional)"
              type="email"
              value={newCustomer.email ?? ""}
              onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddCustomer(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddCustomer}
            disabled={!newCustomer.name.trim() || newCustomer.phone.trim().length < 8 || createCustomerMutation.isPending}
          >
            {createCustomerMutation.isPending ? "Saving…" : "Add customer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Customer Lookup Dialog */}
      <Dialog open={openCustomerLookup} onClose={() => setOpenCustomerLookup(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Find customer</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            autoFocus
            label="Phone number"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookupCustomer()}
            sx={{ mt: 1 }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <Button variant="contained" size="small" onClick={handleLookupCustomer} disabled={lookingUp}>
                      {lookingUp ? "…" : "Search"}
                    </Button>
                  </InputAdornment>
                ),
              },
            }}
          />

          {lookupDone && lookupError && !lookingUp && (
            <Alert severity="info" sx={{ mt: 2 }}>
              No customer found with that phone number.
            </Alert>
          )}

          {customerLookupData && !lookupError && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6">{customerLookupData.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {customerLookupData.phone}
                </Typography>
                <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Balance
                    </Typography>
                    <Typography
                      variant="h6"
                      className="num"
                      color={customerLookupData.balance.usd > 0 ? "error.main" : "success.main"}
                    >
                      {usd(customerLookupData.balance.usd)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {lbp(customerLookupData.balance.lbp)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Total purchases
                    </Typography>
                    <Typography variant="h6" className="num">
                      {usd(customerLookupData.totalPurchases)}
                    </Typography>
                  </Box>
                </Stack>
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
