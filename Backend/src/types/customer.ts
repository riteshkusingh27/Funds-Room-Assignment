import type { CustomerStatus, CustomerType } from "./domain";

export type Customer = {
  id: number;
  name: string;
  mobile: string;
  email: string | null;
  businessName: string;
  gstNumber: string | null;
  customerType: CustomerType;
  address: string;
  status: CustomerStatus;
  followUpDate: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerFollowup = {
  id: number;
  customerId: number;
  note: string;
  followUpDate: string | null;
  createdBy: number;
  createdAt: string;
};

export type CustomerListResponse = {
  items: Customer[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
