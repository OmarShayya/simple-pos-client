import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  TextField,
  Autocomplete,
  IconButton,
  Chip,
  Grid,
  Alert,
  Badge,
  Dialog,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  Tooltip,
  alpha,
  useMediaQuery,
  useTheme,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
} from "@mui/material";
import {
  Add,
  Remove,
  DeleteOutline,
  DeleteSweepOutlined,
  Close,
  Search,
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
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import StatusChip from "@/components/common/StatusChip";
import { brand } from "@/theme/theme";

interface PendingSaleListItem {
  id: string;
  invoiceNumber: string;
  customer?: { name?: string } | null;
  items?: unknown[];
  totals?: { usd: number; lbp: number };
  currentTotals?: { usd: number; lbp: number };
  hasActiveSessions?: boolean;
  activeSessions?: { currentDuration?: number }[];
  createdAt: string;
}

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
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  // When true, the next successful save jumps straight to taking payment
  const chargeAfterSaveRef = useRef(false);
  const cartRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

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
      if (chargeAfterSaveRef.current) {
        chargeAfterSaveRef.current = false;
        navigate(`/sales/history?paymentFor=${sale.id}`);
      }
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
    onError: (error) => {
      chargeAfterSaveRef.current = false;
      toast.error(handleApiError(error));
    },
  });

  const updateSaleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      salesApi.update(id, data),
    onSuccess: (sale) => {
      toast.success(`Sale updated! Invoice: ${sale.invoiceNumber}`);
      resetCart();
      if (chargeAfterSaveRef.current) {
        chargeAfterSaveRef.current = false;
        navigate(`/sales/history?paymentFor=${sale.id}`);
      }
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
    onError: (error) => {
      chargeAfterSaveRef.current = false;
      toast.error(handleApiError(error));
    },
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
    // No toast here: the product tile's quantity badge confirms the add
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
    const totalItemDiscounts = { usd: 0, lbp: 0 };
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
    const totalSessionItemDiscounts = { usd: 0, lbp: 0 };
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
    const saleDiscount = { usd: 0, lbp: 0 };
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

  // Product grid: category chips + live search over ALL products
  const productCategories = useMemo(() => {
    const map = new Map<string, string>();
    (products?.data || []).forEach((p) => p.category?.id && map.set(p.category.id, p.category.name));
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [products?.data]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return (products?.data || [])
      .filter((p) => categoryFilter === "all" || p.category?.id === categoryFilter)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products?.data, productSearch, categoryFilter]);

  const cartQty: Record<string, number> = {};
  cartItems.forEach((i) => {
    if (i.productId) cartQty[i.productId] = i.quantity;
  });

  const totals = calculateTotal();
  const pendingCount = pendingSales?.data?.length || 0;
  const currentRate = exchangeRate?.rate || 89500;
  const itemCount = cartItems.reduce((n, i) => n + i.quantity, 0) + sessionItems.length;
  const hasItems = cartItems.length > 0 || sessionItems.length > 0;
  const isSaving = createSaleMutation.isPending || updateSaleMutation.isPending;

  const handleCharge = () => {
    if (!hasItems) {
      toast.error("Please add items to cart");
      return;
    }
    chargeAfterSaveRef.current = true;
    handleSaveSale();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    // Enter adds the first match (handy with a barcode scanner or quick typing)
    if (e.key !== "Enter") return;
    const first = filteredProducts.find(
      (p) => (p.productType || "physical") === "service" || (p.inventory?.quantity || 0) > 0
    );
    if (first) {
      addToCart(first);
      setProductSearch("");
    }
  };

  if (loadingProducts || loadingCustomers) {
    return (
      <Box>
        <Skeleton variant="rounded" height={48} sx={{ mb: 2, maxWidth: 360 }} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 7, lg: 8 }}>
            <Skeleton variant="rounded" height={420} />
          </Grid>
          <Grid size={{ xs: 12, md: 5, lg: 4 }}>
            <Skeleton variant="rounded" height={420} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: { xs: hasItems ? 10 : 0, md: 0 } }}>
      <PageHeader
        title={editingSaleId ? "Edit pending sale" : "New sale"}
        subtitle={
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
            1 USD = {currentRate.toLocaleString()} LBP
            <IconButton size="small" onClick={handleRefreshRate} disabled={loadingRate} aria-label="Refresh exchange rate">
              <Refresh fontSize="inherit" />
            </IconButton>
          </Box>
        }
        actions={
          <Button
            variant="outlined"
            startIcon={
              <Badge badgeContent={pendingCount} color="warning">
                <PendingActions />
              </Badge>
            }
            onClick={() => setOpenPendingDialog(true)}
          >
            Pending orders
          </Button>
        }
      />

      {editingSaleId && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Button size="small" color="inherit" onClick={resetCart}>
              Cancel edit
            </Button>
          }
        >
          {sessionItems.length > 0
            ? `Editing a sale with ${sessionItems.length} gaming session(s)${
                sessionItems.some((s) => s.isActive) ? " — active sessions keep running" : ""
              }. Session items are kept automatically.`
            : "Editing a pending sale. Make your changes, then update or charge."}
        </Alert>
      )}

      <Grid container spacing={2} alignItems="flex-start">
        {/* Products */}
        <Grid size={{ xs: 12, md: 7, lg: 8 }}>
          <Card>
            <Box sx={{ p: { xs: 1.5, sm: 2 }, pb: 1 }}>
              <TextField
                fullWidth
                placeholder="Search products by name or SKU…"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                    endAdornment: productSearch ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setProductSearch("")} aria-label="Clear search">
                          <Close fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : undefined,
                  },
                }}
              />
              <Stack
                direction="row"
                spacing={1}
                sx={{ mt: 1.5, overflowX: "auto", pb: 0.5, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}
              >
                {[{ id: "all", name: "All" }, ...productCategories].map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    clickable
                    color={categoryFilter === c.id ? "primary" : "default"}
                    variant={categoryFilter === c.id ? "filled" : "outlined"}
                    onClick={() => setCategoryFilter(c.id)}
                    sx={{ flexShrink: 0, height: 34 }}
                  />
                ))}
              </Stack>
            </Box>
            <Box
              sx={{
                px: { xs: 1.5, sm: 2 },
                pb: 2,
                pt: 1,
                maxHeight: { md: "calc(100vh - 290px)" },
                minHeight: { md: 320 },
                overflowY: { md: "auto" },
              }}
            >
              {filteredProducts.length === 0 ? (
                <EmptyState
                  compact
                  title="No products match"
                  description={productSearch ? `Nothing found for “${productSearch}”.` : "This category is empty."}
                />
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gap: { xs: 1, sm: 1.25 },
                    gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(auto-fill, minmax(150px, 1fr))" },
                  }}
                >
                  {filteredProducts.map((product) => {
                    const isService = (product.productType || "physical") === "service";
                    const stock = product.inventory?.quantity || 0;
                    const isAvailable = isService || stock > 0;
                    const inCart = cartQty[product.id] || 0;
                    return (
                      <Box
                        key={product.id}
                        component="button"
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => addToCart(product)}
                        sx={{
                          position: "relative",
                          textAlign: "left",
                          font: "inherit",
                          color: "text.primary",
                          p: 1.5,
                          minHeight: 108,
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.25,
                          borderRadius: 3,
                          border: 1.5,
                          borderColor: inCart ? "primary.main" : "divider",
                          bgcolor: inCart ? alpha(theme.palette.primary.main, 0.06) : "background.paper",
                          cursor: isAvailable ? "pointer" : "not-allowed",
                          opacity: isAvailable ? 1 : 0.45,
                          transition: "border-color .15s ease, transform .1s ease, background-color .15s ease",
                          "&:hover:not(:disabled)": { borderColor: "primary.main" },
                          "&:active:not(:disabled)": { transform: "scale(0.97)" },
                        }}
                      >
                        {inCart > 0 && (
                          <Box
                            sx={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                              minWidth: 24,
                              height: 24,
                              px: 0.75,
                              borderRadius: 12,
                              bgcolor: "primary.main",
                              color: "primary.contrastText",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              display: "grid",
                              placeItems: "center",
                            }}
                          >
                            {inCart}
                          </Box>
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            pr: inCart ? 3.5 : 0,
                            lineHeight: 1.3,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {product.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {product.category?.name}
                        </Typography>
                        <Box sx={{ mt: "auto", pt: 0.75, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 1 }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography className="num" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                              ${product.pricing.usd.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" className="num" noWrap component="div">
                              {Math.round(product.pricing.usd * currentRate).toLocaleString()} LBP
                            </Typography>
                          </Box>
                          {isService ? (
                            <StatusChip status="info" label="Service" dot={false} />
                          ) : stock === 0 ? (
                            <StatusChip status="cancelled" label="Out" dot={false} />
                          ) : product.inventory?.isLowStock ? (
                            <StatusChip status="pending" label={`${stock} left`} dot={false} />
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              className="num"
                              sx={{ flexShrink: 0, display: { xs: "none", sm: "block" } }}
                            >
                              {stock} in stock
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          </Card>
        </Grid>

        {/* Cart */}
        <Grid size={{ xs: 12, md: 5, lg: 4 }} ref={cartRef}>
          <Card sx={{ position: { md: "sticky" }, top: { md: 84 } }}>
            <Box sx={{ p: 2, pb: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
              <ShoppingCart color="primary" />
              <Typography variant="h6" sx={{ flex: 1 }}>
                Cart{itemCount > 0 ? ` · ${itemCount}` : ""}
              </Typography>
              {hasItems && (
                <>
                  <Tooltip title="Print cart">
                    <IconButton size="small" onClick={handlePrintCart} aria-label="Print cart">
                      <Print fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Clear cart">
                    <IconButton size="small" onClick={resetCart} aria-label="Clear cart">
                      <DeleteSweepOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Box>
            <Box sx={{ px: 2 }}>
              <Autocomplete
                options={customers?.data || []}
                getOptionLabel={(option) => `${option.name} (${option.phone})`}
                value={selectedCustomer}
                onChange={(_, value) => setSelectedCustomer(value)}
                renderInput={(params) => <TextField {...params} label="Customer (optional)" size="small" />}
              />
            </Box>

            {!hasItems ? (
              <EmptyState
                compact
                icon={<ShoppingCart />}
                title="Cart is empty"
                description="Tap a product to add it."
              />
            ) : (
              <>
                <Box sx={{ px: 2, mt: 1, maxHeight: { md: "calc(100vh - 520px)" }, minHeight: { md: 120 }, overflowY: { md: "auto" } }}>
                  {/* Gaming session items */}
                  {sessionItems.map((item) => {
                    const sessionCost = calculateSessionCost(item);
                    const pcInfo = item.sessionData?.pcNumber || "Gaming session";
                    const sessionDiscountId = sessionItemDiscounts[item.productSku];
                    const sessionDiscountObj = sessionDiscountId ? sessionDiscounts.find((d) => d.id === sessionDiscountId) : null;
                    const sessionDiscountAmount = sessionDiscountObj ? sessionCost.usd * (sessionDiscountObj.value / 100) : 0;
                    const finalSessionAmount = sessionCost.usd - sessionDiscountAmount;
                    return (
                      <Box
                        key={item.productSku}
                        sx={{
                          my: 1,
                          p: 1.5,
                          borderRadius: 3,
                          border: 1,
                          borderColor: item.isActive ? alpha(theme.palette.info.main, 0.4) : "divider",
                          bgcolor: item.isActive ? alpha(theme.palette.info.main, 0.08) : "action.hover",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Computer fontSize="small" color={item.isActive ? "info" : "action"} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                              {item.productName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {pcInfo} · ${item.sessionData?.hourlyRate?.usd?.toFixed(2) || "0.00"}/hr
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: "right" }}>
                            {sessionDiscountObj && (
                              <Typography variant="caption" color="text.secondary" sx={{ textDecoration: "line-through", display: "block" }}>
                                ${sessionCost.usd.toFixed(2)}
                              </Typography>
                            )}
                            <Typography className="num" sx={{ fontWeight: 700 }} color={sessionDiscountObj ? "success.main" : "text.primary"}>
                              ${finalSessionAmount.toFixed(2)}
                            </Typography>
                          </Box>
                        </Box>
                        {item.isActive && (
                          <Chip
                            icon={<AccessTime sx={{ fontSize: 14 }} />}
                            label={`Live · ${formatSessionDuration(item.sessionData!.startTime)}`}
                            size="small"
                            color="info"
                            variant="outlined"
                            sx={{ mt: 1, animation: "pos-pulse 2s ease-in-out infinite" }}
                          />
                        )}
                        {sessionDiscounts.length > 0 && (
                          <TextField
                            select
                            size="small"
                            fullWidth
                            label="Session discount"
                            value={sessionItemDiscounts[item.productSku] || ""}
                            onChange={(e) =>
                              setSessionItemDiscounts((prev) => ({ ...prev, [item.productSku]: e.target.value }))
                            }
                            sx={{ mt: 1.25 }}
                          >
                            <MenuItem value="">No discount</MenuItem>
                            {sessionDiscounts.map((discount: Discount) => (
                              <MenuItem key={discount.id} value={discount.id}>
                                {discount.name} ({discount.value}% off)
                              </MenuItem>
                            ))}
                          </TextField>
                        )}
                      </Box>
                    );
                  })}

                  {/* Product items */}
                  {cartItems.map((item) => {
                    const productId = item.productId;
                    const itemDiscount = productId ? itemDiscounts[productId] : undefined;
                    const discountObj = productId
                      ? availableDiscounts[productId]?.find((d: Discount) => d.id === itemDiscount)
                      : undefined;
                    const discountAmount = discountObj ? item.subtotal.usd * (discountObj.value / 100) : 0;
                    const finalAmount = item.subtotal.usd - discountAmount;
                    return (
                      <Box key={item.productId || item.productSku} sx={{ py: 1.25, borderBottom: 1, borderColor: "divider" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                              {item.productName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" className="num">
                              ${item.unitPrice.usd.toFixed(2)} each
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              border: 1,
                              borderColor: "divider",
                              borderRadius: 2.5,
                            }}
                          >
                            <IconButton
                              size="small"
                              onClick={() => productId && updateQuantity(productId, -1)}
                              disabled={!productId}
                              aria-label={`Decrease ${item.productName}`}
                            >
                              {item.quantity === 1 ? <DeleteOutline fontSize="small" /> : <Remove fontSize="small" />}
                            </IconButton>
                            <Typography className="num" sx={{ minWidth: 22, textAlign: "center", fontWeight: 700 }}>
                              {item.quantity}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => productId && updateQuantity(productId, 1)}
                              disabled={!productId}
                              aria-label={`Increase ${item.productName}`}
                            >
                              <Add fontSize="small" />
                            </IconButton>
                          </Box>
                          <Box sx={{ minWidth: 62, textAlign: "right" }}>
                            {discountObj && (
                              <Typography variant="caption" color="text.secondary" sx={{ textDecoration: "line-through", display: "block" }}>
                                ${item.subtotal.usd.toFixed(2)}
                              </Typography>
                            )}
                            <Typography className="num" sx={{ fontWeight: 700 }} color={discountObj ? "success.main" : "text.primary"}>
                              ${finalAmount.toFixed(2)}
                            </Typography>
                          </Box>
                        </Box>
                        {productId && availableDiscounts[productId]?.length > 0 && (
                          <TextField
                            select
                            size="small"
                            fullWidth
                            label="Item discount"
                            value={itemDiscounts[productId] || ""}
                            onChange={(e) => setItemDiscounts((prev) => ({ ...prev, [productId]: e.target.value }))}
                            sx={{ mt: 1 }}
                          >
                            <MenuItem value="">No discount</MenuItem>
                            {availableDiscounts[productId].map((discount: Discount) => (
                              <MenuItem key={discount.id} value={discount.id}>
                                {discount.name} ({discount.value}% off)
                              </MenuItem>
                            ))}
                          </TextField>
                        )}
                      </Box>
                    );
                  })}
                </Box>

                <Box sx={{ p: 2, pt: 1.5 }}>
                  {saleDiscounts.length > 0 && (
                    <TextField
                      select
                      size="small"
                      fullWidth
                      label="Sale discount"
                      value={saleDiscountId}
                      onChange={(e) => setSaleDiscountId(e.target.value)}
                      sx={{ mb: 1.5 }}
                    >
                      <MenuItem value="">No sale discount</MenuItem>
                      {saleDiscounts.map((discount) => (
                        <MenuItem key={discount.id} value={discount.id}>
                          {discount.name} ({discount.value}% off)
                        </MenuItem>
                      ))}
                    </TextField>
                  )}

                  <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                    {totals.totalSavings.usd > 0 && (
                      <>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="body2" color="text.secondary">
                            Subtotal
                          </Typography>
                          <Typography variant="body2" className="num">
                            ${totals.subtotalBeforeDiscount.usd.toFixed(2)}
                          </Typography>
                        </Box>
                        {totals.totalItemDiscounts.usd > 0 && (
                          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Typography variant="body2" color="success.main">
                              Item discounts
                            </Typography>
                            <Typography variant="body2" color="success.main" className="num">
                              −${totals.totalItemDiscounts.usd.toFixed(2)}
                            </Typography>
                          </Box>
                        )}
                        {totals.saleDiscount.usd > 0 && (
                          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Typography variant="body2" color="success.main">
                              Sale discount
                            </Typography>
                            <Typography variant="body2" color="success.main" className="num">
                              −${totals.saleDiscount.usd.toFixed(2)}
                            </Typography>
                          </Box>
                        )}
                      </>
                    )}
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", pt: 0.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Total
                      </Typography>
                      <Typography className="num" sx={{ fontFamily: brand.fontDisplay, fontWeight: 700, fontSize: "1.6rem" }}>
                        ${totals.finalTotal.usd.toFixed(2)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" className="num" sx={{ textAlign: "right" }}>
                      {totals.finalTotal.lbp.toLocaleString()} LBP
                    </Typography>
                  </Stack>

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={<Payment />}
                    onClick={handleCharge}
                    disabled={isSaving}
                    sx={{ mb: 1 }}
                  >
                    {isSaving && chargeAfterSaveRef.current ? "Processing…" : `Charge $${totals.finalTotal.usd.toFixed(2)}`}
                  </Button>
                  <Button fullWidth variant="outlined" startIcon={<Receipt />} onClick={handleSaveSale} disabled={isSaving}>
                    {editingSaleId ? "Update pending sale" : "Save as pending"}
                  </Button>
                </Box>
              </>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Mobile cart bar */}
      {isMobile && hasItems && (
        <Paper
          elevation={0}
          sx={{
            position: "fixed",
            left: 12,
            right: 12,
            bottom: "calc(12px + env(safe-area-inset-bottom))",
            zIndex: 1100,
            p: 1,
            pl: 2,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            border: 1,
            borderColor: "divider",
            boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </Typography>
            <Typography className="num" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
              ${totals.finalTotal.usd.toFixed(2)}
            </Typography>
          </Box>
          <Button variant="contained" onClick={() => cartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            Review & charge
          </Button>
        </Paper>
      )}

      {/* Pending orders */}
      <Dialog open={openPendingDialog} onClose={() => setOpenPendingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          Pending orders
          <Chip label={pendingCount} color="warning" size="small" />
        </DialogTitle>
        <DialogContent dividers>
          {loadingPending ? (
            <Stack spacing={1}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="rounded" height={72} />
              ))}
            </Stack>
          ) : !pendingSales?.data?.length ? (
            <EmptyState compact title="No pending orders" description="Saved sales waiting for payment appear here." />
          ) : (
            <Stack spacing={1}>
              {pendingSales.data.map((sale: PendingSaleListItem) => (
                <Box
                  key={sale.id}
                  sx={{
                    p: 1.5,
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 3,
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "stretch", sm: "center" },
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Typography sx={{ fontWeight: 700 }}>{sale.customer?.name || "Walk-in"}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {sale.invoiceNumber}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" className="num">
                      {sale.items?.length || 0} item(s) · $
                      {(sale.hasActiveSessions ? sale.currentTotals?.usd : sale.totals?.usd)?.toFixed(2)} ·{" "}
                      {new Date(sale.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </Typography>
                    {sale.hasActiveSessions && (
                      <Chip
                        icon={<AccessTime sx={{ fontSize: 14 }} />}
                        label={`Active session · ${sale.activeSessions?.[0]?.currentDuration || 0} min`}
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ mt: 0.75 }}
                      />
                    )}
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Edit />}
                      onClick={() => handleLoadPendingSale(sale.id)}
                      sx={{ flex: { xs: 1, sm: "none" } }}
                    >
                      Open
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      color="success"
                      startIcon={<Payment />}
                      onClick={() => handleProcessPayment(sale.id)}
                      sx={{ flex: { xs: 1, sm: "none" } }}
                    >
                      Pay
                    </Button>
                  </Stack>
                </Box>
              ))}
            </Stack>
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
