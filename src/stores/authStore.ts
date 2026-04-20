import { create } from 'zustand';
import { authService } from '../services/authService';
import { authStorage } from '../lib/authStorage';
import type { AuthStatus, Doctor, LoginRequest } from '../types';

interface AuthState {
  status: AuthStatus;
  user: Doctor | null;
  error: string | null;

  bootstrap: () => Promise<void>;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: Doctor | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: authStorage.getAccessToken() ? 'bootstrapping' : 'unauthenticated',
  user: authStorage.getUser<Doctor>(),
  error: null,

  async bootstrap() {
    if (get().status === 'authenticated') return;
    if (!authStorage.getAccessToken()) {
      set({ status: 'unauthenticated' });
      return;
    }
    set({ status: 'bootstrapping' });
    try {
      const me = await authService.me();
      authStorage.setUser(me);
      set({ user: me, status: 'authenticated', error: null });
    } catch {
      authStorage.clear();
      set({ user: null, status: 'unauthenticated' });
    }
  },

  async login(credentials) {
    set({ status: 'loading', error: null });
    try {
      const res = await authService.login(credentials);
      authStorage.setTokens(res.accessToken, res.refreshToken);
      authStorage.setUser(res.user);
      set({ user: res.user, status: 'authenticated', error: null });
    } catch (err) {
      const message =
        (err as { message?: string })?.message ?? 'Could not sign you in. Please try again.';
      set({ status: 'unauthenticated', error: message });
      throw err;
    }
  },

  async logout() {
    try {
      await authService.logout();
    } catch {
      /* swallow — server-side logout is best effort */
    }
    authStorage.clear();
    set({ user: null, status: 'unauthenticated', error: null });
  },

  setUser(user) {
    if (user) authStorage.setUser(user);
    else authStorage.clear();
    set({ user });
  },

  clearError() {
    set({ error: null });
  },
}));

/* ── Session glue ─────────────────────────────────────────────── */

if (typeof window !== 'undefined') {
  // Forced-logout event from the axios response interceptor.
  window.addEventListener('auth:logout', () => {
    useAuthStore.setState({ user: null, status: 'unauthenticated' });
  });

  // Cross-tab sync: if the user signs in or out in another tab, mirror it here.
  window.addEventListener('storage', (e) => {
    if (e.key === 'pai.auth.access' || e.key === 'pai.auth.refresh') {
      if (!authStorage.getAccessToken()) {
        useAuthStore.setState({ user: null, status: 'unauthenticated' });
      } else if (useAuthStore.getState().status !== 'authenticated') {
        useAuthStore.getState().bootstrap();
      }
    }
  });
}
