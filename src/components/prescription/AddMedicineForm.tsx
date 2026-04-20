import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { RxMedicine } from '../../types';

interface AddMedicineFormProps {
  open: boolean;
  onClose: () => void;
  onAdd: (med: RxMedicine) => void;
  initial?: Partial<RxMedicine>;
  title?: string;
  submitLabel?: string;
}

type MedForm =
  | 'Tab'
  | 'Cap'
  | 'Syrup'
  | 'Inj'
  | 'Susp'
  | 'Drop'
  | 'Cream'
  | 'Supp'
  | 'Saline'
  | 'Inhaler';

const FORMS: MedForm[] = [
  'Tab',
  'Cap',
  'Syrup',
  'Inj',
  'Susp',
  'Drop',
  'Cream',
  'Supp',
  'Saline',
  'Inhaler',
];

const DURATIONS = ['3', '5', '7', '10', '14', '30'];

const MEALS = ['Before meal', 'After meal', 'Empty stomach', 'With water'];

const SLOT_LABELS = ['Morning', 'Noon', 'Evening', 'Night'] as const;

function parseDose(d: string): [number, number, number, number] {
  const parts = d.split('+').map((p) => Number(p) || 0);
  return [
    parts[0] ?? 1,
    parts[1] ?? 0,
    parts[2] ?? 1,
    parts[3] ?? 0,
  ];
}
function parseDays(duration?: string): string {
  if (!duration) return '5';
  const m = duration.match(/^(\d+)/);
  return m ? m[1] : '5';
}

