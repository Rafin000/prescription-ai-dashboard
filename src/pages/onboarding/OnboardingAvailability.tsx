import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus, Trash2, Video } from 'lucide-react';
import { StepHeader } from './StepHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../stores/authStore';
import {
  useDoctorAvailability,
  useSaveOnboardingAvailability,
} from '../../queries/hooks';
import type { Availability, AvailabilitySlot, Chamber } from '../../types';
import { cn } from '../../lib/cn';

const WEEKDAYS = [
  { id: 0, label: 'Sun' },
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
];

const blankSlot = (): AvailabilitySlot => ({ weekday: 1, start: '18:00', end: '21:00' });

export function OnboardingAvailability() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: existing } = useDoctorAvailability();
  const save = useSaveOnboardingAvailability();
  const chambers = user?.chambers ?? [];

  const [inPerson, setInPerson] = useState<Record<string, AvailabilitySlot[]>>({});
  const [video, setVideo] = useState<AvailabilitySlot[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setInPerson(existing.inPerson ?? {});
      setVideo(existing.video ?? []);
    }
  }, [existing]);

  // Make sure every chamber has an entry, even if empty.
  useEffect(() => {
    setInPerson((cur) => {
      const next = { ...cur };
      chambers.forEach((c) => {
        if (!next[c.id]) next[c.id] = [];
      });
      return next;
    });
  }, [chambers]);

  const totalInPerson = useMemo(
    () => Object.values(inPerson).reduce((n, arr) => n + arr.length, 0),
    [inPerson]
  );

  const submit = async () => {
    setError(null);
    if (totalInPerson === 0 && video.length === 0) {
      return setError(
        'Add at least one slot — in-person or video — so patients have something to book.'
      );
    }
    const cleaned: Availability = {
      inPerson: Object.fromEntries(
        Object.entries(inPerson).map(([k, arr]) => [k, arr.filter((s) => s.start < s.end)])
      ),
      video: video.filter((s) => s.start < s.end),
    };
    try {
      await save.mutateAsync({ availability: cleaned });
      navigate('/onboarding/preferences');
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Could not save availability.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <StepHeader
        eyebrow="Step 3 of 6"
        title="When are you available?"
        description="Set the weekly hours you'll be at each chamber for in-person consults, plus separate slots reserved for video calls. Patients (and your assistants) can only book inside these windows."
      />

      <section className="flex flex-col gap-5">
        <div>
          <h2 className="font-serif text-[18px] font-semibold text-ink">In-person hours</h2>
          <p className="text-[12px] text-ink-3 mt-1">Per chamber. Add a row for each block.</p>
        </div>

        {chambers.length === 0 && (
          <div className="rounded-md bg-warn-soft border border-warn/30 text-warn text-[12.5px] px-3 py-2">
            You don't have any chambers yet. Go back and add one first.
          </div>
        )}

        {chambers.map((c: Chamber) => (
          <SlotEditor
            key={c.id}
            heading={c.name}
            subheading={c.address}
            slots={inPerson[c.id] ?? []}
            onChange={(next) => setInPerson((cur) => ({ ...cur, [c.id]: next }))}
          />
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-md bg-accent text-white grid place-items-center">
            <Video className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-serif text-[18px] font-semibold text-ink leading-tight">
              Video-call slots
            </h2>
            <p className="text-[12px] text-ink-3">
              Reserved for tele appointments — independent of any chamber.
            </p>
          </div>
        </div>
        <SlotEditor slots={video} onChange={setVideo} videoTone />
      </section>

      {error && (
        <div className="rounded-md bg-danger-soft border border-danger/30 text-danger text-[12.5px] px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-line">
        <Button variant="ghost" leftIcon={<ArrowLeft />} onClick={() => navigate('/onboarding/chambers')}>
          Back
        </Button>
        <Button variant="primary" rightIcon={<ArrowRight />} loading={save.isPending} onClick={submit}>
          Save &amp; continue
        </Button>
      </div>
    </div>
  );
}

function SlotEditor({
  heading,
  subheading,
  slots,
  onChange,
  videoTone,
}: {
  heading?: string;
  subheading?: string;
  slots: AvailabilitySlot[];
  onChange: (next: AvailabilitySlot[]) => void;
  videoTone?: boolean;
}) {
  const update = (i: number, patch: Partial<AvailabilitySlot>) =>
    onChange(slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => onChange(slots.filter((_, idx) => idx !== i));

  return (
    <div
      className={cn(
        'rounded-lg border bg-surface p-4 flex flex-col gap-3',
        videoTone ? 'border-accent/30 bg-accent-softer/30' : 'border-line'
      )}
    >
      {heading && (
        <div>
          <div className="font-serif text-[14.5px] font-semibold text-ink">{heading}</div>
          {subheading && (
            <div className="text-[11.5px] text-ink-3 mt-0.5">{subheading}</div>
          )}
        </div>
      )}

      {slots.length === 0 && (
        <div className="text-[12px] text-ink-3 italic">
          No slots yet — add one below.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {slots.map((s, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_120px_120px_auto] gap-2 items-end"
          >
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-[1.2px] text-ink-3 mb-1">
                Day
              </div>
              <div className="flex flex-wrap gap-1">
                {WEEKDAYS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => update(i, { weekday: d.id })}
                    className={cn(
                      'h-7 px-2 rounded-md text-[11px] font-semibold border transition-colors',
                      s.weekday === d.id
                        ? 'bg-accent text-white border-accent'
                        : 'bg-surface text-ink-2 border-line hover:border-line-strong'
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="Start"
              type="time"
              value={s.start}
              onChange={(e) => update(i, { start: e.target.value })}
            />
            <Input
              label="End"
              type="time"
              value={s.end}
              onChange={(e) => update(i, { end: e.target.value })}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="h-9 px-2 rounded-md text-ink-3 hover:text-danger hover:bg-danger-soft inline-flex items-center justify-center"
              aria-label="Remove slot"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange([...slots, blankSlot()])}
        className="self-start inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent-ink hover:underline"
      >
        <Plus className="h-3 w-3" />
        Add a slot
      </button>
    </div>
  );
}
