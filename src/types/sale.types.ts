export enum SaleStatus {
  PENDING = "pending",
  PAID = "paid",
  CANCELLED = "cancelled",
}

export enum PaymentMethod {
  CASH = "cash",
  CARD = "card",
  BANK_TRANSFER = "bank_transfer",
}

export enum Currency {
  USD = "USD",
  LBP = "LBP",
}

export interface SaleItem {
  productId: string | null; // Can be null for session items
  product?: string | null;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: {
    usd: number;
    lbp: number;
  };
  discount?: {
    discountId: string;
    discountName: string;
    percentage: number;
    amount: {
      usd: number;
      lbp: number;
    };
  };
  subtotal: {
    usd: number;
    lbp: number;
  };
  finalAmount?: {
    usd: number;
    lbp: number;
  };
  sessionData?: {
    sessionId: string;
    sessionNumber: string;
    pcNumber: string; // e.g., "PC-01"
    pcName: string; // e.g., "Gaming PC 1"
    hourlyRate: {
      usd: number;
      lbp: number;
    };
    startTime: string;
    status: string;
  };
  isActive?: boolean; // Only present if session is active
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customer?: {
    id: string;
    name: string;
    phone: string;
  } | null;
  items: SaleItem[];
  subtotalBeforeDiscount?: {
    usd: number;
    lbp: number;
  };
  totalItemDiscounts?: {
    usd: number;
    lbp: number;
  };
  saleDiscount?: {
    discountId: string;
    discountName: string;
    percentage: number;
    amount: {
      usd: number;
      lbp: number;
    };
  };
  totals: {
    usd: number;
    lbp: number;
  };
  currentTotals?: {
    usd: number;
    lbp: number;
  };
  hasActiveSessions?: boolean;
  activeSessions?: Array<{
    sessionNumber: string;
    currentDuration: number;
    currentCost: {
      usd: number;
      lbp: number;
    };
  }>;
  paymentMethod?: PaymentMethod;
  paymentCurrency?: Currency;
  amountPaid: {
    usd: number;
    lbp: number;
  };
  status: SaleStatus;
  cashier: {
    name: string;
    email: string;
  };
  notes?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSaleRequest {
  customerId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    discountId?: string;
  }>;
  saleDiscountId?: string;
  notes?: string;
}

export interface PaySaleRequest {
  paymentMethod: PaymentMethod;
  paymentCurrency: Currency;
  amount: number;
}
