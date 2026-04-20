import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus, Trash2, Users2 } from 'lucide-react';
import { StepHeader } from './StepHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  useInviteMember,
  useSkipOnboardingStep,
  useTeamInvites,
} from '../../queries/hooks';
import type { TeamRole } from '../../lib/permissions';

interface DraftInvite {
  email: string;
  role: TeamRole;
}

const ROLES: Array<{ id: TeamRole; label: string }> = [
  { id: 'admin', label: 'Admin' },
  { id: 'assistant', label: 'Assistant' },
];

export function OnboardingTeam() {
  const navigate = useNavigate();
  const skip = useSkipOnboardingStep();
  const invite = useInviteMember();
  const { data: invites = [] } = useTeamInvites();

  const [drafts, setDrafts] = useState<DraftInvite[]>([{ email: '', role: 'assistant' }]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    const cleaned = drafts.filter((d) => d.email.trim().length > 0);
    if (cleaned.length === 0) {
      // Nothing entered → just skip.
      await skip.mutateAsync('team');
      navigate('/onboarding/payment');
      return;
    }
    setBusy(true);
    try {
      for (const d of cleaned) {
        await invite.mutateAsync({ email: d.email.trim(), role: d.role });
      }
      await skip.mutateAsync('team');
      navigate('/onboarding/payment');
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Could not send invites.');
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = async () => {
    await skip.mutateAsync('team');
    navigate('/onboarding/payment');
  };

  return (
    <div className="flex flex-col gap-6">
      <StepHeader
        eyebrow="Step 5 of 6 · Optional"
        title="Bring your team"
        description="Invite an assistant to triage uploads or manage your appointment book. They'll get an email with a one-click join link."
      />

      <div className="rounded-lg border border-line bg-surface p-4 flex flex-col gap-3">
        <div className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-ink">
          <span className="h-7 w-7 rounded-md bg-accent-softer text-accent-ink grid place-items-center">
            <Users2 className="h-3.5 w-3.5" />
          </span>
          Invite by email
        </div>

        {drafts.map((d, i) => (
          <div key={i} className="grid grid-cols-[1fr_180px_auto] gap-2 items-end">
            <Input
              label={i === 0 ? 'Email' : undefined}
              type="email"
              value={d.email}
              onChange={(e) =>
                setDrafts((cur) => cur.map((x, idx) => (idx === i ? { ...x, email: e.target.value } : x)))
              }
              placeholder="teammate@example.com"
            />
            <Select
              label={i === 0 ? 'Role' : undefined}
              value={d.role}
              onChange={(e) =>
                setDrafts((cur) =>
                  cur.map((x, idx) => (idx === i ? { ...x, role: e.target.value as TeamRole } : x))
                )
              }
              options={ROLES.map((r) => ({ value: r.id, label: r.label }))}
            />
            {drafts.length > 1 && (
              <button
                type="button"
                onClick={() => setDrafts((cur) => cur.filter((_, idx) => idx !== i))}
                className="h-9 px-2 rounded-md text-ink-3 hover:text-danger hover:bg-danger-soft"
                aria-label="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={() => setDrafts((cur) => [...cur, { email: '', role: 'assistant' }])}
          className="self-start inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent-ink hover:underline"
        >
          <Plus className="h-3 w-3" />
          Add another
        </button>
      </div>

      {invites.length > 0 && (
        <div className="text-[11.5px] text-ink-3">
          Already pending: {invites.filter((i) => i.status === 'pending').length} invite(s).
        </div>
      )}

      {error && (
        <div className="rounded-md bg-danger-soft border border-danger/30 text-danger text-[12.5px] px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-line">
        <Button variant="ghost" leftIcon={<ArrowLeft />} onClick={() => navigate('/onboarding/preferences')}>
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" loading={skip.isPending} onClick={handleSkip}>
            Skip for now
          </Button>
          <Button variant="primary" rightIcon={<ArrowRight />} loading={busy} onClick={submit}>
            Send invites &amp; continue
          </Button>
        </div>
      </div>
    </div>
  );
}
