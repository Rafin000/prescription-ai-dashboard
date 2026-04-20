import { useMemo, useState } from 'react';
import { BookMarked, Check, Search } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/cn';
import type { RxLiveDraft } from '../prescription/RxLivePaper';

interface TemplateDef {
  id: string;
  name: string;
  description: string;
  tags: string[];
  payload: Partial<RxLiveDraft>;
}

/**
 * Curated Rx templates. Each one carries the full payload so picking a
 * template actually fills diagnoses, tests, advice, medicines, and follow-up
 * in one shot. Users can tweak anything after import.
 */
const TEMPLATES: TemplateDef[] = [
  {
    id: 'urti-adult',
    name: 'URTI — adult',
    description: 'Common cold, sore throat, low-grade fever. 5-day course.',
    tags: ['respiratory', 'adult'],
    payload: {
      chiefComplaint: 'Sore throat, low-grade fever × 3 days, nasal congestion',
      diagnoses: ['Upper respiratory tract infection'],
      tests: [],
      advice: [
        'Warm saline gargle twice daily',
        'Plenty of warm fluids, rest 2–3 days',
        'Return if fever > 101°F persists past 72 hours',
      ],
      medicines: [
        { id: `tm-${Date.now()}-1`, brand: 'Napa Extra', generic: 'Paracetamol + Caffeine', strength: '500+65 mg', dose: '1+1+1', duration: '5 days', instruction: 'After meal' },
        { id: `tm-${Date.now()}-2`, brand: 'Histacin', generic: 'Chlorpheniramine', strength: '4 mg', dose: '0+0+1', duration: '5 days' },
        { id: `tm-${Date.now()}-3`, brand: 'Tusca Plus', generic: 'Dextromethorphan + Guaifenesin', strength: '—', dose: '10ml TDS', duration: '5 days' },
      ],
      followUp: '5 days if not improving',
    },
  },
  {
    id: 'uti-female',
    name: 'UTI — uncomplicated female',
    description: 'Dysuria, frequency. 5-day Nitrofurantoin + advice.',
    tags: ['urology', 'adult'],
    payload: {
      chiefComplaint: 'Burning micturition, urinary frequency × 2 days',
      diagnoses: ['Acute uncomplicated UTI'],
      tests: ['Urine R/M/E + C/S'],
      advice: [
        'Increase water intake to 2–3 L/day',
        'Avoid holding urine',
        'Cranberry juice if tolerated',
      ],
      medicines: [
        { id: `tm-${Date.now()}-1`, brand: 'Rofurin', generic: 'Nitrofurantoin', strength: '100 mg', dose: '1+0+1', duration: '5 days', instruction: 'After meal' },
        { id: `tm-${Date.now()}-2`, brand: 'Uripas', generic: 'Flavoxate', strength: '200 mg', dose: '1+0+1', duration: '3 days' },
      ],
      followUp: '5 days with report',
    },
  },
  {
    id: 't2dm-fu',
    name: 'Type 2 DM — follow-up',
    description: 'Metformin + Glimepiride review, HbA1c, diet advice.',
    tags: ['chronic', 'endocrine'],
    payload: {
      chiefComplaint: 'Routine DM review — sugar trending up over last month',
      diagnoses: ['Type 2 DM — uncontrolled'],
      tests: ['HbA1c', 'Fasting + 2-hr post-prandial sugar', 'Lipid profile'],
      advice: [
        'Walk 30 min daily, avoid sweet drinks',
        'Log FBS twice a week',
        'Foot inspection daily',
      ],
      medicines: [
        { id: `tm-${Date.now()}-1`, brand: 'Glimet', generic: 'Glimepiride + Metformin', strength: '2+500 mg', dose: '1+0+1', duration: '30 days', instruction: 'Before meal' },
      ],
      followUp: '4 weeks with HbA1c report',
    },
  },
  {
    id: 'htn-stage1',
    name: 'HTN — stage 1',
    description: 'Amlodipine/Losartan titration + lifestyle counselling.',
    tags: ['chronic', 'cardiology'],
    payload: {
      chiefComplaint: 'Routine BP review — readings 140–150/90',
      diagnoses: ['Essential hypertension — stage 1'],
      tests: ['S. creatinine', 'Serum electrolytes', 'ECG'],
      advice: [
        'Low-salt diet (< 5 g/day)',
        'Home BP log morning & evening',
        '30 min brisk walking 5×/week',
      ],
      medicines: [
        { id: `tm-${Date.now()}-1`, brand: 'Amdocal', generic: 'Amlodipine', strength: '5 mg', dose: '0+0+1', duration: '30 days' },
      ],
      followUp: '4 weeks with BP chart',
    },
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (template: TemplateDef['payload'], mode: 'merge' | 'replace') => void;
}

/**
 * Quick template picker surfaced from the consult header. The doctor can
 * either merge the template into whatever they've already got, or replace
 * the draft outright.
 */
export function TemplatePickerModal({ open, onClose, onApply }: Props) {
  const [q, setQ] = useState('');
  const [pickedId, setPickedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return TEMPLATES;
    return TEMPLATES.filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        t.description.toLowerCase().includes(term) ||
        t.tags.some((tag) => tag.includes(term))
    );
  }, [q]);

  const picked = filtered.find((t) => t.id === pickedId) ?? null;

  const apply = (mode: 'merge' | 'replace') => {
    if (!picked) return;
    // Re-stamp medicine ids so templates don't collide across reuse.
    const stamped = picked.payload.medicines?.map((m) => ({
      ...m,
      id: `tm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }));
    onApply({ ...picked.payload, medicines: stamped ?? picked.payload.medicines }, mode);
    setPickedId(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        setPickedId(null);
        onClose();
      }}
      size="lg"
      title="Import a template"
      description="Pick a starter Rx for this visit. You can merge it onto what you've already typed, or replace the draft entirely."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            disabled={!picked}
            onClick={() => apply('merge')}
          >
            Merge into draft
          </Button>
          <Button
            variant="primary"
            disabled={!picked}
            onClick={() => apply('replace')}
          >
            Replace draft
          </Button>
        </>
      }
    >
      <Input
        placeholder="Search templates…"
        leftIcon={<Search />}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        wrapperClassName="mb-3"
      />
      <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto">
        {filtered.map((t) => {
          const selected = t.id === pickedId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setPickedId(t.id)}
              className={cn(
                'w-full text-left rounded-lg border p-3 transition-colors',
                selected
                  ? 'border-accent bg-accent-softer/40 ring-1 ring-accent/30'
                  : 'border-line bg-surface hover:border-line-strong hover:bg-bg-muted'
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'h-8 w-8 rounded-md grid place-items-center shrink-0',
                    selected ? 'bg-accent text-white' : 'bg-bg-muted text-ink-3'
                  )}
                >
                  {selected ? <Check className="h-3.5 w-3.5" /> : <BookMarked className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif text-[14.5px] font-semibold text-ink">
                      {t.name}
                    </span>
                    {t.tags.map((tag) => (
                      <Badge key={tag} tone="neutral" variant="soft">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-[12px] text-ink-2 mt-1 leading-relaxed">{t.description}</p>
                  <div className="text-[11px] text-ink-3 mt-1 font-mono">
                    {t.payload.medicines?.length ?? 0} medicines
                    {t.payload.tests?.length ? ` · ${t.payload.tests.length} tests` : ''}
                    {t.payload.advice?.length ? ` · ${t.payload.advice.length} advice notes` : ''}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-8 text-center text-[12.5px] text-ink-3">
            No templates match "{q}".
          </div>
        )}
      </div>
    </Modal>
  );
}
