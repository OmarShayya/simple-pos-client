// Revenue discount breakdown
export interface RevenueDiscounts {
  totalItemDiscounts: {
    usd: number;
    lbp: number;
  };
  totalSaleDiscounts: {
    usd: number;
    lbp: number;
  };
  totalDiscounts: {
    usd: number;
    lbp: number;
  };
  revenueBeforeDiscounts: {
    usd: number;
    lbp: number;
  };
}

// Revenue breakdown with discount information
export interface RevenueBreakdown {
  total: {
    usd: number;
    lbp: number;
  };
  usdPayments: {
    usd: number;
    lbp: number;
  };
  lbpPayments: {
    usd: number;
    lbp: number;
  };
  totalSales: number;
  averageSale: {
    usd: number;
    lbp: number;
  };
  discounts?: RevenueDiscounts;
}

// Period information
export interface ReportPeriod {
  type: "daily" | "weekly" | "monthly" | "yearly";
  date?: string;
  week?: number;
  month?: number;
  year?: number;
  startDate?: string;
  endDate?: string;
}

// Time-based reports (daily/weekly/monthly/yearly)
export interface TimeBasedReport {
  period: ReportPeriod;
  revenue: RevenueBreakdown;
}

// Sales by product report
export interface ProductSalesReport {
  productId: string;
  productName: string;
  productSku: string;
  totalQuantitySold: number;
  revenueBeforeDiscount: {
    usd: number;
    lbp: number;
  };
  totalDiscounts: {
    usd: number;
    lbp: number;
  };
  totalRevenue: {
    usd: number;
    lbp: number;
  };
  salesCount: number;
}

// Sales by category report
export interface CategorySalesReport {
  categoryId: string;
  categoryName: string;
  totalQuantitySold: number;
  revenueBeforeDiscount: {
    usd: number;
    lbp: number;
  };
  totalDiscounts: {
    usd: number;
    lbp: number;
  };
  totalRevenue: {
    usd: number;
    lbp: number;
  };
  salesCount: number;
}

// Transaction discount breakdown
export interface TransactionDiscounts {
  itemDiscounts: {
    usd: number;
    lbp: number;
  };
  saleDiscount?: {
    name: string;
    percentage: number;
    amount: {
      usd: number;
      lbp: number;
    };
  };
  totalDiscounts: {
    usd: number;
    lbp: number;
  };
}

// Daily transaction
export interface DailyTransaction {
  id: string;
  invoiceNumber: string;
  customer?: {
    name: string;
    phone: string;
  };
  subtotalBeforeDiscount: {
    usd: number;
    lbp: number;
  };
  discounts: TransactionDiscounts;
  totals: {
    usd: number;
    lbp: number;
  };
  amountPaid: {
    usd: number;
    lbp: number;
  };
  paymentMethod: string;
  paymentCurrency: string;
  status: string;
  cashier: string;
  createdAt: string;
}

// Gaming revenue breakdown
export interface GamingRevenueBreakdown {
  totalRevenue: {
    usd: number;
    lbp: number;
  };
  totalSessions: number;
  averageSessionDuration: number;
  averageRevenue: {
    usd: number;
    lbp: number;
  };
  totalDiscounts: {
    usd: number;
    lbp: number;
  };
  revenueBeforeDiscounts: {
    usd: number;
    lbp: number;
  };
}

// Hourly gaming breakdown
export interface HourlyGamingBreakdown {
  hour: number;
  totalSessions: number;
  revenue: {
    usd: number;
    lbp: number;
  };
  discounts: {
    usd: number;
    lbp: number;
  };
  totalDuration: number;
}

// Daily gaming report
export interface DailyGamingReport {
  revenue: GamingRevenueBreakdown;
  hourlyBreakdown: HourlyGamingBreakdown[];
}

// Gaming revenue by PC
export interface GamingRevenueByPC {
  pcId: string;
  pcNumber: string;
  pcName: string;
  totalSessions: number;
  totalRevenue: {
    usd: number;
    lbp: number;
  };
  totalDiscounts: {
    usd: number;
    lbp: number;
  };
  averageDuration: number;
}
