export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address?: {
    street?: string;
    city?: string;
    country?: string;
  };
  balance: {
    usd: number;
    lbp: number;
  };
  totalPurchases: number;
  lastPurchaseDate?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateCustomerRequest {
  name: string;
  email?: string;
  phone: string;
  address?: {
    street?: string;
    city?: string;
    country?: string;
  };
  notes?: string;
}
