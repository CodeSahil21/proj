import api from '@/lib/axios';
import type { ApiResponse, Product, StockMovement } from '@/types';

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  lowStock?: boolean;
}

export const productsApi = {
  list: (filters: ProductFilters = {}) =>
    api.get<ApiResponse<Product[]>>('/api/products', { params: filters }).then((r) => r.data),

  get: (id: string) =>
    api.get<ApiResponse<Product>>(`/api/products/${id}`).then((r) => r.data),

  create: (data: Partial<Product>) =>
    api.post<ApiResponse<Product>>('/api/products', data).then((r) => r.data),

  update: (id: string, data: Partial<Product>) =>
    api.put<ApiResponse<Product>>(`/api/products/${id}`, data).then((r) => r.data),

  getMovements: (id: string, params = {}) =>
    api.get<ApiResponse<StockMovement[]>>(`/api/products/${id}/movements`, { params }).then((r) => r.data),

  adjustStock: (id: string, data: { quantity: number; movementType: string; reason?: string }) =>
    api.post<ApiResponse<{ product: Product; movement: StockMovement }>>(`/api/products/${id}/stock`, data).then((r) => r.data),
};
