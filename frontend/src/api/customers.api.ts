import api from '@/lib/axios';
import type { ApiResponse, Customer, FollowUp } from '@/types';

export interface CustomerFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  customerType?: string;
}

export const customersApi = {
  list: (filters: CustomerFilters = {}) =>
    api.get<ApiResponse<Customer[]>>('/api/customers', { params: filters }).then((r) => r.data),

  get: (id: string) =>
    api.get<ApiResponse<Customer>>(`/api/customers/${id}`).then((r) => r.data),

  create: (data: Partial<Customer>) =>
    api.post<ApiResponse<Customer>>('/api/customers', data).then((r) => r.data),

  update: (id: string, data: Partial<Customer>) =>
    api.put<ApiResponse<Customer>>(`/api/customers/${id}`, data).then((r) => r.data),

  getFollowUps: (id: string, params = {}) =>
    api.get<ApiResponse<FollowUp[]>>(`/api/customers/${id}/followups`, { params }).then((r) => r.data),

  addFollowUp: (id: string, note: string) =>
    api.post<ApiResponse<FollowUp>>(`/api/customers/${id}/followups`, { note }).then((r) => r.data),
};
