import { useEffect } from 'react';
import { useActiveSessionStore, type SessionDraft } from '../stores/activeSessionStore';
import { useConsultScript } from '../queries/hooks';

/**
 * Mounted once at the app shell. Drives the active consult/call:
 *  - ticks the elapsed clock every second while recording,
 *  - streams the scripted transcript turn by turn,
 *  - auto-fills the AI draft at the same turn-count milestones the live
 *    pages used to handle locally.
 * The page components only read state + fire actions — the session ticks
 * along regardless of what route the user navigates to.
 */
export function SessionRunner() {
  const active = useActiveSessionStore((s) => s.active);
  const tick = useActiveSessionStore((s) => s.tickElapsed);
  const appendTurn = useActiveSessionStore((s) => s.appendTurn);
  const incScript = useActiveSessionStore((s) => s.incrementScriptIndex);
  const setDraft = useActiveSessionStore((s) => s.setDraft);

  const { data: script = [] } = useConsultScript();

  // Elapsed timer
  useEffect(() => {
    if (!active?.recording) return;
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [active?.recording, tick]);

  // Scripted AI transcript streaming
  useEffect(() => {
    if (!active?.recording) return;
    if (!script || active.scriptIndex >= script.length) return;
    const idx = active.scriptIndex;
    const t = window.setTimeout(() => {
      appendTurn(script[idx]);
      incScript();
      applyAIDraft(idx + 1, setDraft);
    }, 2200);
    return () => window.clearTimeout(t);
  }, [
    active?.recording,
    active?.scriptIndex,
    script,
    appendTurn,
    incScript,
    setDraft,
  ]);

  return null;
}

function applyAIDraft(
  n: number,
  setDraft: (fn: (d: SessionDraft) => SessionDraft) => void
) {
  if (n === 2) {
    setDraft((d) => ({
      ...d,
      chiefComplaint: 'Productive cough × 5 days, low-grade fever (night)',
    }));
  }
  if (n === 4) {
    setDraft((d) => ({
      ...d,
      chiefComplaint:
        'Productive cough × 5 days, low-grade fever (night), burning micturition × 2 days',
      diagnoses: Array.from(new Set([...d.diagnoses, 'Acute bronchitis', 'UTI — suspected'])),
      tests: Array.from(
        new Set([...d.tests, 'CBC with ESR', 'Urine R/M/E + C/S'])
      ),
    }));
  }
  if (n === 6) {
    setDraft((d) => ({
      ...d,
      diagnoses: Array.from(new Set([...d.diagnoses, 'HTN — uncontrolled'])),
      tests: Array.from(new Set([...d.tests, 'Chest X-ray PA view'])),
      oe: Array.from(
        new Set([...d.oe, 'BP 140/90 mmHg', 'Chest: scattered crepts b/l bases'])
      ),
    }));
  }
  if (n === 7) {
    setDraft((d) => ({
      ...d,
      advice: Array.from(
        new Set([
          ...d.advice,
          'Plenty of warm fluids, rest for 3 days',
          'Steam inhalation twice daily',
          'Low-salt diet; home BP monitoring AM & PM',
        ])
      ),
      medicines:
        d.medicines.length > 0
          ? d.medicines
          : [
              { id: `ai-m1-${Date.now()}`, brand: 'Azin 500', generic: 'Azithromycin', strength: '500 mg', dose: '1+0+0', duration: '5 days', instruction: 'Before meal' },
              { id: `ai-m2-${Date.now()}`, brand: 'Napa Extra', generic: 'Paracetamol + Caffeine', strength: '500+65 mg', dose: '1+1+1', duration: '3 days', instruction: 'If fever > 100°F' },
              { id: `ai-m3-${Date.now()}`, brand: 'Seclo 20', generic: 'Omeprazole', strength: '20 mg', dose: '1+0+1', duration: '14 days', instruction: 'Before meal' },
            ],
      followUp: d.followUp || '5 days with reports',
    }));
  }
}
