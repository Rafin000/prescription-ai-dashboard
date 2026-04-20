import { Download, FileText, Sparkles } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { LabTest } from '../../types';
import { fmtDate } from '../../lib/format';

interface Props {
  open: boolean;
  lab: LabTest | null;
  onClose: () => void;
}

/**
 * Read-only preview of an uploaded lab report. In production the server
 * returns a signed URL that we render in an <iframe> for PDFs or an <img>
 * for scanned pages — the mock can't serve real files, so we show a
 * placeholder sheet alongside the AI-parsed summary.
 */
export function LabReportPreviewModal({ open, lab, onClose }: Props) {
  const isImage =
    !!lab?.reportUrl && /\.(png|jpe?g|webp|gif)$/i.test(lab.reportUrl);
  const isPdf = !!lab?.reportUrl && /\.pdf$/i.test(lab.reportUrl);
  const hasRealUrl =
    !!lab?.reportUrl && lab.reportUrl !== '#' && lab.reportUrl.trim() !== '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={lab?.name ?? 'Lab report'}
      description={
        lab
          ? `Ordered ${fmtDate(lab.orderedOn, 'd MMM yyyy')} · ${lab.status}`
          : undefined
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {hasRealUrl && (
            <a
              href={lab!.reportUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          )}
        </>
      }
    >
      {!lab ? null : (
        <div className="flex flex-col gap-4">
          {lab.summary && (
            <div className="rounded-md bg-surface-muted border border-line p-4">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[1.2px] text-accent-ink mb-1.5">
                <Sparkles className="h-3 w-3" />
                AI-parsed summary
              </div>
              <p className="text-[13px] text-ink-2 leading-relaxed font-serif">
                {lab.summary}
              </p>
            </div>
          )}

          <div className="rounded-md border border-line bg-bg-muted overflow-hidden">
            {hasRealUrl && isImage ? (
              <img
                src={lab.reportUrl}
                alt={`Report — ${lab.name}`}
                className="w-full max-h-[620px] object-contain bg-white"
              />
            ) : hasRealUrl && isPdf ? (
              <iframe
                src={lab.reportUrl}
                title={`Report — ${lab.name}`}
                className="w-full h-[620px] bg-white"
              />
            ) : (
              <PlaceholderSheet name={lab.name} status={lab.status} summary={lab.summary} />
            )}
          </div>

          <div className="flex items-center gap-2 text-[11.5px] text-ink-3">
            <Badge tone="neutral" variant="soft">
              {lab.id}
            </Badge>
            {lab.orderedOn && <span>Ordered on {lab.orderedOn}</span>}
          </div>
        </div>
      )}
    </Modal>
  );
}

function PlaceholderSheet({
  name,
  status,
  summary,
}: {
  name: string;
  status?: string;
  summary?: string;
}) {
  return (
    <div className="aspect-[1/1.3] max-h-[620px] bg-white mx-auto overflow-hidden relative flex flex-col">
      <div className="px-8 pt-8 pb-4 border-b border-line">
        <div className="text-[10.5px] font-bold uppercase tracking-[1.4px] text-ink-3">
          Laboratory report
        </div>
        <div className="font-serif text-[22px] font-semibold text-ink mt-1">{name}</div>
        <div className="text-[11.5px] text-ink-3 mt-1 font-mono inline-flex items-center gap-2">
          <FileText className="h-3 w-3" />
          Preview — uploaded file renders here
        </div>
      </div>
      <div className="px-8 py-6 flex-1 grid grid-cols-2 gap-x-6 gap-y-3 text-[11.5px] text-ink-2">
        {['Sample', 'Reference', 'Patient code', 'Collection date', 'Method', 'Reported by'].map(
          (label) => (
            <div key={label}>
              <div className="text-[9.5px] font-bold uppercase tracking-[1.2px] text-ink-3">
                {label}
              </div>
              <div className="h-3 mt-1.5 rounded bg-bg-muted w-4/5" />
            </div>
          )
        )}
      </div>
      <div className="px-8 pb-8 pt-2">
        {summary ? (
          <div className="rounded-md border border-line bg-surface-muted p-3">
            <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-ink-3 mb-1">
              Summary
            </div>
            <p className="text-[12.5px] text-ink-2 leading-relaxed">{summary}</p>
          </div>
        ) : (
          <div className="h-16 rounded-md bg-bg-muted" />
        )}
        {status && (
          <div className="mt-3 flex items-center justify-end gap-2 text-[10.5px] font-mono text-ink-3 uppercase tracking-[1.2px]">
            Status · {status}
          </div>
        )}
      </div>
    </div>
  );
}
