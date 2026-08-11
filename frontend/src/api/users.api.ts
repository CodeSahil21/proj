import api from '@/lib/axios';
import type { ApiResponse, User } from '@/types';

export const usersApi = {
  list: (params = {}) =>
    api.get<ApiResponse<User[]>>('/api/users', { params }).then((r) => r.data),

  create: (data: { name: string; email: string; password: string; role: string }) =>
    api.post<ApiResponse<User>>('/api/users', data).then((r) => r.data),

  update: (id: string, data: Partial<User> & { password?: string }) =>
    api.put<ApiResponse<User>>(`/api/users/${id}`, data).then((r) => r.data),
};
