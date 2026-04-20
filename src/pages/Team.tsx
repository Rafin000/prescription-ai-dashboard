import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  Crown,
  Link2,
  Mail,
  Phone,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Tabs, type TabItem } from '../components/ui/Tabs';
import { Input } from '../components/ui/Input';
import { Empty } from '../components/ui/Empty';
import { Modal } from '../components/ui/Modal';
import { InviteMemberModal } from '../components/team/InviteMemberModal';
import { RoleFormModal } from '../components/team/RoleFormModal';
import { Can } from '../auth/Can';
import { useCan } from '../auth/useCan';
import { useAuthStore } from '../stores/authStore';
import {
  useRolePolicyStore,
  type RoleDefinition,
} from '../stores/rolePolicyStore';
import {
  useRemoveMember,
  useResendInvite,
  useRevokeInvite,
  useTeamInvites,
  useTeamMembers,
  useUpdateMemberRole,
} from '../queries/hooks';
import {
  isSystemRole,
  SYSTEM_ROLE_LABELS,
  type TeamRole,
} from '../lib/permissions';
import { fmtDate, fmtRelative } from '../lib/format';
import { cn } from '../lib/cn';

type Tab = 'members' | 'invites' | 'roles';

export function Team() {
  const [tab, setTab] = useState<Tab>('members');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const currentUser = useAuthStore((s) => s.user);
  const canManage = useCan('team:manage');

  const { data: members = [], isLoading: membersLoading } = useTeamMembers();
  const { data: invites = [], isLoading: invitesLoading } = useTeamInvites();

  const pendingInvites = useMemo(
    () => invites.filter((i) => i.status === 'pending'),
    [invites]
  );

  const tabs: TabItem<Tab>[] = [
    { id: 'members', label: 'Members', count: members.length },
    { id: 'invites', label: 'Pending invites', count: pendingInvites.length },
    { id: 'roles', label: 'Roles & permissions' },
  ];

  const handleInvited = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      /* fine — user can copy it from the pending invites tab */
    }
    setCopiedLink(link);
    setTab('invites');
    window.setTimeout(() => setCopiedLink(null), 3500);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team"
        description="The people who work with you on this clinic workspace. Invite an assistant to upload reports, book appointments, or draft prescriptions on your behalf."
        actions={
          <Can permission="team:manage">
            <Button variant="primary" leftIcon={<UserPlus />} onClick={() => setInviteOpen(true)}>
              Invite member
            </Button>
          </Can>
        }
      />

      {copiedLink && (
        <div className="rounded-md bg-success-soft border border-success/30 px-3 py-2.5 text-[12.5px] text-success flex items-center gap-2 animate-fade-in">
          <Check className="h-3.5 w-3.5" />
          Invite sent and link copied to your clipboard.
          <code className="ml-auto font-mono text-[11px] bg-white/60 border border-success/20 rounded-xs px-1.5 py-0.5 max-w-[360px] truncate">
            {copiedLink}
          </code>
        </div>
      )}

      <Card className="p-4">
        <Tabs items={tabs} value={tab} onChange={setTab} variant="pill" />
      </Card>

      {tab === 'members' && (
        <Card>
          <div className="hidden md:grid grid-cols-[minmax(220px,1.5fr)_minmax(220px,1.5fr)_200px_120px] gap-5 px-5 py-3 text-[10.5px] font-bold uppercase tracking-[1.2px] text-ink-3 bg-surface-muted border-b border-line">
            <div>Person</div>
            <div>Contact</div>
            <div>Role</div>
            <div className="text-right">Actions</div>
          </div>
          <div className="divide-y divide-line">
            {membersLoading && (
              <div className="px-5 py-10 text-center text-[13px] text-ink-3">Loading…</div>
            )}
            {!membersLoading && members.length === 0 && (
              <div className="p-6">
                <Empty
                  icon={<Users />}
                  title="Just you so far"
                  description="Invite an assistant so you're not handling every lab report and appointment yourself."
                  action={
                    canManage ? (
                      <Button
                        variant="primary"
                        leftIcon={<UserPlus />}
                        onClick={() => setInviteOpen(true)}
                      >
                        Invite member
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            )}
            {!membersLoading &&
              members.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  isMe={m.userId === currentUser?.id}
                  canManage={canManage}
                />
              ))}
          </div>
        </Card>
      )}

      {tab === 'invites' && (
        <Card>
          <div className="divide-y divide-line">
            {invitesLoading && (
              <div className="px-5 py-10 text-center text-[13px] text-ink-3">Loading…</div>
            )}
            {!invitesLoading && pendingInvites.length === 0 && (
              <div className="p-6">
                <Empty
                  icon={<Mail />}
                  title="No pending invites"
                  description="Invites you send appear here with their one-click join link. Revoked and expired invites are cleaned up automatically."
                  action={
                    canManage ? (
                      <Button
                        variant="primary"
                        leftIcon={<UserPlus />}
                        onClick={() => setInviteOpen(true)}
                      >
                        Invite member
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            )}
            {!invitesLoading &&
              pendingInvites.map((inv) => (
                <InviteRow key={inv.id} invite={inv} canManage={canManage} />
              ))}
          </div>
        </Card>
      )}

      {tab === 'roles' && <RolesPanel />}

      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={handleInvited}
      />
    </div>
  );
}

