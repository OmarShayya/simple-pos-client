import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Chip,
  FormControlLabel,
  Switch,
  CircularProgress,
  Stack,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  LocalOffer,
  CheckCircle,
  Cancel,
} from "@mui/icons-material";
import { DataGrid, GridColDef, GridActionsCellItem } from "@mui/x-data-grid";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { discountsApi } from "@/api/discounts.api";
import { productsApi } from "@/api/products.api";
import { categoriesApi } from "@/api/categories.api";
import {
  Discount,
  CreateDiscountRequest,
  UpdateDiscountRequest,
  DiscountTarget,
} from "@/types/discount.types";
import { Product } from "@/types/product.types";
import { Category } from "@/types/category.types";
import { toast } from "react-toastify";
import { handleApiError } from "@/utils/errorHandler";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const Discounts: React.FC = () => {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [targetFilter, setTargetFilter] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  const [formData, setFormData] = useState<CreateDiscountRequest>({
    name: "",
    description: "",
    value: 0,
    target: DiscountTarget.PRODUCT,
    targetId: "",
    isActive: true,
    startDate: "",
    endDate: "",
  });

  const { data: discountsData, isLoading } = useQuery({
    queryKey: [
      "discounts",
      paginationModel.page + 1,
      paginationModel.pageSize,
      targetFilter,
      activeFilter,
    ],
    queryFn: () =>
      discountsApi.getAll({
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        target: targetFilter as DiscountTarget | undefined,
        isActive: activeFilter === "" ? undefined : activeFilter === "true",
      }),
  });

  const { data: productsData } = useQuery({
    queryKey: ["products-for-discount"],
    queryFn: () => productsApi.getAll({ limit: 1000 }),
    enabled: formData.target === DiscountTarget.PRODUCT,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.getAll(),
    enabled: formData.target === DiscountTarget.CATEGORY,
  });

  const createMutation = useMutation({
    mutationFn: discountsApi.create,
    onSuccess: () => {
      toast.success("Discount created successfully!");
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDiscountRequest }) =>
      discountsApi.update(id, data),
    onSuccess: () => {
      toast.success("Discount updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: discountsApi.delete,
    onSuccess: () => {
      toast.success("Discount deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });

  const handleOpenDialog = (discount?: Discount) => {
    if (discount) {
      setEditingDiscount(discount);
      setFormData({
        name: discount.name,
        description: discount.description || "",
        value: discount.value,
        target: discount.target,
        targetId: discount.targetId,
        isActive: discount.isActive,
        startDate: discount.startDate
          ? new Date(discount.startDate).toISOString().split("T")[0]
          : "",
        endDate: discount.endDate
          ? new Date(discount.endDate).toISOString().split("T")[0]
          : "",
      });
    } else {
      setEditingDiscount(null);
      setFormData({
        name: "",
        description: "",
        value: 0,
        target: DiscountTarget.PRODUCT,
        targetId: "",
        isActive: true,
        startDate: "",
        endDate: "",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDiscount(null);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a discount name");
      return;
    }
    if (formData.value <= 0 || formData.value > 100) {
      toast.error("Discount value must be between 1 and 100");
      return;
    }
    if (
      (formData.target === DiscountTarget.PRODUCT ||
        formData.target === DiscountTarget.CATEGORY) &&
      !formData.targetId
    ) {
      toast.error(
        `Please select a ${
          formData.target === DiscountTarget.PRODUCT ? "product" : "category"
        }`
      );
      return;
    }

    const submitData: CreateDiscountRequest = {
      ...formData,
      startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
    };

    if (
      formData.target === DiscountTarget.SALE ||
      formData.target === DiscountTarget.GAMING_SESSION
    ) {
      delete submitData.targetId;
    }

    if (editingDiscount) {
      updateMutation.mutate({ id: editingDiscount.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this discount?")) {
      deleteMutation.mutate(id);
    }
  };

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      minWidth: 150,
    },
    {
      field: "value",
      headerName: "Discount",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={`${params.row.value}%`}
          color="secondary"
          size="small"
          icon={<LocalOffer />}
        />
      ),
    },
    {
      field: "target",
      headerName: "Target Type",
      width: 130,
      renderCell: (params) => {
        const targetLabels: Record<DiscountTarget, string> = {
          [DiscountTarget.PRODUCT]: "Product",
          [DiscountTarget.CATEGORY]: "Category",
          [DiscountTarget.GAMING_SESSION]: "Gaming",
          [DiscountTarget.SALE]: "Sale",
        };
        return (
          <Chip label={targetLabels[params.row.target as DiscountTarget]} size="small" />
        );
      },
    },
    {
      field: "targetDetails",
      headerName: "Target",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => {
        if (
          params.row.target === DiscountTarget.SALE ||
          params.row.target === DiscountTarget.GAMING_SESSION
        ) {
          return <Typography variant="body2">All</Typography>;
        }
        return (
          <Typography variant="body2">
            {params.row.targetDetails?.name || "N/A"}
          </Typography>
        );
      },
    },
    {
      field: "isActive",
      headerName: "Status",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.row.isActive ? "Active" : "Inactive"}
          color={params.row.isActive ? "success" : "default"}
          size="small"
          icon={params.row.isActive ? <CheckCircle /> : <Cancel />}
        />
      ),
    },
    {
      field: "startDate",
      headerName: "Start Date",
      width: 120,
      renderCell: (params) =>
        params.row.startDate
          ? new Date(params.row.startDate).toLocaleDateString()
          : "N/A",
    },
    {
      field: "endDate",
      headerName: "End Date",
      width: 120,
      renderCell: (params) =>
        params.row.endDate
          ? new Date(params.row.endDate).toLocaleDateString()
          : "N/A",
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          key="edit"
          icon={<Edit />}
          label="Edit"
          onClick={() => handleOpenDialog(params.row)}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<Delete />}
          label="Delete"
          onClick={() => handleDelete(params.row.id)}
        />,
      ],
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" fontWeight="bold">
          Discounts
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Create Discount
        </Button>
      </Box>

      <Card sx={{ mb: 3, p: 2.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label="Target Type"
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            size="small"
            sx={{ minWidth: { xs: "100%", sm: 200 } }}
          >
            <MenuItem value="">All Types</MenuItem>
            <MenuItem value={DiscountTarget.PRODUCT}>Product</MenuItem>
            <MenuItem value={DiscountTarget.CATEGORY}>Category</MenuItem>
            <MenuItem value={DiscountTarget.GAMING_SESSION}>Gaming Session</MenuItem>
            <MenuItem value={DiscountTarget.SALE}>Sale</MenuItem>
          </TextField>
          <TextField
            select
            label="Status"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            size="small"
            sx={{ minWidth: { xs: "100%", sm: 200 } }}
          >
            <MenuItem value="">All Status</MenuItem>
            <MenuItem value="true">Active</MenuItem>
            <MenuItem value="false">Inactive</MenuItem>
          </TextField>
        </Stack>
      </Card>

      <Card>
        <DataGrid
          rows={discountsData?.data || []}
          columns={columns}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[5, 10, 25, 50]}
          rowCount={discountsData?.pagination?.total || 0}
          paginationMode="server"
          loading={isLoading}
          disableRowSelectionOnClick
          autoHeight
          sx={{
            "& .MuiDataGrid-cell:focus": {
              outline: "none",
            },
          }}
        />
      </Card>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingDiscount ? "Edit Discount" : "Create New Discount"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Discount Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                fullWidth
                label="Discount Percentage"
                type="number"
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: Number(e.target.value) })
                }
                slotProps={{
                  htmlInput: { min: 0, max: 100, step: 1 }
                }}
                required
              />
              <TextField
                select
                fullWidth
                label="Target Type"
                value={formData.target}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    target: e.target.value as DiscountTarget,
                    targetId: "",
                  })
                }
                required
              >
                <MenuItem value={DiscountTarget.PRODUCT}>Product</MenuItem>
                <MenuItem value={DiscountTarget.CATEGORY}>Category</MenuItem>
                <MenuItem value={DiscountTarget.GAMING_SESSION}>
                  Gaming Session
                </MenuItem>
                <MenuItem value={DiscountTarget.SALE}>Sale</MenuItem>
              </TextField>
            </Stack>

            {formData.target === DiscountTarget.PRODUCT && (
              <TextField
                select
                fullWidth
                label="Select Product"
                value={formData.targetId}
                onChange={(e) =>
                  setFormData({ ...formData, targetId: e.target.value })
                }
                required
              >
                {productsData?.data?.map((product: Product) => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </MenuItem>
                ))}
              </TextField>
            )}

            {formData.target === DiscountTarget.CATEGORY && (
              <TextField
                select
                fullWidth
                label="Select Category"
                value={formData.targetId}
                onChange={(e) =>
                  setFormData({ ...formData, targetId: e.target.value })
                }
                required
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                slotProps={{
                  inputLabel: { shrink: true }
                }}
              />
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                slotProps={{
                  inputLabel: { shrink: true }
                }}
              />
            </Stack>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <CircularProgress size={24} />
            ) : editingDiscount ? (
              "Update"
            ) : (
              "Create"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Discounts;
