import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Check,
  ClipboardList,
  ExternalLink,
  FileText,
  Pencil,
  Search,
  Stethoscope,
  Video,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Tabs, type TabItem } from '../components/ui/Tabs';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Empty } from '../components/ui/Empty';
import { useAllVisits, usePatients } from '../queries/hooks';
import { fmtDate, fmtTime } from '../lib/format';
import { cn } from '../lib/cn';
import type { Patient, Visit } from '../types';
import { FinalizeDraftModal } from '../components/session/FinalizeDraftModal';
import { RxPreviewModal } from '../components/session/RxPreviewModal';

type Tab = 'all' | 'in_person' | 'tele';
type RxFilter = 'all' | 'final' | 'draft' | 'none';

const rxFilterLabels: Record<RxFilter, string> = {
  all: 'All',
  final: 'Finalised',
  draft: 'Drafts',
  none: 'No Rx',
};

function visitRxStatus(v: Visit): 'final' | 'draft' | 'none' {
  return v.rxStatus ?? (v.prescriptionId ? 'final' : 'none');
}

export function Consultations() {
  const { data: visits = [], isLoading } = useAllVisits();
  const { data: patients = [] } = usePatients();
  const location = useLocation() as { state?: { toast?: string } };

  const [tab, setTab] = useState<Tab>('all');
  const [rxFilter, setRxFilter] = useState<RxFilter>('all');
  const [q, setQ] = useState('');
  const [draftVisit, setDraftVisit] = useState<Visit | null>(null);
  const [previewVisit, setPreviewVisit] = useState<Visit | null>(null);

  const patientsById = useMemo(() => {
    const m = new Map<string, Patient>();
    patients.forEach((p) => m.set(p.id, p));
    return m;
  }, [patients]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return visits.filter((v) => {
      if (tab === 'in_person' && v.type === 'tele') return false;
      if (tab === 'tele' && v.type !== 'tele') return false;
      if (rxFilter !== 'all' && visitRxStatus(v) !== rxFilter) return false;
      if (!term) return true;
      const p = patientsById.get(v.patientId);
      return (
        v.chiefComplaint.toLowerCase().includes(term) ||
        v.diagnoses.some((d) => d.toLowerCase().includes(term)) ||
        (p?.name.toLowerCase().includes(term) ?? false) ||
        (p?.code.toLowerCase().includes(term) ?? false)
      );
    });
  }, [visits, q, tab, rxFilter, patientsById]);

  const counts = useMemo(() => {
    return {
      all: visits.length,
      in_person: visits.filter((v) => v.type !== 'tele').length,
      tele: visits.filter((v) => v.type === 'tele').length,
    };
  }, [visits]);

  const rxCounts = useMemo(
    () => ({
      all: visits.length,
      final: visits.filter((v) => visitRxStatus(v) === 'final').length,
      draft: visits.filter((v) => visitRxStatus(v) === 'draft').length,
      none: visits.filter((v) => visitRxStatus(v) === 'none').length,
    }),
    [visits]
  );

  const tabs: TabItem<Tab>[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'in_person', label: 'In-person', count: counts.in_person, icon: <Stethoscope className="h-3.5 w-3.5" /> },
    { id: 'tele', label: 'Virtual', count: counts.tele, icon: <Video className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Consultations"
        description="Every live consult and video call you've completed — across all your patients. Drafts can be re-opened and finalised right from this page."
      />

      {location.state?.toast && (
        <div className="inline-flex items-center gap-2 rounded-md bg-success-soft border border-success/30 text-success px-3 py-2 text-[12.5px] font-medium animate-fade-in">
          <Check className="h-3.5 w-3.5" />
          {location.state.toast}
        </div>
      )}

      <Card className="p-4 flex flex-col gap-4">
        <Input
          placeholder="Search by patient name, code, complaint, or diagnosis…"
          leftIcon={<Search />}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Tabs items={tabs} value={tab} onChange={setTab} variant="pill" />
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[10.5px] font-bold uppercase tracking-[1.2px] text-ink-3 mr-1">
            Prescription
          </span>
          {(Object.keys(rxFilterLabels) as RxFilter[]).map((id) => {
            const active = rxFilter === id;
            const count = rxCounts[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => setRxFilter(id)}
                className={cn(
                  'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11.5px] font-semibold border transition-colors',
                  active
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface text-ink-2 border-line hover:border-line-strong hover:text-ink'
                )}
              >
                {rxFilterLabels[id]}
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold',
                    active ? 'bg-white/20 text-white' : 'bg-bg-muted text-ink-3'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="hidden md:grid grid-cols-[150px_1.4fr_1.4fr_140px_140px_180px] gap-4 px-5 py-3 text-[10.5px] font-bold uppercase tracking-[1.2px] text-ink-3 bg-surface-muted border-b border-line">
          <div>When</div>
          <div>Patient</div>
          <div>Visit</div>
          <div>Type / duration</div>
          <div>Prescription</div>
          <div className="text-right">Actions</div>
        </div>
        <div className="divide-y divide-line">
          {isLoading && (
            <div className="px-5 py-10 text-center text-[13px] text-ink-3">
              Loading history…
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="p-6">
              <Empty
                icon={<ClipboardList />}
                title={q ? `Nothing matches "${q}"` : 'No consultations yet'}
                description={
                  q
                    ? 'Try a different patient name, complaint, or diagnosis.'
                    : 'When you finish a consult or a call, it lands here as a record on the patient — with the prescription one click away.'
                }
              />
            </div>
          )}
          {!isLoading &&
            filtered.map((v) => {
              const patient = patientsById.get(v.patientId);
              return (
                <ConsultationRow
                  key={v.id}
                  visit={v}
                  patient={patient}
                  onContinueDraft={() => setDraftVisit(v)}
                  onOpenRx={() => setPreviewVisit(v)}
                />
              );
            })}
        </div>
      </Card>

      <FinalizeDraftModal
        open={!!draftVisit}
        visit={draftVisit}
        patient={draftVisit ? patientsById.get(draftVisit.patientId) : undefined}
        onClose={() => setDraftVisit(null)}
      />

      <RxPreviewModal
        open={!!previewVisit}
        prescriptionId={previewVisit?.prescriptionId ?? null}
        patientId={previewVisit?.patientId ?? ''}
        onClose={() => setPreviewVisit(null)}
      />
    </div>
  );
}

function ConsultationRow({
  visit,
  patient,
  onContinueDraft,
  onOpenRx,
}: {
  visit: Visit;
  patient: Patient | undefined;
  onContinueDraft: () => void;
  onOpenRx: () => void;
}) {
  const isTele = visit.type === 'tele';
  const Icon = isTele ? Video : Stethoscope;
  const tone: 'info' | 'accent' | 'warn' = isTele
    ? 'info'
    : visit.type === 'follow-up'
    ? 'accent'
    : 'warn';
  const typeLabel = isTele ? 'Virtual call' : visit.type === 'follow-up' ? 'Follow-up' : 'Consultation';

  const status = visitRxStatus(visit);

  return (
    <div className="grid md:grid-cols-[150px_1.4fr_1.4fr_140px_140px_180px] gap-4 px-5 py-4 items-center hover:bg-bg-muted transition-colors">
      <div className="leading-tight">
        <div className="font-serif text-[14.5px] font-semibold text-ink">
          {fmtDate(visit.date, 'd MMM yyyy')}
        </div>
        <div className="text-[11.5px] text-ink-3 font-mono mt-0.5">{fmtTime(visit.date)}</div>
      </div>

      <div className="flex items-center gap-3 min-w-0">
        {patient ? (
          <Link
            to={`/patients/${patient.id}`}
            className="flex items-center gap-3 min-w-0 hover:text-accent-ink"
          >
            <Avatar name={patient.name} size="md" />
            <div className="min-w-0">
              <div className="font-serif text-[14.5px] font-semibold text-ink truncate">
                {patient.name}
              </div>
              <div className="text-[11.5px] text-ink-3 font-mono truncate">
                {patient.code} · {patient.age}y ·{' '}
                {patient.sex === 'female' ? 'F' : patient.sex === 'male' ? 'M' : '—'}
              </div>
            </div>
          </Link>
        ) : (
          <span className="text-[12.5px] text-ink-3 italic">Patient record removed</span>
        )}
      </div>

      <div className="min-w-0">
        <p className="font-serif text-[13.5px] text-ink italic leading-snug truncate">
          "{visit.chiefComplaint}"
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {visit.diagnoses.slice(0, 2).map((d) => (
            <Badge key={d} tone="warn" variant="soft">
              {d}
            </Badge>
          ))}
          {visit.diagnoses.length > 2 && (
            <Badge tone="neutral" variant="soft">
              +{visit.diagnoses.length - 2}
            </Badge>
          )}
        </div>
      </div>

      <div className="leading-tight">
        <Badge tone={tone} variant="soft" icon={<Icon />}>
          {typeLabel}
        </Badge>
        {visit.duration && (
          <div className="text-[11px] text-ink-3 font-mono mt-1">{visit.duration}</div>
        )}
      </div>

      <div className="leading-tight">
        <RxStatusBadge status={status} printed={visit.printed} />
      </div>

      <div className="flex md:justify-end items-center gap-1.5">
        {patient && (
          <Link
            to={`/patients/${patient.id}`}
            className="inline-flex items-center justify-center gap-1 h-8 w-[88px] rounded-md border border-line bg-surface text-[11.5px] font-semibold text-ink-2 hover:border-line-strong hover:bg-bg-muted hover:text-ink"
            title="Open patient profile"
          >
            Profile
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}

        {/* Secondary slot — same width on every row so the column aligns. */}
        {status === 'final' && (
          <button
            type="button"
            onClick={onOpenRx}
            className="inline-flex items-center justify-center gap-1 h-8 w-[96px] rounded-md bg-accent text-white text-[11.5px] font-semibold hover:bg-accent-hover"
            title="Open prescription"
          >
            <FileText className="h-3 w-3" />
            View Rx
          </button>
        )}
        {status === 'draft' && (
          <button
            type="button"
            onClick={onContinueDraft}
            className="inline-flex items-center justify-center gap-1 h-8 w-[96px] rounded-md bg-warn text-white text-[11.5px] font-semibold hover:brightness-95"
            title="Open the draft and finalise"
          >
            <Pencil className="h-3 w-3" />
            Continue
          </button>
        )}
        {status === 'none' && (
          <span className="inline-flex items-center justify-center gap-1 h-8 w-[96px] rounded-md border border-dashed border-line text-[10.5px] text-ink-3 font-semibold">
            <FileText className="h-3 w-3" />
            No Rx kept
          </span>
        )}
      </div>
    </div>
  );
}

function RxStatusBadge({
  status,
  printed,
}: {
  status: 'final' | 'draft' | 'none';
  printed?: boolean;
}) {
  if (status === 'final') {
    return (
      <div className="inline-flex flex-col items-start gap-0.5">
        <Badge tone="success" variant="soft" uppercase>
          Finalised
        </Badge>
        {printed && (
          <span className="text-[10px] text-ink-3 font-mono">printed</span>
        )}
      </div>
    );
  }
  if (status === 'draft') {
    return (
      <Badge tone="warn" variant="soft" uppercase>
        Draft
      </Badge>
    );
  }
  return (
    <Badge tone="neutral" variant="soft" uppercase>
      No Rx
    </Badge>
  );
}
