import { useEffect, useMemo, useState } from 'react';
import { Check, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../../lib/cn';
import {
  PERMISSION_GROUPS,
  type Permission,
} from '../../lib/permissions';
import {
  useRolePolicyStore,
  type RoleDefinition,
} from '../../stores/rolePolicyStore';

interface RoleFormModalProps {
  open: boolean;
  onClose: () => void;
  /** When provided, the modal is in edit mode for that role. */
  role?: RoleDefinition | null;
  /** Optional callback when a role is saved. */
  onSaved?: (role: RoleDefinition) => void;
}

export function RoleFormModal({ open, onClose, role, onSaved }: RoleFormModalProps) {
  const isEdit = !!role;
  const createRole = useRolePolicyStore((s) => s.createRole);
  const updateRole = useRolePolicyStore((s) => s.updateRole);
  const deleteRole = useRolePolicyStore((s) => s.deleteRole);
  const getRole = useRolePolicyStore((s) => s.getRole);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [perms, setPerms] = useState<Set<Permission>>(new Set());
  const [query, setQuery] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate whenever the modal opens / switches role.
  useEffect(() => {
    if (!open) return;
    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setPerms(new Set(role?.permissions ?? []));
    setQuery('');
    setConfirmingDelete(false);
    setError(null);
  }, [open, role?.id]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PERMISSION_GROUPS;
    return PERMISSION_GROUPS
      .map((g) => {
        const items = g.items.filter(
          (it) =>
            g.label.toLowerCase().includes(q) ||
            it.label.toLowerCase().includes(q) ||
            it.permission.toLowerCase().includes(q)
        );
        return items.length > 0 ? { ...g, items } : null;
      })
      .filter(Boolean) as typeof PERMISSION_GROUPS;
  }, [query]);

  const togglePerm = (p: Permission) => {
    setPerms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const toggleGroup = (groupPerms: Permission[], turnOn: boolean) => {
    setPerms((prev) => {
      const next = new Set(prev);
      groupPerms.forEach((p) => (turnOn ? next.add(p) : next.delete(p)));
      return next;
    });
  };

  const canEditName = !role?.isSystem;
  const isAdmin = role?.id === 'admin';

  const submit = () => {
    setError(null);
    const nameTrimmed = name.trim();
    if (canEditName && !nameTrimmed) {
      setError('Please enter a role name.');
      return;
    }
    if (perms.size === 0 && !isAdmin) {
      setError('A role needs at least one permission.');
      return;
    }
    const permissions = Array.from(perms);
    if (isEdit && role) {
      updateRole(role.id, {
        name: canEditName ? nameTrimmed : undefined,
        description,
        permissions,
      });
      const saved = getRole(role.id);
      if (saved) onSaved?.(saved);
    } else {
      const created = createRole({
        name: nameTrimmed,
        description: description.trim() || undefined,
        permissions,
      });
      onSaved?.(created);
    }
    onClose();
  };

  const handleDelete = () => {
    if (!role || role.isSystem) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    deleteRole(role.id);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? (role?.isSystem ? `${role.name} permissions` : `Edit role · ${role!.name}`) : 'Create a custom role'}
      description={
        isAdmin
          ? 'Admins hold every permission in the workspace — that can\'t be changed.'
          : isEdit
          ? 'Tailor what members with this role are allowed to do.'
          : 'Pick a clear name and tick the permissions you want this role to have.'
      }
      footer={
        <>
          {isEdit && !role?.isSystem && (
            <Button
              variant={confirmingDelete ? 'danger' : 'ghost'}
              leftIcon={<Trash2 />}
              onClick={handleDelete}
            >
              {confirmingDelete ? 'Yes, delete role' : 'Delete role'}
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            leftIcon={isEdit ? <Check /> : <ShieldCheck />}
            onClick={submit}
            disabled={isAdmin}
          >
            {isEdit ? 'Save changes' : 'Create role'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Receptionist, Pharmacy tech"
            disabled={!canEditName}
            hint={!canEditName ? 'System roles keep their built-in name.' : undefined}
          />
          <Input
            label="Short description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this role is responsible for"
          />
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap border-t border-line pt-4">
          <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.4px] text-accent-ink">
            <ShieldCheck className="h-3.5 w-3.5" />
            Permissions
            <span className="text-ink-3 font-normal normal-case tracking-normal text-[11.5px] ml-1">
              · {perms.size} of {PERMISSION_GROUPS.reduce((n, g) => n + g.items.length, 0)} selected
            </span>
          </div>
          <Input
            placeholder="Search permissions…"
            leftIcon={<Search />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            wrapperClassName="flex-1 min-w-[220px] max-w-[360px]"
          />
        </div>

        <div className="rounded-lg border border-line overflow-hidden">
          {filteredGroups.length === 0 ? (
            <div className="px-4 py-6 text-center text-[12.5px] text-ink-3 italic">
              No permissions match <b className="not-italic text-ink-2">"{query}"</b>.
            </div>
          ) : (
            filteredGroups.map((group) => {
              const groupPerms = group.items.map((i) => i.permission);
              const allOn = groupPerms.every((p) => perms.has(p));
              const someOn = groupPerms.some((p) => perms.has(p));
              return (
                <div key={group.feature} className="border-b border-line last:border-b-0">
                  <div className="flex items-center justify-between gap-3 px-4 py-2 bg-surface-muted">
                    <div className="text-[10.5px] font-bold uppercase tracking-[1.2px] text-ink-2">
                      {group.label}
                    </div>
                    <button
                      type="button"
                      disabled={isAdmin}
                      onClick={() => toggleGroup(groupPerms, !allOn)}
                      className={cn(
                        'text-[11px] font-semibold transition-colors',
                        isAdmin ? 'text-ink-4 cursor-not-allowed' : 'text-accent-ink hover:underline'
                      )}
                    >
                      {allOn ? 'Clear all' : someOn ? 'Select all' : 'Select all'}
                    </button>
                  </div>
                  <div className="divide-y divide-line">
                    {group.items.map((item) => {
                      const on = perms.has(item.permission);
                      return (
                        <label
                          key={item.permission}
                          className={cn(
                            'flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none transition-colors',
                            isAdmin ? 'cursor-not-allowed opacity-70' : 'hover:bg-bg-muted'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={isAdmin}
                            onChange={() => togglePerm(item.permission)}
                            className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] text-ink truncate">
                              {item.label}
                            </div>
                            <div className="text-[10.5px] text-ink-3 font-mono truncate">
                              {item.permission}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {error && (
          <div className="rounded-md bg-danger-soft border border-danger/30 text-danger text-[12.5px] px-3 py-2">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
