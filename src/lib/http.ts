import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { env } from '../config/env';
import { authStorage } from './authStorage';
import { attachMockAdapter } from '../mocks/handlers';

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const http: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

/* ─── request interceptor: attach access token ────────────────── */
http.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ─── response interceptor: refresh on 401 ────────────────────── */
let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;
  const rt = authStorage.getRefreshToken();
  if (!rt) throw new Error('No refresh token');
  refreshInFlight = axios
    .post(`${env.apiBaseUrl}/auth/refresh`, { refreshToken: rt })
    .then((r) => {
      const { accessToken, refreshToken } = r.data as {
        accessToken: string;
        refreshToken: string;
      };
      authStorage.setTokens(accessToken, refreshToken);
      return accessToken;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

http.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = err.config as RetryConfig | undefined;
    const status = err.response?.status;

    if (
      status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes('/auth/')
    ) {
      original._retry = true;
      try {
        const newToken = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${newToken}`;
        return http.request(original);
      } catch (refreshErr) {
        authStorage.clear();
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(refreshErr);
      }
    }

    const message =
      (err.response?.data as { message?: string } | undefined)?.message ??
      err.message ??
      'Something went wrong. Please try again.';
    return Promise.reject(Object.assign(err, { message }));
  }
);

/* ─── mock adapter for dev / demo ─────────────────────────────── */
if (env.useMock) {
  attachMockAdapter(http);
}

/* ─── typed helpers ───────────────────────────────────────────── */
export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const r = await http.get<T>(url, config);
  return r.data;
}
export async function apiPost<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig
): Promise<T> {
  const r = await http.post<T>(url, body, config);
  return r.data;
}
export async function apiPatch<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig
): Promise<T> {
  const r = await http.patch<T>(url, body, config);
  return r.data;
}
export async function apiPut<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig
): Promise<T> {
  const r = await http.put<T>(url, body, config);
  return r.data;
}
export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const r = await http.delete<T>(url, config);
  return r.data;
}
