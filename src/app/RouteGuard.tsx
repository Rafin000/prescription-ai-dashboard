import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status === 'bootstrapping' || status === 'idle' || status === 'loading') {
    return <SessionLoader />;
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const status = useAuthStore((s) => s.status);
  if (status === 'bootstrapping' || status === 'idle') return <SessionLoader />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <Outlet />;
}

function SessionLoader() {
  return (
    <div className="min-h-screen grid place-items-center bg-bg">
      <div className="flex flex-col items-center gap-3">
        <span
          className="h-8 w-8 rounded-full border-[3px] border-accent border-r-transparent animate-spin"
          aria-hidden
        />
        <span className="text-[12px] text-ink-3 font-mono uppercase tracking-[1.4px]">
          Restoring your session…
        </span>
      </div>
    </div>
  );
}
