import { apiGet, apiPost } from '../lib/http';
import type {
  AuthTokens,
  Doctor,
  LoginRequest,
  LoginResponse,
} from '../types';

export const authService = {
  login: (body: LoginRequest) => apiPost<LoginResponse, LoginRequest>('/auth/login', body),
  refresh: (refreshToken: string) =>
    apiPost<AuthTokens, { refreshToken: string }>('/auth/refresh', { refreshToken }),
  logout: () => apiPost<void>('/auth/logout'),
  me: () => apiGet<Doctor>('/auth/me'),
};
