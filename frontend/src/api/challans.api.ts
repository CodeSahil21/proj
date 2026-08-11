import api from '@/lib/axios';
import type { ApiResponse, Challan } from '@/types';

export interface ChallanFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface CreateChallanPayload {
  customerId: string;
  items: { productId: string; quantity: number; unitPrice: number }[];
  notes?: string;
}

export const challansApi = {
  list: (filters: ChallanFilters = {}) =>
    api.get<ApiResponse<Challan[]>>('/api/challans', { params: filters }).then((r) => r.data),

  get: (id: string) =>
    api.get<ApiResponse<Challan>>(`/api/challans/${id}`).then((r) => r.data),

  create: (data: CreateChallanPayload) =>
    api.post<ApiResponse<Challan>>('/api/challans', data).then((r) => r.data),

  confirm: (id: string) =>
    api.patch<ApiResponse<Challan>>(`/api/challans/${id}/confirm`).then((r) => r.data),

  cancel: (id: string) =>
    api.patch<ApiResponse<Challan>>(`/api/challans/${id}/cancel`).then((r) => r.data),
};
