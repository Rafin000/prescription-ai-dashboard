import { useEffect, useState } from 'react';
import { Check, Pencil, Printer, Save, Send } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  useCurrentDoctor,
  useFinalizeVisitDraft,
  usePrescription,
  useUpdateVisitDraft,
} from '../../queries/hooks';
import { RxLivePaper, type RxLiveDraft } from '../prescription/RxLivePaper';
import { AddMedicineForm } from '../prescription/AddMedicineForm';
import type { Patient, Prescription, RxMedicine, Visit } from '../../types';

interface Props {
  open: boolean;
  visit: Visit | null;
  patient: Patient | undefined;
  onClose: () => void;
}

type BusyKind = 'save-draft' | 'finalize' | 'finalize-print';

/**
 * Fully editable re-entry point for a saved draft Rx. Hydrates from the
 * saved prescription, lets the doctor change anything (patient strip,
 * clinical notes, meds, follow-up), then either saves the draft again,
 * finalises it, or finalises + prints.
 */
export function FinalizeDraftModal({ open, visit, patient, onClose }: Props) {
  const { data: doctor } = useCurrentDoctor();
  const { data: rx, isLoading } = usePrescription(visit?.prescriptionId);
  const finalize = useFinalizeVisitDraft();
  const update = useUpdateVisitDraft();

  const [draft, setDraft] = useState<RxLiveDraft>(emptyDraft);
  const [addMedOpen, setAddMedOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<RxMedicine | null>(null);
  const [busy, setBusy] = useState<BusyKind | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Hydrate local draft whenever the underlying Rx loads or the modal reopens.
  useEffect(() => {
    if (!open) return;
    if (rx) setDraft(rxToDraft(rx));
    else setDraft(emptyDraft);
    setBusy(null);
    setToast(null);
  }, [open, rx]);

  if (!visit) return null;

  const run = async (kind: BusyKind) => {
    if (!patient) return;
    setBusy(kind);
    const body = { draft: draftToPayload(draft) };
    try {
      if (kind === 'save-draft') {
        await update.mutateAsync({ visitId: visit.id, patientId: patient.id, ...body });
        setToast('Draft saved.');
        window.setTimeout(() => {
          setToast(null);
          onClose();
        }, 900);
      } else {
        await finalize.mutateAsync({
          visitId: visit.id,
          patientId: patient.id,
          ...body,
          printed: kind === 'finalize-print',
        });
        setToast(
          kind === 'finalize-print'
            ? `Finalised — opening print dialog for ${patient.name}…`
            : `Finalised for ${patient.name}.`
        );
        if (kind === 'finalize-print') {
          window.setTimeout(() => window.print(), 250);
        }
        window.setTimeout(() => {
          setToast(null);
          onClose();
        }, 1100);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      size="xl"
      title="Continue the draft prescription"
      description={
        patient
          ? `Draft from ${patient.name}'s ${visit.type === 'tele' ? 'video call' : 'consult'} on ${formatLong(visit.date)}. Edit anything, then finalise — or save your changes and keep it as a draft.`
          : `Draft from a consult on ${formatLong(visit.date)}.`
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={!!busy}>
            Close
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Save />}
            loading={busy === 'save-draft'}
            disabled={!rx || !!busy}
            onClick={() => run('save-draft')}
          >
            Save changes as draft
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Send />}
            loading={busy === 'finalize'}
            disabled={!rx || !!busy}
            onClick={() => run('finalize')}
          >
            Finalise
          </Button>
          <Button
            variant="primary"
            leftIcon={<Printer />}
            loading={busy === 'finalize-print'}
            disabled={!rx || !!busy}
            onClick={() => run('finalize-print')}
          >
            Finalise &amp; print
          </Button>
        </>
      }
    >
      {toast && (
        <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-success-soft border border-success/30 text-success px-3 py-2 text-[12.5px] font-medium animate-fade-in">
          <Check className="h-3.5 w-3.5" />
          {toast}
        </div>
      )}

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Badge tone="warn" variant="soft" uppercase>
          Draft
        </Badge>
        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-accent-ink bg-accent-softer border border-accent/20 rounded-full px-2 py-[3px]">
          <Pencil className="h-3 w-3" />
          Click any text to edit
        </span>
        <span className="text-[11.5px] text-ink-3">
          Finalising will lock the Rx and add it to {patient?.name ?? 'the patient'}'s prescription history.
        </span>
      </div>

      {isLoading && (
        <div className="py-12 text-center text-[12.5px] text-ink-3">
          Loading the draft…
        </div>
      )}

      {!isLoading && !rx && (
        <div className="py-12 text-center text-[12.5px] text-danger">
          We couldn't find the draft Rx record for this consultation.
        </div>
      )}

      {!isLoading && rx && doctor && patient && (
        <div className="-mx-2 overflow-x-auto">
          <RxLivePaper
            doctor={doctor}
            patient={patient}
            draft={draft}
            setDraft={(fn) => setDraft((d) => fn(d))}
            onAddMedicine={() => {
              setEditingMed(null);
              setAddMedOpen(true);
            }}
            onEditMedicine={(m) => {
              setEditingMed(m);
              setAddMedOpen(true);
            }}
            onEditMedicineNote={(m) => {
              setEditingMed(m);
              setAddMedOpen(true);
            }}
          />
        </div>
      )}

      <AddMedicineForm
        open={addMedOpen}
        onClose={() => {
          setAddMedOpen(false);
          setEditingMed(null);
        }}
        initial={editingMed ?? undefined}
        title={editingMed ? 'Edit medicine' : 'New medicine'}
        submitLabel={editingMed ? 'Save changes' : 'Add to prescription'}
        onAdd={(med) => {
          setDraft((d) => {
            if (editingMed) {
              return {
                ...d,
                medicines: d.medicines.map((x) =>
                  x.id === editingMed.id ? { ...med, id: editingMed.id } : x
                ),
              };
            }
            return { ...d, medicines: [...d.medicines, med] };
          });
          setAddMedOpen(false);
          setEditingMed(null);
        }}
      />
    </Modal>
  );
}

const emptyDraft: RxLiveDraft = {
  chiefComplaint: '',
  oe: [],
  diagnoses: [],
  tests: [],
  advice: [],
  medicines: [],
  followUp: '',
  operation: [],
};

function rxToDraft(rx: Prescription): RxLiveDraft {
  const opText = rx.operation ?? '';
  return {
    chiefComplaint: rx.chiefComplaint ?? '',
    oe: [],
    diagnoses: rx.diagnoses ?? [],
    tests: rx.tests ?? [],
    advice: rx.advice ?? [],
    medicines: rx.medicines ?? [],
    followUp: rx.followUp ?? '',
    operation: typeof opText === 'string'
      ? opText.split('\n').map((s) => s.trim()).filter(Boolean)
      : (opText as unknown as string[]),
  };
}

function draftToPayload(d: RxLiveDraft) {
  return {
    chiefComplaint: d.chiefComplaint,
    diagnoses: d.diagnoses,
    tests: d.tests,
    advice: d.advice,
    medicines: d.medicines,
    followUp: d.followUp || undefined,
    operation: d.operation && d.operation.length ? d.operation.join('\n') : undefined,
  };
}

function formatLong(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
