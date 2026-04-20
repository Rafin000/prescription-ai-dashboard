/**
 * Role-based access control — single source of truth.
 *
 * We deliberately keep roles to a tight preset for now (no custom roles).
 * Each permission is a `feature:action` string, checked via the `useCan`
 * hook or the `<Can>` component. Add new keys here and the UI gates pick
 * them up automatically.
 */

/**
 * A role is identified by a string ID. The two baked-in system roles are
 * `"admin"` (the workspace owner, undeletable) and `"assistant"` (a sensible
 * default helper). Admins can create additional custom roles with any ID.
 */
export type TeamRole = string;

export const SYSTEM_ROLE_IDS = ['admin', 'assistant'] as const;
export type SystemRoleId = (typeof SYSTEM_ROLE_IDS)[number];

export const SYSTEM_ROLE_LABELS: Record<SystemRoleId, string> = {
  admin: 'Admin',
  assistant: 'Assistant',
};

export const SYSTEM_ROLE_DESCRIPTIONS: Record<SystemRoleId, string> = {
  admin:
    'Full access — writes and finalises prescriptions, manages patients, appointments, team and settings.',
  assistant:
    'Helper — uploads lab reports, books appointments, views records, and drafts prescriptions the admin reviews. Cannot finalise or send prescriptions.',
};

/** @deprecated Use role records from the role policy store instead. */
export const ROLE_LABELS = SYSTEM_ROLE_LABELS;
/** @deprecated Use role records from the role policy store instead. */
export const ROLE_DESCRIPTIONS = SYSTEM_ROLE_DESCRIPTIONS;

export function isSystemRole(roleId: string): roleId is SystemRoleId {
  return (SYSTEM_ROLE_IDS as readonly string[]).includes(roleId);
}

/** Turn a human name into a stable role id (e.g. "Pharmacy Tech" → "pharmacy-tech"). */
export function slugifyRoleName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/* ── Permission keys ──────────────────────────────────────────── */

export type Permission =
  // patients
  | 'patient:read'
  | 'patient:create'
  | 'patient:update'
  | 'patient:delete'
  // prescriptions
  | 'rx:read'
  | 'rx:write'
  | 'rx:finalize'
  | 'rx:print'
  | 'rx:send'
  // live consult + video call
  | 'consult:start'
  // appointments
  | 'appointment:read'
  | 'appointment:create'
  | 'appointment:update'
  | 'appointment:cancel'
  // lab reports
  | 'report:read'
  | 'report:upload'
  | 'report:assign'
  // medicines catalog
  | 'medicine:read'
  | 'medicine:rate'
  // Rx templates
  | 'template:read'
  | 'template:write'
  // surgical plans
  | 'surgery:read'
  | 'surgery:write'
  // team / settings
  | 'team:read'
  | 'team:manage'
  | 'settings:manage';

export const ALL_PERMISSIONS: Permission[] = [
  'patient:read',
  'patient:create',
  'patient:update',
  'patient:delete',
  'rx:read',
  'rx:write',
  'rx:finalize',
  'rx:print',
  'rx:send',
  'consult:start',
  'appointment:read',
  'appointment:create',
  'appointment:update',
  'appointment:cancel',
  'report:read',
  'report:upload',
  'report:assign',
  'medicine:read',
  'medicine:rate',
  'template:read',
  'template:write',
  'surgery:read',
  'surgery:write',
  'team:read',
  'team:manage',
  'settings:manage',
];

/* ── Role → Permission bundle ────────────────────────────────── */

