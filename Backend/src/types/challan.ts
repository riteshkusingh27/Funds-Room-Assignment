import type { ChallanStatus } from "./domain";

export type ChallanItem = {
  id: number;
  challanId: number;
  productId: number;
  productName: string;
  sku: string;
  unitPrice: string;
  quantity: number;
  createdAt: string;
};

export type Challan = {
  id: number;
  challanNumber: string;
  customerId: number;
  totalQuantity: number;
  status: ChallanStatus;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
};

export type ChallanWithItems = Challan & {
  items: ChallanItem[];
};

export type ChallanListResponse = {
  items: Challan[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
