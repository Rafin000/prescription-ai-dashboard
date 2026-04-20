import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Phone,
  ShieldCheck,
  Video,
  VideoOff,
  Volume2,
} from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { BrandMark } from '../components/layout/BrandMark';
import { guestService } from '../services/guestService';
import { useGuestAppointment } from '../queries/hooks';
import { cn } from '../lib/cn';
import { fmtTime, fmtDate } from '../lib/format';

type Stage = 'loading' | 'error' | 'connecting' | 'in_call' | 'ended';

export function PatientJoin() {
  const { token } = useParams<{ token: string }>();
  const { data: appt, isLoading, error } = useGuestAppointment(token);

  const [stage, setStage] = useState<Stage>('loading');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  // Resolve loading/error/connect.
  useEffect(() => {
    if (isLoading) {
      setStage('loading');
      return;
    }
    if (error || !appt) {
      setStage('error');
      return;
    }
    setStage('connecting');
    // Announce presence so doctor's side flips to "patient joined".
    if (token) guestService.announce(token, appt.patientName).catch(() => {});
    // Simulate connecting handshake — one second and we're in.
    const t = window.setTimeout(() => setStage('in_call'), 1200);
    return () => window.clearTimeout(t);
  }, [isLoading, error, appt, token]);

  // Best-effort depart on unmount (tab close / navigation away).
  useEffect(() => {
    return () => {
      if (token) guestService.depart(token).catch(() => {});
    };
  }, [token]);

  // Call timer
  useEffect(() => {
    if (stage !== 'in_call') return;
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [stage]);

  const clock = useMemo(() => {
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    return `${h ? `${h.toString().padStart(2, '0')}:` : ''}${m
      .toString()
      .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [elapsed]);

  if (stage === 'loading') return <FullPageSpinner message="Checking your invite…" />;

  if (stage === 'error' || !appt) {
    return (
      <InvalidLink
        title="This link has expired"
        message="Ask your doctor to send a fresh join link. Each link is one-time and bound to your appointment."
      />
    );
  }

  return (
    <div className="min-h-screen bg-ink text-white flex flex-col">
      {/* Top bar */}
      <div className="h-14 shrink-0 px-5 flex items-center justify-between border-b border-white/10 bg-ink/95">
        <BrandMark tone="dark" />
        <div className="flex items-center gap-2 text-[11.5px] text-white/60">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          <span>Encrypted · private to you and your doctor</span>
        </div>
      </div>

      {/* Stage */}
      <div className="flex-1 min-h-0 grid place-items-center px-5 py-8">
        {stage === 'connecting' && (
          <div className="text-center max-w-md">
            <div className="relative mx-auto h-24 w-24 rounded-full bg-accent/20 grid place-items-center mb-5">
              <span className="absolute inset-0 rounded-full bg-accent/30 animate-pulse-ring" />
              <Avatar name={appt.doctor.name} size="xl" className="relative h-20 w-20" />
            </div>
            <div className="font-serif text-[22px] font-semibold leading-tight">
              Connecting you to {appt.doctor.name}…
            </div>
            <p className="text-[13px] text-white/70 mt-2 leading-relaxed">
              {appt.doctor.specialty} · {appt.chamber.name}
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-[12px] text-white/60">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Establishing secure call
            </div>
          </div>
        )}

        {stage === 'in_call' && (
          <div className="w-full max-w-5xl h-full flex flex-col">
            {/* Doctor tile — the main stage */}
            <div className="relative flex-1 rounded-2xl overflow-hidden bg-gradient-to-br from-[#1A2743] to-[#0B1220] border border-white/10 grid place-items-center min-h-[360px]">
              <div className="flex flex-col items-center gap-5 text-center">
                <div className="relative">
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-accent/20 animate-pulse-ring"
                  />
                  <Avatar
                    name={appt.doctor.name}
                    size="xl"
                    className="h-28 w-28 text-[34px]"
                  />
                </div>
                <div>
                  <div className="font-serif text-[26px] font-semibold tracking-tight">
                    {appt.doctor.name}
                  </div>
                  <div className="text-[13px] text-white/60 mt-1">
                    {appt.doctor.specialty}
                  </div>
                </div>
                <div className="flex items-end gap-1 h-7">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <span
                      key={i}
                      className="w-[3px] rounded-full bg-accent/70"
                      style={{
                        height: `${25 + Math.abs(Math.sin((Date.now() / 200 + i) * 0.8)) * 75}%`,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="absolute top-4 left-4 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-black/50 backdrop-blur text-[12px] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {appt.doctor.name}
                <Volume2 className="h-3.5 w-3.5 text-white/60" />
              </div>

              <div className="absolute top-4 right-4 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-black/50 backdrop-blur text-[11.5px] font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                {clock}
              </div>

              {/* Self view */}
              <div className="absolute bottom-5 right-5 w-[170px] h-[110px] rounded-lg overflow-hidden bg-gradient-to-br from-accent-ink to-ink border-2 border-white/20 shadow-lg grid place-items-center">
                {camOn ? (
                  <>
                    <Avatar name={appt.patientName} size="lg" className="h-14 w-14" />
                    <div className="absolute bottom-1.5 left-1.5 text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-black/50 backdrop-blur">
                      You · {appt.patientName}
                    </div>
                  </>
                ) : (
                  <VideoOff className="h-5 w-5 text-white/50" />
                )}
                {!micOn && (
                  <div className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-danger grid place-items-center">
                    <MicOff className="h-3 w-3" />
                  </div>
                )}
              </div>
            </div>

            {/* Appointment detail strip */}
            <div className="mt-3 px-2 text-[11.5px] text-white/60 flex items-center justify-between">
              <div>
                Appointment: <span className="text-white font-medium">{fmtDate(appt.start)}</span>{' '}
                · {fmtTime(appt.start)}
              </div>
              <div className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                Your doctor sees you joined
              </div>
            </div>
          </div>
        )}

        {stage === 'ended' && (
          <div className="text-center max-w-md">
            <div className="h-16 w-16 rounded-full bg-white/10 grid place-items-center mx-auto">
              <Phone className="h-6 w-6 rotate-[135deg] text-white/70" />
            </div>
            <div className="font-serif text-[22px] font-semibold mt-4">Call ended</div>
            <p className="text-[13px] text-white/70 mt-1">
              Thank you. Your doctor's prescription will be sent to you shortly.
            </p>
          </div>
        )}
      </div>

      {/* Control dock */}
      {stage === 'in_call' && (
        <div className="h-20 shrink-0 border-t border-white/10 bg-ink/95 flex items-center justify-center gap-3 px-5">
          <CtrlBtn
            label={micOn ? 'Mute' : 'Unmute'}
            tone={micOn ? 'neutral' : 'danger'}
            onClick={() => setMicOn((v) => !v)}
          >
            {micOn ? <Mic /> : <MicOff />}
          </CtrlBtn>
          <CtrlBtn
            label={camOn ? 'Stop video' : 'Start video'}
            tone={camOn ? 'neutral' : 'danger'}
            onClick={() => setCamOn((v) => !v)}
          >
            {camOn ? <Video /> : <VideoOff />}
          </CtrlBtn>
          <CtrlBtn label="Chat" onClick={() => {}}>
            <MessageSquare />
          </CtrlBtn>
          <button
            type="button"
            onClick={() => {
              setStage('ended');
              if (token) guestService.depart(token).catch(() => {});
            }}
            className="inline-flex items-center gap-2 h-12 px-5 rounded-full bg-danger text-white font-semibold shadow-lg hover:brightness-95 transition"
          >
            <Phone className="h-4 w-4 rotate-[135deg]" />
            Leave
          </button>
        </div>
      )}
    </div>
  );
}

function CtrlBtn({
  label,
  children,
  tone = 'neutral',
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  tone?: 'neutral' | 'danger';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center h-12 w-12 rounded-full transition [&>svg]:h-4 [&>svg]:w-4',
        tone === 'danger'
          ? 'bg-danger text-white hover:brightness-95'
          : 'bg-white/10 text-white hover:bg-white/15'
      )}
    >
      {children}
    </button>
  );
}

function FullPageSpinner({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-ink grid place-items-center text-white">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <div className="text-[12px] text-white/60 font-mono uppercase tracking-[1.4px]">
          {message}
        </div>
      </div>
    </div>
  );
}

function InvalidLink({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-ink grid place-items-center text-white px-6">
      <div className="max-w-md text-center">
        <div className="h-14 w-14 rounded-full bg-danger-soft/10 border border-danger/30 grid place-items-center mx-auto">
          <AlertTriangle className="h-6 w-6 text-danger" />
        </div>
        <div className="font-serif text-[22px] font-semibold mt-4">{title}</div>
        <p className="text-[13px] text-white/70 mt-2 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
