import { apiGet, apiPost } from '../lib/http';
import type {
  AuthTokens,
  Doctor,
  LoginRequest,
  LoginResponse,
} from '../types';

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  specialty: string;
  bmdcNo?: string;
  phone?: string;
  teamName?: string;
  /** Short-lived phone-verified JWT from /auth/otp/verify. */
  phoneOtpToken?: string;
}

export const authService = {
  login: (body: LoginRequest) => apiPost<LoginResponse, LoginRequest>('/auth/login', body),
  signup: (body: SignupRequest) => apiPost<LoginResponse, SignupRequest>('/auth/signup', body),
  refresh: (refreshToken: string) =>
    apiPost<AuthTokens, { refreshToken: string }>('/auth/refresh', { refreshToken }),
  logout: () => apiPost<void>('/auth/logout'),
  me: () => apiGet<Doctor>('/auth/me'),
};