export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRoleId, Permission[]> = {
  admin: [
    'patient:read',
    'patient:create',
    'patient:update',
    'patient:delete',
    'rx:read',
    'rx:write',
    'rx:finalize',
    'rx:print',
    'rx:send',
    'consult:start',
    'appointment:read',
    'appointment:create',
    'appointment:update',
    'appointment:cancel',
    'report:read',
    'report:upload',
    'report:assign',
    'medicine:read',
    'medicine:rate',
    'template:read',
    'template:write',
    'surgery:read',
    'surgery:write',
    'team:read',
    'team:manage',
    'settings:manage',
  ],
  // Scoped helper — Lab inbox, Patients, Appointments, Rx templates only.
  assistant: [
    'patient:read',
    'patient:create',
    'patient:update',
    'appointment:read',
    'appointment:create',
    'appointment:update',
    'appointment:cancel',
    'report:read',
    'report:upload',
    'report:assign',
    'template:read',
    'surgery:read',
    'team:read',
  ],
};

/** @deprecated Prefer `useRolePolicyStore.getState().has(role, perm)`. */
export const ROLE_PERMISSIONS = DEFAULT_ROLE_PERMISSIONS;

/** @deprecated Prefer reading permissions from the role policy store. */
export function roleHas(role: TeamRole | undefined | null, perm: Permission): boolean {
  if (!role) return false;
  const list = DEFAULT_ROLE_PERMISSIONS[role as SystemRoleId];
  return list?.includes(perm) ?? false;
}

/** @deprecated Prefer reading permissions from the role policy store. */
export function permissionsFor(role: TeamRole | undefined | null): Permission[] {
  if (!role) return [];
  return DEFAULT_ROLE_PERMISSIONS[role as SystemRoleId] ?? [];
}

/**
 * Feature/action matrix used by the UI's permission chart — makes the
 * role's capabilities legible to the humans inviting people.
 */
export const PERMISSION_GROUPS: Array<{
  feature: string;
  label: string;
  items: Array<{ permission: Permission; label: string }>;
}> = [
  {
    feature: 'patients',
    label: 'Patients',
    items: [
      { permission: 'patient:read', label: 'View patients' },
      { permission: 'patient:create', label: 'Add new patients' },
      { permission: 'patient:update', label: 'Edit patient details' },
      { permission: 'patient:delete', label: 'Delete patients' },
    ],
  },
  {
    feature: 'rx',
    label: 'Prescriptions',
    items: [
      { permission: 'rx:read', label: 'View prescriptions' },
      { permission: 'rx:write', label: 'Draft prescriptions' },
      { permission: 'rx:finalize', label: 'Finalize & sign' },
      { permission: 'rx:print', label: 'Print prescriptions' },
      { permission: 'rx:send', label: 'Send to patient' },
    ],
  },
  {
    feature: 'consult',
    label: 'Consultations',
    items: [{ permission: 'consult:start', label: 'Start a live consult' }],
  },
  {
    feature: 'appointments',
    label: 'Appointments',
    items: [
      { permission: 'appointment:read', label: 'View the schedule' },
      { permission: 'appointment:create', label: 'Book appointments' },
      { permission: 'appointment:update', label: 'Reschedule' },
      { permission: 'appointment:cancel', label: 'Cancel appointments' },
    ],
  },
  {
    feature: 'reports',
    label: 'Lab reports',
    items: [
      { permission: 'report:read', label: 'View reports' },
      { permission: 'report:upload', label: 'Upload new reports' },
      { permission: 'report:assign', label: 'Route reports to patients' },
    ],
  },
  {
    feature: 'templates',
    label: 'Rx templates',
    items: [
      { permission: 'template:read', label: 'Use saved templates' },
      { permission: 'template:write', label: 'Create / edit templates' },
    ],
  },
  {
    feature: 'surgery',
    label: 'Surgical plans',
    items: [
      { permission: 'surgery:read', label: 'View planned operations' },
      { permission: 'surgery:write', label: 'Add / update surgical plans' },
    ],
  },
  {
    feature: 'team',
    label: 'Team & settings',
    items: [
      { permission: 'team:read', label: 'View team members' },
      { permission: 'team:manage', label: 'Invite / remove members' },
      { permission: 'settings:manage', label: 'Clinic settings' },
    ],
  },
];
