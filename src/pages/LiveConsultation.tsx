import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  BookMarked,
  Calendar,
  ChevronRight,
  ExternalLink,
  Eye,
  Heart,
  Mic,
  Pause,
  Pencil,
  Square,
  Weight,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { RxLivePaper } from '../components/prescription/RxLivePaper';
import { AddMedicineForm } from '../components/prescription/AddMedicineForm';
import {
  useConsultScript,
  useCreateVisit,
  useCurrentDoctor,
  usePatient,
} from '../queries/hooks';
import { useActiveSessionStore } from '../stores/activeSessionStore';
import {
  EndSessionModal,
  type EndSessionAction,
  type EndSessionPayload,
} from '../components/session/EndSessionModal';
import { RxPreviewInlineModal } from '../components/session/RxPreviewInlineModal';
import { TemplatePickerModal } from '../components/session/TemplatePickerModal';
import { cn } from '../lib/cn';
import { fmtDate } from '../lib/format';
import { printRxScoped } from '../lib/printRx';
import type { ConsultTurn, RxMedicine } from '../types';

type Lang = 'bn' | 'en';

export function LiveConsultation() {
  const { patientId } = useParams<{ patientId?: string }>();
  const navigate = useNavigate();
  const effectiveId = patientId ?? 'pai-00284';
  const { data: doctor } = useCurrentDoctor();
  const { data: patient } = usePatient(effectiveId);
  const createVisit = useCreateVisit();
  // eagerly load the script so the SessionRunner can stream it
  useConsultScript();

  const active = useActiveSessionStore((s) => s.active);
  const start = useActiveSessionStore((s) => s.start);
  const end = useActiveSessionStore((s) => s.end);
  const setRecording = useActiveSessionStore((s) => s.setRecording);
  const setDraft = useActiveSessionStore((s) => s.setDraft);
  const setVitals = useActiveSessionStore((s) => s.setVitals);
  const setStripOverrides = useActiveSessionStore((s) => s.setStripOverrides);

  // Purely UI-local state — modals don't need to survive navigation.
  const [addMedOpen, setAddMedOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<RxMedicine | null>(null);
  const [endOpen, setEndOpen] = useState(false);
  const [endBusy, setEndBusy] = useState<EndSessionAction | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  /** Brief passive toast used for one-shot feedback (e.g., template imported). */
  const [toast, setToast] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  // Once the doctor finishes the consult we're about to navigate away — the
  // auto-start effect below MUST NOT resurrect the session during that brief
  // interval, otherwise the "Consulting …" pill would come back.
  const endedRef = useRef(false);

  /**
   * A consult session is only "live" once the doctor confirms start. If
   * they're landing fresh from the patient picker, show the cover modal
   * first. If they're navigating back to an already-running session (via
   * the OngoingSessionBar pill), skip it.
   */
  const alreadyRunning =
    !!active && active.kind === 'consult' && active.patientId === effectiveId;
  const [sessionStarted, setSessionStarted] = useState(alreadyRunning);

  // Keep sessionStarted in sync if the store flips (e.g., a returning
  // session was hydrated from localStorage a frame later).
  useEffect(() => {
    if (alreadyRunning && !sessionStarted) setSessionStarted(true);
  }, [alreadyRunning, sessionStarted]);

  const handleStartSession = () => {
    if (!patient || endedRef.current) return;
    start({
      kind: 'consult',
      patientId: patient.id,
      patientName: patient.name,
      returnPath: `/consult/${patient.id}`,
      autoRecord: true,
    });
    setSessionStarted(true);
  };

  // Scroll transcript to latest bubble.
  useEffect(() => {
    requestAnimationFrame(() => {
      transcriptRef.current?.scrollTo({
        top: transcriptRef.current.scrollHeight,
        behavior: 'smooth',
      });
    });
  }, [active?.transcript.length]);

  const session = active && active.kind === 'consult' && active.patientId === effectiveId
    ? active
    : null;

  const recording = session?.recording ?? false;
  const elapsed = session?.elapsed ?? 0;
  const lang: Lang = (session?.lang as Lang) ?? 'bn';
  const transcript = session?.transcript ?? [];
  const draft = session?.draft ?? {
    chiefComplaint: '',
    oe: [],
    diagnoses: [],
    tests: [],
    advice: [],
    medicines: [],
    followUp: '',
    operation: [],
  };
  const vitals = session?.vitals ?? { weight: '68', bp: '140/90', pulse: '88' };
  const stripOverrides = session?.stripOverrides ?? {};

  const clock = useMemo(() => {
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [elapsed]);

  const anyContent =
    draft.chiefComplaint ||
    draft.oe.length ||
    draft.diagnoses.length ||
    draft.tests.length ||
    draft.advice.length ||
    draft.medicines.length;

  if (!patient || !doctor) {
    return (
      <div className="text-[13px] text-ink-3 font-mono uppercase tracking-[1.4px]">
        Loading consultation…
      </div>
    );
  }

  /** End button always pops the decision modal so the doctor can pick what
   *  to do with the Rx (Save & print / Save / Save as draft / No Rx). */
  const finishConsult = () => {
    if (!sessionStarted) return;
    setEndOpen(true);
  };

  const flashToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  };

  const applyTemplate = (
    payload: Partial<{
      chiefComplaint: string;
      oe: string[];
      diagnoses: string[];
      tests: string[];
      advice: string[];
      medicines: RxMedicine[];
      followUp: string;
    }>,
    mode: 'merge' | 'replace'
  ) => {
    setDraft((d) => {
      if (mode === 'replace') {
        return {
          chiefComplaint: payload.chiefComplaint ?? '',
          oe: payload.oe ?? [],
          diagnoses: payload.diagnoses ?? [],
          tests: payload.tests ?? [],
          advice: payload.advice ?? [],
          medicines: payload.medicines ?? [],
          followUp: payload.followUp ?? '',
          operation: [],
        };
      }
      return {
        chiefComplaint: d.chiefComplaint || payload.chiefComplaint || '',
        oe: mergeList(d.oe, payload.oe),
        diagnoses: mergeList(d.diagnoses, payload.diagnoses),
        tests: mergeList(d.tests, payload.tests),
        advice: mergeList(d.advice, payload.advice),
        medicines: [...(d.medicines ?? []), ...(payload.medicines ?? [])],
        followUp: d.followUp || payload.followUp || '',
        operation: d.operation ?? [],
      };
    });
    flashToast('Template imported — edit anything as needed.');
  };

  const handleEndAction = async ({ action, print }: EndSessionPayload) => {
    if (!patient) return;
    setEndBusy(action);
    try {
      await createVisit.mutateAsync({
        patientId: patient.id,
        patientName: patient.name,
        type: 'consultation',
        startedAt: session?.startedAt ?? new Date().toISOString(),
        durationSec: elapsed,
        rxStatus: action === 'finalize' ? 'final' : action === 'draft' ? 'draft' : 'none',
        printed: action === 'finalize' && !!print,
        draft:
          action === 'discard'
            ? undefined
            : {
                chiefComplaint: draft.chiefComplaint,
                diagnoses: draft.diagnoses,
                tests: draft.tests,
                advice: draft.advice,
                medicines: draft.medicines,
                followUp: draft.followUp,
                operation: draft.operation?.length
                  ? draft.operation.join('\n')
                  : undefined,
              },
      });
    } catch (err) {
      setEndBusy(null);
      flashToast(
        (err as { message?: string })?.message ??
          'Could not save this consult. Please try again.',
      );
      return;
    }

    endedRef.current = true;
    setEndBusy(null);
    setEndOpen(false);
    end();

    if (action === 'finalize' && print) {
      window.setTimeout(() => printRxScoped(), 300);
    }

    if (action === 'finalize') {
      navigate(`/patients/${patient.id}`, {
        state: { toast: `Prescription finalised for ${patient.name}` },
      });
    } else if (action === 'draft') {
      navigate('/consultations', {
        state: { toast: `Draft saved for ${patient.name} — reopen anytime to finalise` },
      });
    } else {
      navigate(`/patients/${patient.id}`, {
        state: { toast: `Consult logged for ${patient.name}` },
      });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ─── Breadcrumb + actions bar ────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-[12.5px] text-ink-3">
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink-2">
            <span className="h-5 px-1.5 rounded-xs bg-accent text-white text-[9.5px] font-bold uppercase tracking-[1.4px] inline-flex items-center">
              AI
            </span>
            Prescription
          </span>
          <Divider />
          <Calendar className="h-3.5 w-3.5" />
          <span>Today · {fmtDate(new Date().toISOString(), 'd MMM yyyy')}</span>
          <Divider />
          <a href="/start-consult" className="hover:text-accent-ink transition-colors">
            Live consultation
          </a>
          <ChevronRight className="h-3 w-3 text-ink-4" />
          <span className="text-ink font-medium">{patient.name}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            leftIcon={<Eye />}
            disabled={!sessionStarted}
            onClick={() => setPreviewOpen(true)}
          >
            Preview
          </Button>
          <Button
            variant="secondary"
            leftIcon={<BookMarked />}
            disabled={!sessionStarted}
            onClick={() => setTemplateOpen(true)}
          >
            Import template
          </Button>
          <Button
            variant="danger"
            leftIcon={<Square />}
            disabled={!sessionStarted}
            onClick={finishConsult}
          >
            End consultation
          </Button>
        </div>
      </div>

      {/* ─── Patient strip ────────────────────────────────────── */}
      <div className="flex items-center gap-4 flex-wrap">
        <a
          href={`/patients/${patient.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0"
          title={`Open ${patient.name}'s profile in a new tab`}
        >
          <Avatar
            name={patient.name}
            size="lg"
            className="ring-2 ring-transparent hover:ring-accent/40 transition-all"
          />
        </a>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <a
              href={`/patients/${patient.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-serif text-[24px] font-semibold text-ink leading-tight tracking-tight hover:text-accent-ink transition-colors"
            >
              {patient.name}
            </a>
            {patient.nameBn && (
              <span className="font-bn text-[14px] text-ink-3">{patient.nameBn}</span>
            )}
            <a
              href={`/patients/${patient.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-line bg-surface text-[11.5px] font-semibold text-ink-2 hover:border-line-strong hover:bg-bg-muted hover:text-ink transition-colors ml-2"
              title="Opens in a new tab so your consult isn't interrupted"
            >
              View profile
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="mt-1 flex items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-2 flex-wrap">
            <span>
              ID · <span className="font-mono font-semibold text-ink">{patient.code}</span>
            </span>
            <Dot />
            <span>
              {patient.age}y / {patient.sex === 'female' ? 'F' : patient.sex === 'male' ? 'M' : '—'}
            </span>
            <Dot />
            <span className="font-mono">☏ {patient.phone}</span>
            <Dot />
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-ink-3" />
              Last visit 12 Feb 2026
            </span>
            <Dot />
            <span className="font-mono text-ink-2">
              {(patient.conditions ?? []).map((c) => shortCondition(c.name)).join(' · ')}
              {patient.allergies?.length ? ` · ${patient.allergies.join(', ')}` : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <VitalTile
            icon={<Weight />}
            label="Weight"
            value={vitals.weight}
            unit="kg"
            onChange={(v) => setVitals((s) => ({ ...s, weight: v }))}
          />
          <VitalTile
            icon={<Activity />}
            label="BP"
            value={vitals.bp}
            unit="mmHg"
            tone="warn"
            onChange={(v) => setVitals((s) => ({ ...s, bp: v }))}
          />
          <VitalTile
            icon={<Heart />}
            label="Pulse"
            value={vitals.pulse}
            unit="/min"
            onChange={(v) => setVitals((s) => ({ ...s, pulse: v }))}
          />
        </div>
      </div>

      {/* ─── Split: transcript (narrower) | prescription (wider) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.3fr] gap-6 items-start">
        {/* LEFT — transcript */}
        <div className="flex flex-col border border-line rounded-xl bg-surface shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-gradient-to-b from-surface to-surface-muted">
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.4px] text-accent-ink">
              <Mic className="h-3.5 w-3.5" />
              Live transcript
              <span className="text-ink-3 font-normal normal-case tracking-normal text-[11.5px] ml-1">
                · {transcript.length} turns
              </span>
            </div>
            <div
              className={cn(
                'inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.3px]',
                recording ? 'text-live' : 'text-ink-3'
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  recording ? 'bg-live animate-pulse' : 'bg-ink-3'
                )}
              />
              {recording ? 'Listening' : 'Paused'}
            </div>
          </div>

          <div
            ref={transcriptRef}
            className="flex-1 min-h-[440px] max-h-[560px] overflow-y-auto"
          >
            {transcript.length === 0 ? (
              <div className="h-full min-h-[440px] grid place-items-center p-10 text-center">
                <div className="max-w-sm">
                  <div className="h-20 w-20 mx-auto rounded-full bg-accent-softer grid place-items-center text-accent mb-5">
                    <Mic className="h-7 w-7" />
                  </div>
                  <div className="font-serif text-[20px] font-semibold text-ink mb-2 leading-snug">
                    Ready when you are.
                  </div>
                  <p className="text-[13px] text-ink-3 leading-relaxed">
                    Tap the mic below and speak naturally — in Bangla or English. I'll
                    transcribe the consult and build the prescription as you go. The
                    session stays active while you move around the app.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 px-5 py-5">
                {transcript.map((t) => (
                  <TranscriptBubble key={t.id} turn={t} lang={lang} />
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-line px-5 py-4 flex items-center gap-4 bg-surface">
            <button
              type="button"
              onClick={() => setRecording(!recording)}
              className={cn(
                'relative h-12 w-12 rounded-full grid place-items-center shrink-0 transition-all',
                recording
                  ? 'bg-gradient-to-br from-accent to-accent-hover text-white shadow-accent'
                  : 'bg-surface border-2 border-accent text-accent hover:bg-accent-softer'
              )}
              aria-label={recording ? 'Pause' : 'Start listening'}
            >
              {recording && (
                <span className="absolute inset-0 rounded-full bg-accent/30 animate-pulse-ring" />
              )}
              {recording ? <Pause className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <Waveform active={recording} />
            <div className="text-right shrink-0 leading-tight">
              <div className="font-mono text-[14px] font-semibold text-ink">{clock}</div>
              <div className="text-[10.5px] text-ink-3 uppercase tracking-[1.2px] mt-0.5">
                {recording ? 'Tap to pause' : 'Tap to start'}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — prescription preview */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.4px] text-accent-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Prescription preview
              <span className="text-ink-3 font-normal normal-case tracking-normal text-[11.5px] ml-1">
                · {anyContent ? 'as it will print' : 'nothing yet'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-accent-ink bg-accent-softer border border-accent/20 rounded-full px-2 py-[3px]">
                <Pencil className="h-3 w-3" />
                Click any text to edit
              </span>
              <span className="text-[10.5px] text-ink-3 font-mono">
                A4 · {lang === 'bn' ? 'বাংলা' : 'bilingual'}
              </span>
            </div>
          </div>

          <RxLivePaper
            doctor={doctor}
            patient={patient}
            draft={draft}
            setDraft={setDraft}
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
            patientName={stripOverrides.patientName}
            ageSex={stripOverrides.ageSex}
            bp={`${vitals.bp} mmHg`}
            weight={`${vitals.weight} kg`}
            date={stripOverrides.date}
            onPatientStripChange={(patch) => {
              if (patch.bp !== undefined) {
                setVitals((v) => ({
                  ...v,
                  bp: patch.bp!.replace(/\s*mmHg\s*$/i, '').trim() || v.bp,
                }));
              }
              if (patch.weight !== undefined) {
                setVitals((v) => ({
                  ...v,
                  weight: patch.weight!.replace(/\s*kg\s*$/i, '').trim() || v.weight,
                }));
              }
              const { bp: _bp, weight: _weight, ...rest } = patch;
              if (Object.keys(rest).length > 0) {
                setStripOverrides(rest);
              }
            }}
          />
        </div>
      </div>

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

      {/* Passive toast — template imports, one-shot feedback. */}
      {toast && (
        <div className="fixed bottom-24 right-6 z-[55] max-w-[340px] rounded-lg border border-line bg-surface shadow-lg px-4 py-3 text-[12.5px] font-medium text-ink animate-fade-in">
          {toast}
        </div>
      )}

      {/* Cover the page until the doctor explicitly starts. AI only begins
          listening after Start is clicked. */}
      <Modal
        open={!sessionStarted}
        onClose={() => {
          /* not dismissible — forces an explicit choice */
        }}
        size="md"
        closeOnBackdrop={false}
        title={`Start consultation with ${patient.name}?`}
        description="Confirm to begin the session. The AI will start transcribing and filling the prescription as you talk — you can pause or end the consult any time."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => navigate(`/patients/${patient.id}`)}
            >
              Not now
            </Button>
            <Button
              variant="primary"
              leftIcon={<Mic />}
              onClick={handleStartSession}
            >
              Start &amp; listen
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3 rounded-md border border-line bg-surface-muted px-3 py-2.5">
          <Avatar name={patient.name} size="md" />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="font-serif text-[14.5px] font-semibold text-ink truncate">
              {patient.name}
            </div>
            <div className="text-[11.5px] text-ink-3 font-mono truncate">
              {patient.code} · {patient.age}y ·{' '}
              {patient.sex === 'female' ? 'Female' : patient.sex === 'male' ? 'Male' : '—'}
              {patient.conditions?.length
                ? ` · ${patient.conditions.map((c) => c.name).join(', ')}`
                : ''}
            </div>
          </div>
        </div>
        <ul className="mt-3 flex flex-col gap-1 text-[12.5px] text-ink-2">
          <li>
            • AI transcription runs in {lang === 'bn' ? 'Bangla' : 'English'} — toggle any time from the top bar.
          </li>
          <li>• The session stays alive if you navigate away — just tap the pill to come back.</li>
          <li>• Choose <b>Save as draft</b> or <b>Finalise</b> while consulting to pre-commit; then <b>End consultation</b> is one-click.</li>
        </ul>
      </Modal>

      <EndSessionModal
        open={endOpen}
        kind="consult"
        onClose={() => setEndOpen(false)}
        onConfirm={handleEndAction}
        patientName={patient.name}
        busyAction={endBusy}
        summary={{
          chiefComplaint: !!draft.chiefComplaint,
          diagnosesCount: draft.diagnoses.length,
          testsCount: draft.tests.length,
          medicinesCount: draft.medicines.length,
          hasFollowUp: !!draft.followUp,
        }}
      />

      <RxPreviewInlineModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        doctor={doctor}
        patient={patient}
        draft={draft}
      />

      <TemplatePickerModal
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        onApply={applyTemplate}
      />
    </div>
  );
}

/** Append items from `extra` that aren't already in `current`. */
function mergeList(current: string[] = [], extra?: string[]): string[] {
  if (!extra?.length) return current;
  const set = new Set(current.map((s) => s.toLowerCase()));
  const out = [...current];
  for (const item of extra) {
    if (!set.has(item.toLowerCase())) {
      out.push(item);
      set.add(item.toLowerCase());
    }
  }
  return out;
}

/* ── Small helpers ───────────────────────────────────────── */

function Divider() {
  return <span className="h-3.5 w-px bg-line-strong mx-1" />;
}

function Dot() {
  return <span className="text-ink-4">·</span>;
}

function shortCondition(name: string): string {
  return name.replace('Type 2 Diabetes', 'T2DM').replace('Hypertension', 'HTN');
}

function VitalTile({
  icon,
  label,
  value,
  unit,
  tone,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
  tone?: 'warn';
  onChange?: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const commit = () => {
    const v = draft.trim() || value;
    if (onChange && v !== value) onChange(v);
    setEditing(false);
  };
  return (
    <div
      className={cn(
        'min-w-[86px] rounded-lg border px-3 py-2 leading-tight cursor-pointer transition-shadow',
        tone === 'warn'
          ? 'bg-warn-soft border-warn/30'
          : 'bg-surface border-line hover:border-line-strong hover:shadow-xs'
      )}
      onClick={() => {
        if (!editing && onChange) {
          setDraft(value);
          setEditing(true);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div
        className={cn(
          'flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[1.2px]',
          tone === 'warn' ? 'text-warn' : 'text-ink-3'
        )}
      >
        <span className="[&>svg]:h-3 [&>svg]:w-3">{icon}</span>
        {label}
        {onChange && !editing && (
          <Pencil
            className={cn(
              'h-2.5 w-2.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity',
              tone === 'warn' ? 'text-warn' : 'text-ink-3'
            )}
          />
        )}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              }
              if (e.key === 'Escape') setEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'font-serif font-semibold text-[18px] leading-none bg-transparent border-0 outline-none focus:ring-0 p-0 w-full max-w-[90px]',
              tone === 'warn' ? 'text-warn' : 'text-ink'
            )}
          />
        ) : (
          <span
            className={cn(
              'font-serif font-semibold text-[18px] leading-none',
              tone === 'warn' ? 'text-warn' : 'text-ink'
            )}
          >
            {value}
          </span>
        )}
        <span className="text-[11px] font-mono text-ink-3">{unit}</span>
      </div>
    </div>
  );
}

function TranscriptBubble({ turn, lang }: { turn: ConsultTurn; lang: Lang }) {
  const isDoctor = turn.who === 'doctor';
  const primary = lang === 'bn' && turn.textBn ? turn.textBn : turn.text;
  const secondary = lang === 'bn' && turn.textBn ? turn.text : turn.textBn;
  return (
    <div className={cn('flex gap-2.5 items-start animate-fade-in', !isDoctor && 'flex-row-reverse')}>
      <div
        className={cn(
          'h-7 w-7 rounded-full grid place-items-center text-[10px] font-bold shrink-0',
          isDoctor ? 'bg-accent text-white' : 'bg-bg-muted text-ink-2'
        )}
      >
        {isDoctor ? 'Dr' : 'Pt'}
      </div>
      <div
        className={cn(
          'max-w-[82%] rounded-lg px-3 py-2 border',
          isDoctor ? 'bg-accent-softer border-accent-soft' : 'bg-surface border-line'
        )}
      >
        <div className="text-[9px] font-bold uppercase tracking-[1.2px] text-ink-3 mb-0.5">
          {isDoctor ? 'Doctor' : 'Patient'}
        </div>
        <div
          className={cn(
            'text-[13px] leading-relaxed text-ink',
            lang === 'bn' && turn.textBn && 'font-bn'
          )}
        >
          {primary}
        </div>
        {secondary && (
          <div className="text-[11px] text-ink-3 mt-0.5 italic leading-snug">{secondary}</div>
        )}
      </div>
    </div>
  );
}

function Waveform({ active }: { active: boolean }) {
  const bars = Array.from({ length: 34 });
  return (
    <div className="flex-1 flex items-center gap-[3px] h-8 overflow-hidden">
      {bars.map((_, i) => {
        const h = active ? 15 + Math.abs(Math.sin((Date.now() / 140 + i) * 0.9)) * 75 : 10;
        return (
          <span
            key={i}
            className={cn(
              'w-[3px] rounded-full transition-all',
              active ? 'bg-accent' : 'bg-line'
            )}
            style={{ height: `${h}%` }}
          />
        );
      })}
    </div>
  );
}
