import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building2, Plus, Trash2 } from 'lucide-react';
import { StepHeader } from './StepHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../stores/authStore';
import { useSaveOnboardingChambers } from '../../queries/hooks';
import type { ChamberDraft } from '../../services';

const blank = (): ChamberDraft => ({
  name: '',
  address: '',
  phone: '',
  days: [],
  time: '',
});

export function OnboardingChambers() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const save = useSaveOnboardingChambers();

  const [chambers, setChambers] = useState<ChamberDraft[]>([blank()]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.chambers && user.chambers.length > 0) {
      setChambers(
        user.chambers.map((c) => ({
          id: c.id,
          name: c.name,
          address: c.address,
          phone: c.phone ?? '',
          days: c.days ?? [],
          time: c.time ?? '',
        }))
      );
    }
  }, [user]);

  const update = (idx: number, patch: Partial<ChamberDraft>) =>
    setChambers((cs) => cs.map((c, i) => (i === idx ? { ...c, ...patch } : c)));

  const remove = (idx: number) =>
    setChambers((cs) => cs.filter((_, i) => i !== idx));

  const submit = async () => {
    setError(null);
    const cleaned = chambers
      .map((c) => ({ ...c, name: c.name.trim(), address: c.address.trim() }))
      .filter((c) => c.name && c.address);
    if (cleaned.length === 0) {
      return setError('Add at least one chamber with a name and address.');
    }
    try {
      await save.mutateAsync({ chambers: cleaned });
      navigate('/onboarding/availability');
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Could not save your chambers.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <StepHeader
        eyebrow="Step 2 of 6"
        title="Where do you see patients?"
        description="Add each clinic, hospital OPD, or chamber where you consult. We'll use these on prescriptions and to limit appointment booking to the right place."
      />

      <div className="flex flex-col gap-4">
        {chambers.map((c, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-line bg-surface p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-ink">
                <span className="h-7 w-7 rounded-md bg-accent-softer text-accent-ink grid place-items-center">
                  <Building2 className="h-3.5 w-3.5" />
                </span>
                Chamber {idx + 1}
              </div>
              {chambers.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-danger hover:underline"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Name"
                value={c.name}
                onChange={(e) => update(idx, { name: e.target.value })}
                placeholder="e.g. Popular Diagnostic — Dhanmondi"
              />
              <Input
                label="Phone"
                value={c.phone ?? ''}
                onChange={(e) => update(idx, { phone: e.target.value })}
              />
              <Input
                label="Address"
                value={c.address}
                onChange={(e) => update(idx, { address: e.target.value })}
                wrapperClassName="sm:col-span-2"
              />
            </div>
            <p className="text-[11px] text-ink-3 mt-1">
              You'll set day &amp; time slots in the next step.
            </p>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setChambers((cs) => [...cs, blank()])}
          className="rounded-lg border-2 border-dashed border-line bg-surface px-4 py-3 inline-flex items-center justify-center gap-2 text-[12.5px] font-semibold text-ink-2 hover:border-line-strong hover:bg-bg-muted"
        >
          <Plus className="h-3.5 w-3.5" />
          Add another chamber
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-danger-soft border border-danger/30 text-danger text-[12.5px] px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-line">
        <Button variant="ghost" leftIcon={<ArrowLeft />} onClick={() => navigate('/onboarding/profile')}>
          Back
        </Button>
        <Button variant="primary" rightIcon={<ArrowRight />} loading={save.isPending} onClick={submit}>
          Save &amp; continue
        </Button>
      </div>
    </div>
  );
}
