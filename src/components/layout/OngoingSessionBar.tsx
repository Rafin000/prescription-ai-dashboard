import { Link, useLocation } from 'react-router-dom';
import { Mic, Stethoscope, Video } from 'lucide-react';
import { useActiveSessionStore } from '../../stores/activeSessionStore';
import { cn } from '../../lib/cn';

/**
 * Floating pill surfaced everywhere there's an active consult or video call
 * in progress — like Google Meet's "return to call" chip. Clicking it drops
 * the doctor back into the live page without losing any state.
 */
export function OngoingSessionBar() {
  const active = useActiveSessionStore((s) => s.active);
  const location = useLocation();

  if (!active) return null;

  // Don't double up on the page the session itself lives on.
  const here = location.pathname;
  if (here === active.returnPath) return null;
  if (here.startsWith(`${active.returnPath}/`)) return null;

  const m = Math.floor(active.elapsed / 60)
    .toString()
    .padStart(2, '0');
  const s = (active.elapsed % 60).toString().padStart(2, '0');
  const isCall = active.kind === 'call';

  return (
    <Link
      to={active.returnPath}
      className={cn(
        'fixed bottom-6 right-6 z-[60] inline-flex items-center gap-2.5 pl-3 pr-4 h-12 rounded-full shadow-lg transition-colors',
        isCall
          ? 'bg-live text-white hover:brightness-95'
          : 'bg-ink text-white hover:bg-accent-ink'
      )}
      title={`Return to ${isCall ? 'call' : 'consult'} with ${active.patientName}`}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          active.recording ? 'animate-pulse' : 'opacity-60',
          isCall ? 'bg-white' : 'bg-success'
        )}
      />
      {isCall ? <Video className="h-4 w-4" /> : <Stethoscope className="h-4 w-4" />}
      <span className="text-[13px] font-semibold">
        {isCall ? 'Call with' : 'Consulting'} {active.patientName.split(' ')[0]}
      </span>
      <span className="text-[11.5px] font-mono text-white/80">
        {m}:{s}
      </span>
      {active.recording && !isCall && (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[1.2px] text-accent-soft">
          <Mic className="h-3 w-3" />
          AI
        </span>
      )}
    </Link>
  );
}
