import { Printer } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useCurrentDoctor, usePatient, usePrescription } from '../../queries/hooks';
import { RxPaper } from '../prescription/RxPaper';

interface Props {
  open: boolean;
  prescriptionId: string | null;
  patientId: string;
  onClose: () => void;
}

/** Read-only viewer for a finalised Rx, surfaced from /consultations. */
export function RxPreviewModal({ open, prescriptionId, patientId, onClose }: Props) {
  const { data: doctor } = useCurrentDoctor();
  const { data: patient } = usePatient(patientId);
  const { data: rx, isLoading } = usePrescription(prescriptionId ?? undefined);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Prescription"
      description={
        patient ? `Finalised Rx for ${patient.name}` : 'Finalised prescription'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            leftIcon={<Printer />}
            disabled={!rx}
            onClick={() => window.print()}
          >
            Print
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-2 mb-3">
        <Badge tone="success" variant="soft" uppercase>
          Finalised
        </Badge>
        {rx?.printedAt && (
          <span className="text-[11.5px] text-ink-3 font-mono">
            printed · {new Date(rx.printedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="py-12 text-center text-[12.5px] text-ink-3">
          Loading the prescription…
        </div>
      )}

      {!isLoading && !rx && (
        <div className="py-12 text-center text-[12.5px] text-danger">
          This Rx record could not be loaded.
        </div>
      )}

      {!isLoading && rx && doctor && patient && (
        <div className="-mx-2 overflow-x-auto">
          <RxPaper
            doctor={doctor}
            patient={patient}
            chamberId={doctor.chambers[0].id}
            rx={rx}
          />
        </div>
      )}
    </Modal>
  );
}
