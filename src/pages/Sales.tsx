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
  MenuItem,
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
  Computer,
  AccessTime,
  Print,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { productsApi } from "@/api/products.api";
import { customersApi } from "@/api/customers.api";
import { salesApi } from "@/api/sales.api";
import { exchangeRateApi } from "@/api/exchangeRate.api";
import { discountsApi } from "@/api/discounts.api";
import { Product } from "@/types/product.types";
import { Customer } from "@/types/customer.types";
import { SaleItem, SaleStatus } from "@/types/sale.types";
import { Discount } from "@/types/discount.types";
import { toast } from "react-toastify";
import { handleApiError } from "@/utils/errorHandler";

// Helper to check if an item is a gaming session
const isSessionItem = (item: SaleItem): boolean => {
  return item.productSku?.startsWith("SESSION-") || false;
};

// Calculate real-time session cost for active sessions
const calculateSessionCost = (item: SaleItem): { usd: number; lbp: number } => {
  if (!item.isActive || !item.sessionData) {
    return item.finalAmount || item.subtotal;
  }

  // Handle case where hourlyRate might be undefined
  const hourlyRate = item.sessionData.hourlyRate || { usd: 0, lbp: 0 };

  const now = new Date();
  const start = new Date(item.sessionData.startTime);
  const hours = (now.getTime() - start.getTime()) / (1000 * 60 * 60);

  return {
    usd: Math.round(hourlyRate.usd * hours * 100) / 100,
    lbp: Math.round(hourlyRate.lbp * hours),
  };
};

