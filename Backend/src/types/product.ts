export type Product = {
  id: number;
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  currentStock: number;
  minimumStock: number;
  warehouseLocation: string;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductListResponse = {
  items: Product[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
