import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  InputAdornment,
  Tooltip,
  Avatar,
  Divider,
  Grid,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Search,
  Person,
  Phone,
  Email,
  AccountBalance,
} from "@mui/icons-material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "@/api/customers.api";
import { Customer, CreateCustomerRequest } from "@/types/customer.types";
import { toast } from "react-toastify";
import { handleApiError } from "@/utils/errorHandler";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const Customers: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [openBalanceDialog, setOpenBalanceDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  const [formData, setFormData] = useState<CreateCustomerRequest>({
    name: "",
    phone: "",
    email: "",
    address: {
      street: "",
      city: "",
      country: "",
    },
    notes: "",
  });

  const [balanceData, setBalanceData] = useState({
    usd: 0,
    lbp: 0,
  });

  const { data: customersData, isLoading } = useQuery({
    queryKey: ["customers", paginationModel.page + 1, searchQuery],
    queryFn: () =>
      customersApi.getAll({
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        search: searchQuery || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      toast.success("Customer created successfully");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      handleCloseDialog();
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateCustomerRequest>;
    }) => customersApi.update(id, data),
    onSuccess: () => {
      toast.success("Customer updated successfully");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      handleCloseDialog();
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const updateBalanceMutation = useMutation({
    mutationFn: ({
      id,
      balance,
    }: {
      id: string;
      balance: { usd: number; lbp: number };
    }) => customersApi.updateBalance(id, balance),
    onSuccess: () => {
      toast.success("Balance updated successfully");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setOpenBalanceDialog(false);
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: customersApi.delete,
    onSuccess: () => {
      toast.success("Customer deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || "",
        address: customer.address || {
          street: "",
          city: "",
          country: "",
        },
        notes: customer.notes || "",
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: "",
        phone: "",
        email: "",
        address: {
          street: "",
          city: "",
          country: "",
        },
        notes: "",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCustomer(null);
  };

  const handleOpenBalanceDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setBalanceData(customer.balance);
    setOpenBalanceDialog(true);
  };

  const handleOpenDetailsDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setOpenDetailsDialog(true);
  };

  const handleSubmit = () => {
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleUpdateBalance = () => {
    if (selectedCustomer) {
      updateBalanceMutation.mutate({
        id: selectedCustomer.id,
        balance: balanceData,
      });
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      deleteMutation.mutate(id);
    }
  };

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      minWidth: 180,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
            {params.row.name.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2" fontWeight={500}>
            {params.row.name}
          </Typography>
        </Box>
      ),
    },
    {
      field: "phone",
      headerName: "Phone",
      width: 140,
    },
    {
      field: "email",
      headerName: "Email",
      width: 200,
      renderCell: (params) => params.row.email || "-",
    },
    {
      field: "balance",
      headerName: "Balance (USD)",
      width: 130,
      renderCell: (params) => (
        <Chip
          label={`$${params.row.balance.usd.toFixed(2)}`}
          color={params.row.balance.usd > 0 ? "error" : "success"}
          size="small"
        />
      ),
    },
    {
      field: "totalPurchases",
      headerName: "Total Purchases",
      width: 140,
      renderCell: (params) => `$${params.row.totalPurchases.toFixed(2)}`,
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 180,
      renderCell: (params) => (
        <Box>
          <Tooltip title="View Details">
            <IconButton
              size="small"
              onClick={() => handleOpenDetailsDialog(params.row)}
            >
              <Person fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Update Balance">
            <IconButton
              size="small"
              color="info"
              onClick={() => handleOpenBalanceDialog(params.row)}
            >
              <AccountBalance fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => handleOpenDialog(params.row)}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDelete(params.row.id)}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Customers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage customer information and balances
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Customer
        </Button>
      </Box>

      {/* Search */}
      <Card sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search customers by name, phone, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Card>

      {/* Customers Table */}
      <Card>
        <DataGrid
          rows={customersData?.data || []}
          columns={columns}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          rowCount={customersData?.pagination.total || 0}
          pageSizeOptions={[5, 10, 25, 50]}
          paginationMode="server"
          autoHeight
          disableRowSelectionOnClick
        />
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingCustomer ? "Edit Customer" : "Add New Customer"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Full Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Phone Number"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Email (Optional)"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Street Address"
                value={formData.address?.street || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, street: e.target.value },
                  })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="City"
                value={formData.address?.city || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, city: e.target.value },
                  })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Country"
                value={formData.address?.country || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, country: e.target.value },
                  })
                }
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editingCustomer ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Balance Dialog */}
      <Dialog
        open={openBalanceDialog}
        onClose={() => setOpenBalanceDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Update Customer Balance</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Customer: <strong>{selectedCustomer?.name}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Phone: {selectedCustomer?.phone}
            </Typography>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                fullWidth
                type="number"
                label="Balance (USD)"
                value={balanceData.usd}
                onChange={(e) =>
                  setBalanceData({
                    ...balanceData,
                    usd: Number(e.target.value),
                  })
                }
                helperText="Positive = Customer owes money, Negative = Customer has credit"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                type="number"
                label="Balance (LBP)"
                value={balanceData.lbp}
                onChange={(e) =>
                  setBalanceData({
                    ...balanceData,
                    lbp: Number(e.target.value),
                  })
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">LBP</InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBalanceDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpdateBalance}
            disabled={updateBalanceMutation.isPending}
          >
            Update Balance
          </Button>
        </DialogActions>
      </Dialog>

      {/* Customer Details Dialog */}
      <Dialog
        open={openDetailsDialog}
        onClose={() => setOpenDetailsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Customer Details</DialogTitle>
        <DialogContent>
          {selectedCustomer && (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                <Avatar
                  sx={{ width: 64, height: 64, bgcolor: "primary.main", mr: 2 }}
                >
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {selectedCustomer.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedCustomer.phone}
                  </Typography>
                  {selectedCustomer.email && (
                    <Typography variant="body2" color="text.secondary">
                      {selectedCustomer.email}
                    </Typography>
                  )}
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid size={6}>
                  <Card sx={{ p: 2, bgcolor: "background.default" }}>
                    <Typography variant="caption" color="text.secondary">
                      Balance (USD)
                    </Typography>
                    <Typography
                      variant="h5"
                      fontWeight={600}
                      color={
                        selectedCustomer.balance.usd > 0
                          ? "error.main"
                          : "success.main"
                      }
                    >
                      ${selectedCustomer.balance.usd.toFixed(2)}
                    </Typography>
                  </Card>
                </Grid>
                <Grid size={6}>
                  <Card sx={{ p: 2, bgcolor: "background.default" }}>
                    <Typography variant="caption" color="text.secondary">
                      Balance (LBP)
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {selectedCustomer.balance.lbp.toLocaleString()}
                    </Typography>
                  </Card>
                </Grid>
                <Grid size={6}>
                  <Card sx={{ p: 2, bgcolor: "background.default" }}>
                    <Typography variant="caption" color="text.secondary">
                      Total Purchases
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      ${selectedCustomer.totalPurchases.toFixed(2)}
                    </Typography>
                  </Card>
                </Grid>
                <Grid size={6}>
                  <Card sx={{ p: 2, bgcolor: "background.default" }}>
                    <Typography variant="caption" color="text.secondary">
                      Last Purchase
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {selectedCustomer.lastPurchaseDate
                        ? new Date(
                            selectedCustomer.lastPurchaseDate
                          ).toLocaleDateString()
                        : "Never"}
                    </Typography>
                  </Card>
                </Grid>
              </Grid>

              {selectedCustomer.address && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Address
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedCustomer.address.street &&
                      `${selectedCustomer.address.street}, `}
                    {selectedCustomer.address.city &&
                      `${selectedCustomer.address.city}, `}
                    {selectedCustomer.address.country}
                  </Typography>
                </>
              )}

              {selectedCustomer.notes && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Notes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedCustomer.notes}
                  </Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Customers;
