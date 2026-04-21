import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AudioLines,
  ChevronLeft,
  ExternalLink,
  Eye,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  Pause,
  Phone,
  PhoneOff,
  Printer,
  Signal,
  Sparkles,
  UserPlus,
  Video,
  VideoOff,
  Volume2,
} from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { TalkToAIModal } from '../components/prescription/TalkToAIModal';
import { RxLivePaper } from '../components/prescription/RxLivePaper';
import { AddMedicineForm } from '../components/prescription/AddMedicineForm';
import { RxPaper } from '../components/prescription/RxPaper';
import { printRxScoped } from '../lib/printRx';
import {
  EndSessionModal,
  type EndSessionAction,
  type EndSessionPayload,
} from '../components/session/EndSessionModal';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { BrandMark } from '../components/layout/BrandMark';
import { useActiveSessionStore } from '../stores/activeSessionStore';
import {
  useAppointments,
  useConsultScript,
  useCreateVisit,
  useCurrentDoctor,
  usePatient,
  usePromoteAppointmentDraft,
  useSetAppointmentPresence,
} from '../queries/hooks';
import { cn } from '../lib/cn';
import type { ConsultTurn, RxMedicine } from '../types';

type Lang = 'bn' | 'en';

export function VideoCall() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { data: appointments = [] } = useAppointments();
  const appointment = appointments.find((a) => a.id === appointmentId);
  const { data: patient } = usePatient(appointment?.patientId);
  const { data: doctor } = useCurrentDoctor();
  const { data: script = [] } = useConsultScript();
  const promoteDraft = usePromoteAppointmentDraft();
  const setPresence = useSetAppointmentPresence();

  /**
   * Promote the appointment's patientDraft to a real Patient record the
   * moment this call loads. Runs once per appointment — no-op if the
   * appointment already has a linked patientId.
   */
  const promotedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!appointment) return;
    if (appointment.patientId) return;
    if (!appointment.patientDraft) return;
    if (promotedRef.current === appointment.id) return;
    promotedRef.current = appointment.id;
    promoteDraft.mutate(appointment.id);
  }, [appointment, promoteDraft]);

  // Session state flows through the global store so the call keeps running
  // (AI listening, Rx draft updating, clock ticking) even when the doctor
  // navigates to /patients or elsewhere.
  const active = useActiveSessionStore((s) => s.active);
  const startSession = useActiveSessionStore((s) => s.start);
  const endSession = useActiveSessionStore((s) => s.end);
  const setRecording = useActiveSessionStore((s) => s.setRecording);
  const setLang = useActiveSessionStore((s) => s.setLang);
  const setDraftStore = useActiveSessionStore((s) => s.setDraft);
  const setStripOverridesStore = useActiveSessionStore((s) => s.setStripOverrides);
  const setMicStore = useActiveSessionStore((s) => s.setMic);
  const setCamStore = useActiveSessionStore((s) => s.setCam);
  const setPatientLeftStore = useActiveSessionStore((s) => s.setPatientLeft);

  // Once the doctor explicitly ends the call we're about to navigate away —
  // the useEffect below MUST NOT auto-restart a session during that brief
  // interval, otherwise the "Call with …" pill would resurrect itself.
  const endedRef = useRef(false);

  useEffect(() => {
    if (endedRef.current) return;
    if (!appointment) return;
    // Wait until any draft patient has been promoted to a real record.
    if (!appointment.patientId) return;
    // Wait until the doctor has explicitly joined the room (Meet-style).
    if (!appointment.doctorPresent) return;
    if (active?.kind === 'call' && active.patientId === appointment.patientId) return;
    startSession({
      kind: 'call',
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      returnPath: `/call/${appointment.id}`,
      autoRecord: true,
    });
    // Seed the Rx's chief complaint from the reason captured at booking
    // time. Only fills once — the doctor can edit freely after.
    if (appointment.reason?.trim()) {
      setDraftStore((d) =>
        d.chiefComplaint ? d : { ...d, chiefComplaint: appointment.reason!.trim() }
      );
    }
  }, [appointment, active, startSession]);

  const session =
    active && active.kind === 'call' && appointment && active.patientId === appointment.patientId
      ? active
      : null;

  const recording = session?.recording ?? true;
  const lang: Lang = (session?.lang as Lang) ?? 'bn';
  const elapsed = session?.elapsed ?? 0;
  const transcript = session?.transcript ?? [];
  const scriptIndex = session?.scriptIndex ?? 0;
  const draft = session?.draft ?? {
    chiefComplaint: '', oe: [], diagnoses: [], tests: [], advice: [], medicines: [], followUp: '', operation: [],
  };
  const stripOverrides = session?.stripOverrides ?? {};
  const micOn = session?.micOn ?? true;
  const camOn = session?.camOn ?? true;
  const patientLeft = session?.patientLeft ?? false;

  const setDraft = setDraftStore;
  const setStripOverrides = (patch: {
    patientName?: string;
    ageSex?: string;
    bp?: string;
    weight?: string;
    date?: string;
  }) => setStripOverridesStore(patch);
  const setMicOn = (on: boolean) => setMicStore(on);
  const setCamOn = (on: boolean) => setCamStore(on);
  const setPatientLeft = (left: boolean) => setPatientLeftStore(left);

  const [aiOpen, setAiOpen] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [addMedOpen, setAddMedOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<RxMedicine | null>(null);
  const [endOpen, setEndOpen] = useState(false);
  const [endBusy, setEndBusy] = useState<EndSessionAction | null>(null);
  /**
   * Two-phase close: first click of "End call" just hangs up the video/audio
   * and leaves the Rx editor on screen so the doctor can finish writing. A
   * second explicit action ("End session") is what persists the visit +
   * opens the prescription decision modal.
   */
  const [callEnded, setCallEnded] = useState(false);
  const createVisit = useCreateVisit();

  const [previewOpen, setPreviewOpen] = useState(false);

  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  // Attach/detach the captured screen stream to the video element.
  useEffect(() => {
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = screenStream;
    }
    return () => {
      if (!screenStream) return;
      // If the user stops sharing via the browser UI, clean up.
    };
  }, [screenStream]);

  // Stop screen share on unmount so the browser indicator goes away.
  useEffect(() => {
    return () => {
      screenStream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleScreenShare = async () => {
    setScreenError(null);
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setScreenError('Your browser does not support screen sharing.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: false,
      });
      // When the user ends the share from the browser bar, clean up state.
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          setScreenStream((cur) => (cur === stream ? null : cur));
        });
      });
      setScreenStream(stream);
    } catch (err) {
      // User cancelled the picker or permissions denied — quietly reset.
      const name = (err as { name?: string })?.name;
      if (name !== 'AbortError' && name !== 'NotAllowedError') {
        setScreenError('Could not start screen sharing.');
      }
    }
  };

  // Elapsed ticking + scripted transcript streaming are driven globally by
  // `SessionRunner`, so the call keeps progressing when the doctor is off
  // this page.

  // Demo: once the scripted conversation finishes, simulate the patient
  // leaving the call so the doctor sees the banner + wrap-up flow.
  useEffect(() => {
    if (scriptIndex < script.length || patientLeft) return;
    const t = window.setTimeout(() => setPatientLeft(true), 3500);
    return () => window.clearTimeout(t);
  }, [scriptIndex, script.length, patientLeft, setPatientLeft]);

  // SessionRunner handles the scripted AI transcription + draft fill so
  // the call keeps advancing even when the doctor is off this page.

  const clock = useMemo(() => {
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    return `${h ? `${h.toString().padStart(2, '0')}:` : ''}${m
      .toString()
      .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [elapsed]);

  const handleAI = (command: string) => {
    const c = command.toLowerCase();
    if (c.startsWith('add ')) {
      const brand = command.slice(4).trim();
      setDraft((d) => ({
        ...d,
        medicines: [
          ...d.medicines,
          { id: `ai-${Date.now()}`, brand, dose: '1+0+1', duration: '5 days' },
        ],
      }));
    } else if (c.startsWith('advice:')) {
      const rest = command.slice(7).trim();
      setDraft((d) => ({ ...d, advice: [...d.advice, rest] }));
    }
  };

  /** Hang up video / audio / screen share, but keep the session alive so
   *  the doctor can finish the prescription. AI transcription also stops.
   *  Doctor presence in the room is preserved through this wrap-up phase;
   *  only End-session actually empties the room. */
  const hangUpCall = () => {
    if (callEnded) return;
    screenStream?.getTracks().forEach((t) => t.stop());
    setScreenStream(null);
    setRecording(false);
    setMicStore(false);
    setCamStore(false);
    setCallEnded(true);
  };

  /** Undo a hang-up — doctor didn't actually mean to end the call and
   *  wants to resume audio/video with the patient. AI and mic/cam turn
   *  back on; the Rx draft is untouched. */
  const rejoinCall = () => {
    setCallEnded(false);
    setRecording(true);
    setMicStore(true);
    setCamStore(true);
  };

  /** Persistent tele join link that the doctor can share with the patient
   *  any time before the appointment is closed. The backend builds this
   *  from the appointment's `joinToken`. */
  const [linkCopied, setLinkCopied] = useState(false);
  const patientJoinUrl =
    appointment?.joinToken
      ? `${window.location.origin}/join/${appointment.joinToken}`
      : null;
  const copyPatientLink = async () => {
    if (!patientJoinUrl) return;
    try {
      await navigator.clipboard.writeText(patientJoinUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1800);
    } catch {
      /* clipboard may be blocked — fall through silently */
    }
  };

  const openEndSession = () => setEndOpen(true);

  // End also clears the session so the ongoing-session pill goes away.
  const clearSession = () => endSession();

  const handleEndAction = async ({ action, print }: EndSessionPayload) => {
    if (!patient || !appointment) return;
    endedRef.current = true;
    setEndBusy(action);
    screenStream?.getTracks().forEach((t) => t.stop());

    try {
      await createVisit.mutateAsync({
        patientId: patient.id,
        patientName: patient.name,
        type: 'tele',
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
    } finally {
      setEndBusy(null);
      setEndOpen(false);
      clearSession();
      // Now that the session is persisted, formally leave the room.
      setPresence.mutate({
        id: appointment.id,
        actor: 'doctor',
        present: false,
      });
    }

    if (action === 'finalize' && print) {
      // Give the navigation a tick so the print dialog opens against the new page.
      window.setTimeout(() => printRxScoped(), 300);
    }

    if (action === 'finalize') {
      navigate(`/patients/${patient.id}`, {
        state: { toast: `Prescription finalised for ${patient.name}` },
      });
    } else if (action === 'draft') {
      navigate('/consultations', {
        state: { toast: `Draft saved — find it under Consultations for ${patient.name}` },
      });
    } else {
      navigate('/appointments');
    }
  };

  if (!appointment || !patient || !doctor) {
    return (
      <div className="min-h-screen bg-ink grid place-items-center text-white">
        <div className="text-[13px] font-mono uppercase tracking-[1.4px] opacity-60">
          Loading call…
        </div>
      </div>
    );
  }

  // Lobby — doctor hasn't joined the room yet (fresh visit, or returning
  // after ending a previous meeting). Shows appointment summary + the
  // patient's presence so the doctor knows whether they're waiting or
  // joining an already-live room.
  if (!appointment.doctorPresent) {
    const meetingEnded =
      !!appointment.meetingEndedAt &&
      (!appointment.meetingStartedAt ||
        appointment.meetingEndedAt > appointment.meetingStartedAt);
    return (
      <div className="min-h-screen bg-ink text-white flex flex-col">
        <div className="h-14 shrink-0 px-4 flex items-center justify-between border-b border-white/10 bg-ink/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/appointments')}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-[12.5px] font-semibold">Back to appointments</span>
            </button>
            <div className="h-6 w-px bg-white/10" />
            <BrandMark tone="dark" />
          </div>
          <Badge tone="success" variant="soft" uppercase icon={<Video />}>
            Virtual consult · lobby
          </Badge>
        </div>

        <main className="flex-1 grid place-items-center px-6 py-10">
          <div className="w-full max-w-[560px] rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-accent/20 animate-pulse-ring"
                />
                <Avatar
                  name={patient.name}
                  size="xl"
                  className="h-20 w-20 text-[28px]"
                />
              </div>
            </div>
            <div className="font-serif text-[22px] font-semibold">
              {patient.name}
            </div>
            <div className="text-[12.5px] text-white/60 font-mono mt-1">
              {patient.code} · {patient.age}y · {appointment.start.slice(0, 16).replace('T', ' ')}
            </div>

            <div className="mt-6 mb-6 flex items-center justify-center gap-2 flex-wrap">
              {appointment.patientPresent ? (
                <Badge tone="success" variant="soft" uppercase>
                  Patient is in the room
                </Badge>
              ) : meetingEnded ? (
                <Badge tone="neutral" variant="soft" uppercase>
                  Previous meeting ended · click to re-open
                </Badge>
              ) : (
                <Badge tone="neutral" variant="soft" uppercase>
                  Waiting for the patient
                </Badge>
              )}
            </div>

            {appointment.reason && (
              <div className="text-left rounded-md bg-black/30 border border-white/10 px-3 py-2.5 mb-6">
                <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-white/60">
                  Reason for visit
                </div>
                <p className="text-[13px] text-white/90 mt-1 leading-relaxed">
                  {appointment.reason}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Button
                variant="primary"
                leftIcon={<Video />}
                loading={setPresence.isPending}
                onClick={() =>
                  setPresence.mutate({
                    id: appointment.id,
                    actor: 'doctor',
                    present: true,
                  })
                }
              >
                Join call
              </Button>
              {patientJoinUrl && (
                <Button
                  variant="ghost"
                  leftIcon={<ExternalLink />}
                  onClick={copyPatientLink}
                  className="text-white/80 hover:text-white"
                >
                  {linkCopied ? 'Link copied' : 'Copy patient link'}
                </Button>
              )}
            </div>
            <p className="text-[11.5px] text-white/50 mt-3 leading-relaxed">
              The patient has a persistent join link for this appointment —
              either of you can open the room any time. When both leave, the
              meeting ends; rejoining re-opens it.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Last 1–2 transcript turns appear as captions.
  const caption = transcript[transcript.length - 1];
  const prevCaption = transcript[transcript.length - 2];

  return (
    <div className="h-screen overflow-hidden bg-ink text-white flex flex-col">
      {/* ── Top bar ────────────────────────────────────────── */}
      <div className="h-14 shrink-0 px-4 flex items-center justify-between border-b border-white/10 bg-ink/95 backdrop-blur">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={callEnded ? openEndSession : hangUpCall}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-[12.5px] font-semibold">Back</span>
          </button>
          <div className="h-6 w-px bg-white/10" />
          <BrandMark tone="dark" />
        </div>

        <div className="flex items-center gap-2">
          {callEnded ? (
            <Badge tone="warn" variant="soft" uppercase>
              Call ended · finish Rx
            </Badge>
          ) : (
            <Badge tone="success" variant="soft" uppercase icon={<Video />}>
              Virtual consult
            </Badge>
          )}
          <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-white/5 border border-white/10 text-[12px] font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            {clock}
          </div>
          <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-white/5 border border-white/10 text-[11.5px]">
            <Signal className="h-3.5 w-3.5 text-success" />
            <span className="text-white/80">Excellent</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {patientJoinUrl && (
            <button
              type="button"
              onClick={copyPatientLink}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white/10 hover:bg-white/15 text-[12.5px] font-semibold"
              title="Copy the patient's join link"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {linkCopied ? 'Copied' : 'Copy patient link'}
            </button>
          )}
          <a
            href={`/patients/${patient.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white/10 hover:bg-white/15 text-[12.5px] font-semibold"
            title={`Open ${patient.name}'s profile in a new tab`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View profile
          </a>
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white/10 hover:bg-white/15 text-[12.5px] font-semibold"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Talk to AI
            <kbd className="font-mono text-[10px] bg-black/30 rounded-xs px-1.5 py-0.5">⌘K</kbd>
          </button>
          {callEnded ? (
            <button
              type="button"
              onClick={openEndSession}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-danger hover:brightness-95 text-[12.5px] font-semibold shadow-sm"
            >
              <PhoneOff className="h-3.5 w-3.5" />
              End session
            </button>
          ) : (
            <button
              type="button"
              onClick={hangUpCall}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-danger hover:brightness-95 text-[12.5px] font-semibold shadow-sm"
            >
              <PhoneOff className="h-3.5 w-3.5" />
              End call
            </button>
          )}
        </div>
      </div>

      {/* ── Main split: video (left) + live Rx (right).
          Video column is flexible (fills whatever's left), Rx column is
          fixed so the A4 sheet stays at its real size. After the call is
          hung up, the video column collapses and the Rx takes the whole
          screen. */}
      <div
        className={cn(
          'flex-1 min-h-0 grid grid-cols-1 gap-0',
          !callEnded && 'lg:grid-cols-[1fr_900px]'
        )}
      >
        {/* Video column — stacked patient tile + self PiP + captions.
            The gradient covers the full column width, but the actual tile /
            captions / controls are capped at 560px and centered so they
            don't float as lonely islands on wide monitors. Fully collapsed
            once the call has been hung up. */}
        {!callEnded && (
        <div className="relative bg-gradient-to-br from-[#0B1220] via-[#111A2E] to-[#18223A] border-r border-white/10 overflow-hidden flex flex-col min-h-[360px] min-w-0">
          {/* Screen share surface (takes over when active) */}
          {screenStream && (
            <div className="absolute inset-3 rounded-xl overflow-hidden bg-black border border-accent/50 shadow-lg z-10">
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain bg-black"
              />
              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent/90 text-white text-[10.5px] font-bold uppercase tracking-[1.3px]">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                Sharing your screen
              </div>
              <button
                type="button"
                onClick={toggleScreenShare}
                className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/60 hover:bg-black/80 text-white text-[11px] font-semibold"
              >
                Stop sharing
              </button>
            </div>
          )}
          {screenError && (
            <div className="absolute top-12 right-3 z-30 max-w-[260px] rounded-md bg-danger text-white text-[11.5px] px-3 py-2 shadow-lg">
              {screenError}
            </div>
          )}

          {/* Inner container — pads the column uniformly. */}
          <div className="relative flex-1 flex flex-col min-h-0 w-full mx-auto">

          {/* Patient left banner — doctor can still finalise the Rx */}
          {patientLeft && (
            <div className="mx-3 mt-3 rounded-md bg-warn/15 border border-warn/40 text-warn-soft px-3 py-2 text-[12.5px] flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-warn" />
              <span className="flex-1">
                <b className="font-semibold text-white">{patient.name} left the call.</b>{' '}
                You can still finalise the prescription; they'll receive it on their join
                link.
              </span>
              <button
                type="button"
                onClick={hangUpCall}
                className="text-[11.5px] font-semibold text-white underline underline-offset-2 hover:no-underline"
              >
                Wrap up
              </button>
            </div>
          )}

          {/* Patient tile */}
          <div className="relative flex-1 mx-3 mt-3 rounded-xl overflow-hidden bg-gradient-to-br from-[#1A2743] to-[#0B1220] border border-white/10 grid place-items-center min-h-[220px]">
            {/* Recording badge + CC + lang toggle overlay the video tile */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
              {recording && (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-live/90 text-white text-[10.5px] font-bold uppercase tracking-[1.3px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  AI recording
                </div>
              )}
            </div>
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCaptionsOn((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-semibold transition-colors',
                  captionsOn
                    ? 'bg-white/15 text-white'
                    : 'bg-white/5 text-white/60 hover:text-white'
                )}
                title={captionsOn ? 'Hide captions' : 'Show captions'}
              >
                CC
              </button>
              <button
                type="button"
                onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
                className="inline-flex items-center h-7 px-2 rounded-md bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-white"
              >
                <span className={cn('font-bn', lang === 'bn' && 'text-accent-soft')}>বাং</span>
                <span className="mx-0.5 text-white/40">·</span>
                <span className={cn(lang === 'en' && 'text-accent-soft')}>EN</span>
              </button>
            </div>

            {camOn ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="relative">
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-accent/20 animate-pulse-ring"
                  />
                  <Avatar name={patient.name} size="xl" className="h-20 w-20 text-[28px]" />
                </div>
                <div>
                  <div className="font-serif text-[17px] font-semibold text-white tracking-tight">
                    {patient.name}
                  </div>
                  <div className="text-[11px] text-white/60 mt-0.5 font-mono">
                    {patient.code} · {patient.age}y
                  </div>
                </div>
                <div className="flex items-end gap-1 h-5">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <span
                      key={i}
                      className="w-[2.5px] rounded-full bg-accent/70"
                      style={{
                        height: `${20 + Math.abs(Math.sin((Date.now() / 180 + i) * 0.8)) * 80}%`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <VideoOff className="h-8 w-8 text-white/40 mx-auto" />
                <div className="text-[12px] text-white/60 mt-2">
                  {patient.name} turned off camera
                </div>
              </div>
            )}

            <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 px-2 py-1 rounded-md bg-black/50 backdrop-blur text-[11.5px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              {patient.name}
              <Volume2 className="h-3 w-3 text-white/60" />
            </div>

            {/* Self view PiP */}
            <div className="absolute right-3 bottom-3 w-[110px] h-[72px] rounded-lg overflow-hidden bg-gradient-to-br from-accent-ink to-ink border-2 border-white/20 shadow-lg grid place-items-center">
              {camOn ? (
                <>
                  <Avatar name={doctor.name} size="sm" className="h-9 w-9" />
                  <div className="absolute bottom-1 left-1 text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-black/60 backdrop-blur">
                    You
                  </div>
                </>
              ) : (
                <VideoOff className="h-4 w-4 text-white/50" />
              )}
              {!micOn && (
                <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-danger grid place-items-center">
                  <MicOff className="h-2.5 w-2.5" />
                </div>
              )}
            </div>
          </div>

          {/* Live-caption strip under the video — latest 1–2 turns, fading */}
          <div className="mx-3 mt-2 rounded-lg bg-black/55 backdrop-blur px-3 py-2.5 min-h-[68px] max-h-[120px] overflow-hidden">
            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[1.4px] text-accent-soft mb-1">
              <Sparkles className="h-3 w-3" />
              Live AI captions
            </div>
            {!captionsOn ? (
              <div className="text-[11px] text-white/40 italic">Captions hidden (CC to show)</div>
            ) : transcript.length === 0 ? (
              <div className="text-[11.5px] text-white/50 italic">
                Waiting for the conversation…
              </div>
            ) : (
              <div className="space-y-0.5">
                {prevCaption && (
                  <CaptionLine turn={prevCaption} lang={lang} muted />
                )}
                {caption && <CaptionLine turn={caption} lang={lang} />}
              </div>
            )}
          </div>

          {/* Call controls — scoped to the video column */}
          <div className="mx-3 mt-3 mb-3 rounded-xl bg-black/40 backdrop-blur border border-white/10 px-2.5 py-2 flex items-center justify-center gap-1.5 flex-wrap">
            <CallControl
              size="sm"
              label={micOn ? 'Mute' : 'Unmute'}
              tone={micOn ? 'neutral' : 'danger'}
              onClick={() => setMicOn(!micOn)}
            >
              {micOn ? <Mic /> : <MicOff />}
            </CallControl>
            <CallControl
              size="sm"
              label={camOn ? 'Stop video' : 'Start video'}
              tone={camOn ? 'neutral' : 'danger'}
              onClick={() => setCamOn(!camOn)}
            >
              {camOn ? <Video /> : <VideoOff />}
            </CallControl>
            <CallControl
              size="sm"
              label={screenStream ? 'Stop sharing' : 'Share screen'}
              tone={screenStream ? 'accent' : 'neutral'}
              onClick={toggleScreenShare}
            >
              <MonitorUp />
            </CallControl>
            <CallControl size="sm" label="Chat" onClick={() => {}}>
              <MessageSquare />
            </CallControl>
            <CallControl size="sm" label="Add participant" onClick={() => {}}>
              <UserPlus />
            </CallControl>
            <CallControl
              size="sm"
              label={recording ? 'Pause AI transcription' : 'Resume AI transcription'}
              tone={recording ? 'recording' : 'neutral'}
              onClick={() => setRecording(!recording)}
            >
              {recording ? (
                <span className="relative inline-flex items-center justify-center">
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-live/40 animate-pulse-ring"
                  />
                  <AudioLines className="relative z-10" />
                </span>
              ) : (
                <Pause />
              )}
            </CallControl>
            <div className="w-px h-7 bg-white/10 mx-0.5" />
            <button
              type="button"
              onClick={hangUpCall}
              className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-danger text-white font-semibold text-[12.5px] shadow-sm hover:brightness-95 transition-all"
            >
              <Phone className="h-3.5 w-3.5 rotate-[135deg]" />
              End call
            </button>
          </div>
          </div>
        </div>
        )}

        {/* Live prescription — rendered at its real A4 size, centered on a
            muted "desk" background with breathing room on either side. */}
        <div
          className={cn(
            'relative overflow-y-auto bg-bg-muted',
            !callEnded && 'border-l border-line'
          )}
        >
          <div className="px-10 py-6 mx-auto" style={{ width: 820 + 40 * 2 }}>
            {callEnded && (
              <div className="mb-4 rounded-lg bg-warn-soft border border-warn/40 text-warn px-4 py-3 flex items-center gap-3 flex-wrap">
                <PhoneOff className="h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-[220px]">
                  <div className="text-[13.5px] font-semibold text-ink">
                    Call ended with {patient.name}. Finish the prescription.
                  </div>
                  <p className="text-[12px] text-ink-2 mt-0.5">
                    Audio / video is off. Rejoin if you need to talk again,
                    or keep editing the Rx and click <b>End session</b> when
                    you're done.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Video />}
                    onClick={rejoinCall}
                  >
                    Rejoin call
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<PhoneOff />}
                    onClick={openEndSession}
                  >
                    End session
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
              <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.4px] text-accent-ink">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {callEnded ? 'Prescription' : 'Live prescription'}
                <span className="text-ink-3 font-normal normal-case tracking-normal text-[11.5px] ml-1">
                  · {callEnded ? 'editable until you end the session' : 'filling as you talk'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Eye />}
                  onClick={() => setPreviewOpen(true)}
                >
                  Preview
                </Button>
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
              bp={(session?.vitals?.bp ?? '140/90') + ' mmHg'}
              weight={(session?.vitals?.weight ?? '68') + ' kg'}
              date={stripOverrides.date}
              onPatientStripChange={(patch) => {
                const {
                  bp: _bp,
                  weight: _weight,
                  ...rest
                } = patch as {
                  patientName?: string;
                  ageSex?: string;
                  date?: string;
                  bp?: string;
                  weight?: string;
                };
                if (Object.keys(rest).length) setStripOverrides(rest);
              }}
            />
          </div>
        </div>
      </div>

      <TalkToAIModal open={aiOpen} onClose={() => setAiOpen(false)} onSubmit={handleAI} />

      <EndSessionModal
        open={endOpen}
        kind="call"
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

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        size="xl"
        title="Prescription preview"
        description="Exactly what will print for the patient."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            <Button variant="primary" leftIcon={<Printer />} onClick={() => printRxScoped()}>
              Print
            </Button>
          </>
        }
      >
        <RxPaper
          doctor={doctor}
          patient={patient}
          chamberId={doctor.chambers[0].id}
          rx={{
            id: `rx-live-${appointment.id}`,
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
      </Modal>

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
    </div>
  );
}

function CallControl({
  label,
  children,
  tone = 'neutral',
  size = 'md',
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  tone?: 'neutral' | 'danger' | 'accent' | 'recording';
  size?: 'sm' | 'md';
  onClick: () => void;
}) {
  const toneClass =
    tone === 'danger'
      ? 'bg-danger text-white hover:brightness-95'
      : tone === 'accent'
      ? 'bg-accent text-white hover:bg-accent-hover'
      : tone === 'recording'
      ? 'bg-live text-white hover:brightness-95 ring-2 ring-live/30'
      : 'bg-white/10 text-white hover:bg-white/15';
  const sizeClass =
    size === 'sm'
      ? 'h-10 w-10 [&>svg]:h-3.5 [&>svg]:w-3.5'
      : 'h-12 w-12 [&>svg]:h-4 [&>svg]:w-4';
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-colors',
        sizeClass,
        toneClass
      )}
    >
      {children}
    </button>
  );
}

function CaptionLine({
  turn,
  lang,
  muted,
}: {
  turn: ConsultTurn;
  lang: Lang;
  muted?: boolean;
}) {
  const isDoctor = turn.who === 'doctor';
  const primary = lang === 'bn' && turn.textBn ? turn.textBn : turn.text;
  return (
    <div
      className={cn(
        'flex items-baseline gap-2 text-[12.5px] leading-snug animate-fade-in',
        muted ? 'opacity-45' : 'opacity-100'
      )}
    >
      <span
        className={cn(
          'shrink-0 text-[9px] font-bold uppercase tracking-[1.2px] rounded-xs px-1.5 py-[1px]',
          isDoctor ? 'bg-accent/30 text-accent-soft' : 'bg-white/10 text-white/70'
        )}
      >
        {isDoctor ? 'Dr' : 'Pt'}
      </span>
      <span
        className={cn(
          'text-white/90',
          lang === 'bn' && turn.textBn && 'font-bn'
        )}
      >
        {primary}
      </span>
    </div>
  );
}
