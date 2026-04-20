import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import {
  type RxTemplate,
  type RxTemplateMedicine,
  type UpsertTemplateRequest,
} from '../../services/templatesService';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (body: UpsertTemplateRequest) => Promise<void> | void;
  initial?: RxTemplate | null;
  canShare?: boolean; // only show "Save for team" to admin
}

interface Draft {
  name: string;
  description: string;
  tags: string;
  chiefComplaint: string;
  diagnoses: string;
  tests: string;
  advice: string;
  followUp: string;
  notes: string;
  medicines: RxTemplateMedicine[];
  shared: boolean;
}

const emptyDraft = (t?: RxTemplate | null): Draft => ({
  name: t?.name ?? '',
  description: t?.description ?? '',
  tags: (t?.tags ?? []).join(', '),
  chiefComplaint: t?.chiefComplaint ?? '',
  diagnoses: (t?.diagnoses ?? []).join('\n'),
  tests: (t?.tests ?? []).join('\n'),
  advice: (t?.advice ?? []).join('\n'),
  followUp: t?.followUp ?? '',
  notes: t?.notes ?? '',
  medicines: t?.medicines?.length
    ? t.medicines.map((m) => ({ ...m }))
    : [{ name: '', dosage: '', frequency: '', duration: '' }],
  shared: !!t?.shared,
});

export function TemplateEditorModal({ open, onClose, onSave, initial, canShare }: Props) {
  const [d, setD] = useState<Draft>(emptyDraft(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setD(emptyDraft(initial));
      setError(null);
    }
  }, [open, initial]);

  const update = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setD((prev) => ({ ...prev, [k]: v }));

  const setMed = (i: number, patch: Partial<RxTemplateMedicine>) =>
    setD((prev) => ({
      ...prev,
      medicines: prev.medicines.map((m, idx) => (idx === i ? { ...m, ...patch } : m)),
    }));

  const addMed = () =>
    setD((prev) => ({
      ...prev,
      medicines: [...prev.medicines, { name: '', dosage: '', frequency: '', duration: '' }],
    }));

  const removeMed = (i: number) =>
    setD((prev) => ({
      ...prev,
      medicines: prev.medicines.filter((_, idx) => idx !== i),
    }));

  const splitLines = (s: string) =>
    s.split('\n').map((x) => x.trim()).filter(Boolean);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!d.name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: d.name.trim(),
        description: d.description.trim() || undefined,
        tags: d.tags.split(',').map((t) => t.trim()).filter(Boolean),
        chiefComplaint: d.chiefComplaint.trim() || undefined,
        diagnoses: splitLines(d.diagnoses),
        tests: splitLines(d.tests),
        advice: splitLines(d.advice),
        medicines: d.medicines
          .filter((m) => m.name.trim())
          .map((m) => ({
            name: m.name.trim(),
            dosage: m.dosage?.trim() || undefined,
            frequency: m.frequency?.trim() || undefined,
            duration: m.duration?.trim() || undefined,
            notes: m.notes?.trim() || undefined,
          })),
        followUp: d.followUp.trim() || undefined,
        notes: d.notes.trim() || undefined,
        shared: d.shared,
      });
      onClose();
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Could not save template.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={initial ? 'Edit template' : 'New template'}
      description="Save a reusable Rx skeleton. Use it later to seed a new consult in one click."
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Name *"
            value={d.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Common cold — evening"
            required
          />
          <Input
            label="Tags (comma-separated)"
            value={d.tags}
            onChange={(e) => update('tags', e.target.value)}
            placeholder="flu, respiratory"
          />
        </div>
        <Textarea
          label="Description"
          value={d.description}
          onChange={(e) => update('description', e.target.value)}
          rows={2}
          placeholder="Common cold, sore throat, low-grade fever. 5-day course."
        />
        <Input
          label="Chief complaint"
          value={d.chiefComplaint}
          onChange={(e) => update('chiefComplaint', e.target.value)}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Textarea
            label="Diagnoses (one per line)"
            value={d.diagnoses}
            onChange={(e) => update('diagnoses', e.target.value)}
            rows={3}
          />
          <Textarea
            label="Tests (one per line)"
            value={d.tests}
            onChange={(e) => update('tests', e.target.value)}
            rows={3}
          />
        </div>
        <Textarea
          label="Advice (one per line)"
          value={d.advice}
          onChange={(e) => update('advice', e.target.value)}
          rows={3}
        />

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11.5px] font-semibold uppercase tracking-[1.2px] text-ink-3">
              Medicines
            </label>
            <Button type="button" variant="ghost" size="sm" leftIcon={<Plus />} onClick={addMed}>
              Add medicine
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {d.medicines.map((m, i) => (
              <div key={i} className="grid grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-2 items-center">
                <Input
                  value={m.name}
                  onChange={(e) => setMed(i, { name: e.target.value })}
                  placeholder="Brand"
                />
                <Input
                  value={m.dosage ?? ''}
                  onChange={(e) => setMed(i, { dosage: e.target.value })}
                  placeholder="1 tab"
                />
                <Input
                  value={m.frequency ?? ''}
                  onChange={(e) => setMed(i, { frequency: e.target.value })}
                  placeholder="TDS"
                />
                <Input
                  value={m.duration ?? ''}
                  onChange={(e) => setMed(i, { duration: e.target.value })}
                  placeholder="5 days"
                />
                <button
                  type="button"
                  onClick={() => removeMed(i)}
                  aria-label="Remove"
                  className="h-10 w-10 grid place-items-center rounded-md text-ink-3 hover:text-danger hover:bg-danger-soft"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Follow-up"
            value={d.followUp}
            onChange={(e) => update('followUp', e.target.value)}
            placeholder="1 week"
          />
          <Textarea
            label="Notes"
            value={d.notes}
            onChange={(e) => update('notes', e.target.value)}
            rows={2}
          />
        </div>

        {canShare && (
          <label className="flex items-center gap-2 text-[12.5px] text-ink-2">
            <input
              type="checkbox"
              checked={d.shared}
              onChange={(e) => update('shared', e.target.checked)}
              className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
            />
            Share with the whole team (only admins see this option)
          </label>
        )}

        {error && (
          <div className="rounded-md bg-danger-soft border border-danger/30 text-danger text-[12.5px] px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {initial ? 'Save changes' : 'Create template'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
