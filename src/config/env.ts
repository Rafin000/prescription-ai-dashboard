/**
 * Centralised access to Vite env vars with sensible defaults.
 * Add new variables here so the rest of the app has a typed, single source
 * of truth (no scattered `import.meta.env.X` reads).
 */
export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api',
  appName: 'Prescription AI',
  idleLogoutMinutes: 30,
  refreshSkewSeconds: 60,
} as const;

export type Env = typeof env;
