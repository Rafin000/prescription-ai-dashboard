import { useEffect, useRef, useState } from 'react';
import { Mic, Send, X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface TalkToAIModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (command: string) => void;
}

const EXAMPLES = [
  'Add Napa 500mg',
  'Remove ciprofloxacin',
  'ফলো-আপ ৭ দিন',
  'Advice: warm water, rest',
];

export function TalkToAIModal({ open, onClose, onSubmit }: TalkToAIModalProps) {
  const [value, setValue] = useState('');
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onSubmit(v);
    setValue('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-4 bg-ink/35 backdrop-blur-[2px] animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[640px] rounded-xl bg-surface border border-line shadow-lg animate-slide-up overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-line">
          <div className="inline-flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="font-serif text-[17px] font-semibold text-ink">Talk to AI</span>
            <span className="text-[12.5px] text-ink-3">
              · Modify the prescription by voice or text
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-md grid place-items-center text-ink-3 hover:bg-bg-muted hover:text-ink transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Input */}
        <div className="px-6 pt-5">
          <div
            className={cn(
              'flex items-center gap-3 p-2 rounded-xl border bg-surface transition-colors',
              listening
                ? 'border-accent shadow-[0_0_0_3px_rgba(15,118,110,0.12)]'
                : 'border-line focus-within:border-accent focus-within:shadow-ring'
            )}
          >
            <button
              type="button"
              onClick={() => setListening((l) => !l)}
              className={cn(
                'relative h-10 w-10 rounded-lg grid place-items-center shrink-0 transition-colors',
                listening
                  ? 'bg-accent text-white'
                  : 'bg-accent-softer text-accent hover:bg-accent-soft'
              )}
              aria-label={listening ? 'Stop listening' : 'Start voice input'}
            >
              {listening && (
                <span className="absolute inset-0 rounded-lg bg-accent/30 animate-pulse-ring" />
              )}
              <Mic className="h-4 w-4" />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              placeholder={`Type a command — e.g. "Add Napa 500mg", "Remove ciprofloxacin"`}
              className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[14px] text-ink placeholder:text-ink-3 focus:ring-0 p-0"
            />

            <button
              type="button"
              onClick={submit}
              disabled={!value.trim()}
              className={cn(
                'inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[12.5px] font-semibold transition-colors shrink-0',
                value.trim()
                  ? 'bg-accent text-white hover:bg-accent-hover shadow-accent'
                  : 'bg-bg-muted text-ink-3 cursor-not-allowed'
              )}
            >
              Send
              <Send className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Examples */}
        <div className="px-6 pt-5 pb-4">
          <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-ink-3 mb-2">
            Examples
          </div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setValue(ex)}
                className="text-[12.5px] text-ink-2 bg-surface border border-line rounded-full px-3 h-7 hover:border-accent hover:text-accent-ink hover:bg-accent-softer/50 transition-colors font-sans"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="px-6 py-4 border-t border-line bg-surface-muted text-[11.5px] text-ink-3 leading-relaxed">
          AI only modifies the prescription — conversation transcript is untouched. Say it in
          Bangla, English, or both.
        </div>
      </div>
    </div>
  );
}
