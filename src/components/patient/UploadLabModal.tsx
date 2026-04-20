import { useRef, useState } from 'react';
import { Paperclip, Plus, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { fmtDate } from '../../lib/format';
import type { LabTest } from '../../types';

interface UploadLabModalProps {
  open: boolean;
  onClose: () => void;
  pendingTests: LabTest[];
  defaultTestId?: string;
  onSubmit: (testId: string, files: File[]) => void;
}

export function UploadLabModal({
  open,
  onClose,
  pendingTests,
  defaultTestId,
  onSubmit,
}: UploadLabModalProps) {
  const [testId, setTestId] = useState(defaultTestId ?? pendingTests[0]?.id ?? '');
  const [files, setFiles] = useState<File[]>([]);
  const [parsingId, setParsingId] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const chooseFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  };

  const submit = () => {
    if (!testId || files.length === 0) return;
    setParsingId(testId);
    onSubmit(testId, files);
  };

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-4 bg-ink/40 backdrop-blur-[2px] animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px] rounded-xl bg-surface border border-line shadow-lg animate-slide-up overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-line">
          <div>
            <h3 className="font-serif text-[20px] font-semibold text-ink leading-tight tracking-tight">
              Upload lab report
            </h3>
            <p className="text-[12.5px] text-ink-3 mt-1">
              Drop the file — we'll extract results automatically.
            </p>
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

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
          <section>
            <div className="text-[10.5px] font-bold uppercase tracking-[1.2px] text-ink-3 mb-2">
              Which test is this report for?
            </div>
            <div className="flex flex-col gap-2">
              {pendingTests.map((t) => {
                const picked = testId === t.id;
                const parsing = parsingId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTestId(t.id)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all',
                      picked
                        ? 'border-accent bg-accent-softer shadow-xs'
                        : 'border-line bg-surface hover:border-line-strong hover:bg-bg-muted'
                    )}
                  >
                    <span
                      className={cn(
                        'h-4 w-4 rounded-full border-2 shrink-0 grid place-items-center transition-colors',
                        picked ? 'border-accent' : 'border-line-strong'
                      )}
                    >
                      {picked && <span className="h-2 w-2 rounded-full bg-accent" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-serif text-[14px] font-semibold text-ink">
                        {t.name}
                      </div>
                      <div className="text-[11.5px] text-ink-3 mt-0.5">
                        Ordered {fmtDate(t.orderedOn, 'd MMM yyyy')}
                        {t.status === 'collected' && ' · sample collected, awaiting report'}
                      </div>
                    </div>
                    {parsing && (
                      <span className="text-[9.5px] font-bold uppercase tracking-[1.2px] text-warn bg-warn-soft border border-warn/30 rounded-xs px-2 py-1">
                        Parsing…
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="text-[10.5px] font-bold uppercase tracking-[1.2px] text-ink-3 mb-2">
              Report file(s)
            </div>
            <div
              ref={dropRef}
              onDragOver={(e) => {
                e.preventDefault();
                dropRef.current?.classList.add('border-accent', 'bg-accent-softer/40');
              }}
              onDragLeave={() => {
                dropRef.current?.classList.remove('border-accent', 'bg-accent-softer/40');
              }}
              onDrop={(e) => {
                e.preventDefault();
                dropRef.current?.classList.remove('border-accent', 'bg-accent-softer/40');
                chooseFiles(e.dataTransfer.files);
              }}
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-dashed border-line bg-surface-muted text-center px-6 py-10 cursor-pointer hover:border-line-strong transition-colors"
            >
              <div className="mx-auto h-9 w-9 rounded-full bg-surface border border-line grid place-items-center text-ink-3 mb-2">
                <Plus className="h-4 w-4" />
              </div>
              <div className="font-serif text-[14.5px] font-semibold text-ink">
                Click or drag files here
              </div>
              <div className="text-[11.5px] text-ink-3 mt-1">
                PDF, JPG or PNG · up to 10 MB each · multi-page OK
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                className="hidden"
                onChange={(e) => chooseFiles(e.target.files)}
              />
            </div>

            {files.length > 0 && (
              <div className="mt-2.5 flex flex-col gap-1.5">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-[12.5px] text-ink-2 bg-surface border border-line rounded-md px-2.5 py-1.5"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-ink-3" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="font-mono text-[11px] text-ink-3">
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      type="button"
                      aria-label="Remove"
                      onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                      className="text-ink-3 hover:text-danger"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line bg-surface-muted flex items-center justify-between gap-3">
          <div className="text-[11.5px] text-ink-3 inline-flex items-center gap-1.5">
            <Paperclip className="h-3.5 w-3.5" />
            Extraction takes ~30s. Results auto-attach to the record.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={submit}
              disabled={!testId || files.length === 0}
              loading={!!parsingId}
            >
              Upload &amp; parse
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
