import type { ReactNode } from 'react';
import { useCan } from './useCan';
import type { Permission } from '../lib/permissions';

interface CanProps {
  permission: Permission;
  /** What to render when the user does have the permission. */
  children: ReactNode;
  /** Optional fallback when the user lacks it. Defaults to nothing. */
  fallback?: ReactNode;
}

/**
 * Conditionally render UI based on the current user's role.
 *
 *   <Can permission="rx:finalize">
 *     <Button>Finalize & send</Button>
 *   </Can>
 *
 * For pages (route-level), use `<RoleGate>` instead.
 */
export function Can({ permission, children, fallback = null }: CanProps) {
  const allowed = useCan(permission);
  return <>{allowed ? children : fallback}</>;
}
