import { useEffect, useState } from 'react';
import { Bell, HelpCircle, Search, Sparkles, Stethoscope } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { IconButton } from '../ui/IconButton';
import { Can } from '../../auth/Can';
import { StartSessionModal } from '../session/StartSessionModal';
import { TalkToAIModal } from '../prescription/TalkToAIModal';
import { useActiveSessionStore } from '../../stores/activeSessionStore';
import { cn } from '../../lib/cn';

export function TopBar() {
  const [startOpen, setStartOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const active = useActiveSessionStore((s) => s.active);
  const setLang = useActiveSessionStore((s) => s.setLang);
  const setDraft = useActiveSessionStore((s) => s.setDraft);
  const hasActiveSession = !!active;
  const lang = active?.lang ?? 'bn';

  // ⌘K / Ctrl-K opens Talk-to-AI globally while a session is running.
  useEffect(() => {
    if (!hasActiveSession) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAiOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasActiveSession]);

  /**
   * Apply a Talk-to-AI command to whichever session is live. Mirrors the
   * per-page handler that used to live in LiveConsultation / VideoCall.
   */
  const handleAICommand = (command: string) => {
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
    } else if (c.startsWith('remove ')) {
      const needle = command.slice(7).trim().toLowerCase();
      setDraft((d) => ({
        ...d,
        medicines: d.medicines.filter((m) => !m.brand.toLowerCase().includes(needle)),
      }));
    } else if (c.startsWith('advice:')) {
      const rest = command.slice(7).trim();
      setDraft((d) => ({ ...d, advice: [...d.advice, rest] }));
    } else if (/ফলো|follow/i.test(command)) {
      setDraft((d) => ({ ...d, followUp: command }));
    }
  };

  return (
    <header className="h-16 shrink-0 border-b border-line bg-surface px-5 lg:px-6 flex items-center gap-4 sticky top-0 z-40">
      {/* Left — search, capped but allowed to grow to push the middle CTA
          toward the actual centre of the header. */}
      <div className="flex-1 max-w-xl">
        <Input
          placeholder="Search patients, medicines, or templates…"
          leftIcon={<Search />}
          inputSize="md"
          wrapperClassName="w-full"
        />
      </div>

      {/* Middle — the headline CTA. Its own slot so it stays visually
          centred regardless of the right-hand cluster's width. */}
      <div className="shrink-0">
        <Can permission="consult:start">
          <Button
            variant="primary"
            leftIcon={<Stethoscope />}
            onClick={() => setStartOpen(true)}
          >
            <span className="hidden sm:inline">Start new consult</span>
            <span className="sm:hidden">Consult</span>
          </Button>
        </Can>
      </div>

      {/* Right — session-scoped controls + utility icons. */}
      <div className="flex-1 flex items-center justify-end gap-2">
        {hasActiveSession && (
          <>
            <button
              type="button"
              onClick={() => setAiOpen(true)}
              className="inline-flex items-center gap-2 h-9 pl-3 pr-2.5 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:bg-accent-ink transition-colors"
              title={`Talk to AI · ${active?.patientName ?? ''}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              <Sparkles className="h-3.5 w-3.5" />
              Talk to AI
              <kbd className="font-mono text-[10px] bg-white/15 rounded-xs px-1.5 py-0.5">
                ⌘K
              </kbd>
            </button>
            <button
              type="button"
              onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
              className="inline-flex items-center h-9 px-3 rounded-md border border-line bg-surface text-[12.5px] font-semibold text-ink-2 hover:bg-bg-muted shadow-xs"
              title="Toggle AI language"
            >
              <span className={cn('font-bn', lang === 'bn' && 'text-accent-ink')}>বাং</span>
              <span className="mx-1 text-ink-3">·</span>
              <span className={cn(lang === 'en' && 'text-accent-ink')}>EN</span>
            </button>
          </>
        )}

        <IconButton aria-label="Help">
          <HelpCircle />
        </IconButton>
        <div className="relative">
          <IconButton aria-label="Notifications">
            <Bell />
          </IconButton>
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-live ring-2 ring-surface" />
        </div>
      </div>

      <StartSessionModal open={startOpen} onClose={() => setStartOpen(false)} />
      <TalkToAIModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onSubmit={handleAICommand}
      />
    </header>
  );
}
