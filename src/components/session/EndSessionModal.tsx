import { useState } from 'react';
import {
  AlertTriangle,
  Printer,
  Save,
  Send,
  Trash2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { cn } from '../../lib/cn';

export type EndSessionAction = 'finalize' | 'draft' | 'discard';
export type EndSessionKind = 'consult' | 'call';

export interface EndSessionPayload {
  action: EndSessionAction;
  /** When `finalize`, also fire window.print() so the doctor gets the paper copy. */
  print?: boolean;
}

interface EndSessionModalProps {
  open: boolean;
  kind: EndSessionKind;
  onClose: () => void;
  onConfirm: (payload: EndSessionPayload) => void;
  patientName: string;
  /** Rough summary of what's in the draft — helps the doctor decide. */
  summary: {
    chiefComplaint: boolean;
    diagnosesCount: number;
    testsCount: number;
    medicinesCount: number;
    hasFollowUp: boolean;
  };
  busyAction?: EndSessionAction | null;
}

export function EndSessionModal({
  open,
  kind,
  onClose,
  onConfirm,
  patientName,
  summary,
  busyAction,
}: EndSessionModalProps) {
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [printAfterFinalize, setPrintAfterFinalize] = useState(true);

  const hasAnyContent =
    summary.chiefComplaint ||
    summary.diagnosesCount > 0 ||
    summary.testsCount > 0 ||
    summary.medicinesCount > 0 ||
    summary.hasFollowUp;

  const handleDiscard = () => {
    if (!hasAnyContent) {
      onConfirm({ action: 'discard' });
      return;
    }
    if (!confirmingDiscard) {
      setConfirmingDiscard(true);
      return;
    }
    setConfirmingDiscard(false);
    onConfirm({ action: 'discard' });
  };

  const isCall = kind === 'call';
  const hasPatientName = !!patientName.trim();
  const namedPatient = hasPatientName ? patientName : 'this patient';
  const title = isCall ? 'End the call?' : 'Finish the consult?';
  const subjectShort = isCall ? 'call' : 'consult';
  const description = hasAnyContent
    ? `There's a prescription in progress for ${namedPatient}. Choose what to do with it before ending this ${subjectShort}.`
    : `The prescription is empty. End this ${subjectShort} with ${namedPatient}?`;

  return (
    <Modal
      open={open}
      onClose={() => {
        setConfirmingDiscard(false);
        onClose();
      }}
      size="md"
      title={title}
      description={description}
    >
      <div className="flex flex-col gap-3">
        {hasAnyContent && (
          <div className="rounded-md bg-surface-muted border border-line px-3 py-2.5 text-[12.5px] text-ink-2">
            <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-ink-3 mb-1.5">
              Current draft
            </div>
            <div className="flex flex-wrap gap-1.5">
              {summary.chiefComplaint && <Pill>Chief complaint</Pill>}
              {summary.diagnosesCount > 0 && (
                <Pill>
                  {summary.diagnosesCount} diagnos
                  {summary.diagnosesCount === 1 ? 'is' : 'es'}
                </Pill>
              )}
              {summary.testsCount > 0 && (
                <Pill>
                  {summary.testsCount} test{summary.testsCount === 1 ? '' : 's'}
                </Pill>
              )}
              {summary.medicinesCount > 0 && (
                <Pill tone="accent">
                  {summary.medicinesCount} medicine
                  {summary.medicinesCount === 1 ? '' : 's'}
                </Pill>
              )}
              {summary.hasFollowUp && <Pill>Follow-up</Pill>}
            </div>
          </div>
        )}

        <Choice
          icon={<Printer />}
          title="Save & print"
          body={
            isCall
              ? `Locks the prescription, logs this visit on ${namedPatient}'s record, delivers it via the same join link, and opens the print dialog for your paper copy.`
              : `Locks the prescription, logs this visit on ${namedPatient}'s record, and opens the print dialog for your paper copy.`
          }
          extra={
            !hasPatientName ? (
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-warn">
                <AlertTriangle className="h-3 w-3" />
                Add the patient name on the Rx before you can save.
              </div>
            ) : null
          }
          cta={
            <Button
              variant="primary"
              leftIcon={<Printer />}
              loading={busyAction === 'finalize' && printAfterFinalize}
              disabled={!hasAnyContent || !hasPatientName || !!busyAction}
              onClick={() => {
                setPrintAfterFinalize(true);
                onConfirm({ action: 'finalize', print: true });
              }}
            >
              Save &amp; print
            </Button>
          }
          highlight
        />

        <Choice
          icon={<Send />}
          title="Save"
          body={`Locks the prescription and logs this visit on ${namedPatient}'s record — skip the print dialog (you can print any time from the patient's Rx history).`}
          extra={
            !hasPatientName ? (
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-warn">
                <AlertTriangle className="h-3 w-3" />
                Add the patient name on the Rx before you can save.
              </div>
            ) : null
          }
          cta={
            <Button
              variant="secondary"
              leftIcon={<Send />}
              loading={busyAction === 'finalize' && !printAfterFinalize}
              disabled={!hasAnyContent || !hasPatientName || !!busyAction}
              onClick={() => {
                setPrintAfterFinalize(false);
                onConfirm({ action: 'finalize', print: false });
              }}
            >
              Save
            </Button>
          }
        />

        <Choice
          icon={<Save />}
          title="Save as draft for this consultation"
          body={`Keeps the prescription against this consultation under ${patientName}'s record so you can re-open and finalise it later from the Consultations page.`}
          cta={
            <Button
              variant="secondary"
              leftIcon={<Save />}
              loading={busyAction === 'draft'}
              disabled={!!busyAction}
              onClick={() => onConfirm({ action: 'draft' })}
            >
              Save draft
            </Button>
          }
        />

        <Choice
          icon={<Trash2 />}
          title="No prescription"
          body={`Logs the consultation on the patient's history with no prescription attached. The draft will be discarded — this can't be undone.`}
          tone="danger"
          cta={
            <Button
              variant={confirmingDiscard ? 'danger' : 'ghost'}
              leftIcon={confirmingDiscard ? <AlertTriangle /> : <Trash2 />}
              loading={busyAction === 'discard'}
              disabled={!!busyAction}
              onClick={handleDiscard}
            >
              {confirmingDiscard ? 'Yes, discard Rx' : 'Discard Rx'}
            </Button>
          }
        />
      </div>
    </Modal>
  );
}

function Choice({
  icon,
  title,
  body,
  cta,
  highlight,
  tone,
  extra,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: React.ReactNode;
  highlight?: boolean;
  tone?: 'danger';
  extra?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3.5 flex items-start gap-3',
        highlight
          ? 'border-accent/50 bg-accent-softer/40'
          : tone === 'danger'
          ? 'border-danger/30 bg-danger-soft/30'
          : 'border-line bg-surface'
      )}
    >
      <div
        className={cn(
          'h-9 w-9 rounded-md grid place-items-center shrink-0 [&>svg]:w-4 [&>svg]:h-4',
          highlight
            ? 'bg-accent text-white'
            : tone === 'danger'
            ? 'bg-danger-soft text-danger'
            : 'bg-bg-muted text-ink-2'
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-serif text-[14.5px] font-semibold text-ink leading-tight">
          {title}
        </div>
        <p className="text-[12.5px] text-ink-2 mt-1 leading-relaxed">{body}</p>
        {extra}
      </div>
      <div className="shrink-0">{cta}</div>
    </div>
  );
}

function Pill({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'accent';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-xs border',
        tone === 'accent'
          ? 'bg-accent-soft text-accent-ink border-accent/30'
          : 'bg-surface text-ink-2 border-line'
      )}
    >
      {children}
    </span>
  );
}
