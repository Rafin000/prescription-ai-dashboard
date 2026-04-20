import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  ExternalLink,
  FileText,
  Inbox,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  UserSearch,
  X,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs, type TabItem } from '../components/ui/Tabs';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Empty } from '../components/ui/Empty';
import { Modal } from '../components/ui/Modal';
import {
  useAssignLabReport,
  useConfirmLabReport,
  useLabIntake,
  usePatients,
  useRejectLabReport,
  useUploadLabReport,
} from '../queries/hooks';
import { cn } from '../lib/cn';
import { fmtDateTime, fmtRelative } from '../lib/format';
import type { LabIntake, LabIntakeStatus, Patient } from '../types';

type TabId = 'all' | 'processing' | 'needs_review' | 'unidentified' | 'routed';

export function LabInbox() {
  const [tab, setTab] = useState<TabId>('all');
  const [assignTarget, setAssignTarget] = useState<LabIntake | null>(null);

  const { data: rows = [], isLoading } = useLabIntake();
  const { data: patients = [] } = usePatients();
  const uploadMutation = useUploadLabReport();
  const confirmMutation = useConfirmLabReport();
  const rejectMutation = useRejectLabReport();

  const counts = useMemo(() => {
    return {
      all: rows.length,
      processing: rows.filter((r) => r.status === 'processing').length,
      needs_review: rows.filter((r) => r.status === 'needs_review').length,
      unidentified: rows.filter((r) => r.status === 'unidentified').length,
      routed: rows.filter((r) => r.status === 'routed').length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    if (tab === 'all') return rows;
    return rows.filter((r) => r.status === tab);
  }, [rows, tab]);

  const tabs: TabItem<TabId>[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'processing', label: 'Processing', count: counts.processing },
    { id: 'needs_review', label: 'Needs review', count: counts.needs_review },
    { id: 'unidentified', label: 'Unidentified', count: counts.unidentified },
    { id: 'routed', label: 'Routed', count: counts.routed },
  ];

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) =>
      uploadMutation.mutate({
        filename: f.name,
        sizeKb: Math.round(f.size / 1024),
        mime: f.type || 'application/octet-stream',
      })
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            AI-routed
          </span>
        }
        title="Lab inbox"
        description="Drop any report — a CBC, X-ray, HbA1c, anything. AI reads the header, matches it to the right patient and test, and files it for you. Low-confidence guesses wait here for a quick confirm."
      />

      <GlobalDropZone onFiles={handleFiles} uploading={uploadMutation.isPending} />

      <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-line flex items-center justify-between gap-3 flex-wrap">
          <Tabs items={tabs} value={tab} onChange={setTab} variant="pill" />
          <div className="text-[11.5px] text-ink-3">
            {rows.some((r) => r.status === 'processing') && (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-accent" />
                AI reading {counts.processing} file
                {counts.processing === 1 ? '' : 's'}…
              </span>
            )}
          </div>
        </div>

        <div className="divide-y divide-line">
          {isLoading && (
            <div className="px-5 py-10 text-center text-[13px] text-ink-3">
              Loading inbox…
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="px-5 py-10">
              <Empty
                icon={<Inbox />}
                title="Nothing here"
                description="Reports you drop above will land in this list. Routed ones link straight to the patient; low-confidence ones wait for a quick review."
              />
            </div>
          )}
          {filtered.map((row) => (
            <IntakeRow
              key={row.id}
              row={row}
              onConfirm={() => confirmMutation.mutate(row.id)}
              onReject={() => rejectMutation.mutate(row.id)}
              onAssign={() => setAssignTarget(row)}
            />
          ))}
        </div>
      </div>

      <AssignModal
        row={assignTarget}
        patients={patients}
        onClose={() => setAssignTarget(null)}
      />
    </div>
  );
}

/* ── Global drop zone ─────────────────────────────────────── */

function GlobalDropZone({
  onFiles,
  uploading,
}: {
  onFiles: (files: FileList | null) => void;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    onFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'relative overflow-hidden cursor-pointer rounded-xl border-2 border-dashed bg-surface-muted px-8 py-10 text-center transition-all',
        dragging
          ? 'border-accent bg-accent-softer scale-[1.005]'
          : 'border-line hover:border-line-strong hover:bg-surface'
      )}
    >
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 10%, rgba(15,118,110,0.15), transparent 40%), radial-gradient(circle at 80% 90%, rgba(15,118,110,0.1), transparent 40%)',
        }}
      />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div
          className={cn(
            'h-12 w-12 rounded-full grid place-items-center transition-colors',
            uploading ? 'bg-accent text-white' : 'bg-surface border border-line text-accent'
          )}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Upload className="h-5 w-5" />
          )}
        </div>
        <div>
          <div className="font-serif text-[19px] font-semibold text-ink">
            Drop any report here — we'll route it
          </div>
          <p className="text-[13px] text-ink-2 mt-1 max-w-xl mx-auto">
            AI reads the header, picks up the patient name / ID and test, and files it
            directly into the matching patient record. PDF, JPG, or PNG · multi-page OK.
          </p>
        </div>
        <Button variant="primary" size="md" leftIcon={<Upload />}>
          Choose files
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            onFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

