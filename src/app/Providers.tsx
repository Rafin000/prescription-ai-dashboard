import { useEffect, useState, type ReactNode } from 'react';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { SessionRunner } from './SessionRunner';
import { SettingsRunner } from './SettingsRunner';
import { OngoingSessionBar } from '../components/layout/OngoingSessionBar';
import { installKeyboardPrintHandler } from '../lib/printRx';

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, err: unknown) => {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 401 || status === 403 || status === 404) return false;
          return failureCount < 2;
        },
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
    queryCache: new QueryCache({
      onError: (err) => {
        // Surface to a toast system later; for now log so we notice in dev.
        // eslint-disable-next-line no-console
        console.warn('[query] error:', (err as { message?: string })?.message ?? err);
      },
    }),
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => makeQueryClient());
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
    installKeyboardPrintHandler();
  }, [bootstrap]);

  // Clear caches on logout so stale authenticated data doesn't leak.
  useEffect(() => {
    const onLogout = () => client.clear();
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, [client]);

  return (
    <QueryClientProvider client={client}>
      {children}
      <SessionRunner />
      <SettingsRunner />
      <OngoingSessionBar />
    </QueryClientProvider>
  );
}
