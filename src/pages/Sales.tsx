import React, { useState } from "react";
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
} from "@mui/material";
import {
  Add,
  Remove,
  Delete,
  ShoppingCart,
  Receipt,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "@/api/products.api";
import { customersApi } from "@/api/customers.api";
import { salesApi } from "@/api/sales.api";
import { Product } from "@/types/product.types";
import { Customer } from "@/types/customer.types";
import { PaymentMethod, Currency, SaleItem } from "@/types/sale.types";
import { toast } from "react-toastify";
import { handleApiError } from "@/utils/errorHandler";

const Sales: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [paymentData, setPaymentData] = useState({
    method: PaymentMethod.CASH,
    currency: Currency.USD,
    amount: 0,
  });

  const { data: products } = useQuery({
    queryKey: ["products-all"],
    queryFn: () => productsApi.getAll({ limit: 1000 }),
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-all"],
    queryFn: () => customersApi.getAll({ limit: 1000 }),
  });

  const createSaleMutation = useMutation({
    mutationFn: salesApi.create,
    onSuccess: (sale) => {
      toast.success(`Sale created! Invoice: ${sale.invoiceNumber}`);
      setCartItems([]);
      setSelectedCustomer(null);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setOpenPaymentDialog(true);
      setPaymentData({
        ...paymentData,
        amount: sale.totals.usd,
      });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const addToCart = (product: Product) => {
    const existingItem = cartItems.find(
      (item) => item.productId === product.id
    );

    if (existingItem) {
      setCartItems(
        cartItems.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
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
          unitPrice: product.pricing,
          subtotal: product.pricing,
        },
      ]);
    }
  };

  const updateQuantity = (productId: string, change: number) => {
    setCartItems(
      cartItems
        .map((item) => {
          if (item.productId === productId) {
            const newQuantity = item.quantity + change;
            return {
              ...item,
              quantity: newQuantity,
              subtotal: {
                usd: item.unitPrice!.usd * newQuantity,
                lbp: item.unitPrice!.lbp * newQuantity,
              },
            };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCartItems(cartItems.filter((item) => item.productId !== productId));
  };

  const calculateTotal = () => {
    return cartItems.reduce(
      (acc, item) => ({
        usd: acc.usd + item.subtotal!.usd,
        lbp: acc.lbp + item.subtotal!.lbp,
      }),
      { usd: 0, lbp: 0 }
    );
  };

  const handleCreateSale = () => {
    if (cartItems.length === 0) {
      toast.error("Please add items to cart");
      return;
    }

    createSaleMutation.mutate({
      customerId: selectedCustomer?.id,
      items: cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    });
  };

  const total = calculateTotal();

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Point of Sale
      </Typography>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Left Side - Product Selection */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Select Products
              </Typography>

              <Autocomplete
                options={products?.data || []}
                getOptionLabel={(option) => `${option.name} (${option.sku})`}
                onChange={(_, value) => value && addToCart(value)}
                renderInput={(params) => (
                  <TextField {...params} label="Search products" fullWidth />
                )}
                sx={{ mb: 3 }}
              />

              <Box sx={{ maxHeight: 400, overflow: "auto" }}>
                <Grid container spacing={2}>
                  {products?.data.slice(0, 12).map((product) => (
                    <Grid size={{ xs: 6, sm: 4 }} key={product.id}>
                      <Card
                        sx={{
                          cursor: "pointer",
                          "&:hover": { boxShadow: 3 },
                          border: 1,
                          borderColor: "divider",
                        }}
                        onClick={() => addToCart(product)}
                      >
                        <CardContent>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {product.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {product.sku}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="primary"
                            fontWeight={600}
                            sx={{ mt: 1 }}
                          >
                            ${product.pricing.usd}
                          </Typography>
                          <Chip
                            label={`Stock: ${product.inventory.quantity}`}
                            size="small"
                            color={
                              product.inventory.isLowStock ? "error" : "success"
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

        {/* Right Side - Cart */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ position: "sticky", top: 20 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                <ShoppingCart sx={{ mr: 1, verticalAlign: "middle" }} />
                Cart
              </Typography>

              {/* Customer Selection */}
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

              {/* Cart Items */}
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
                            ${item.unitPrice!.usd} each
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
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ minWidth: 80, textAlign: "right" }}
                        >
                          ${item.subtotal!.usd.toFixed(2)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Total */}
                  <Box>
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
                      <Typography variant="h6" fontWeight={600} color="primary">
                        ${total.usd.toFixed(2)}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 2,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Total (LBP):
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {total.lbp.toLocaleString()} LBP
                      </Typography>
                    </Box>

                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={<Receipt />}
                      onClick={handleCreateSale}
                      disabled={createSaleMutation.isPending}
                    >
                      Create Sale
                    </Button>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Sales;