/* ── Single intake row ────────────────────────────────────── */

function IntakeRow({
  row,
  onConfirm,
  onReject,
  onAssign,
}: {
  row: LabIntake;
  onConfirm: () => void;
  onReject: () => void;
  onAssign: () => void;
}) {
  return (
    <div className="px-5 py-4 flex items-start gap-4 flex-wrap md:flex-nowrap">
      <FileThumb row={row} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-serif text-[15px] font-semibold text-ink">{row.filename}</span>
          <StatusPill status={row.status} />
          {row.suggestion?.confidence !== undefined && row.status !== 'routed' && (
            <ConfidenceChip value={row.suggestion.confidence} />
          )}
        </div>
        <div className="mt-0.5 text-[11.5px] text-ink-3 flex items-center gap-2 flex-wrap">
          <span>{row.uploadedBy}</span>
          <span>·</span>
          <span title={fmtDateTime(row.uploadedAt)}>
            uploaded {fmtRelative(row.uploadedAt)}
          </span>
          <span>·</span>
          <span className="font-mono">
            {row.sizeKb.toLocaleString()} KB
            {row.pages ? ` · ${row.pages} page${row.pages === 1 ? '' : 's'}` : ''}
          </span>
        </div>

        {row.status === 'processing' ? (
          <div className="mt-3 inline-flex items-center gap-2 text-[12.5px] text-accent-ink bg-accent-softer border border-accent/20 rounded-md px-3 py-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            AI reading this report — typically ~30s
          </div>
        ) : (
          <>
            {row.extracted && (
              <div className="mt-2.5 rounded-md bg-surface-muted border border-line px-3 py-2.5 text-[12.5px] text-ink-2">
                <div className="flex items-center gap-2 flex-wrap text-[11px] text-ink-3">
                  {row.extracted.patientName && (
                    <span>
                      <span className="font-bold uppercase tracking-[1px] mr-1 text-ink-3">
                        Patient
                      </span>
                      <span className="text-ink font-semibold">
                        {row.extracted.patientName}
                      </span>
                      {row.extracted.patientId && (
                        <span className="font-mono text-ink-3 ml-1">
                          · {row.extracted.patientId}
                        </span>
                      )}
                    </span>
                  )}
                  {row.extracted.testName && (
                    <span>
                      <span className="font-bold uppercase tracking-[1px] mr-1 text-ink-3">
                        Test
                      </span>
                      <span className="text-ink font-semibold">
                        {row.extracted.testName}
                      </span>
                    </span>
                  )}
                  {row.extracted.labName && (
                    <span>
                      <span className="font-bold uppercase tracking-[1px] mr-1 text-ink-3">
                        Lab
                      </span>
                      {row.extracted.labName}
                    </span>
                  )}
                </div>
                {row.extracted.summary && (
                  <p className="mt-1.5 font-serif text-[13px] text-ink-2 leading-relaxed">
                    {row.extracted.summary}
                  </p>
                )}
              </div>
            )}

            {row.suggestion?.reason && row.status !== 'routed' && (
              <div className="mt-2 text-[11.5px] text-ink-3 italic">
                <Sparkles className="inline h-3 w-3 mr-1 text-accent" />
                {row.suggestion.reason}
              </div>
            )}

            {row.routed && (
              <div className="mt-2 text-[12px] text-success inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" />
                Filed to{' '}
                <Link
                  to={`/patients/${row.routed.patientId}`}
                  className="font-semibold text-accent-ink underline underline-offset-2 hover:no-underline"
                >
                  {row.routed.patientName}
                </Link>
                {row.routed.testName && (
                  <>
                    <span className="text-ink-3">·</span>
                    <span className="text-ink-2 font-medium">{row.routed.testName}</span>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {row.status === 'needs_review' && row.suggestion && (
          <>
            <Button variant="primary" size="sm" leftIcon={<Check />} onClick={onConfirm}>
              Looks right
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<UserSearch />} onClick={onAssign}>
              Pick different
            </Button>
          </>
        )}
        {row.status === 'unidentified' && (
          <Button variant="primary" size="sm" leftIcon={<UserSearch />} onClick={onAssign}>
            Assign manually
          </Button>
        )}
        {row.status === 'routed' && row.routed && (
          <Link to={`/patients/${row.routed.patientId}`}>
            <Button variant="secondary" size="sm" rightIcon={<ExternalLink />}>
              Open patient
            </Button>
          </Link>
        )}
        {row.status !== 'processing' && (
          <button
            type="button"
            onClick={onReject}
            className="h-8 w-8 rounded-md grid place-items-center text-ink-3 hover:bg-danger-soft hover:text-danger transition-colors"
            aria-label="Discard"
            title="Discard"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Small bits ───────────────────────────────────────────── */

function FileThumb({ row }: { row: LabIntake }) {
  const isPdf = row.mime.includes('pdf');
  return (
    <div
      className={cn(
        'h-16 w-12 shrink-0 rounded-md border border-line bg-surface-muted grid place-items-center text-ink-3',
        'relative overflow-hidden'
      )}
    >
      <FileText className="h-5 w-5" />
      <span className="absolute bottom-[2px] left-0 right-0 text-center text-[8.5px] font-mono font-bold uppercase tracking-[0.6px] text-ink-3">
        {isPdf ? 'PDF' : row.mime.split('/')[1]?.slice(0, 4)}
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: LabIntakeStatus }) {
  if (status === 'routed') {
    return (
      <Badge tone="success" variant="soft" uppercase icon={<Check />}>
        Routed
      </Badge>
    );
  }
  if (status === 'processing') {
    return (
      <Badge tone="accent" variant="soft" uppercase icon={<Loader2 className="animate-spin" />}>
        Processing
      </Badge>
    );
  }
  if (status === 'needs_review') {
    return (
      <Badge tone="warn" variant="soft" uppercase icon={<AlertTriangle />}>
        Needs review
      </Badge>
    );
  }
  if (status === 'unidentified') {
    return (
      <Badge tone="danger" variant="soft" uppercase icon={<UserSearch />}>
        Unidentified
      </Badge>
    );
  }
  return (
    <Badge tone="neutral" variant="soft" uppercase>
      Archived
    </Badge>
  );
}

function ConfidenceChip({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone =
    value >= 0.85 ? 'success' : value >= 0.7 ? 'warn' : 'danger';
  return (
    <Badge tone={tone as 'success' | 'warn' | 'danger'} variant="soft" uppercase>
      {pct}% confident
    </Badge>
  );
}

/* ── Assign modal (manual routing) ────────────────────────── */

function AssignModal({
  row,
  patients,
  onClose,
}: {
  row: LabIntake | null;
  patients: Patient[];
  onClose: () => void;
}) {
  const [patientId, setPatientId] = useState<string>(
    row?.suggestion?.patientId ?? ''
  );
  const [note, setNote] = useState('');
  const { mutate: assign, isPending } = useAssignLabReport();

  // Reset state when row changes.
  useMemo(() => {
    setPatientId(row?.suggestion?.patientId ?? '');
    setNote('');
  }, [row?.id]);

  if (!row) return null;

  const matched = patients.find((p) => p.id === patientId);

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title="Assign report manually"
      description="Route this report to the right patient. The AI suggestion starts pre-filled — you can override it."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            leftIcon={<Check />}
            disabled={!patientId}
            loading={isPending}
            onClick={() =>
              assign(
                { id: row.id, patientId },
                {
                  onSuccess: onClose,
                }
              )
            }
          >
            File this report
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="bg-surface-muted border border-line rounded-md p-3 text-[12.5px] text-ink-2">
          <div className="flex items-center gap-2 flex-wrap">
            <FileText className="h-3.5 w-3.5 text-ink-3" />
            <span className="font-semibold text-ink">{row.filename}</span>
            <span className="text-ink-3">·</span>
            <span className="font-mono text-[11.5px]">{row.sizeKb} KB</span>
          </div>
          {row.extracted?.summary && (
            <p className="mt-1.5 italic font-serif leading-relaxed">
              {row.extracted.summary}
            </p>
          )}
        </div>

        <Select
          label="Patient"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          placeholder="Select a patient…"
          options={patients.map((p) => ({
            value: p.id,
            label: `${p.name} · ${p.code} · ${p.age}y`,
          }))}
        />

        {matched && (
          <div className="rounded-md bg-accent-softer/50 border border-accent/20 px-3 py-2.5 text-[12px] text-accent-ink">
            Filing to{' '}
            <span className="font-semibold font-serif text-[13.5px]">{matched.name}</span>{' '}
            <span className="text-ink-3 font-mono">({matched.code})</span>.
            <div className="mt-1 text-ink-3 text-[11.5px]">
              {matched.age}y · {matched.phone}
            </div>
          </div>
        )}

        <Input
          label="Internal note (optional)"
          placeholder="e.g. received via WhatsApp from patient's son"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          leftIcon={<X />}
        />
      </div>
    </Modal>
  );
}
