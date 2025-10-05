export interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string | undefined;
  image?: string | undefined;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  image?: string;
}
