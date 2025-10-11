import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Grid,
  Tooltip,
  CircularProgress,
  CardContent,
  CardMedia,
  CardActions,
  Avatar,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import {
  Add,
  Search,
  Edit,
  Delete,
  Warning,
  Upload,
  ViewList,
  ViewModule,
  Inventory,
} from "@mui/icons-material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "@/api/products.api";
import { categoriesApi } from "@/api/categories.api";
import { exchangeRateApi } from "@/api/exchangeRate.api";
import {
  Product,
  CreateProductRequest,
  UpdateProductRequest,
} from "@/types/product.types";
import { Category } from "@/types/category.types";
import { toast } from "react-toastify";
import { handleApiError } from "@/utils/errorHandler";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { uploadImageToFirebase } from "@/utils/firebaseUpload";

const Products: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "card">("grid");
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  const [formData, setFormData] = useState<CreateProductRequest>({
    name: "",
    description: "",
    sku: "",
    category: "",
    pricing: { usd: 0, lbp: 0 },
    inventory: { quantity: 0, minStockLevel: 10 },
    image: "",
  });

  const [isEditingUsd, setIsEditingUsd] = useState(false);
  const [isEditingLbp, setIsEditingLbp] = useState(false);
  const [lastEditedField, setLastEditedField] = useState<"usd" | "lbp" | null>(
    null
  );

  const { data: exchangeRate } = useQuery({
    queryKey: ["exchange-rate"],
    queryFn: exchangeRateApi.getCurrentRate,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (
      exchangeRate &&
      formData.pricing.usd > 0 &&
      lastEditedField === "usd" &&
      !isEditingLbp
    ) {
      const lbpValue = Math.round(formData.pricing.usd * exchangeRate.rate);
      if (Math.abs(lbpValue - formData.pricing.lbp) > 1) {
        setFormData((prev) => ({
          ...prev,
          pricing: {
            ...prev.pricing,
            lbp: lbpValue,
          },
        }));
      }
    }
  }, [formData.pricing.usd, exchangeRate, lastEditedField, isEditingLbp]);

  useEffect(() => {
    if (
      exchangeRate &&
      formData.pricing.lbp > 0 &&
      lastEditedField === "lbp" &&
      !isEditingUsd
    ) {
      const usdValue = Number(
        (formData.pricing.lbp / exchangeRate.rate).toFixed(2)
      );
      if (Math.abs(usdValue - formData.pricing.usd) > 0.01) {
        setFormData((prev) => ({
          ...prev,
          pricing: {
            ...prev.pricing,
            usd: usdValue,
          },
        }));
      }
    }
  }, [formData.pricing.lbp, exchangeRate, lastEditedField, isEditingUsd]);

  const { data: productsData, isLoading } = useQuery({
    queryKey: [
      "products",
      paginationModel.page + 1,
      paginationModel.pageSize,
      searchQuery,
      categoryFilter,
      lowStockOnly,
    ],
    queryFn: () =>
      productsApi.getAll({
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        search: searchQuery || undefined,
        category: categoryFilter || undefined,
        lowStock: lowStockOnly || undefined,
      }),
    placeholderData: (previousData) => previousData,
  });

  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      toast.success("Product created successfully");
      handleCloseDialog();
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductRequest }) =>
      productsApi.update(id, data),
    onSuccess: () => {
      toast.success("Product updated successfully");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      handleCloseDialog();
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      toast.success("Product deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || "",
        sku: product.sku,
        category: product.category.id,
        pricing: product.pricing,
        inventory: {
          quantity: product.inventory.quantity,
          minStockLevel: product.inventory.minStockLevel,
        },
        image: product.image || "",
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        sku: "",
        category: "",
        pricing: { usd: 0, lbp: 0 },
        inventory: { quantity: 0, minStockLevel: 10 },
        image: "",
      });
    }
    setImageFile(null);
    setIsEditingUsd(false);
    setIsEditingLbp(false);
    setLastEditedField(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProduct(null);
    setImageFile(null);
  };

  const handleImageSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setImageFile(file);
    setUploadingImage(true);

    try {
      const imageUrl = await uploadImageToFirebase(file, "products");
      setFormData((prev) => ({ ...prev, image: imageUrl }));
      toast.success("Image uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload image");
      setImageFile(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = () => {
    if (editingProduct) {
      // For update, exclude SKU and only send changed fields
      const updateData: UpdateProductRequest = {
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category,
        pricing: formData.pricing,
        inventory: formData.inventory,
        image: formData.image || undefined,
      };

      updateMutation.mutate({ id: editingProduct.id, data: updateData });
    } else {
      // For create, send all fields including SKU
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      deleteMutation.mutate(id);
    }
  };

  const columns: GridColDef[] = [
    {
      field: "image",
      headerName: "Image",
      width: 80,
      renderCell: (params) => (
        <Avatar
          src={params.row.image}
          alt={params.row.name}
          variant="rounded"
          sx={{ width: 50, height: 50 }}
        >
          <Inventory />
        </Avatar>
      ),
    },
    {
      field: "name",
      headerName: "Product Name",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "sku",
      headerName: "SKU",
      width: 120,
    },
    {
      field: "category",
      headerName: "Category",
      width: 150,
      renderCell: (params) => params.row.category.name,
    },
    {
      field: "pricing",
      headerName: "Price (USD)",
      width: 120,
      renderCell: (params) => `$${params.row.pricing.usd.toFixed(2)}`,
    },
    {
      field: "inventory",
      headerName: "Stock",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.row.inventory.quantity}
          color={params.row.inventory.isLowStock ? "error" : "success"}
          size="small"
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 120,
      renderCell: (params) => (
        <Box>
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
            Products
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your product inventory
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Product
        </Button>
      </Box>

      <Card sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth
              placeholder="Search products..."
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
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              select
              label="Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Button
              fullWidth
              variant={lowStockOnly ? "contained" : "outlined"}
              startIcon={<Warning />}
              onClick={() => setLowStockOnly(!lowStockOnly)}
              sx={{ height: "100%" }}
            >
              Low Stock Only
            </Button>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newMode) => newMode && setViewMode(newMode)}
              fullWidth
            >
              <ToggleButton value="grid">
                <ViewList />
              </ToggleButton>
              <ToggleButton value="card">
                <ViewModule />
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Card>

      {viewMode === "grid" ? (
        <Card>
          <DataGrid
            rows={productsData?.data || []}
            columns={columns}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            rowCount={productsData?.pagination.total || 0}
            pageSizeOptions={[5, 10, 25, 50]}
            paginationMode="server"
            autoHeight
            disableRowSelectionOnClick
            loading={isLoading}
            getRowHeight={() => 70}
          />
        </Card>
      ) : (
        <Grid container spacing={3}>
          {productsData?.data.map((product: Product) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={product.id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={product.image || "/placeholder-product.png"}
                  alt={product.name}
                  sx={{ objectFit: "cover" }}
                  onError={(e: any) => {
                    e.target.src = "/placeholder-product.png";
                  }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom noWrap>
                    {product.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    SKU: {product.sku}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      mb: 2,
                      minHeight: 40,
                    }}
                  >
                    {product.description || "No description"}
                  </Typography>
                  <Chip
                    label={product.category.name}
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" color="primary">
                      ${product.pricing.usd.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {product.pricing.lbp.toLocaleString()} LBP
                    </Typography>
                  </Box>
                  <Chip
                    label={`Stock: ${product.inventory.quantity}`}
                    color={product.inventory.isLowStock ? "error" : "success"}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    onClick={() => handleOpenDialog(product)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => handleDelete(product.id)}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingProduct ? "Edit Product" : "Add New Product"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Product Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="SKU"
                value={formData.sku}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                required
                disabled={!!editingProduct}
                helperText={editingProduct ? "SKU cannot be changed" : ""}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                multiline
                rows={2}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                select
                label="Category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                required
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Button
                fullWidth
                variant="outlined"
                component="label"
                startIcon={
                  uploadingImage ? <CircularProgress size={20} /> : <Upload />
                }
                disabled={uploadingImage}
                sx={{ height: "56px" }}
              >
                {imageFile ? imageFile.name : "Upload Image"}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageSelect}
                />
              </Button>
            </Grid>
            {formData.image && (
              <Grid size={12}>
                <Card sx={{ p: 2 }}>
                  <img
                    src={formData.image}
                    alt="Product preview"
                    style={{ maxWidth: "200px", maxHeight: "200px" }}
                  />
                </Card>
              </Grid>
            )}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Price (USD)"
                value={formData.pricing.usd}
                onFocus={(e) => {
                  setIsEditingUsd(true);
                  setLastEditedField("usd");
                  if (formData.pricing.usd === 0) {
                    e.target.select();
                  }
                }}
                onBlur={() => setIsEditingUsd(false)}
                onChange={(e) => {
                  const value =
                    e.target.value === "" ? 0 : Number(e.target.value);
                  setFormData({
                    ...formData,
                    pricing: { ...formData.pricing, usd: value },
                  });
                  setLastEditedField("usd");
                }}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Price (LBP)"
                value={formData.pricing.lbp}
                onFocus={(e) => {
                  setIsEditingLbp(true);
                  setLastEditedField("lbp");
                  if (formData.pricing.lbp === 0) {
                    e.target.select();
                  }
                }}
                onBlur={() => setIsEditingLbp(false)}
                onChange={(e) => {
                  const value =
                    e.target.value === "" ? 0 : Number(e.target.value);
                  setFormData({
                    ...formData,
                    pricing: { ...formData.pricing, lbp: value },
                  });
                  setLastEditedField("lbp");
                }}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">LBP</InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={12}>
              <Typography variant="caption" color="text.secondary">
                Exchange Rate: 1 USD = {exchangeRate?.rate.toLocaleString()} LBP
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Quantity"
                value={formData.inventory.quantity}
                onFocus={(e) => {
                  if (formData.inventory.quantity === 0) {
                    e.target.select();
                  }
                }}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    inventory: {
                      ...formData.inventory,
                      quantity:
                        e.target.value === "" ? 0 : Number(e.target.value),
                    },
                  })
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Min Stock Level"
                value={formData.inventory.minStockLevel}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    inventory: {
                      ...formData.inventory,
                      minStockLevel: Number(e.target.value),
                    },
                  })
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={
              createMutation.isPending ||
              updateMutation.isPending ||
              uploadingImage
            }
          >
            {editingProduct ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Products;