/* ── Member row ───────────────────────────────────────────── */

function MemberRow({
  member,
  isMe,
  canManage,
}: {
  member: import('../types').TeamMember;
  isMe: boolean;
  canManage: boolean;
}) {
  const [removeOpen, setRemoveOpen] = useState(false);
  const { mutate: updateRole, isPending: changingRole } = useUpdateMemberRole();
  const { mutate: remove, isPending: removing } = useRemoveMember();

  const roleEditable = canManage && !member.isOwner;
  const removable = canManage && !member.isOwner && !isMe;

  return (
    <div className="grid md:grid-cols-[minmax(220px,1.5fr)_minmax(220px,1.5fr)_200px_120px] gap-5 px-5 py-4 items-center">
      {/* Person */}
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={member.name} size="md" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-serif text-[15px] font-semibold text-ink truncate">
              {member.name}
            </span>
            {member.isOwner && (
              <Badge tone="accent" variant="soft" icon={<Crown />} uppercase>
                Owner
              </Badge>
            )}
            {isMe && !member.isOwner && (
              <Badge tone="neutral" variant="soft" uppercase>
                You
              </Badge>
            )}
          </div>
          <div className="text-[11.5px] text-ink-3 mt-0.5">
            Joined {fmtDate(member.joinedAt, 'MMM yyyy')}
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="min-w-0 text-[12.5px] leading-snug">
        <div className="flex items-center gap-1.5 text-ink font-mono truncate">
          <Mail className="h-3 w-3 text-ink-3 shrink-0" />
          <span className="truncate">{member.email}</span>
        </div>
        {member.phone && (
          <div className="flex items-center gap-1.5 text-ink-3 mt-1 truncate">
            <Phone className="h-3 w-3 text-ink-3 shrink-0" />
            <span className="truncate">{member.phone}</span>
          </div>
        )}
      </div>

      {/* Role */}
      <div>
        {roleEditable ? (
          <RolePicker
            value={member.role}
            disabled={changingRole}
            onChange={(role) => updateRole({ userId: member.userId, role })}
          />
        ) : (
          <Badge tone={member.role === 'admin' ? 'accent' : 'neutral'} variant="soft" uppercase>
            {roleLabel(member.role)}
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="md:text-right">
        {removable && (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Trash2 />}
            onClick={() => setRemoveOpen(true)}
          >
            Remove
          </Button>
        )}
      </div>

      {removable && (
        <Modal
          open={removeOpen}
          onClose={() => setRemoveOpen(false)}
          size="sm"
          title={`Remove ${member.name}?`}
          description="They'll lose access to this workspace immediately. You can re-invite them later with a fresh link."
          footer={
            <>
              <Button variant="ghost" onClick={() => setRemoveOpen(false)} disabled={removing}>
                Cancel
              </Button>
              <Button
                variant="danger"
                leftIcon={<AlertTriangle />}
                loading={removing}
                onClick={() =>
                  remove(member.userId, {
                    onSuccess: () => setRemoveOpen(false),
                  })
                }
              >
                Remove from team
              </Button>
            </>
          }
        >
          <div className="rounded-md bg-surface-muted border border-line px-3 py-2.5 text-[12.5px] text-ink-2">
            <div className="flex items-center gap-2">
              <Avatar name={member.name} size="sm" />
              <div className="min-w-0">
                <div className="font-serif text-[13.5px] font-semibold text-ink truncate">
                  {member.name}
                </div>
                <div className="text-[11.5px] text-ink-3 font-mono truncate">
                  {member.email}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* Lookup for a role's display name — live from the store, with a fallback. */
function roleLabel(roleId: TeamRole): string {
  const fromStore = useRolePolicyStore.getState().getRole(roleId);
  if (fromStore) return fromStore.name;
  if (isSystemRole(roleId)) return SYSTEM_ROLE_LABELS[roleId];
  return roleId;
}

/* Role picker — segmented pill when there are 2 roles, dropdown when more. */
function RolePicker({
  value,
  onChange,
  disabled,
}: {
  value: TeamRole;
  onChange: (role: TeamRole) => void;
  disabled?: boolean;
}) {
  const roles = useRolePolicyStore((s) => s.roles);
  const ordered = useMemo(
    () =>
      [...roles].sort((a, b) => {
        if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
        return a.createdAt.localeCompare(b.createdAt);
      }),
    [roles]
  );

  if (ordered.length <= 2) {
    return (
      <div
        className={cn(
          'inline-flex items-center p-0.5 rounded-md border border-line bg-bg-muted',
          disabled && 'opacity-60'
        )}
      >
        {ordered.map((r) => {
          const active = r.id === value;
          return (
            <button
              key={r.id}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && r.id !== value && onChange(r.id)}
              className={cn(
                'inline-flex items-center gap-1 h-7 px-3 rounded-sm text-[12px] font-semibold transition-colors',
                active ? 'bg-surface text-ink shadow-xs' : 'text-ink-3 hover:text-ink-2'
              )}
            >
              {r.name}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'appearance-none h-8 pl-3 pr-8 rounded-md border border-line bg-surface text-[12.5px] font-semibold text-ink cursor-pointer',
          'focus:outline-none focus:border-accent focus:shadow-ring',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        {ordered.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-3 text-[10px]">
        ▾
      </span>
    </div>
  );
}

/* ── Invite row ───────────────────────────────────────────── */

function InviteRow({
  invite,
  canManage,
}: {
  invite: import('../types').Invite;
  canManage: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const { mutate: revoke, isPending: revoking } = useRevokeInvite();
  const { mutate: resend, isPending: resending } = useResendInvite();

  const link = `${window.location.origin}/invite/${invite.token}`;
  const expired = new Date(invite.expiresAt).getTime() < Date.now();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy the join link:', link);
    }
  };

  return (
    <div className="px-5 py-4 flex items-center gap-4 flex-wrap md:flex-nowrap">
      <div className="h-10 w-10 rounded-full bg-bg-muted text-ink-3 grid place-items-center shrink-0">
        <Mail className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-serif text-[14.5px] font-semibold text-ink truncate">
            {invite.email}
          </span>
          <Badge tone={invite.role === 'admin' ? 'accent' : 'neutral'} variant="soft" uppercase>
            {roleLabel(invite.role)}
          </Badge>
          {expired ? (
            <Badge tone="warn" variant="soft" uppercase icon={<Clock />}>
              Expired
            </Badge>
          ) : (
            <Badge tone="info" variant="soft" uppercase>
              Pending
            </Badge>
          )}
        </div>
        <div className="text-[11.5px] text-ink-3 mt-0.5">
          Invited {fmtRelative(invite.createdAt)} by {invite.invitedByName ?? 'you'} · expires{' '}
          {fmtDate(invite.expiresAt, 'd MMM yyyy')}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant={copied ? 'primary' : 'secondary'}
          size="sm"
          leftIcon={copied ? <Check /> : <Link2 />}
          onClick={copy}
        >
          {copied ? 'Copied!' : 'Copy link'}
        </Button>
        {canManage && (
          <>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCcw />}
              loading={resending}
              onClick={() => resend(invite.id)}
              title={expired ? 'Issue a fresh link' : 'Issue a fresh link'}
            >
              Resend
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 />}
              loading={revoking}
              onClick={() => revoke(invite.id)}
            >
              Revoke
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Roles & permissions panel ───────────────────────────── */

function RolesPanel() {
  const canManage = useCan('team:manage');
  const roles = useRolePolicyStore((s) => s.roles);
  const resetToDefault = useRolePolicyStore((s) => s.resetToDefault);

  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<RoleDefinition | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const orderedRoles = useMemo(
    () =>
      [...roles].sort((a, b) => {
        if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
        return a.createdAt.localeCompare(b.createdAt);
      }),
    [roles]
  );

  const visibleRoles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orderedRoles;
    return orderedRoles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false) ||
        r.permissions.some((p) => p.includes(q))
    );
  }, [orderedRoles, query]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (r: RoleDefinition) => {
    setEditing(r);
    setFormOpen(true);
  };

  return (
    <>
      <Card>
        <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[1.4px] text-accent-ink">
            <ShieldCheck className="h-3.5 w-3.5" />
            Roles &amp; permissions
            <span className="text-ink-3 font-normal normal-case tracking-normal text-[11.5px] ml-1">
              · {roles.length} role{roles.length === 1 ? '' : 's'}
            </span>
          </div>
          {canManage && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resetToDefault()}
                title="Restore every role to factory defaults"
              >
                Reset to defaults
              </Button>
              <Button variant="primary" size="sm" leftIcon={<ShieldCheck />} onClick={openCreate}>
                Create role
              </Button>
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col gap-4">
          <p className="text-[12.5px] text-ink-2 leading-relaxed">
            Roles bundle permissions. Edit a role's permissions or create a custom one —
            changes apply instantly to every member with that role.
          </p>

          <Input
            placeholder="Search roles by name, id, or permission…"
            leftIcon={<Search />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            wrapperClassName="max-w-[440px]"
          />

          {visibleRoles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line bg-surface-muted px-4 py-8 text-center text-[12.5px] text-ink-3 italic">
              No roles match <b className="not-italic text-ink-2">"{query}"</b>.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibleRoles.map((r) => (
                <RoleCard
                  key={r.id}
                  role={r}
                  canManage={canManage}
                  onEdit={() => openEdit(r)}
                />
              ))}
            </div>
          )}

          {!canManage && (
            <div className="rounded-md bg-bg-muted border border-line text-[11.5px] text-ink-3 px-3 py-2 inline-flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Only an admin can create or edit roles.
            </div>
          )}
        </div>
      </Card>

      <RoleFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        role={editing}
      />
    </>
  );
}

/* ── Role card used in the Roles tab ────────────────────── */
function RoleCard({
  role,
  canManage,
  onEdit,
}: {
  role: RoleDefinition;
  canManage: boolean;
  onEdit: () => void;
}) {
  const isAdmin = role.id === 'admin';
  return (
    <button
      type="button"
      disabled={!canManage}
      onClick={() => canManage && onEdit()}
      className={cn(
        'text-left rounded-lg border border-line bg-surface p-4 flex flex-col gap-2 transition-colors',
        canManage ? 'hover:border-line-strong hover:bg-bg-muted cursor-pointer' : 'cursor-default'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-serif text-[16px] font-semibold text-ink">
              {role.name}
            </div>
            {role.isSystem ? (
              <Badge tone="neutral" variant="soft" uppercase>
                System
              </Badge>
            ) : (
              <Badge tone="accent" variant="soft" uppercase>
                Custom
              </Badge>
            )}
            {isAdmin && (
              <Badge tone="accent" variant="soft" uppercase icon={<Crown />}>
                Owner
              </Badge>
            )}
          </div>
          <div className="text-[10.5px] text-ink-3 font-mono mt-0.5">{role.id}</div>
        </div>
        <span className="text-[10.5px] text-ink-3 font-mono shrink-0">
          {role.permissions.length} perms
        </span>
      </div>
      {role.description && (
        <p className="text-[12px] text-ink-2 leading-relaxed">{role.description}</p>
      )}
      {canManage && (
        <div className="text-[11px] text-accent-ink font-semibold mt-1">
          {isAdmin ? 'View permissions →' : role.isSystem ? 'Edit permissions →' : 'Edit role →'}
        </div>
      )}
    </button>
  );
}
