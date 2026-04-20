import { useEffect, useMemo, useState } from 'react';
import { AtSign, Check, ShieldCheck, UserPlus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { type TeamRole } from '../../lib/permissions';
import { useRolePolicyStore } from '../../stores/rolePolicyStore';
import { useInviteMember } from '../../queries/hooks';
import { cn } from '../../lib/cn';

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  onInvited?: (joinLink: string) => void;
}

export function InviteMemberModal({ open, onClose, onInvited }: InviteMemberModalProps) {
  const rawRoles = useRolePolicyStore((s) => s.roles);
  const roles = useMemo(
    () =>
      [...rawRoles].sort((a, b) => {
        if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
        return a.createdAt.localeCompare(b.createdAt);
      }),
    [rawRoles]
  );
  // Prefer `assistant` as the default if it exists, else first non-admin, else admin.
  const defaultRole: TeamRole =
    roles.find((r) => r.id === 'assistant')?.id ?? roles.find((r) => r.id !== 'admin')?.id ?? roles[0]?.id ?? 'assistant';

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>(defaultRole);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { mutate: invite, isPending } = useInviteMember();

  // Reset whenever the modal reopens.
  useEffect(() => {
    if (!open) return;
    setEmail('');
    setRole(defaultRole);
    setMessage('');
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = () => {
    setError(null);
    if (!email.trim()) {
      setError('Please enter an email.');
      return;
    }
    invite(
      { email: email.trim(), role, message: message.trim() || undefined },
      {
        onSuccess: (inv) => {
          const link = `${window.location.origin}/invite/${inv.token}`;
          onInvited?.(link);
          onClose();
        },
        onError: (err: { message?: string }) => {
          setError(err?.message ?? 'Could not send the invite. Please try again.');
        },
      }
    );
  };

  const rolePermissions = roles.find((r) => r.id === role)?.permissions.length ?? 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Invite someone to your team"
      description="They'll get a one-click link. No account required upfront — they pick their name and a password to join your workspace."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            leftIcon={<UserPlus />}
            onClick={submit}
            loading={isPending}
            disabled={!email.trim()}
          >
            Send invite
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<AtSign />}
          placeholder="samira@yourclinic.bd"
          inputSize="lg"
          autoFocus
        />

        <div>
          <div className="text-[11px] font-semibold text-ink-2 mb-1.5">Role</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
            {roles.map((r) => {
              const selected = r.id === role;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={cn(
                    'text-left p-3 rounded-lg border transition-colors',
                    selected
                      ? 'border-accent bg-accent-softer shadow-xs'
                      : 'border-line bg-surface hover:border-line-strong hover:bg-bg-muted'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'font-serif text-[14px] font-semibold',
                        selected ? 'text-accent-ink' : 'text-ink'
                      )}
                    >
                      {r.name}
                    </span>
                    <span
                      className={cn(
                        'h-4 w-4 rounded-full border-2 grid place-items-center',
                        selected ? 'border-accent' : 'border-line-strong'
                      )}
                    >
                      {selected && <span className="h-2 w-2 rounded-full bg-accent" />}
                    </span>
                  </div>
                  {r.description && (
                    <p className="text-[12px] text-ink-2 mt-1 leading-relaxed">
                      {r.description}
                    </p>
                  )}
                  <div className="mt-1.5 text-[10.5px] text-ink-3 font-mono">
                    {r.permissions.length} permissions · {r.isSystem ? 'System' : 'Custom'}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-3">
            <ShieldCheck className="h-3 w-3" />
            {rolePermissions} permissions granted for this role
          </div>
        </div>

        <div>
          <div className="text-[11px] font-semibold text-ink-2 mb-1.5">
            Personal note <span className="text-ink-3 font-normal">(optional)</span>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hey Samira — come join the clinic workspace…"
            rows={2}
            className="w-full px-3 py-2 rounded-md border border-line bg-surface text-[13px] text-ink outline-none focus:border-accent focus:shadow-ring placeholder:text-ink-3 resize-y min-h-[60px]"
          />
        </div>

        {error && (
          <div className="rounded-md bg-danger-soft border border-danger/30 text-danger text-[12.5px] px-3 py-2">
            {error}
          </div>
        )}

        <div className="rounded-md bg-surface-muted border border-line px-3 py-2.5 text-[11.5px] text-ink-3 inline-flex items-start gap-2">
          <Check className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
          <span>
            We'll email the link and copy it to your clipboard so you can share it on
            WhatsApp or SMS too. Invites expire in 7 days.
          </span>
        </div>
      </div>
    </Modal>
  );
}
