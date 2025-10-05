export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  category: {
    id: string;
    name: string;
  };
  pricing: {
    usd: number;
    lbp: number;
  };
  inventory: {
    quantity: number;
    minStockLevel: number;
    isLowStock: boolean;
  };
  image?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  sku: string;
  category: string;
  pricing: {
    usd: number;
    lbp: number;
  };
  inventory: {
    quantity: number;
    minStockLevel?: number;
  };
  image?: string;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  category?: string;
  pricing?: {
    usd: number;
    lbp: number;
  };
  inventory?: {
    quantity: number;
    minStockLevel?: number;
  };
  image?: string;
}
