import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  CalendarPlus,
  ChevronLeft,
  Clock,
  MapPin,
  Scissors,
  Search,
  Stethoscope,
  UserPlus,
  Video,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Empty } from '../ui/Empty';
import { useCreateAppointment, useCurrentDoctor, usePatients } from '../../queries/hooks';
import { cn } from '../../lib/cn';
import type {
  AppointmentPatientDraft,
  AppointmentType,
  Patient,
  Sex,
} from '../../types';

interface NewAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  /** When provided, the patient picker step is skipped. */
  patient?: Patient;
  /** Optional default date (YYYY-MM-DD). Defaults to tomorrow. */
  defaultDate?: string;
  /** Pre-select an appointment type — surfaces when opening the modal
   *  from a specific context (e.g., "Schedule operation"). */
  defaultType?: AppointmentType;
  onCreated?: (appointmentId: string) => void;
}

/** Either an existing patient, or inline new-patient fields that will be
 *  attached to the appointment as a draft (no patient record created yet). */
type PickedPatient =
  | { kind: 'existing'; patient: Patient }
  | { kind: 'draft'; draft: AppointmentPatientDraft };

const TYPES: Array<{
  id: AppointmentType;
  label: string;
  description: string;
  icon: React.ReactNode;
  durationMin: number;
}> = [
  {
    id: 'consultation',
    label: 'New consultation',
    description: 'In-person, first visit',
    icon: <Stethoscope className="h-4 w-4" />,
    durationMin: 20,
  },
  {
    id: 'follow-up',
    label: 'Follow-up',
    description: 'In-person, returning patient',
    icon: <Stethoscope className="h-4 w-4" />,
    durationMin: 15,
  },
  {
    id: 'tele',
    label: 'Virtual call',
    description: 'Video consult — patient joins via link',
    icon: <Video className="h-4 w-4" />,
    durationMin: 20,
  },
  {
    id: 'surgery',
    label: 'Operation',
    description: 'Schedule an OT slot for this patient',
    icon: <Scissors className="h-4 w-4" />,
    durationMin: 90,
  },
];

