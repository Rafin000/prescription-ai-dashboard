import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { StepHeader } from './StepHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { useAuthStore } from '../../stores/authStore';
import {
  useSaveOnboardingPreferences,
  useSkipOnboardingStep,
} from '../../queries/hooks';
import { cn } from '../../lib/cn';
import type { DoctorPreferences } from '../../types';

const LANGS: Array<{ id: NonNullable<DoctorPreferences['rxLanguage']>; label: string; hint: string }> = [
  { id: 'bn', label: 'বাংলা', hint: 'Print + transcribe in Bangla.' },
  { id: 'en', label: 'English', hint: 'Print + transcribe in English.' },
  { id: 'bilingual', label: 'Bilingual', hint: 'BN headings, EN body — best of both.' },
];

export function OnboardingPreferences() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const save = useSaveOnboardingPreferences();
  const skip = useSkipOnboardingStep();

  const [lang, setLang] = useState<DoctorPreferences['rxLanguage']>('bilingual');
  const [duration, setDuration] = useState('20');
  const [footer, setFooter] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = user?.preferences;
    if (p) {
      setLang(p.rxLanguage ?? 'bilingual');
      setDuration(String(p.defaultAppointmentMinutes ?? 20));
      setFooter(p.rxFooter ?? '');
    }
  }, [user]);

  const submit = async () => {
    setError(null);
    try {
      await save.mutateAsync({
        preferences: {
          rxLanguage: lang,
          defaultAppointmentMinutes: Number(duration) || 20,
          rxFooter: footer.trim() || undefined,
        },
      });
      navigate('/onboarding/team');
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Could not save preferences.');
    }
  };

  const handleSkip = async () => {
    await skip.mutateAsync('preferences');
    navigate('/onboarding/team');
  };

  return (
    <div className="flex flex-col gap-6">
      <StepHeader
        eyebrow="Step 4 of 6 · Optional"
        title="Pick your defaults"
        description="These shape the live consult, prescription pad, and appointment booking. You can change everything later from Settings."
      />

      <div>
        <div className="text-[11px] font-semibold text-ink-2 mb-1.5">
          Default Rx language
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {LANGS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setLang(opt.id)}
              className={cn(
                'text-left p-3 rounded-lg border transition-colors',
                lang === opt.id
                  ? 'border-accent bg-accent-softer'
                  : 'border-line bg-surface hover:border-line-strong hover:bg-bg-muted'
              )}
            >
              <div
                className={cn(
                  'font-serif text-[15px] font-semibold',
                  lang === opt.id ? 'text-accent-ink' : 'text-ink'
                )}
              >
                {opt.label}
              </div>
              <div className="text-[11.5px] text-ink-2 mt-1">{opt.hint}</div>
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Default appointment length (minutes)"
        type="number"
        min={5}
        max={120}
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        wrapperClassName="max-w-[260px]"
      />

      <Textarea
        label="Footer printed on every Rx (optional)"
        value={footer}
        onChange={(e) => setFooter(e.target.value)}
        placeholder="e.g. Emergency: +880 1711-000 001 · Reports to dr.ashraful@…"
        rows={2}
      />

      {error && (
        <div className="rounded-md bg-danger-soft border border-danger/30 text-danger text-[12.5px] px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-line">
        <Button variant="ghost" leftIcon={<ArrowLeft />} onClick={() => navigate('/onboarding/availability')}>
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" loading={skip.isPending} onClick={handleSkip}>
            Skip for now
          </Button>
          <Button variant="primary" rightIcon={<ArrowRight />} loading={save.isPending} onClick={submit}>
            Save &amp; continue
          </Button>
        </div>
      </div>
    </div>
  );
}
