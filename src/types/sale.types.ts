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
  productId: string;
  product?: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: {
    usd: number;
    lbp: number;
  };
  subtotal: {
    usd: number;
    lbp: number;
  };
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
  totals: {
    usd: number;
    lbp: number;
  };
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
  }>;
  notes?: string;
}

export interface PaySaleRequest {
  paymentMethod: PaymentMethod;
  paymentCurrency: Currency;
  amount: number;
}
