/**
 * Centralised access to Vite env vars with sensible defaults.
 * Add new variables here so the rest of the app has a typed, single source
 * of truth (no scattered `import.meta.env.X` reads).
 */
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

export const env = {
  apiBaseUrl: API_BASE,
  /** Origin (protocol+host) of the backend, used when rendering backend-served
   *  assets like `/api/doctor/avatar/:id` into an <img src>. */
  apiOrigin: API_BASE.startsWith('http')
    ? new URL(API_BASE).origin
    : window.location.origin,
  appName: 'Prescription AI',
  idleLogoutMinutes: 30,
  refreshSkewSeconds: 60,
} as const;

export type Env = typeof env;

/** Resolve a backend-relative asset URL (e.g. "/api/doctor/avatar/:id") to
 *  an absolute URL that works when dashboard and API live on different
 *  origins. Passes data: / http(s): URLs through untouched. */
export function resolveAsset(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('/')) return `${env.apiOrigin}${url}`;
  return url;
}
