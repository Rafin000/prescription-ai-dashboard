import { Printer } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { RxPaper } from '../prescription/RxPaper';
import type { Doctor, Patient } from '../../types';
import type { RxLiveDraft } from '../prescription/RxLivePaper';

interface Props {
  open: boolean;
  onClose: () => void;
  doctor: Doctor;
  patient: Patient;
  draft: RxLiveDraft;
  /** Synthetic id is fine — this preview isn't persisted. */
  previewId?: string;
}

/**
 * Read-only look at the Rx exactly as it would print. No saves happen
 * here — doctor gets either Close or a direct Print button.
 */
export function RxPreviewInlineModal({
  open,
  onClose,
  doctor,
  patient,
  draft,
  previewId,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Prescription preview"
      description="Exactly what will print for the patient. Nothing is saved until you hit Save or Save & print."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" leftIcon={<Printer />} onClick={() => window.print()}>
            Print now
          </Button>
        </>
      }
    >
      <div className="-mx-2 overflow-x-auto">
        <RxPaper
          doctor={doctor}
          patient={patient}
          chamberId={doctor.chambers[0].id}
          rx={{
            id: previewId ?? `rx-preview-${patient.id}`,
            patientId: patient.id,
            doctorId: doctor.id,
            date: new Date().toISOString(),
            chiefComplaint: draft.chiefComplaint,
            diagnoses: draft.diagnoses,
            tests: draft.tests,
            advice: draft.advice,
            medicines: draft.medicines,
            followUp: draft.followUp,
          }}
        />
      </div>
    </Modal>
  );
}
