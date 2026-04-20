import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Video } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useCreateAppointment, useCurrentDoctor } from '../../queries/hooks';
import { cn } from '../../lib/cn';
import type { Patient } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  /**
   * When provided, the chooser skips the patient-picker step. In-person
   * jumps straight into /consult/:id; video books a tele appointment and
   * redirects to /call/:appointmentId.
   */
  patient?: Patient;
}

/**
 * Kind chooser surfaced from two places:
 *  - Top-bar "Start new consult" — no patient yet; hand off to the
 *    dedicated /start-consult or /start-call pages for patient picking.
 *  - Patient profile — patient is known; start right away.
 */
export function StartSessionModal({ open, onClose, patient }: Props) {
  const navigate = useNavigate();
  const { data: doctor } = useCurrentDoctor();
  const createAppointment = useCreateAppointment();
  const [busy, setBusy] = useState<'consult' | 'call' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    setBusy(null);
    onClose();
  };

  const pickConsult = () => {
    if (busy) return;
    if (patient) {
      close();
      navigate(`/consult/${patient.id}`);
    } else {
      close();
      navigate('/start-consult');
    }
  };

  const pickCall = async () => {
    if (busy) return;
    if (!patient) {
      close();
      navigate('/start-call');
      return;
    }
    if (!doctor) return;
    setBusy('call');
    setError(null);
    try {
      const now = new Date();
      const end = new Date(now.getTime() + 30 * 60_000);
      const appt = await createAppointment.mutateAsync({
        patientId: patient.id,
        patientName: patient.name,
        start: now.toISOString(),
        end: end.toISOString(),
        type: 'tele',
        chamberId: doctor.chambers[0].id,
        note: `Started from ${patient.name}'s profile`,
      });
      close();
      navigate(`/call/${appt.id}`);
    } catch (err) {
      setError(
        (err as { message?: string })?.message ??
          'Could not start the call. Please try again.'
      );
      setBusy(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="md"
      title={patient ? `Start a consult with ${patient.name}` : 'Start a new consultation'}
      description={
        patient
          ? 'Pick how you\'ll see them — in-person drops you into the live consult, video books a tele appointment and opens the call.'
          : "Pick how you'll see the patient — we'll then ask whether they're an existing patient or a new registration."
      }
      footer={
        <Button variant="ghost" onClick={close} disabled={!!busy}>
          Cancel
        </Button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <KindCard
          icon={<Stethoscope />}
          title="In-person"
          body={
            patient
              ? 'Live consult in your chamber. The AI listens and builds the Rx in real time.'
              : 'Live consult in your chamber. The AI listens, transcribes, and builds the Rx in real time.'
          }
          onClick={pickConsult}
          disabled={!!busy}
        />
        <KindCard
          icon={<Video />}
          title="Video call"
          body={
            patient
              ? 'Book a tele appointment for right now and jump into the call surface.'
              : 'Book a tele appointment for the patient and jump straight into the call surface.'
          }
          onClick={pickCall}
          disabled={!!busy}
          busy={busy === 'call'}
          accent
        />
      </div>

      {error && (
        <div className="mt-3 rounded-md bg-danger-soft border border-danger/30 text-danger text-[12.5px] px-3 py-2">
          {error}
        </div>
      )}
    </Modal>
  );
}

function KindCard({
  icon,
  title,
  body,
  onClick,
  accent,
  disabled,
  busy,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  onClick: () => void;
  accent?: boolean;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'text-left rounded-lg border p-4 transition-all hover:shadow-sm hover:-translate-y-px disabled:opacity-60 disabled:pointer-events-none',
        accent
          ? 'border-accent/40 bg-accent-softer/40 hover:border-accent'
          : 'border-line bg-surface hover:border-line-strong'
      )}
    >
      <div
        className={cn(
          'h-10 w-10 rounded-md grid place-items-center [&>svg]:h-5 [&>svg]:w-5',
          accent ? 'bg-accent text-white' : 'bg-bg-muted text-ink-2'
        )}
      >
        {icon}
      </div>
      <div className="font-serif text-[16px] font-semibold text-ink mt-3 flex items-center gap-2">
        {title}
        {busy && (
          <span className="text-[10.5px] font-mono uppercase tracking-[1.2px] text-ink-3">
            booking…
          </span>
        )}
      </div>
      <p className="text-[12.5px] text-ink-2 mt-1.5 leading-relaxed">{body}</p>
    </button>
  );
}
