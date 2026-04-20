import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_ROLE_PERMISSIONS,
  SYSTEM_ROLE_DESCRIPTIONS,
  SYSTEM_ROLE_IDS,
  SYSTEM_ROLE_LABELS,
  isSystemRole,
  slugifyRoleName,
  type Permission,
  type TeamRole,
} from '../lib/permissions';

export interface RoleDefinition {
  id: TeamRole;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: string;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions: Permission[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissions?: Permission[];
}

interface RolePolicyState {
  roles: RoleDefinition[];

  /** All roles in their display order — system roles first, then by creation. */
  list: () => RoleDefinition[];
  getRole: (roleId: TeamRole | null | undefined) => RoleDefinition | undefined;
  has: (roleId: TeamRole | null | undefined, perm: Permission) => boolean;

  togglePermission: (roleId: TeamRole, perm: Permission) => void;
  setPermissions: (roleId: TeamRole, perms: Permission[]) => void;

  /** Returns the ID of the newly-created role (possibly de-duped). */
  createRole: (input: CreateRoleInput) => RoleDefinition;
  updateRole: (roleId: TeamRole, patch: UpdateRoleInput) => void;
  deleteRole: (roleId: TeamRole) => void;

  /** Restore a role (or all roles) to factory defaults. */
  resetToDefault: (roleId?: TeamRole) => void;
}

function defaultSystemRoles(): RoleDefinition[] {
  return SYSTEM_ROLE_IDS.map((id) => ({
    id,
    name: SYSTEM_ROLE_LABELS[id],
    description: SYSTEM_ROLE_DESCRIPTIONS[id],
    permissions: [...DEFAULT_ROLE_PERMISSIONS[id]],
    isSystem: true,
    createdAt: new Date(0).toISOString(),
  }));
}

function uniqueId(base: string, existing: Set<string>): string {
  const root = slugifyRoleName(base) || 'role';
  if (!existing.has(root)) return root;
  let n = 2;
  while (existing.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}

export const useRolePolicyStore = create<RolePolicyState>()(
  persist(
    (set, get) => ({
      roles: defaultSystemRoles(),

      list: () => {
        const { roles } = get();
        return [...roles].sort((a, b) => {
          if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
          return a.createdAt.localeCompare(b.createdAt);
        });
      },

      getRole: (roleId) => {
        if (!roleId) return undefined;
        return get().roles.find((r) => r.id === roleId);
      },

      has: (roleId, perm) => {
        if (!roleId) return false;
        const role = get().roles.find((r) => r.id === roleId);
        return role?.permissions.includes(perm) ?? false;
      },

      togglePermission: (roleId, perm) => {
        set((s) => ({
          roles: s.roles.map((r) => {
            if (r.id !== roleId) return r;
            // Admins always keep every permission.
            if (r.id === 'admin') return r;
            const has = r.permissions.includes(perm);
            return {
              ...r,
              permissions: has
                ? r.permissions.filter((p) => p !== perm)
                : [...r.permissions, perm],
            };
          }),
        }));
      },

      setPermissions: (roleId, perms) => {
        set((s) => ({
          roles: s.roles.map((r) =>
            r.id === roleId && r.id !== 'admin' ? { ...r, permissions: [...perms] } : r
          ),
        }));
      },

      createRole: (input) => {
        const ids = new Set(get().roles.map((r) => r.id));
        const id = uniqueId(input.name, ids);
        const role: RoleDefinition = {
          id,
          name: input.name.trim() || id,
          description: input.description?.trim() || undefined,
          permissions: [...input.permissions],
          isSystem: false,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ roles: [...s.roles, role] }));
        return role;
      },

      updateRole: (roleId, patch) => {
        set((s) => ({
          roles: s.roles.map((r) => {
            if (r.id !== roleId) return r;
            // System roles: only permissions editable (not name/description),
            // and admin's permissions are locked to the full default set.
            if (r.isSystem) {
              if (r.id === 'admin') return r;
              return {
                ...r,
                permissions: patch.permissions ? [...patch.permissions] : r.permissions,
              };
            }
            return {
              ...r,
              name: patch.name?.trim() || r.name,
              description:
                patch.description !== undefined
                  ? patch.description.trim() || undefined
                  : r.description,
              permissions: patch.permissions ? [...patch.permissions] : r.permissions,
            };
          }),
        }));
      },

      deleteRole: (roleId) => {
        set((s) => ({
          roles: s.roles.filter((r) => r.id !== roleId || r.isSystem),
        }));
      },

      resetToDefault: (roleId) => {
        if (roleId) {
          if (!isSystemRole(roleId)) return; // only system roles have defaults
          set((s) => ({
            roles: s.roles.map((r) =>
              r.id === roleId
                ? {
                    ...r,
                    permissions: [...DEFAULT_ROLE_PERMISSIONS[roleId as 'admin' | 'assistant']],
                  }
                : r
            ),
          }));
          return;
        }
        set({ roles: defaultSystemRoles() });
      },
    }),
    {
      name: 'pai.role-policy',
      version: 2,
      // Old v1 shape was { policies: Record<role, Permission[]> }; just reset to
      // sane defaults on that path — no one has production data yet.
      migrate: (_persisted, _from) => ({ roles: defaultSystemRoles() }),
    }
  )
);

/** Subscribe to the live permissions for a single role. */
export function useRolePermissions(roleId: TeamRole | null | undefined): Permission[] {
  return useRolePolicyStore((s) => {
    if (!roleId) return [];
    return s.roles.find((r) => r.id === roleId)?.permissions ?? [];
  });
}
