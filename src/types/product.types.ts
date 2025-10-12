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
  displayOnMenu: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductInventoryInput {
  quantity: number;
  minStockLevel?: number;
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
  inventory: ProductInventoryInput;
  image?: string;
  displayOnMenu?: boolean;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  category?: string;
  pricing?: {
    usd: number;
    lbp: number;
  };
  inventory?: ProductInventoryInput;
  image?: string;
  displayOnMenu?: boolean;
}

export interface MenuProduct {
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
  image?: string;
}