function tomorrowYmd(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function combine(date: string, time: string): string {
  return `${date}T${time}:00`;
}

export function NewAppointmentModal({
  open,
  onClose,
  patient: presetPatient,
  defaultDate,
  defaultType,
  onCreated,
}: NewAppointmentModalProps) {
  const { data: doctor } = useCurrentDoctor();
  const { mutate: create, isPending } = useCreateAppointment();

  // Patient picker state (only used when no preset patient was passed).
  const [picked, setPicked] = useState<PickedPatient | null>(null);
  const [q, setQ] = useState('');
  const { data: patientList = [], isLoading: loadingPatients } = usePatients(q);

  // Inline "new patient" draft fields — collapsed until the doctor opens it.
  const [draftOpen, setDraftOpen] = useState(false);
  const [dName, setDName] = useState('');
  const [dPhone, setDPhone] = useState('');
  const [dAge, setDAge] = useState('');
  const [dSex, setDSex] = useState<Sex>('male');
  const [dAddress, setDAddress] = useState('');
  const [dBloodGroup, setDBloodGroup] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);

  const pickedPatient =
    presetPatient
      ? ({ kind: 'existing', patient: presetPatient } as PickedPatient)
      : picked;
  const displayName =
    pickedPatient?.kind === 'existing'
      ? pickedPatient.patient.name
      : pickedPatient?.kind === 'draft'
      ? pickedPatient.draft.name
      : '';

  const [date, setDate] = useState('');
  const [time, setTime] = useState('18:00');
  const [type, setType] = useState<AppointmentType>('follow-up');
  const [chamberId, setChamberId] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDate(defaultDate ?? tomorrowYmd());
    setTime('18:00');
    setType(defaultType ?? 'follow-up');
    setChamberId(doctor?.chambers[0]?.id ?? '');
    setReason('');
    setNote('');
    setError(null);
    setPicked(null);
    setQ('');
    setDraftOpen(false);
    setDName('');
    setDPhone('');
    setDAge('');
    setDSex('male');
    setDAddress('');
    setDBloodGroup('');
    setDraftError(null);
  }, [open, defaultDate, defaultType, doctor?.chambers]);

  const selectedType = useMemo(() => TYPES.find((t) => t.id === type), [type]);

  const confirmDraft = () => {
    setDraftError(null);
    if (!dName.trim()) return setDraftError("Patient name is required.");
    if (!dPhone.trim()) return setDraftError('Phone number is required.');
    const ageNum = Number(dAge);
    if (!ageNum || Number.isNaN(ageNum) || ageNum < 0 || ageNum > 130) {
      return setDraftError('Please enter a valid age.');
    }
    const draft: AppointmentPatientDraft = {
      name: dName.trim(),
      age: ageNum,
      sex: dSex,
      phone: dPhone.trim(),
      address: dAddress.trim() || undefined,
      bloodGroup: dBloodGroup.trim() || undefined,
    };
    setPicked({ kind: 'draft', draft });
    setDraftOpen(false);
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!pickedPatient) return setError('Please pick a patient first.');
    if (!date) return setError('Please pick a date.');
    if (!time) return setError('Please pick a time.');
    if (!chamberId) return setError('Please pick a chamber.');
    if (!doctor) return;

    const start = combine(date, time);
    const startD = new Date(start);
    const endD = new Date(startD.getTime() + (selectedType?.durationMin ?? 20) * 60_000);
    const end = endD.toISOString().slice(0, 19);

    const common = {
      patientName: displayName,
      start,
      end,
      type,
      chamberId,
      note: note.trim() || undefined,
      reason: reason.trim() || undefined,
    };
    const body =
      pickedPatient.kind === 'existing'
        ? { ...common, patientId: pickedPatient.patient.id }
        : { ...common, patientDraft: pickedPatient.draft };

    create(body, {
      onSuccess: (a) => {
        onCreated?.(a.id);
        onClose();
      },
      onError: (err) =>
        setError(
          (err as { message?: string })?.message ?? 'Could not book the appointment.'
        ),
    });
  };

  if (!doctor) return null;

  // Step 1 — patient picker. Only renders when no preset patient was passed.
  if (!pickedPatient) {
    const term = q.trim().toLowerCase();
    const looksLikePhone = /^\+?\d[\d\s-]{3,}$/.test(term);

    return (
      <Modal
        open={open}
        onClose={onClose}
        size="md"
        title="Who is this appointment for?"
        description="Pick an existing patient, or capture the new patient's info directly on this booking — a full patient record is created only when the consult actually runs."
        footer={
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search by name, code, or phone…"
              leftIcon={<Search />}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              wrapperClassName="flex-1"
              inputSize="md"
              autoFocus
            />
            <Button
              variant="primary"
              leftIcon={<UserPlus />}
              onClick={() => {
                setDraftOpen((v) => !v);
                if (!draftOpen) {
                  // Prefill from the search box if it looks like a name/phone.
                  if (!dName && !looksLikePhone && term) setDName(q);
                  if (!dPhone && looksLikePhone && term) setDPhone(q);
                }
              }}
            >
              New patient
            </Button>
          </div>

          {draftOpen && (
            <div className="rounded-lg border border-accent/40 bg-accent-softer/40 p-4 flex flex-col gap-3">
              <div>
                <div className="font-serif text-[14.5px] font-semibold text-ink">
                  New patient — just for this booking
                </div>
                <p className="text-[11.5px] text-ink-2 mt-1 leading-relaxed">
                  We'll attach these details to the appointment and create a
                  proper patient record the moment the consult starts. No
                  record is added now, so no-shows don't clutter your patient
                  list.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Full name"
                  value={dName}
                  onChange={(e) => setDName(e.target.value)}
                  required
                />
                <Input
                  label="Phone"
                  value={dPhone}
                  onChange={(e) => setDPhone(e.target.value)}
                  type="tel"
                  required
                />
                <Input
                  label="Age"
                  value={dAge}
                  onChange={(e) => setDAge(e.target.value.replace(/[^\d]/g, ''))}
                  type="text"
                  inputMode="numeric"
                  required
                />
                <Select
                  label="Sex"
                  value={dSex}
                  onChange={(e) => setDSex(e.target.value as Sex)}
                  options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
                <Input
                  label="Address (optional)"
                  value={dAddress}
                  onChange={(e) => setDAddress(e.target.value)}
                  wrapperClassName="sm:col-span-2"
                />
                <Input
                  label="Blood group (optional)"
                  value={dBloodGroup}
                  onChange={(e) => setDBloodGroup(e.target.value.toUpperCase())}
                  maxLength={4}
                />
              </div>
              {draftError && (
                <div className="rounded-md bg-danger-soft border border-danger/30 text-danger text-[12.5px] px-3 py-2">
                  {draftError}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDraftOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={confirmDraft}>
                  Use these details
                </Button>
              </div>
            </div>
          )}

          <div className="max-h-[260px] overflow-y-auto rounded-md border border-line divide-y divide-line">
            {loadingPatients && (
              <div className="px-4 py-6 text-center text-[12.5px] text-ink-3">
                Looking up patients…
              </div>
            )}
            {!loadingPatients && patientList.length === 0 && (
              <div className="px-4 py-5">
                <Empty
                  icon={<UserPlus />}
                  title={term ? `No one found for "${q}"` : 'No patients match'}
                  description='Tap "New patient" above to capture their details for this booking.'
                />
              </div>
            )}
            {!loadingPatients &&
              patientList.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPicked({ kind: 'existing', patient: p })}
                  className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-bg-muted transition-colors"
                >
                  <Avatar name={p.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif text-[13.5px] font-semibold text-ink truncate">
                        {p.name}
                      </span>
                      <Badge tone="neutral" variant="soft">
                        {p.code}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-ink-3 mt-0.5 font-mono truncate">
                      {p.age}y · {p.sex === 'female' ? 'F' : p.sex === 'male' ? 'M' : '—'} ·{' '}
                      {p.phone}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      </Modal>
    );
  }

  // Step 2 — date / type / chamber + reason form.
  const summaryLabel =
    pickedPatient.kind === 'existing'
      ? `${pickedPatient.patient.code} · ${pickedPatient.patient.age}y · ${pickedPatient.patient.phone}`
      : `New patient · ${pickedPatient.draft.age}y · ${pickedPatient.draft.phone}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Book an appointment"
      description={`Schedule a ${selectedType?.label.toLowerCase() ?? 'visit'} for ${displayName}.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            leftIcon={<CalendarPlus />}
            loading={isPending}
            onClick={() => submit()}
          >
            Book appointment
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        {!presetPatient && (
          <div className="rounded-md border border-line bg-surface-muted px-3 py-2 flex items-center gap-3">
            <Avatar name={displayName} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="font-serif text-[13.5px] font-semibold text-ink truncate">
                {displayName}
                {pickedPatient.kind === 'draft' && (
                  <Badge tone="accent" variant="soft" uppercase>
                    Draft — promoted on consult
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-ink-3 font-mono truncate">
                {summaryLabel}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11.5px] font-semibold text-ink-3 hover:text-ink hover:bg-bg-muted"
            >
              <ChevronLeft className="h-3 w-3" />
              Change
            </button>
          </div>
        )}

        {/* Type picker */}
        <div>
          <div className="text-[11px] font-semibold text-ink-2 mb-1.5">
            Appointment type
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {TYPES.map((t) => {
              const selected = t.id === type;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={cn(
                    'text-left p-3 rounded-lg border transition-colors',
                    selected
                      ? 'border-accent bg-accent-softer shadow-xs'
                      : 'border-line bg-surface hover:border-line-strong hover:bg-bg-muted'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'h-7 w-7 rounded-md grid place-items-center',
                        selected ? 'bg-accent text-white' : 'bg-bg-muted text-ink-3'
                      )}
                    >
                      {t.icon}
                    </span>
                    <span
                      className={cn(
                        'font-serif text-[14px] font-semibold',
                        selected ? 'text-accent-ink' : 'text-ink'
                      )}
                    >
                      {t.label}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-ink-2 mt-1.5 leading-snug">
                    {t.description}
                  </div>
                  <div className="text-[10.5px] text-ink-3 font-mono mt-1.5 inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t.durationMin} min
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date + Time */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label="Time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>

        {/* Chamber */}
        <Select
          label="Chamber"
          value={chamberId}
          onChange={(e) => setChamberId(e.target.value)}
          options={doctor.chambers.map((c) => ({
            value: c.id,
            label: c.name,
          }))}
        />
        <div className="text-[11px] text-ink-3 inline-flex items-center gap-1.5 -mt-2">
          <MapPin className="h-3 w-3" />
          {doctor.chambers.find((c) => c.id === chamberId)?.address ?? ''}
        </div>

        {/* Reason for visit — pre-fills the Rx's chief complaint. */}
        <Textarea
          label="Reason for visit / symptoms (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Chest pain on exertion × 2 weeks · headaches · review reports"
          rows={2}
          hint="When the consult starts, this seeds the prescription's chief complaint."
        />

        {/* Note */}
        <Textarea
          label="Note for the visit (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Bring most recent BP readings · review CXR report"
          rows={2}
        />

        {type === 'tele' && (
          <div className="rounded-md bg-info-soft border border-info/30 text-info text-[12px] px-3 py-2 inline-flex items-start gap-2">
            <Video className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              We'll generate a one-click join link the patient can open without
              creating an account. You can copy the link from the appointment
              row anytime before the call.
            </span>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-danger-soft border border-danger/30 text-danger text-[12.5px] px-3 py-2">
            {error}
          </div>
        )}

        <button type="submit" className="hidden" aria-hidden />
      </form>
    </Modal>
  );
}
