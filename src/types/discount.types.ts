export enum DiscountTarget {
  PRODUCT = "product",
  CATEGORY = "category",
  GAMING_SESSION = "gaming_session",
  SALE = "sale",
}

export enum DiscountType {
  PERCENTAGE = "percentage",
}

export interface DiscountDetails {
  discountId: string;
  discountName: string;
  percentage: number;
  amount: {
    usd: number;
    lbp: number;
  };
}

export interface Discount {
  id: string;
  name: string;
  description?: string;
  type: DiscountType;
  value: number; // 0-100 for percentage
  target: DiscountTarget;
  targetId?: string; // Required for product/category, null for gaming_session/sale
  targetDetails?: {
    _id: string;
    name: string;
  };
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface CreateDiscountRequest {
  name: string;
  description?: string;
  value: number;
  target: DiscountTarget;
  targetId?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

export interface UpdateDiscountRequest {
  name?: string;
  description?: string;
  value?: number;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface GetDiscountsFilters {
  target?: DiscountTarget;
  isActive?: boolean;
  targetId?: string;
  page?: number;
  limit?: number;
}

export interface DiscountUsageReport {
  discountId: string;
  discountName: string;
  discountPercentage: number;
  timesUsed: number;
  totalDiscountAmount: {
    usd: number;
    lbp: number;
  };
  revenueImpact: {
    usd: number;
    lbp: number;
  };
}

export interface CustomerDiscountReport {
  customerId: string;
  customerName: string;
  totalPurchases: number;
  totalSpent: {
    usd: number;
    lbp: number;
  };
  totalDiscountsReceived: {
    usd: number;
    lbp: number;
  };
  amountSaved: {
    usd: number;
    lbp: number;
  };
}
