import api from '@/lib/axios';
import type { ApiResponse, User } from '@/types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<ApiResponse<LoginResponse>>('/api/auth/login', payload).then((r) => r.data),

  getMe: () =>
    api.get<ApiResponse<User>>('/api/auth/me').then((r) => r.data),
};