export function AddMedicineForm({
  open,
  onClose,
  onAdd,
  initial,
  title = 'New medicine',
  submitLabel = 'Add to prescription',
}: AddMedicineFormProps) {
  const [name, setName] = useState(initial?.brand ?? '');
  const [form, setForm] = useState<MedForm>((initial?.generic as MedForm) ?? 'Tab');
  const [strength, setStrength] = useState(initial?.strength ?? '');
  const [pattern, setPattern] = useState<[number, number, number, number]>(
    parseDose(initial?.dose ?? '1+0+1')
  );
  const [days, setDays] = useState(parseDays(initial?.duration));
  const [meal, setMeal] = useState(initial?.instruction ?? 'After meal');
  const [note, setNote] = useState(initial?.note ?? '');

  // Reset all fields whenever the modal opens — otherwise state from the
  // previous session (e.g. an earlier "edit medicine") leaks into the next.
  useEffect(() => {
    if (!open) return;
    setName(initial?.brand ?? '');
    setForm((initial?.generic as MedForm) ?? 'Tab');
    setStrength(initial?.strength ?? '');
    setPattern(parseDose(initial?.dose ?? '1+0+1'));
    setDays(parseDays(initial?.duration));
    setMeal(initial?.instruction ?? 'After meal');
    setNote(initial?.note ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  const cycle = (idx: number) => {
    setPattern((p) => {
      const next = [...p] as typeof p;
      next[idx] = ((p[idx] + 1) % 3) as 0 | 1 | 2;
      return next;
    });
  };

  const doseStr = pattern[3] ? pattern.join('+') : pattern.slice(0, 3).join('+');
  const canSubmit = !!name.trim();

  const submit = () => {
    if (!canSubmit) return;
    onAdd({
      id: initial?.id ?? `new-${Date.now()}`,
      brand: name.trim(),
      generic: form,
      strength: strength.trim() || undefined,
      dose: doseStr,
      duration: `${days || 1} day${days === '1' ? '' : 's'}`,
      instruction: meal,
      note: note.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description="Set the dose, duration, and any comment you want printed under the medicine."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus />}
            disabled={!canSubmit}
            onClick={submit}
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Name */}
        <FieldRow label="Name">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit) submit();
              if (e.key === 'Escape') onClose();
            }}
            placeholder="e.g. Napa, Seclo, Azithrocin"
            className="w-full h-9 px-3 rounded-md border border-line bg-surface text-[13px] text-ink outline-none focus:border-accent focus:shadow-ring placeholder:text-ink-3"
          />
        </FieldRow>

        {/* Form */}
        <FieldRow label="Form">
          <div className="flex flex-wrap gap-1.5">
            {FORMS.map((f) => (
              <Chip key={f} active={form === f} onClick={() => setForm(f)}>
                {f}
              </Chip>
            ))}
          </div>
        </FieldRow>

        {/* Strength */}
        <FieldRow label="Strength (optional)">
          <input
            value={strength}
            onChange={(e) => setStrength(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit) submit();
            }}
            placeholder="500mg · 20mg · 5ml"
            className="w-full h-9 px-3 rounded-md border border-line bg-surface text-[13px] text-ink outline-none focus:border-accent focus:shadow-ring placeholder:text-ink-3"
          />
        </FieldRow>

        {/* When to take */}
        <FieldRow label="When to take">
          <div className="grid grid-cols-4 gap-1">
            {SLOT_LABELS.map((label, i) => {
              const on = pattern[i] > 0;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => cycle(i)}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 h-8 rounded-md border transition-colors',
                    on
                      ? 'border-accent bg-accent-soft'
                      : 'border-line bg-surface hover:bg-bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'font-serif font-semibold text-[14px] leading-none',
                      on ? 'text-accent-ink' : 'text-ink-3'
                    )}
                  >
                    {pattern[i]}
                  </span>
                  <span
                    className={cn(
                      'text-[9.5px] font-bold uppercase tracking-[0.8px]',
                      on ? 'text-accent-ink' : 'text-ink-3'
                    )}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-1.5 flex items-center gap-2 px-2">
            <span className="font-serif font-semibold text-[13px] text-accent-ink">
              {doseStr}
            </span>
            <span className="text-[10.5px] text-ink-3">
              tap each slot to cycle 0 → 1 → 2
            </span>
          </div>
        </FieldRow>

        {/* Duration + Take with */}
        <div className="grid grid-cols-2 gap-4">
          <FieldRow label="Duration (days)">
            <div className="flex flex-wrap gap-1.5 items-center">
              {DURATIONS.map((d) => (
                <Chip
                  key={d}
                  active={days === d}
                  onClick={() => setDays(d)}
                >
                  {d}
                </Chip>
              ))}
              <input
                value={DURATIONS.includes(days) ? '' : days}
                onChange={(e) => setDays(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="other"
                className="w-[58px] h-6 px-2 rounded-full border border-line bg-surface text-[11.5px] text-ink outline-none text-center focus:border-accent focus:shadow-ring placeholder:text-ink-3"
              />
            </div>
          </FieldRow>

          <FieldRow label="Take with">
            <div className="flex flex-wrap gap-1.5">
              {MEALS.map((m) => (
                <Chip key={m} active={meal === m} onClick={() => setMeal(m)}>
                  {m}
                </Chip>
              ))}
            </div>
          </FieldRow>
        </div>

        {/* Note — printed below the medicine line on the Rx */}
        <FieldRow label="Comment (optional — prints under the medicine)">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSubmit) submit();
            }}
            placeholder="e.g. check BP at home every morning, stop if dizziness, taper after 5 days…"
            rows={2}
            className="w-full px-3 py-2 rounded-md border border-line bg-surface text-[13px] text-ink outline-none focus:border-accent focus:shadow-ring placeholder:text-ink-3 font-serif leading-relaxed resize-y min-h-[60px]"
          />
        </FieldRow>
      </div>
    </Modal>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-ink-3 mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-7 px-3 rounded-full text-[12px] font-semibold transition-colors',
        active
          ? 'bg-ink text-white border border-ink'
          : 'bg-surface text-ink-2 border border-line hover:border-line-strong hover:bg-bg-muted'
      )}
    >
      {children}
    </button>
  );
}
