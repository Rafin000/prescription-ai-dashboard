import { useAuthStore } from '../stores/authStore';
import { useRolePolicyStore } from '../stores/rolePolicyStore';
import type { Permission } from '../lib/permissions';

/** True if the signed-in user's role currently has the given permission.
 *  Reads the live role policy, so admin edits on /team take effect instantly. */
export function useCan(perm: Permission): boolean {
  const role = useAuthStore((s) => s.user?.role);
  const has = useRolePolicyStore((s) => s.has);
  return has(role, perm);
}

/** All given permissions must pass. */
export function useCanAll(...perms: Permission[]): boolean {
  const role = useAuthStore((s) => s.user?.role);
  const has = useRolePolicyStore((s) => s.has);
  return perms.every((p) => has(role, p));
}

/** Any of the given permissions passes. */
export function useCanAny(...perms: Permission[]): boolean {
  const role = useAuthStore((s) => s.user?.role);
  const has = useRolePolicyStore((s) => s.has);
  return perms.some((p) => has(role, p));
}
