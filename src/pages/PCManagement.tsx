import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  IconButton,
  Chip,
  Autocomplete,
} from "@mui/material";
import { Add, Edit, Delete, Lock, LockOpen } from "@mui/icons-material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gamingApi } from "@/api/gaming.api";
import { customersApi } from "@/api/customers.api";
import { PC, PCStatus } from "@/types/gaming.types";
import { Customer } from "@/types/customer.types";
import { toast } from "react-toastify";
import { handleApiError } from "@/utils/errorHandler";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const PCManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [openLockDialog, setOpenLockDialog] = useState(false);
  const [editingPC, setEditingPC] = useState<PC | null>(null);
  const [lockingPC, setLockingPC] = useState<PC | null>(null);
  const [formData, setFormData] = useState({
    pcNumber: "",
    name: "",
    hourlyRateUsd: 2,
    location: "",
    specifications: {
      cpu: "",
      gpu: "",
      ram: "",
      monitor: "",
    },
    notes: "",
  });

  const [lockData, setLockData] = useState({
    selectedCustomer: null as Customer | null,
    customerName: "",
  });

  const { data: pcsData, isLoading } = useQuery({
    queryKey: ["gaming-pcs-management"],
    queryFn: () => gamingApi.getAllPCs({ limit: 100 }),
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-all"],
    queryFn: () => customersApi.getAll({ limit: 1000 }),
  });

  const createPCMutation = useMutation({
    mutationFn: gamingApi.createPC,
    onSuccess: () => {
      toast.success("PC created successfully!");
      setOpenDialog(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["gaming-pcs-management"] });
      queryClient.invalidateQueries({ queryKey: ["gaming-pcs"] });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const updatePCMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      gamingApi.updatePC(id, data),
    onSuccess: () => {
      toast.success("PC updated successfully!");
      setOpenDialog(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["gaming-pcs-management"] });
      queryClient.invalidateQueries({ queryKey: ["gaming-pcs"] });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const deletePCMutation = useMutation({
    mutationFn: gamingApi.deletePC,
    onSuccess: () => {
      toast.success("PC deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["gaming-pcs-management"] });
      queryClient.invalidateQueries({ queryKey: ["gaming-pcs"] });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const lockPCMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      gamingApi.lockPC(id, data),
    onSuccess: () => {
      toast.success("PC locked successfully!");
      setOpenLockDialog(false);
      resetLockData();
      queryClient.invalidateQueries({ queryKey: ["gaming-pcs-management"] });
      queryClient.invalidateQueries({ queryKey: ["gaming-pcs"] });
      queryClient.invalidateQueries({ queryKey: ["active-gaming-sessions"] });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const unlockPCMutation = useMutation({
    mutationFn: gamingApi.unlockPC,
    onSuccess: () => {
      toast.success("PC unlocked successfully!");
      queryClient.invalidateQueries({ queryKey: ["gaming-pcs-management"] });
      queryClient.invalidateQueries({ queryKey: ["gaming-pcs"] });
      queryClient.invalidateQueries({ queryKey: ["active-gaming-sessions"] });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const resetForm = () => {
    setFormData({
      pcNumber: "",
      name: "",
      hourlyRateUsd: 2,
      location: "",
      specifications: {
        cpu: "",
        gpu: "",
        ram: "",
        monitor: "",
      },
      notes: "",
    });
    setEditingPC(null);
  };

  const resetLockData = () => {
    setLockData({
      selectedCustomer: null,
      customerName: "",
    });
    setLockingPC(null);
  };

  const handleOpenDialog = (pc?: PC) => {
    if (pc) {
      setEditingPC(pc);
      setFormData({
        pcNumber: pc.pcNumber,
        name: pc.name,
        hourlyRateUsd: pc.hourlyRate.usd,
        location: pc.location || "",
        specifications: {
          cpu: pc?.specifications?.cpu || "",
          gpu: pc?.specifications?.gpu || "",
          ram: pc?.specifications?.ram || "",
          monitor: pc?.specifications?.monitor || "",
        },
        notes: pc.notes || "",
      });
    }
    setOpenDialog(true);
  };

  const handleOpenLockDialog = (pc: PC) => {
    setLockingPC(pc);
    setOpenLockDialog(true);
  };

  const handleSubmit = () => {
    if (editingPC) {
      updatePCMutation.mutate({
        id: editingPC.id,
        data: formData,
      });
    } else {
      createPCMutation.mutate(formData);
    }
  };

  const handleLock = () => {
    if (!lockingPC) return;

    lockPCMutation.mutate({
      id: lockingPC.id,
      data: {
        customerId: lockData.selectedCustomer?.id,
        customerName:
          lockData.selectedCustomer?.name || lockData.customerName || "Walk-in",
      },
    });
  };

  const handleUnlock = (id: string) => {
    if (
      window.confirm(
        "Are you sure you want to unlock this PC? This will end the active session."
      )
    ) {
      unlockPCMutation.mutate(id);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this PC?")) {
      deletePCMutation.mutate(id);
    }
  };

  const columns: GridColDef[] = [
    { field: "pcNumber", headerName: "PC Number", width: 130 },
    { field: "name", headerName: "Name", flex: 1 },
    {
      field: "hourlyRate",
      headerName: "Hourly Rate (USD)",
      width: 150,
      renderCell: (params) => `$${params.row.hourlyRate.usd.toFixed(2)}`,
    },
    { field: "location", headerName: "Location", width: 150 },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.row.status.toUpperCase()}
          color={
            params.row.status === PCStatus.AVAILABLE
              ? "success"
              : params.row.status === PCStatus.OCCUPIED
              ? "error"
              : "warning"
          }
          size="small"
        />
      ),
    },
    {
      field: "isActive",
      headerName: "Active",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.row.isActive ? "Yes" : "No"}
          color={params.row.isActive ? "success" : "default"}
          size="small"
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 200,
      renderCell: (params) => (
        <Box>
          {params.row.status === PCStatus.AVAILABLE && (
            <IconButton
              size="small"
              color="warning"
              onClick={() => handleOpenLockDialog(params.row)}
              title="Lock PC"
            >
              <Lock fontSize="small" />
            </IconButton>
          )}
          {params.row.status === PCStatus.OCCUPIED && (
            <IconButton
              size="small"
              color="success"
              onClick={() => handleUnlock(params.row.id)}
              title="Unlock PC"
            >
              <LockOpen fontSize="small" />
            </IconButton>
          )}
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleOpenDialog(params.row)}
          >
            <Edit fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(params.row.id)}
          >
            <Delete fontSize="small" />
          </IconButton>
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
            PC Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage gaming station configurations and lock/unlock
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add PC
        </Button>
      </Box>

      <Card>
        <DataGrid
          rows={pcsData?.data || []}
          columns={columns}
          autoHeight
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
        />
      </Card>

      {/* Add/Edit PC Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{editingPC ? "Edit PC" : "Add New PC"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="PC Number"
                value={formData.pcNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pcNumber: e.target.value.toUpperCase(),
                  })
                }
                disabled={!!editingPC}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Hourly Rate (USD)"
                value={formData.hourlyRateUsd}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hourlyRateUsd: Number(e.target.value),
                  })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="CPU"
                value={formData.specifications.cpu}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    specifications: {
                      ...formData.specifications,
                      cpu: e.target.value,
                    },
                  })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="GPU"
                value={formData.specifications.gpu}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    specifications: {
                      ...formData.specifications,
                      gpu: e.target.value,
                    },
                  })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="RAM"
                value={formData.specifications.ram}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    specifications: {
                      ...formData.specifications,
                      ram: e.target.value,
                    },
                  })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Monitor"
                value={formData.specifications.monitor}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    specifications: {
                      ...formData.specifications,
                      monitor: e.target.value,
                    },
                  })
                }
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createPCMutation.isPending || updatePCMutation.isPending}
          >
            {createPCMutation.isPending || updatePCMutation.isPending
              ? "Saving..."
              : editingPC
              ? "Update"
              : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lock PC Dialog */}
      <Dialog
        open={openLockDialog}
        onClose={() => setOpenLockDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Lock PC</DialogTitle>
        <DialogContent>
          {lockingPC && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Locking: {lockingPC.name} ({lockingPC.pcNumber})
              </Typography>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={12}>
                  <Autocomplete
                    options={customers?.data || []}
                    getOptionLabel={(option) =>
                      `${option.name} (${option.phone})`
                    }
                    value={lockData.selectedCustomer}
                    onChange={(_, value) =>
                      setLockData({ ...lockData, selectedCustomer: value })
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Customer (Optional)"
                        fullWidth
                      />
                    )}
                  />
                </Grid>

                {!lockData.selectedCustomer && (
                  <Grid size={12}>
                    <TextField
                      fullWidth
                      label="Customer Name (Walk-in)"
                      value={lockData.customerName}
                      onChange={(e) =>
                        setLockData({
                          ...lockData,
                          customerName: e.target.value,
                        })
                      }
                      placeholder="Enter customer name or leave blank"
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLockDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleLock}
            disabled={lockPCMutation.isPending}
            startIcon={<Lock />}
          >
            {lockPCMutation.isPending ? "Locking..." : "Lock PC"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PCManagement;
