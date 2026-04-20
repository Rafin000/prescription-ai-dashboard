import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useCan } from './useCan';
import type { Permission } from '../lib/permissions';

interface RoleGateProps {
  /** Permission required to see this page. */
  require: Permission;
  /** Where to redirect when the user lacks the permission. Default: `/`. */
  redirectTo?: string;
}

/**
 * Route-level permission guard. Place inside a `<Route element=...>`
 * wrapping one or more child routes, and the child Outlet only renders
 * when the signed-in user has the permission.
 *
 *   <Route element={<RoleGate require="team:manage" />}>
 *     <Route path="team" element={<Team />} />
 *   </Route>
 */
export function RoleGate({ require, redirectTo = '/' }: RoleGateProps) {
  const allowed = useCan(require);
  const location = useLocation();
  if (allowed) return <Outlet />;
  return (
    <Navigate
      to={redirectTo}
      replace
      state={{
        from: location,
        notice: "You don't have access to that page.",
      }}
    />
  );
}

/** Inline "no permission" state, in case a page needs to show a soft block. */
export function NoAccess({ note }: { note?: string }) {
  return (
    <div className="min-h-[50vh] grid place-items-center text-center px-6">
      <div className="max-w-sm">
        <div className="h-12 w-12 rounded-full bg-bg-muted text-ink-3 grid place-items-center mx-auto">
          <Lock className="h-5 w-5" />
        </div>
        <div className="font-serif text-[18px] font-semibold text-ink mt-3">
          You don't have access here
        </div>
        <p className="text-[13px] text-ink-2 mt-1.5 leading-relaxed">
          {note ?? 'Ask your workspace admin to grant you the permission you need.'}
        </p>
      </div>
    </div>
  );
}
