import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import {
  SYSTEM_ROLE_LABELS,
  isSystemRole,
} from '../../lib/permissions';
import { useRolePolicyStore } from '../../stores/rolePolicyStore';

const STORAGE_KEY_PREFIX = 'pai.team.welcome.dismissed.';

/**
 * One-shot welcome shown to invited team members the first time they
 * land in the workspace. Owners never see it. Dismissal is persisted
 * per-user so it never reappears for that account.
 */
export function MemberWelcomeBanner() {
  const user = useAuthStore((s) => s.user);
  const roles = useRolePolicyStore((s) => s.roles);

  const dismissedKey = user ? `${STORAGE_KEY_PREFIX}${user.id}` : null;
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined' || !dismissedKey) return false;
    return window.localStorage.getItem(dismissedKey) === '1';
  });

  if (!user || user.isOwner !== false || dismissed) return null;

  const customRole = roles.find((r) => r.id === user.role);
  const roleLabel =
    customRole?.name ??
    (isSystemRole(user.role) ? SYSTEM_ROLE_LABELS[user.role] : user.role);

  const close = () => {
    setDismissed(true);
    if (dismissedKey) window.localStorage.setItem(dismissedKey, '1');
  };

  return (
    <div className="rounded-xl border border-accent/30 bg-accent-softer/60 px-4 py-3 flex items-start gap-3">
      <span className="h-9 w-9 rounded-md bg-accent text-white grid place-items-center shrink-0">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-serif text-[15px] font-semibold text-ink">
          Welcome, {user.name?.split(' ')[0] ?? 'there'}.
        </div>
        <p className="text-[12.5px] text-ink-2 mt-1 leading-relaxed">
          You're in as <b>{roleLabel}</b>. Your sidebar only shows the
          tools you can use — patients, appointments, lab inbox, and the
          consult surface where applicable. Permissions changes show up
          live; ping the doctor if anything looks blocked that shouldn't be.
        </p>
      </div>
      <button
        type="button"
        onClick={close}
        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-bg-muted transition-colors"
        aria-label="Dismiss welcome"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
