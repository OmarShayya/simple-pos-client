import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Autocomplete,
  IconButton,
  Divider,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Add,
  Remove,
  Delete,
  ShoppingCart,
  Receipt,
  PendingActions,
  Edit,
  Refresh,
  Payment,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { productsApi } from "@/api/products.api";
import { customersApi } from "@/api/customers.api";
import { salesApi } from "@/api/sales.api";
import { exchangeRateApi } from "@/api/exchangeRate.api";
import { Product } from "@/types/product.types";
import { Customer } from "@/types/customer.types";
import { SaleItem, SaleStatus } from "@/types/sale.types";
import { toast } from "react-toastify";
import { handleApiError } from "@/utils/errorHandler";

const Sales: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [openPendingDialog, setOpenPendingDialog] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);

  const { data: exchangeRate, isLoading: loadingRate } = useQuery({
    queryKey: ["exchange-rate"],
    queryFn: exchangeRateApi.getCurrentRate,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["products-all"],
    queryFn: () => productsApi.getAll({ limit: 1000 }),
    staleTime: 60 * 1000,
  });

  const { data: customers, isLoading: loadingCustomers } = useQuery({
    queryKey: ["customers-all"],
    queryFn: () => customersApi.getAll({ limit: 1000 }),
    staleTime: 60 * 1000,
  });

  const { data: pendingSales, isLoading: loadingPending } = useQuery({
    queryKey: ["pending-sales"],
    queryFn: () => salesApi.getAll({ status: SaleStatus.PENDING, limit: 100 }),
    staleTime: 10 * 1000,
  });

  useEffect(() => {
    if (exchangeRate && cartItems.length > 0) {
      setCartItems((prevItems) =>
        prevItems.map((item) => ({
          ...item,
          unitPrice: {
            ...item.unitPrice,
            lbp: Math.round(item.unitPrice.usd * exchangeRate.rate),
          },
          subtotal: {
            usd: item.subtotal.usd,
            lbp: Math.round(item.subtotal.usd * exchangeRate.rate),
          },
        }))
      );
    }
  }, [exchangeRate?.rate]);

  const createSaleMutation = useMutation({
    mutationFn: salesApi.create,
    onSuccess: (sale) => {
      toast.success(`Sale created! Invoice: ${sale.invoiceNumber}`);
      resetCart();
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["pending-sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (selectedCustomer) {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
      }
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const updateSaleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      salesApi.update(id, data),
    onSuccess: (sale) => {
      toast.success(`Sale updated! Invoice: ${sale.invoiceNumber}`);
      resetCart();
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["pending-sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const resetCart = () => {
    setCartItems([]);
    setSelectedCustomer(null);
    setEditingSaleId(null);
  };

  const addToCart = (product: Product) => {
    if (product.inventory.quantity === 0) {
      toast.error("Product out of stock");
      return;
    }

    const rate = exchangeRate?.rate || 89500;
    const existingItem = cartItems.find(
      (item) => item.productId === product.id
    );

    if (existingItem) {
      if (existingItem.quantity >= product.inventory.quantity) {
        toast.error("Not enough stock");
        return;
      }
      setCartItems(
        cartItems.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: {
                  usd: item.unitPrice.usd * (item.quantity + 1),
                  lbp: Math.round(
                    item.unitPrice.usd * (item.quantity + 1) * rate
                  ),
                },
              }
            : item
        )
      );
    } else {
      setCartItems([
        ...cartItems,
        {
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          quantity: 1,
          unitPrice: {
            usd: product.pricing.usd,
            lbp: Math.round(product.pricing.usd * rate),
          },
          subtotal: {
            usd: product.pricing.usd,
            lbp: Math.round(product.pricing.usd * rate),
          },
        },
      ]);
    }
    toast.success(`${product.name} added to cart`);
  };

  const updateQuantity = (productId: string, change: number) => {
    const rate = exchangeRate?.rate || 89500;
    setCartItems(
      cartItems
        .map((item) => {
          if (item.productId === productId) {
            const newQuantity = item.quantity + change;
            if (newQuantity <= 0) return null;
            return {
              ...item,
              quantity: newQuantity,
              subtotal: {
                usd: item.unitPrice.usd * newQuantity,
                lbp: Math.round(item.unitPrice.usd * newQuantity * rate),
              },
            };
          }
          return item;
        })
        .filter((item): item is SaleItem => item !== null)
    );
  };

  const removeFromCart = (productId: string) => {
    setCartItems(cartItems.filter((item) => item.productId !== productId));
  };

  const calculateTotal = () => {
    return cartItems.reduce(
      (acc, item) => ({
        usd: acc.usd + item.subtotal.usd,
        lbp: acc.lbp + item.subtotal.lbp,
      }),
      { usd: 0, lbp: 0 }
    );
  };

  const handleSaveSale = () => {
    if (cartItems.length === 0) {
      toast.error("Please add items to cart");
      return;
    }

    const saleData = {
      customerId: selectedCustomer?.id,
      items: cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    };

    if (editingSaleId) {
      updateSaleMutation.mutate({ id: editingSaleId, data: saleData });
    } else {
      createSaleMutation.mutate(saleData);
    }
  };

  const handleLoadPendingSale = async (saleId: string) => {
    try {
      const sale = await salesApi.getById(saleId);
      const rate = exchangeRate?.rate || 89500;

      if (sale.customer) {
        const customer = customers?.data.find(
          (c: Customer) => c.id === sale.customer?.id
        );
        setSelectedCustomer(customer || null);
      }

      const newCartItems: SaleItem[] = sale.items.map((item) => {
        // Extract productId safely from various possible formats
        let productId = "";

        if (item.productId) {
          productId = item.productId;
        } else if (typeof item.product === "string") {
          productId = item.product;
        } else if (item.product && typeof item.product === "object") {
          productId =
            (item.product as any)._id || (item.product as any).id || "";
        }

        return {
          productId,
          productName: item.productName,
          productSku: item.productSku,
          quantity: item.quantity,
          unitPrice: {
            usd: item.unitPrice.usd,
            lbp: Math.round(item.unitPrice.usd * rate),
          },
          subtotal: {
            usd: item.subtotal.usd,
            lbp: Math.round(item.subtotal.usd * rate),
          },
        };
      });

      setCartItems(newCartItems);
      setEditingSaleId(saleId);
      setOpenPendingDialog(false);
      toast.success("Pending order loaded");
    } catch (error) {
      toast.error("Failed to load pending order");
      console.error("Load pending sale error:", error);
    }
  };

  const handleProcessPayment = (saleId: string) => {
    setOpenPendingDialog(false);
    navigate(`/sales/history?paymentFor=${saleId}`);
  };

  const handleRefreshRate = () => {
    queryClient.invalidateQueries({ queryKey: ["exchange-rate"] });
    toast.info("Refreshing exchange rate...");
  };

  const total = calculateTotal();
  const pendingCount = pendingSales?.data?.length || 0;
  const currentRate = exchangeRate?.rate || 89500;

  if (loadingProducts || loadingCustomers) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Point of Sale
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
            <Chip
              label={`1 USD = ${currentRate.toLocaleString()} LBP`}
              color="primary"
              size="small"
              variant="outlined"
            />
            <IconButton
              size="small"
              onClick={handleRefreshRate}
              disabled={loadingRate}
              title="Refresh exchange rate"
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        <Button
          variant="outlined"
          startIcon={
            <Badge badgeContent={pendingCount} color="error">
              <PendingActions />
            </Badge>
          }
          onClick={() => setOpenPendingDialog(true)}
        >
          Pending Orders
        </Button>
      </Box>

      {editingSaleId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Editing pending sale. Make changes and click "Update Sale" to save.
          <Button size="small" onClick={resetCart} sx={{ ml: 2 }}>
            Cancel Edit
          </Button>
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Select Products
              </Typography>

              <Autocomplete
                options={products?.data || []}
                getOptionLabel={(option) =>
                  `${option.name} - ${option.sku} ($${option.pricing.usd})`
                }
                onChange={(_, value) => value && addToCart(value)}
                inputValue={productSearch}
                onInputChange={(_, newValue) => setProductSearch(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Search products" fullWidth />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <Box sx={{ width: "100%" }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {option.name}
                        </Typography>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography
                            variant="body2"
                            color="primary"
                            fontWeight={600}
                          >
                            ${option.pricing.usd.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {Math.round(
                              option.pricing.usd * currentRate
                            ).toLocaleString()}{" "}
                            LBP
                          </Typography>
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {option.sku}
                        </Typography>
                        <Chip
                          label={`Stock: ${option.inventory.quantity}`}
                          size="small"
                          color={
                            option.inventory.isLowStock ? "error" : "success"
                          }
                        />
                      </Box>
                    </Box>
                  </li>
                )}
                sx={{ mb: 3 }}
              />

              <Box sx={{ maxHeight: 400, overflow: "auto" }}>
                <Grid container spacing={2}>
                  {products?.data.slice(0, 12).map((product) => (
                    <Grid size={{ xs: 6, sm: 4 }} key={product.id}>
                      <Card
                        sx={{
                          cursor:
                            product.inventory.quantity > 0
                              ? "pointer"
                              : "not-allowed",
                          opacity: product.inventory.quantity > 0 ? 1 : 0.5,
                          "&:hover":
                            product.inventory.quantity > 0
                              ? { boxShadow: 3 }
                              : {},
                          border: 1,
                          borderColor: "divider",
                        }}
                        onClick={() =>
                          product.inventory.quantity > 0 && addToCart(product)
                        }
                      >
                        <CardContent>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {product.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {product.sku}
                          </Typography>
                          <Box sx={{ mt: 1 }}>
                            <Typography
                              variant="body2"
                              color="primary"
                              fontWeight={600}
                            >
                              ${product.pricing.usd.toFixed(2)}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {Math.round(
                                product.pricing.usd * currentRate
                              ).toLocaleString()}{" "}
                              LBP
                            </Typography>
                          </Box>
                          <Chip
                            label={`Stock: ${product.inventory.quantity}`}
                            size="small"
                            color={
                              product.inventory.quantity === 0
                                ? "default"
                                : product.inventory.isLowStock
                                ? "error"
                                : "success"
                            }
                            sx={{ mt: 1 }}
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ position: "sticky", top: 20 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                <ShoppingCart sx={{ mr: 1, verticalAlign: "middle" }} />
                Cart ({cartItems.length} items)
              </Typography>

              <Autocomplete
                options={customers?.data || []}
                getOptionLabel={(option) => `${option.name} (${option.phone})`}
                value={selectedCustomer}
                onChange={(_, value) => setSelectedCustomer(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Customer (Optional)"
                    size="small"
                  />
                )}
                sx={{ mb: 2 }}
              />

              <Divider sx={{ my: 2 }} />

              {cartItems.length === 0 ? (
                <Alert severity="info">Cart is empty</Alert>
              ) : (
                <>
                  <Box sx={{ maxHeight: 300, overflow: "auto", mb: 2 }}>
                    {cartItems.map((item) => (
                      <Box
                        key={item.productId}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 2,
                          p: 1,
                          bgcolor: "background.default",
                          borderRadius: 1,
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {item.productName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ${item.unitPrice.usd.toFixed(2)} /{" "}
                            {item.unitPrice.lbp.toLocaleString()} LBP
                          </Typography>
                        </Box>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <IconButton
                            size="small"
                            onClick={() => updateQuantity(item.productId, -1)}
                          >
                            <Remove fontSize="small" />
                          </IconButton>
                          <Typography
                            variant="body2"
                            sx={{ minWidth: 30, textAlign: "center" }}
                          >
                            {item.quantity}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => updateQuantity(item.productId, 1)}
                          >
                            <Add fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeFromCart(item.productId)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                        <Box sx={{ textAlign: "right", minWidth: 100 }}>
                          <Typography variant="body2" fontWeight={600}>
                            ${item.subtotal.usd.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.subtotal.lbp.toLocaleString()} LBP
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box>
                    <Card
                      sx={{
                        bgcolor: "primary.main",
                        color: "white",
                        p: 2,
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Typography variant="h6" fontWeight={600}>
                          Total (USD):
                        </Typography>
                        <Typography variant="h6" fontWeight={700}>
                          ${total.usd.toFixed(2)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="body2">Total (LBP):</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {total.lbp.toLocaleString()} LBP
                        </Typography>
                      </Box>
                    </Card>

                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={<Receipt />}
                      onClick={handleSaveSale}
                      disabled={
                        createSaleMutation.isPending ||
                        updateSaleMutation.isPending
                      }
                    >
                      {createSaleMutation.isPending ||
                      updateSaleMutation.isPending
                        ? "Processing..."
                        : editingSaleId
                        ? "Update Sale"
                        : "Create Sale"}
                    </Button>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={openPendingDialog}
        onClose={() => setOpenPendingDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6">Pending Orders</Typography>
            <Chip label={`${pendingCount} Orders`} color="warning" />
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingPending ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : pendingSales?.data?.length === 0 ? (
            <Alert severity="info">No pending orders</Alert>
          ) : (
            <List>
              {pendingSales?.data.map((sale: any) => (
                <ListItem
                  key={sale.id}
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    mb: 1,
                    pr: 20, // Add padding-right to make space for buttons
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="body1" fontWeight={600}>
                          {sale.customer?.name || "Walk-in Customer"}
                        </Typography>
                        <Chip
                          label={sale.invoiceNumber}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Items: {sale.items?.length || 0} | Total: $
                          {sale.totals.usd.toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Created: {new Date(sale.createdAt).toLocaleString()}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box
                      sx={{ display: "flex", gap: 1, flexDirection: "column" }}
                    >
                      <Button
                        variant="outlined"
                        size="small"
                        fullWidth
                        startIcon={<Edit />}
                        onClick={() => handleLoadPendingSale(sale.id)}
                      >
                        Load
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        fullWidth
                        color="success"
                        startIcon={<Payment />}
                        onClick={() => handleProcessPayment(sale.id)}
                      >
                        Pay
                      </Button>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPendingDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Sales;
