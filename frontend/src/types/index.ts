export type Role = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';
export type CustomerType = 'RETAILER' | 'WHOLESALER' | 'DISTRIBUTOR' | 'INDIVIDUAL';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'PROSPECT';
export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';
export type ChallanStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  businessName?: string;
  gstNumber?: string;
  customerType: CustomerType;
  address?: string;
  status: CustomerStatus;
  followUpDate?: string;
  notes?: string;
  createdById: string;
  createdBy?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
  _count?: { challans: number; followUps: number };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string;
  unitPrice: number;
  currentStock: number;
  minStockQty: number;
  location?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  quantity: number;
  movementType: MovementType;
  reason?: string;
  referenceId?: string;
  createdById: string;
  createdBy?: { id: string; name: string };
  createdAt: string;
}

export interface ChallanItem {
  id: string;
  challanId: string;
  productId: string;
  product?: { id: string; name: string; sku: string; currentStock?: number };
  productSnapshot: Record<string, unknown>;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Challan {
  id: string;
  challanNumber: string;
  customerId: string;
  customer?: Pick<Customer, 'id' | 'name' | 'mobile' | 'businessName'>;
  customerSnapshot: Record<string, unknown>;
  totalQuantity: number;
  totalAmount: number;
  status: ChallanStatus;
  notes?: string;
  createdById: string;
  createdBy?: { id: string; name: string };
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
  items?: ChallanItem[];
  _count?: { items: number };
}

export interface FollowUp {
  id: string;
  customerId: string;
  note: string;
  createdById: string;
  createdBy?: { id: string; name: string };
  createdAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}