// Format duration from start time
const formatSessionDuration = (startTime: string): string => {
  const now = new Date();
  const start = new Date(startTime);
  const diffMs = now.getTime() - start.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

const Sales: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [cartItems, setCartItems] = useState<SaleItem[]>([]); // Regular product items only
  const [sessionItems, setSessionItems] = useState<SaleItem[]>([]); // Gaming session items (read-only)
  const [productSearch, setProductSearch] = useState("");
  const [openPendingDialog, setOpenPendingDialog] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [itemDiscounts, setItemDiscounts] = useState<Record<string, string>>({});
  const [saleDiscountId, setSaleDiscountId] = useState<string>("");
  const [availableDiscounts, setAvailableDiscounts] = useState<Record<string, Discount[]>>({});
  const [saleDiscounts, setSaleDiscounts] = useState<Discount[]>([]);
  const [sessionDiscounts, setSessionDiscounts] = useState<Discount[]>([]); // Gaming session discounts
  const [sessionItemDiscounts, setSessionItemDiscounts] = useState<Record<string, string>>({}); // Session SKU -> discount ID
  const [, setUpdateTrigger] = useState(0); // For real-time session cost updates
  const [initialLoadDone, setInitialLoadDone] = useState(false);

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

  // Update session costs every second
  useEffect(() => {
    if (sessionItems.some(item => item.isActive)) {
      const interval = setInterval(() => {
        setUpdateTrigger(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [sessionItems]);

  // Handle loading sale from URL query parameter (e.g., from GamingStations)
  useEffect(() => {
    const loadSaleId = searchParams.get("loadSale");
    if (loadSaleId && !initialLoadDone && exchangeRate) {
      setInitialLoadDone(true);
      // Clear the URL parameter
      setSearchParams({});
      // Load the sale
      handleLoadPendingSale(loadSaleId);
    }
  }, [searchParams, initialLoadDone, exchangeRate]);

  useEffect(() => {
    const fetchSaleDiscounts = async () => {
      try {
        const discounts = await discountsApi.getActiveForSale();
        setSaleDiscounts(discounts);
      } catch (error) {
        console.error("Failed to fetch sale discounts:", error);
      }
    };
    fetchSaleDiscounts();
  }, []);

  // Fetch gaming session discounts
  useEffect(() => {
    const fetchSessionDiscounts = async () => {
      try {
        const discounts = await discountsApi.getActiveForGamingSession();
        setSessionDiscounts(discounts);
      } catch (error) {
        console.error("Failed to fetch gaming session discounts:", error);
      }
    };
    fetchSessionDiscounts();
  }, []);

  const createSaleMutation = useMutation({
    mutationFn: salesApi.create,
    onSuccess: (sale) => {
      toast.success(`Sale created! Invoice: ${sale.invoiceNumber}`);
      resetCart();
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["pending-sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["daily-report"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-report"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-report"] });
      queryClient.invalidateQueries({ queryKey: ["yearly-report"] });
      queryClient.invalidateQueries({ queryKey: ["daily-transactions"] });
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
      queryClient.invalidateQueries({ queryKey: ["daily-report"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-report"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-report"] });
      queryClient.invalidateQueries({ queryKey: ["yearly-report"] });
      queryClient.invalidateQueries({ queryKey: ["daily-transactions"] });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const resetCart = () => {
    setCartItems([]);
    setSessionItems([]);
    setSelectedCustomer(null);
    setEditingSaleId(null);
    setItemDiscounts({});
    setSaleDiscountId("");
    setAvailableDiscounts({});
    setSessionItemDiscounts({});
  };

  const addToCart = async (product: Product) => {
    const isService = (product.productType || "physical") === "service";

    // Only check stock for physical products
    if (!isService) {
      if ((product.inventory?.quantity || 0) === 0) {
        toast.error("Product out of stock");
        return;
      }
    }

    const rate = exchangeRate?.rate || 89500;
    const existingItem = cartItems.find(
      (item) => item.productId === product.id
    );

    if (existingItem) {
      // Only check stock limit for physical products
      if (!isService && existingItem.quantity >= (product.inventory?.quantity || 0)) {
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
          productSku: product.sku || product.id,
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

      // Fetch available discounts for this product
      try {
        const discounts = await discountsApi.getActiveForProduct(product.id);
        if (discounts.length > 0) {
          setAvailableDiscounts(prev => ({
            ...prev,
            [product.id]: discounts
          }));
        }
      } catch (error) {
        console.error("Failed to fetch discounts for product:", error);
      }
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
    const rate = exchangeRate?.rate || 89500;

    // Calculate subtotal for regular cart items before discounts
    const cartSubtotal = cartItems.reduce(
      (acc, item) => ({
        usd: acc.usd + item.subtotal.usd,
        lbp: acc.lbp + item.subtotal.lbp,
      }),
      { usd: 0, lbp: 0 }
    );

    // Calculate session items total (with real-time calculation for active sessions)
    const sessionSubtotal = sessionItems.reduce(
      (acc, item) => {
        const cost = calculateSessionCost(item);
        return {
          usd: acc.usd + cost.usd,
          lbp: acc.lbp + cost.lbp,
        };
      },
      { usd: 0, lbp: 0 }
    );

    // Combined subtotal before discounts
    const subtotalBeforeDiscount = {
      usd: cartSubtotal.usd + sessionSubtotal.usd,
      lbp: cartSubtotal.lbp + sessionSubtotal.lbp,
    };

    // Calculate item-level discounts (only for regular cart items with productId)
    let totalItemDiscounts = { usd: 0, lbp: 0 };
    cartItems.forEach(item => {
      if (item.productId) {
        const discountId = itemDiscounts[item.productId];
        if (discountId) {
          const discount = availableDiscounts[item.productId]?.find((d: Discount) => d.id === discountId);
          if (discount) {
            const discountAmount = item.subtotal.usd * (discount.value / 100);
            totalItemDiscounts.usd += discountAmount;
            totalItemDiscounts.lbp += Math.round(discountAmount * rate);
          }
        }
      }
    });

    // Calculate session item discounts
    let totalSessionItemDiscounts = { usd: 0, lbp: 0 };
    sessionItems.forEach((item) => {
      const cost = calculateSessionCost(item);
      const discountId = sessionItemDiscounts[item.productSku];
      const discount = discountId ? sessionDiscounts.find(d => d.id === discountId) : null;
      if (discount) {
        const discountAmount = cost.usd * (discount.value / 100);
        totalSessionItemDiscounts.usd += discountAmount;
        totalSessionItemDiscounts.lbp += Math.round(discountAmount * rate);
      }
    });

    // Combined item discounts (products + sessions)
    const combinedItemDiscounts = {
      usd: totalItemDiscounts.usd + totalSessionItemDiscounts.usd,
      lbp: totalItemDiscounts.lbp + totalSessionItemDiscounts.lbp,
    };

    // Subtotal after item discounts (products + sessions)
    const subtotalAfterItems = {
      usd: subtotalBeforeDiscount.usd - combinedItemDiscounts.usd,
      lbp: subtotalBeforeDiscount.lbp - combinedItemDiscounts.lbp,
    };

    // Calculate sale-level discount
    let saleDiscount = { usd: 0, lbp: 0 };
    if (saleDiscountId) {
      const discount = saleDiscounts.find(d => d.id === saleDiscountId);
      if (discount) {
        saleDiscount.usd = subtotalAfterItems.usd * (discount.value / 100);
        saleDiscount.lbp = Math.round(saleDiscount.usd * rate);
      }
    }

    // Final total
    const finalTotal = {
      usd: subtotalAfterItems.usd - saleDiscount.usd,
      lbp: subtotalAfterItems.lbp - saleDiscount.lbp,
    };

    return {
      subtotalBeforeDiscount,
      totalItemDiscounts: combinedItemDiscounts,
      totalProductDiscounts: totalItemDiscounts,
      totalSessionDiscounts: totalSessionItemDiscounts,
      subtotalAfterItems,
      saleDiscount,
      finalTotal,
      totalSavings: {
        usd: combinedItemDiscounts.usd + saleDiscount.usd,
        lbp: combinedItemDiscounts.lbp + saleDiscount.lbp,
      },
      sessionSubtotal,
      cartSubtotal,
    };
  };

  const handleSaveSale = () => {
    // Allow saving if we have cart items OR if we're editing a sale with session items
    if (cartItems.length === 0 && sessionItems.length === 0) {
      toast.error("Please add items to cart");
      return;
    }

    // Only send product items (with non-null productId) - session items are managed by the gaming system
    const productItemsToSend = cartItems
      .filter(item => item.productId !== null)
      .map((item) => ({
        productId: item.productId!,
        quantity: item.quantity,
        ...(item.productId && itemDiscounts[item.productId] && { discountId: itemDiscounts[item.productId] }),
      }));

    // Build session discounts array to send to backend
    // Include all session items - with discountId to apply, without to remove
    const sessionDiscountsToSend = sessionItems.map(item => {
      const discountId = sessionItemDiscounts[item.productSku];
      return discountId
        ? { productSku: item.productSku, discountId }
        : { productSku: item.productSku }; // No discountId = remove discount
    });

    const saleData = {
      customerId: selectedCustomer?.id,
      items: productItemsToSend,
      ...(saleDiscountId !== undefined && { saleDiscountId: saleDiscountId || "" }), // Empty string to remove
      ...(sessionDiscountsToSend.length > 0 && { sessionDiscounts: sessionDiscountsToSend }),
    };

    if (editingSaleId) {
      updateSaleMutation.mutate({ id: editingSaleId, data: saleData });
    } else {
      createSaleMutation.mutate(saleData);
    }
  };

  const handlePrintCart = () => {
    const totalsData = calculateTotal();
    const currentRate = exchangeRate?.rate || 89500;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print");
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cart - ${editingSaleId ? "Order" : "New Sale"}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header h1 { margin: 0; font-size: 18px; }
          .header p { margin: 5px 0; font-size: 12px; color: #666; }
          .customer { margin-bottom: 15px; padding: 8px; background: #f5f5f5; border-radius: 4px; }
          .item { border-bottom: 1px dashed #ccc; padding: 8px 0; }
          .item-name { font-weight: bold; font-size: 14px; }
          .item-details { font-size: 12px; color: #666; display: flex; justify-content: space-between; }
          .item-price { text-align: right; }
          .session-item { background: #fff3e0; padding: 8px; margin: 5px 0; border-radius: 4px; }
          .discount { color: #4caf50; font-size: 12px; }
          .totals { margin-top: 20px; border-top: 2px solid #000; padding-top: 10px; }
          .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
          .total-row.final { font-weight: bold; font-size: 16px; border-top: 1px solid #000; padding-top: 10px; margin-top: 10px; }
          .savings { color: #4caf50; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Epic Lounge</h1>
          <p>${new Date().toLocaleString()}</p>
          <p>${editingSaleId ? "Order Preview" : "New Sale"}</p>
        </div>

        ${selectedCustomer ? `
          <div class="customer">
            <strong>Customer:</strong> ${selectedCustomer.name}<br/>
            <small>Phone: ${selectedCustomer.phone}</small>
          </div>
        ` : ""}

        <div class="items">
          ${sessionItems.map(item => {
            const cost = calculateSessionCost(item);
            const discountId = sessionItemDiscounts[item.productSku];
            const discount = discountId ? sessionDiscounts.find(d => d.id === discountId) : null;
            const discountAmount = discount ? cost.usd * (discount.value / 100) : 0;
            const finalAmount = cost.usd - discountAmount;
            return `
              <div class="session-item">
                <div class="item-name">${item.productName}</div>
                <div class="item-details">
                  <span>${item.sessionData?.pcNumber || "Gaming"} | $${item.sessionData?.hourlyRate?.usd?.toFixed(2) || "0.00"}/hr</span>
                  <span class="item-price">$${cost.usd.toFixed(2)}</span>
                </div>
                ${discount ? `<div class="discount">-${discount.value}% (-$${discountAmount.toFixed(2)}) = $${finalAmount.toFixed(2)}</div>` : ""}
              </div>
            `;
          }).join("")}

          ${cartItems.map(item => {
            const productId = item.productId;
            const discountId = productId ? itemDiscounts[productId] : undefined;
            const discount = productId && discountId ? availableDiscounts[productId]?.find(d => d.id === discountId) : undefined;
            const discountAmount = discount ? item.subtotal.usd * (discount.value / 100) : 0;
            const finalAmount = item.subtotal.usd - discountAmount;
            return `
              <div class="item">
                <div class="item-name">${item.productName}</div>
                <div class="item-details">
                  <span>$${item.unitPrice.usd.toFixed(2)} x ${item.quantity}</span>
                  <span class="item-price">$${item.subtotal.usd.toFixed(2)}</span>
                </div>
                ${discount ? `<div class="discount">-${discount.value}% (-$${discountAmount.toFixed(2)}) = $${finalAmount.toFixed(2)}</div>` : ""}
              </div>
            `;
          }).join("")}
        </div>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>$${totalsData.subtotalBeforeDiscount.usd.toFixed(2)}</span>
          </div>
          ${totalsData.totalSavings.usd > 0 ? `
            <div class="total-row savings">
              <span>Total Discounts:</span>
              <span>-$${totalsData.totalSavings.usd.toFixed(2)}</span>
            </div>
          ` : ""}
          <div class="total-row final">
            <span>Total (USD):</span>
            <span>$${totalsData.finalTotal.usd.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>Total (LBP):</span>
            <span>${totalsData.finalTotal.lbp.toLocaleString()} LBP</span>
          </div>
          <div class="total-row" style="font-size: 11px; color: #666;">
            <span>Rate:</span>
            <span>1 USD = ${currentRate.toLocaleString()} LBP</span>
          </div>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
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

      // Extract discount selections from loaded sale
      const loadedItemDiscounts: Record<string, string> = {};
      const loadedAvailableDiscounts: Record<string, Discount[]> = {};
      const loadedSessionItemDiscounts: Record<string, string> = {};

      // Separate session items from product items
      const loadedSessionItems: SaleItem[] = [];
      const productItems: typeof sale.items = [];

      for (const item of sale.items) {
        if (isSessionItem(item)) {
          // Session items - restore any existing discount
          loadedSessionItems.push(item);
          if (item.discount?.discountId) {
            loadedSessionItemDiscounts[item.productSku] = item.discount.discountId;
          }
        } else {
          productItems.push(item);
        }
      }

      // Map cart items and restore discount data
      const newCartItems: SaleItem[] = await Promise.all(
        productItems.map(async (item) => {
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

          // If item has a discount, store it and fetch available discounts
          if (item.discount?.discountId && productId) {
            loadedItemDiscounts[productId] = item.discount.discountId;

            try {
              const discounts = await discountsApi.getActiveForProduct(productId);
              if (discounts.length > 0) {
                loadedAvailableDiscounts[productId] = discounts;
              }
            } catch (error) {
              console.error(`Failed to fetch discounts for product ${productId}:`, error);
            }
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
        })
      );

      setCartItems(newCartItems);
      setSessionItems(loadedSessionItems);
      setItemDiscounts(loadedItemDiscounts);
      setSessionItemDiscounts(loadedSessionItemDiscounts);
      setAvailableDiscounts(loadedAvailableDiscounts);

      // Restore sale-level discount if present
      if (sale.saleDiscount?.discountId) {
        setSaleDiscountId(sale.saleDiscount.discountId);
      }

      setEditingSaleId(saleId);
      setOpenPendingDialog(false);

      if (loadedSessionItems.length > 0) {
        const activeCount = loadedSessionItems.filter(s => s.isActive).length;
        if (activeCount > 0) {
          toast.info(`Loaded order with ${activeCount} active gaming session(s). You can add items - session items are managed separately.`);
        } else {
          toast.success("Pending order loaded. Session items are preserved.");
        }
      } else {
        toast.success("Pending order loaded with discounts");
      }
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

  const totals = calculateTotal();
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
          {sessionItems.length > 0 ? (
            <>
              Editing sale with {sessionItems.length} gaming session(s).
              {sessionItems.some(s => s.isActive) && " Active sessions continue running."}
              {" "}Add/remove products freely - session items are preserved automatically.
            </>
          ) : (
            <>Editing pending sale. Make changes and click "Update Sale" to save.</>
          )}
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
                          {option.sku || "Service"}
                        </Typography>
                        {(option.productType || "physical") === "service" ? (
                          <Chip
                            label="Service"
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        ) : (
                          <Chip
                            label={`Stock: ${option.inventory?.quantity || 0}`}
                            size="small"
                            color={
                              option.inventory?.isLowStock ? "error" : "success"
                            }
                          />
                        )}
                      </Box>
                    </Box>
                  </li>
                )}
                sx={{ mb: 3 }}
              />

              <Box sx={{ maxHeight: 400, overflow: "auto" }}>
                <Grid container spacing={2}>
                  {products?.data.slice(0, 12).map((product) => {
                    const isService = (product.productType || "physical") === "service";
                    const isAvailable = isService || (product.inventory?.quantity || 0) > 0;
                    return (
                      <Grid size={{ xs: 6, sm: 4 }} key={product.id}>
                        <Card
                          sx={{
                            cursor: isAvailable ? "pointer" : "not-allowed",
                            opacity: isAvailable ? 1 : 0.5,
                            "&:hover": isAvailable ? { boxShadow: 3 } : {},
                            border: 1,
                            borderColor: "divider",
                          }}
                          onClick={() => isAvailable && addToCart(product)}
                        >
                          <CardContent>
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {product.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {product.sku || "Service"}
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
                            {isService ? (
                              <Chip
                                label="Service"
                                size="small"
                                color="info"
                                variant="outlined"
                                sx={{ mt: 1 }}
                              />
                            ) : (
                              <Chip
                                label={`Stock: ${product.inventory?.quantity || 0}`}
                                size="small"
                                color={
                                  (product.inventory?.quantity || 0) === 0
                                    ? "default"
                                    : product.inventory?.isLowStock
                                    ? "error"
                                    : "success"
                                }
                                sx={{ mt: 1 }}
                              />
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ position: "sticky", top: 20 }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="h6" fontWeight={600}>
                  <ShoppingCart sx={{ mr: 1, verticalAlign: "middle" }} />
                  Cart ({cartItems.length + sessionItems.length} items)
                </Typography>
                {(cartItems.length > 0 || sessionItems.length > 0) && (
                  <IconButton
                    size="small"
                    onClick={handlePrintCart}
                    title="Print Cart"
                    color="primary"
                  >
                    <Print />
                  </IconButton>
                )}
              </Box>

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

              {cartItems.length === 0 && sessionItems.length === 0 ? (
                <Alert severity="info">Cart is empty</Alert>
              ) : (
                <>
                  <Box sx={{ maxHeight: 350, overflow: "auto", mb: 2 }}>
                    {/* Session Items */}
                    {sessionItems.map((item) => {
                      const sessionCost = calculateSessionCost(item);
                      const pcInfo = item.sessionData?.pcNumber || "Gaming Session";
                      const sessionDiscountId = sessionItemDiscounts[item.productSku];
                      const sessionDiscountObj = sessionDiscountId ? sessionDiscounts.find(d => d.id === sessionDiscountId) : null;
                      const sessionDiscountAmount = sessionDiscountObj ? sessionCost.usd * (sessionDiscountObj.value / 100) : 0;
                      const finalSessionAmount = sessionCost.usd - sessionDiscountAmount;

                      return (
                        <Box
                          key={item.productSku}
                          sx={{
                            mb: 2,
                            p: 1.5,
                            bgcolor: item.isActive ? "info.dark" : "action.selected",
                            borderRadius: 1,
                            border: 2,
                            borderColor: item.isActive ? "info.main" : "divider",
                          }}
                        >
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start", mb: 1 }}>
                            <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1 }}>
                              <Computer sx={{ color: item.isActive ? "info.light" : "action.active" }} />
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {item.productName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {pcInfo} | ${item.sessionData?.hourlyRate?.usd?.toFixed(2) || "0.00"}/hr
                                </Typography>
                              </Box>
                            </Box>
                            {item.isActive && (
                              <Chip
                                icon={<AccessTime sx={{ fontSize: 14 }} />}
                                label={formatSessionDuration(item.sessionData!.startTime)}
                                size="small"
                                color="info"
                                sx={{
                                  animation: "pulse 2s ease-in-out infinite",
                                  "@keyframes pulse": {
                                    "0%, 100%": { opacity: 1 },
                                    "50%": { opacity: 0.7 },
                                  },
                                }}
                              />
                            )}
                          </Box>

                          {/* Session Discount Dropdown */}
                          {sessionDiscounts.length > 0 && (
                            <TextField
                              select
                              size="small"
                              fullWidth
                              label="Apply Session Discount"
                              value={sessionItemDiscounts[item.productSku] || ""}
                              onChange={(e) => setSessionItemDiscounts(prev => ({
                                ...prev,
                                [item.productSku]: e.target.value
                              }))}
                              sx={{ mb: 1 }}
                            >
                              <MenuItem value="">No Discount</MenuItem>
                              {sessionDiscounts.map((discount: Discount) => (
                                <MenuItem key={discount.id} value={discount.id}>
                                  {discount.name} ({discount.value}% off)
                                </MenuItem>
                              ))}
                            </TextField>
                          )}

                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                {item.isActive ? "Live cost (updates in real-time)" : "Session ended"}
                              </Typography>
                              {sessionDiscountObj && (
                                <Typography variant="caption" display="block" color="success.main">
                                  -{sessionDiscountObj.value}% (${sessionDiscountAmount.toFixed(2)})
                                </Typography>
                              )}
                            </Box>
                            <Box sx={{ textAlign: "right" }}>
                              {sessionDiscountObj && (
                                <Typography variant="caption" color="text.secondary" sx={{ textDecoration: "line-through" }}>
                                  ${sessionCost.usd.toFixed(2)}
                                </Typography>
                              )}
                              <Typography variant="body2" fontWeight={600} color={sessionDiscountObj ? "success.main" : (item.isActive ? "info.main" : "text.primary")}>
                                ${finalSessionAmount.toFixed(2)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {Math.round(finalSessionAmount * (exchangeRate?.rate || 89500)).toLocaleString()} LBP
                              </Typography>
                            </Box>
                          </Box>
                          {item.isActive && (
                            <Alert severity="info" sx={{ mt: 1, py: 0 }}>
                              <Typography variant="caption">
                                Session managed from Gaming Stations
                              </Typography>
                            </Alert>
                          )}
                        </Box>
                      );
                    })}

                    {/* Regular Cart Items */}
                    {cartItems.map((item) => {
                      const productId = item.productId;
                      const itemDiscount = productId ? itemDiscounts[productId] : undefined;
                      const discountObj = productId ? availableDiscounts[productId]?.find((d: Discount) => d.id === itemDiscount) : undefined;
                      const discountAmount = discountObj ? item.subtotal.usd * (discountObj.value / 100) : 0;
                      const finalAmount = item.subtotal.usd - discountAmount;

                      return (
                        <Box
                          key={item.productId || item.productSku}
                          sx={{
                            mb: 2,
                            p: 1.5,
                            bgcolor: "background.default",
                            borderRadius: 1,
                          }}
                        >
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start", mb: 1 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" fontWeight={600}>
                                {item.productName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ${item.unitPrice.usd.toFixed(2)} x {item.quantity}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <IconButton
                                size="small"
                                onClick={() => productId && updateQuantity(productId, -1)}
                                disabled={!productId}
                              >
                                <Remove fontSize="small" />
                              </IconButton>
                              <Typography variant="body2" sx={{ minWidth: 30, textAlign: "center" }}>
                                {item.quantity}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => productId && updateQuantity(productId, 1)}
                                disabled={!productId}
                              >
                                <Add fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => productId && removeFromCart(productId)}
                                disabled={!productId}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>

                          {productId && availableDiscounts[productId]?.length > 0 && (
                            <TextField
                              select
                              size="small"
                              fullWidth
                              label="Apply Discount"
                              value={itemDiscounts[productId] || ""}
                              onChange={(e) => setItemDiscounts(prev => ({
                                ...prev,
                                [productId]: e.target.value
                              }))}
                              sx={{ mb: 1 }}
                            >
                              <MenuItem value="">No Discount</MenuItem>
                              {availableDiscounts[productId].map((discount: Discount) => (
                                <MenuItem key={discount.id} value={discount.id}>
                                  {discount.name} ({discount.value}% off)
                                </MenuItem>
                              ))}
                            </TextField>
                          )}

                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Box>
                              {discountObj && (
                                <Typography variant="caption" color="success.main">
                                  -{discountObj.value}% (${discountAmount.toFixed(2)})
                                </Typography>
                              )}
                            </Box>
                            <Box sx={{ textAlign: "right" }}>
                              {discountObj && (
                                <Typography variant="caption" color="text.secondary" sx={{ textDecoration: "line-through" }}>
                                  ${item.subtotal.usd.toFixed(2)}
                                </Typography>
                              )}
                              <Typography variant="body2" fontWeight={600} color={discountObj ? "success.main" : "inherit"}>
                                ${finalAmount.toFixed(2)}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {saleDiscounts.length > 0 && (
                    <TextField
                      select
                      size="small"
                      fullWidth
                      label="Sale Discount (Optional)"
                      value={saleDiscountId}
                      onChange={(e) => setSaleDiscountId(e.target.value)}
                      sx={{ mb: 2 }}
                    >
                      <MenuItem value="">No Sale Discount</MenuItem>
                      {saleDiscounts.map(discount => (
                        <MenuItem key={discount.id} value={discount.id}>
                          {discount.name} ({discount.value}% off entire sale)
                        </MenuItem>
                      ))}
                    </TextField>
                  )}

                  <Box>
                    {totals.totalSavings.usd > 0 && (
                      <Card sx={{ bgcolor: "background.default", p: 1.5, mb: 2 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            Subtotal:
                          </Typography>
                          <Typography variant="body2">
                            ${totals.subtotalBeforeDiscount.usd.toFixed(2)}
                          </Typography>
                        </Box>
                        {totals.totalItemDiscounts.usd > 0 && (
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                            <Typography variant="body2" color="success.main">
                              Item Discounts:
                            </Typography>
                            <Typography variant="body2" color="success.main">
                              -${totals.totalItemDiscounts.usd.toFixed(2)}
                            </Typography>
                          </Box>
                        )}
                        {totals.saleDiscount.usd > 0 && (
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                            <Typography variant="body2" color="success.main">
                              Sale Discount:
                            </Typography>
                            <Typography variant="body2" color="success.main">
                              -${totals.saleDiscount.usd.toFixed(2)}
                            </Typography>
                          </Box>
                        )}
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="body2" fontWeight={600} color="success.main">
                            Total Savings:
                          </Typography>
                          <Typography variant="body2" fontWeight={600} color="success.main">
                            ${totals.totalSavings.usd.toFixed(2)}
                          </Typography>
                        </Box>
                      </Card>
                    )}

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
                          ${totals.finalTotal.usd.toFixed(2)}
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
                          {totals.finalTotal.lbp.toLocaleString()} LBP
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
                    primaryTypographyProps={{ component: 'div' }}
                    secondaryTypographyProps={{ component: 'div' }}
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
                          {(sale.hasActiveSessions ? sale.currentTotals?.usd : sale.totals.usd)?.toFixed(2)}
                        </Typography>
                        {sale.hasActiveSessions && (
                          <Box sx={{ mt: 0.5, mb: 0.5 }}>
                            <Chip
                              label={`⏱️ Active Session - ${sale.activeSessions?.[0]?.currentDuration || 0} min`}
                              size="small"
                              color="info"
                              sx={{
                                animation: "pulse 2s ease-in-out infinite",
                                "@keyframes pulse": {
                                  "0%, 100%": { opacity: 1 },
                                  "50%": { opacity: 0.7 },
                                },
                              }}
                            />
                          </Box>
                        )}
                        <Typography variant="caption" color="text.secondary" display="block">
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
