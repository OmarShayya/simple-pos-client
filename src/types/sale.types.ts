export const SaleStatus = {
  PENDING: "pending",
  PAID: "paid",
  CANCELLED: "cancelled",
} as const;

export type SaleStatus = (typeof SaleStatus)[keyof typeof SaleStatus];

export const PaymentMethod = {
  CASH: "cash",
  CARD: "card",
  BANK_TRANSFER: "bank_transfer",
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const Currency = {
  USD: "USD",
  LBP: "LBP",
} as const;

export type Currency = (typeof Currency)[keyof typeof Currency];

export interface SaleItem {
  productId: string;
  productName?: string;
  productSku?: string;
  quantity: number;
  unitPrice?: {
    usd: number;
    lbp: number;
  };
  subtotal?: {
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
  };
  items: SaleItem[];
  totals: {
    usd: number;
    lbp: number;
  };
  paymentMethod?: PaymentMethod;
  paymentCurrency?: Currency;
  amountPaid?: {
    usd: number;
    lbp: number;
  };
  status: SaleStatus;
  cashier?: {
    name: string;
    email: string;
  };
  notes?: string;
  paidAt?: string;
  createdAt: string;
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
