import { Link, useParams } from 'react-router-dom';
import { useMemo, useRef, useState } from 'react';
import {
  Activity,
  CalendarCheck,
  ChevronRight,
  CircleCheck,
  Download,
  Eye,
  Filter,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Printer,
  Scissors,
  Stethoscope,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Tabs, type TabItem } from '../components/ui/Tabs';
import { Empty } from '../components/ui/Empty';
import { VitalsMiniChart } from '../components/patient/VitalsMiniChart';
import { UploadLabModal } from '../components/patient/UploadLabModal';
import { FinalizeDraftModal } from '../components/session/FinalizeDraftModal';
import { NewAppointmentModal } from '../components/appointment/NewAppointmentModal';
import { StartSessionModal } from '../components/session/StartSessionModal';
import { RxPaper } from '../components/prescription/RxPaper';
import { LabReportPreviewModal } from '../components/patient/LabReportPreviewModal';
import { EditPatientModal } from '../components/patient/EditPatientModal';
import {
  useAppointments,
  useCurrentDoctor,
  usePatient,
  usePatientLabs,
  usePatientPrescriptions,
  usePatientVisits,
  usePatientVitals,
} from '../queries/hooks';
import { cn } from '../lib/cn';
import { fmtDate, fmtTime } from '../lib/format';
import { printRxScoped } from '../lib/printRx';
import type { LabTest, Prescription, Visit } from '../types';
import { parseISO } from 'date-fns';

export function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTestId, setUploadTestId] = useState<string | undefined>(undefined);
  const [draftVisit, setDraftVisit] = useState<Visit | null>(null);
  const [bookingKind, setBookingKind] = useState<
    'closed' | 'follow-up' | 'surgery' | 'any'
  >('closed');
  const [startOpen, setStartOpen] = useState(false);
  const [previewLab, setPreviewLab] = useState<LabTest | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [visitFilter, setVisitFilter] = useState<{
    type: 'all' | 'consultation' | 'follow-up' | 'tele';
    rx: 'all' | 'final' | 'draft' | 'none';
  }>({ type: 'all', rx: 'all' });
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: patient, isLoading } = usePatient(id);
  const { data: doctor } = useCurrentDoctor();
  const { data: vitals = [] } = usePatientVitals(id);
  const { data: visits = [] } = usePatientVisits(id);
  const { data: labs = [] } = usePatientLabs(id);
  const { data: rxList = [] } = usePatientPrescriptions(id);
  const { data: allAppts = [] } = useAppointments();
  const patientAppts = useMemo(
    () => allAppts.filter((a) => a.patientId === id),
    [allAppts, id]
  );

  const pendingTests = useMemo(
    () => labs.filter((l) => l.status !== 'completed'),
    [labs]
  );

  const filteredVisits = useMemo(
    () =>
      visits.filter((v) => {
        if (visitFilter.type !== 'all' && v.type !== visitFilter.type) return false;
        if (visitFilter.rx !== 'all') {
          const rxStatus = v.rxStatus ?? (v.prescriptionId ? 'final' : 'none');
          if (rxStatus !== visitFilter.rx) return false;
        }
        return true;
      }),
    [visits, visitFilter],
  );

  if (isLoading || !patient) {
    return (
      <div className="text-[13px] text-ink-3 font-mono uppercase tracking-[1.4px]">
        Loading patient…
      </div>
    );
  }

  const patientSinceMonth = fmtDate(patient.patientSince, 'MMM yyyy');

  return (
    <div className="flex flex-col gap-6">
      {/* ── Breadcrumb + centered title row ───────────────── */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
          <Link to="/patients" className="hover:text-accent-ink transition-colors">
            Patients
          </Link>
          <ChevronRight className="h-3 w-3 text-ink-4" />
          <span className="text-ink-2 font-medium">{patient.name}</span>
        </div>
        <div className="inline-flex items-center gap-1.5">
          <span className="font-serif text-[18px] font-semibold text-ink tracking-tight">
            Prescription
          </span>
          <span className="h-5 px-1.5 rounded-xs bg-accent text-white text-[9.5px] font-bold uppercase tracking-[1.4px] inline-flex items-center">
            AI
          </span>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <Button variant="secondary" leftIcon={<Download />}>
            Export records
          </Button>
          <Button
            variant="secondary"
            leftIcon={<CalendarCheck />}
            onClick={() => setBookingKind('any')}
          >
            Book appointment
          </Button>
          <Button
            variant="primary"
            leftIcon={<Stethoscope />}
            onClick={() => setStartOpen(true)}
          >
            Start new consult
          </Button>
        </div>
      </div>

      {/* ── Patient summary card ─────────────────────────── */}
      <div className="bg-surface border border-line rounded-xl shadow-sm p-6">
        <div className="flex items-start gap-5">
          <Avatar name={patient.name} size="xl" ring />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-serif text-[28px] font-semibold text-ink leading-tight tracking-tight">
                    {patient.name}
                  </span>
                  {patient.nameBn && (
                    <span className="font-bn text-[14px] text-ink-3">{patient.nameBn}</span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-ink-3" />
                    {patient.age}y · {patient.sex === 'female' ? 'Female' : patient.sex === 'male' ? 'Male' : '—'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-ink-3" />
                    {patient.phone}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-ink-3" />
                    {patient.address.split(',').slice(0, 2).join(', ')}
                  </span>
                  {patient.bloodGroup && (
                    <span className="inline-flex items-center gap-1.5 text-danger font-semibold font-mono">
                      {patient.bloodGroup}
                    </span>
                  )}
                  <span className="font-mono text-ink-3">{patient.code}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {patient.surgicalPlan &&
                    patient.surgicalPlan.status !== 'done' &&
                    patient.surgicalPlan.status !== 'cancelled' && (
                      <Badge
                        tone={patient.surgicalPlan.urgency === 'emergency' ? 'danger' : 'warn'}
                        variant="soft"
                        icon={<Scissors />}
                        uppercase
                      >
                        Operation · {patient.surgicalPlan.procedure}
                      </Badge>
                    )}
                  {(patient.conditions ?? []).map((c) => (
                    <Badge
                      key={c.name}
                      tone={c.status === 'uncontrolled' ? 'warn' : 'warn'}
                      variant="soft"
                    >
                      {c.name} ({c.diagnosedYear})
                    </Badge>
                  ))}
                  {(patient.allergies ?? []).length > 0 && (
                    <Badge tone="neutral" variant="soft">
                      Allergy: {(patient.allergies ?? []).join(', ')}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0 flex flex-col items-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Pencil />}
                  onClick={() => setEditOpen(true)}
                >
                  Edit details
                </Button>
                <div>
                  <div className="font-serif text-[44px] font-semibold text-ink leading-none">
                    {patient.visits}
                  </div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[1.4px] text-ink-3 mt-1.5">
                    Visits
                  </div>
                  <div className="text-[11.5px] text-ink-3 mt-2">
                    Patient since {patientSinceMonth}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main split: visits (left) | latest status + contact (right) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-5">
        <div className="flex flex-col gap-5">
          {/* Vitals trend */}
          {vitals.length > 0 && (
            <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
                <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.4px] text-accent-ink">
                  <Activity className="h-3.5 w-3.5" />
                  Vitals trend
                </div>
                <Button variant="ghost" size="sm" rightIcon={<ChevronRight />}>
                  Full chart
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-line">
                {vitals.map((v) => (
                  <div key={v.label} className="p-5">
                    <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-ink-3">
                      {v.label}
                    </div>
                    <div className="flex items-baseline gap-1 mt-1.5">
                      <span
                        className={cn(
                          'font-serif text-[28px] font-semibold leading-none',
                          v.tone === 'warn' ? 'text-warn' : 'text-ink'
                        )}
                      >
                        {v.value}
                      </span>
                      <span className="text-[11px] text-ink-3 font-mono">{v.unit}</span>
                    </div>
                    {v.delta && (
                      <div
                        className={cn(
                          'text-[11.5px] mt-1',
                          v.tone === 'warn' ? 'text-warn font-semibold' : 'text-ink-3'
                        )}
                      >
                        {v.delta}
                      </div>
                    )}
                    {v.trend && (
                      <div className="mt-3">
                        <VitalsMiniChart points={v.trend} tone={v.tone ?? 'accent'} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visit history */}
          <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-line relative">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.4px] text-accent-ink">
                  <Stethoscope className="h-3.5 w-3.5" />
                  Visit history
                </div>
                <span className="text-[11.5px] text-ink-3">
                  · {filteredVisits.length} shown of {visits.length}
                </span>
                {(visitFilter.type !== 'all' || visitFilter.rx !== 'all') && (
                  <button
                    type="button"
                    onClick={() => setVisitFilter({ type: 'all', rx: 'all' })}
                    className="inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[1.2px] bg-accent-softer text-accent-ink border border-accent/30 rounded-full px-2 py-[2px] hover:bg-accent-soft"
                  >
                    <X className="h-3 w-3" />
                    Clear filter
                  </button>
                )}
              </div>
              <div className="relative">
                <Button
                  variant={visitFilter.type !== 'all' || visitFilter.rx !== 'all' ? 'secondary' : 'ghost'}
                  size="sm"
                  leftIcon={<Filter />}
                  onClick={() => setFilterOpen((v) => !v)}
                >
                  Filter
                </Button>
                {filterOpen && (
                  <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-[240px] rounded-lg border border-line bg-surface shadow-lg p-3 text-[12.5px]">
                    <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-ink-3 mb-1.5">
                      Visit type
                    </div>
                    <div className="flex flex-col gap-0.5 mb-3">
                      {(['all', 'consultation', 'follow-up', 'tele'] as const).map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setVisitFilter((f) => ({ ...f, type: k }))}
                          className={cn(
                            'text-left px-2 py-1 rounded-sm capitalize',
                            visitFilter.type === k
                              ? 'bg-accent-softer text-accent-ink font-semibold'
                              : 'hover:bg-bg-muted text-ink-2',
                          )}
                        >
                          {k === 'tele' ? 'Video call' : k}
                        </button>
                      ))}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-ink-3 mb-1.5">
                      Prescription
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {(['all', 'final', 'draft', 'none'] as const).map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setVisitFilter((f) => ({ ...f, rx: k }))}
                          className={cn(
                            'text-left px-2 py-1 rounded-sm capitalize',
                            visitFilter.rx === k
                              ? 'bg-accent-softer text-accent-ink font-semibold'
                              : 'hover:bg-bg-muted text-ink-2',
                          )}
                        >
                          {k === 'final' ? 'Finalised Rx' : k === 'draft' ? 'Draft Rx' : k === 'none' ? 'No Rx' : 'All'}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 pt-2 border-t border-line flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setFilterOpen(false)}
                        className="text-[11.5px] text-ink-3 hover:text-ink"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              {filteredVisits.length === 0 ? (
                <div className="p-5">
                  <Empty
                    icon={<Stethoscope />}
                    title={visits.length === 0 ? 'No visits yet' : 'No visits match'}
                    description={
                      visits.length === 0
                        ? "Start a consult to capture this patient's first visit."
                        : 'Clear the filter to see the full history.'
                    }
                  />
                </div>
              ) : (
                <ol className="relative">
                  {filteredVisits.map((v, idx) => {
                    const rx = rxList.find((r) => r.id === v.prescriptionId);
                    const isToday = v.date.startsWith('2026-04-18');
                    return (
                      <VisitTimelineItem
                        key={v.id}
                        visit={v}
                        rx={rx}
                        open={idx === 0}
                        isToday={isToday}
                        doctor={doctor}
                        patient={patient}
                        labs={labs}
                        onUploadLab={(testName) => {
                          const match = labs.find((l) => sameTest(l.name, testName));
                          setUploadTestId(match?.id);
                          setUploadOpen(true);
                        }}
                        onPreviewLab={(lab) => setPreviewLab(lab)}
                        onContinueDraft={() => setDraftVisit(v)}
                      />
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          {/* Latest status — rolled up from the most recent visit. */}
          <LatestStatusCard
            visits={visits}
            rxList={rxList}
            appointments={patientAppts}
            surgicalPlan={patient.surgicalPlan ?? null}
            onBookFollowUp={() => setBookingKind('follow-up')}
            onScheduleOperation={() => setBookingKind('surgery')}
          />

          {/* Contact */}
          <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-line">
              <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.4px] text-accent-ink">
                <Phone className="h-3.5 w-3.5" />
                Contact
              </div>
            </div>
            <div className="p-5 grid gap-4 text-[13px]">
              <div>
                <div className="font-mono text-ink font-semibold">{patient.phone}</div>
                <div className="text-[11.5px] text-ink-3 mt-0.5">{patient.address}</div>
              </div>
              {patient.emergencyContact && (
                <div className="pt-3 border-t border-line">
                  <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-ink-3 mb-1">
                    Emergency contact
                  </div>
                  <div className="font-serif text-[14px] text-ink">
                    {patient.emergencyContact.name}{' '}
                    <span className="text-ink-3 text-[11.5px] italic">
                      ({patient.emergencyContact.relation})
                    </span>
                  </div>
                  <div className="font-mono text-[11.5px] text-ink-2">
                    {patient.emergencyContact.phone}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <UploadLabModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        pendingTests={pendingTests}
        defaultTestId={uploadTestId}
        onSubmit={() => setUploadOpen(false)}
      />

      <FinalizeDraftModal
        open={!!draftVisit}
        visit={draftVisit}
        patient={patient}
        onClose={() => setDraftVisit(null)}
      />

      <NewAppointmentModal
        open={bookingKind !== 'closed'}
        onClose={() => setBookingKind('closed')}
        patient={patient}
        defaultType={
          bookingKind === 'surgery'
            ? 'surgery'
            : bookingKind === 'follow-up'
            ? 'follow-up'
            : undefined
        }
      />

      <StartSessionModal
        open={startOpen}
        onClose={() => setStartOpen(false)}
        patient={patient}
      />

      <LabReportPreviewModal
        open={!!previewLab}
        lab={previewLab}
        onClose={() => setPreviewLab(null)}
      />

      <EditPatientModal
        open={editOpen}
        patient={patient}
        onClose={() => setEditOpen(false)}
      />
    </div>
  );
}

/* ── Visit timeline item with Rx / Lab report / Status tabs ─── */

type VisitTab = 'rx' | 'labs' | 'status';

function VisitTimelineItem({
  visit,
  rx,
  open,
  isToday,
  doctor,
  patient,
  labs = [],
  onContinueDraft,
  onUploadLab,
  onPreviewLab,
}: {
  visit: Visit;
  rx?: Prescription;
  open?: boolean;
  isToday?: boolean;
  doctor?: import('../types').Doctor;
  patient?: import('../types').Patient;
  labs?: LabTest[];
  onContinueDraft?: () => void;
  onUploadLab?: (testName?: string) => void;
  onPreviewLab?: (lab: LabTest) => void;
}) {
  const [expanded, setExpanded] = useState(!!open);
  const [tab, setTab] = useState<VisitTab>('rx');
  const typeIcon = visit.type === 'tele' ? <Video className="h-3 w-3" /> : null;
  const rxStatus: 'final' | 'draft' | 'none' =
    visit.rxStatus ?? (visit.prescriptionId ? 'final' : 'none');
  const isDraft = rxStatus === 'draft';
  const isFinal = rxStatus === 'final';

  return (
    <li
      className={cn(
        'relative pl-12 pr-5 py-5 border-b border-line last:border-b-0',
        expanded && isToday && 'bg-accent-softer/30'
      )}
    >
      {/* Timeline dot */}
      <span className="absolute left-5 top-7 h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-surface" />

      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-serif text-[18px] font-semibold text-ink leading-tight flex items-center gap-2">
              {fmtDate(visit.date, 'd MMM yyyy')}
              {isToday && (
                <span className="text-[9.5px] font-bold uppercase tracking-[1.4px] bg-accent text-white rounded-xs px-1.5 py-[2px]">
                  Today
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11.5px] font-mono text-ink-3">
              <Badge tone="accent" variant="soft" uppercase icon={typeIcon}>
                {visit.type === 'follow-up' ? 'follow-up' : visit.type}
              </Badge>
              {isFinal && (
                <Badge tone="success" variant="soft" uppercase>
                  Rx finalised
                </Badge>
              )}
              {isDraft && (
                <Badge tone="warn" variant="soft" uppercase>
                  Rx draft
                </Badge>
              )}
              {rxStatus === 'none' && (
                <Badge tone="neutral" variant="soft" uppercase>
                  No Rx kept
                </Badge>
              )}
              <span>{fmtTime(visit.date)}</span>
              {visit.duration && (
                <>
                  <span>·</span>
                  <span>{visit.duration}</span>
                </>
              )}
            </div>
            <p className="font-serif text-[14.5px] italic text-ink mt-2 leading-relaxed">
              "{visit.chiefComplaint}"
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {visit.diagnoses.map((d) => (
                <Badge key={d} tone="warn" variant="soft">
                  {d}
                </Badge>
              ))}
            </div>
          </div>
          <ChevronRight
            className={cn(
              'h-4 w-4 text-ink-3 transition-transform shrink-0',
              expanded && 'rotate-90'
            )}
          />
        </div>
      </button>

      {expanded && isDraft && (
        <div className="mt-4 border-t border-line pt-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[12.5px] text-ink-2">
            A draft prescription is saved for this consult.
            {' '}<span className="text-ink-3">No finalised Rx on this visit yet.</span>
          </p>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Printer />}
            onClick={(e) => {
              e.stopPropagation();
              onContinueDraft?.();
            }}
          >
            Continue &amp; finalise draft
          </Button>
        </div>
      )}

      {expanded && isFinal && (
        <div className="mt-4 border-t border-line pt-4">
          <Tabs
            items={
              [
                { id: 'rx', label: 'Prescription' },
                { id: 'labs', label: 'Lab report' },
                { id: 'status', label: 'Status' },
              ] as TabItem<VisitTab>[]
            }
            value={tab}
            onChange={setTab}
            variant="pill"
          />

          {tab === 'rx' && <VisitRxTab rx={rx} doctor={doctor} patient={patient} />}

          {tab === 'labs' && (
            <VisitLabsTab
              rxTests={rx?.tests ?? []}
              labs={labsForVisit(labs, visit, rx)}
              allLabs={labs}
              onUpload={onUploadLab}
              onPreview={onPreviewLab}
            />
          )}

          {tab === 'status' && <VisitStatusTab visit={visit} rx={rx} patient={patient} />}
        </div>
      )}
    </li>
  );
}

/* ── Latest status (right-column rollup) ─────────────────── */

function LatestStatusCard({
  visits,
  rxList,
  appointments,
  surgicalPlan,
  onBookFollowUp,
  onScheduleOperation,
}: {
  visits: Visit[];
  rxList: Prescription[];
  appointments: import('../types').Appointment[];
  surgicalPlan: import('../types').SurgicalPlan | null;
  onBookFollowUp: () => void;
  onScheduleOperation: () => void;
}) {
  // Visits are already sorted newest-first in the mock, but guard just in case.
  const latest =
    [...visits]
      .sort((a, b) => (b.date > a.date ? 1 : -1))
      .find((v) => (v.rxStatus ?? (v.prescriptionId ? 'final' : 'none')) !== 'none') ??
    visits[0];
  const latestRx = latest?.prescriptionId
    ? rxList.find((r) => r.id === latest.prescriptionId)
    : undefined;

  const now = new Date().toISOString();
  // "Latest" = most recently booked. We don't have a createdAt, so use
  // appointments array order (mocks push in creation order) and fall back
  // to start date desc so a freshly-booked appointment wins over older ones.
  const latestBookings = [...appointments]
    .filter((a) => a.start >= now && a.status !== 'cancelled')
    .reverse();
  const nextFollowUp = latestBookings.find(
    (a) => a.type === 'follow-up' || a.type === 'tele' || a.type === 'consultation'
  );
  const nextSurgery = latestBookings.find((a) => a.type === 'surgery');

  const surgeryActive =
    surgicalPlan && surgicalPlan.status !== 'cancelled' && surgicalPlan.status !== 'done';
  const recovered = !latestRx?.followUp && !nextFollowUp && !surgeryActive;

  return (
    <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-line flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.4px] text-accent-ink">
          <Activity className="h-3.5 w-3.5" />
          Latest status
        </div>
        {latest && (
          <span className="text-[11px] text-ink-3 font-mono">
            {fmtDate(latest.date, 'd MMM yyyy')}
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col gap-4 text-[13px]">
        {!latest && (
          <div className="text-[12.5px] text-ink-3 italic">
            No visits on record yet.
          </div>
        )}

        {latest && (
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[1.2px] text-ink-3 mb-1">
              Last visit
            </div>
            <div className="font-serif text-[15px] text-ink font-semibold leading-tight">
              {latest.type === 'tele'
                ? 'Virtual consult'
                : latest.type === 'follow-up'
                ? 'Follow-up'
                : 'Consultation'}
              {latest.duration && (
                <span className="text-[11.5px] text-ink-3 font-normal font-mono ml-2">
                  {latest.duration}
                </span>
              )}
            </div>
            <div className="text-[11.5px] text-ink-3 mt-0.5">
              {latest.diagnoses.join(' · ') || latest.chiefComplaint}
            </div>
          </div>
        )}

        {/* Recovered — shown only when there's no pending follow-up or surgery. */}
        {recovered && (
          <div className="rounded-md border border-success/30 bg-success-soft/50 p-3 flex items-start gap-3">
            <span className="h-7 w-7 rounded-md grid place-items-center bg-success text-white shrink-0">
              <CircleCheck className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-ink-3">
                Recovered
              </div>
              <div className="text-[13px] text-ink mt-0.5">
                No follow-up or operation pending. Patient can return on symptoms.
              </div>
            </div>
          </div>
        )}

        {/* Follow-up — only rendered when the latest Rx or an existing
            appointment actually calls for one. If the doctor didn't ask
            the patient to return, we don't surface a schedule CTA here. */}
        {!recovered && (nextFollowUp || latestRx?.followUp) && (
          <div className="rounded-md border border-line bg-surface-muted p-3">
            <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.2px] text-ink-3 mb-1">
              <CalendarCheck className="h-3 w-3" />
              Follow-up
            </div>
            {nextFollowUp ? (
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="text-[13px] text-ink leading-snug">
                  <b>{fmtDate(nextFollowUp.start, 'd MMM yyyy')}</b>
                  {' · '}
                  <span className="text-ink-2">
                    {fmtTime(nextFollowUp.start)}
                    {nextFollowUp.type === 'tele' ? ' · video call' : ''}
                  </span>
                  {latestRx?.followUp && (
                    <div className="text-[11.5px] text-ink-3 mt-0.5">
                      Plan · {latestRx.followUp}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={onBookFollowUp}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="text-[13px] text-ink leading-snug">
                  <b>{latestRx?.followUp}</b>
                  <div className="text-[11.5px] text-ink-3 mt-0.5">
                    Not yet booked on the calendar.
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<CalendarCheck />}
                  onClick={onBookFollowUp}
                >
                  Book
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Operation — only rendered when the Rx actually carries a plan.
            Without one, nothing to schedule yet. */}
        {surgeryActive && (
          <div className="rounded-md border border-warn/30 bg-warn-soft/40 p-3">
            <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.2px] text-ink-3 mb-2">
              <Scissors className="h-3 w-3" />
              Operation
            </div>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="font-serif text-[14px] font-semibold text-ink">
                  {surgicalPlan.procedure}
                </div>
                <div className="text-[11.5px] text-ink-2 mt-0.5 flex items-center gap-2 flex-wrap">
                  <Badge
                    tone={
                      surgicalPlan.urgency === 'emergency'
                        ? 'danger'
                        : surgicalPlan.urgency === 'urgent'
                        ? 'warn'
                        : 'info'
                    }
                    variant="soft"
                    uppercase
                  >
                    {surgicalPlan.urgency}
                  </Badge>
                  <Badge tone="neutral" variant="soft" uppercase>
                    {surgicalPlan.status}
                  </Badge>
                </div>
                {nextSurgery ? (
                  <div className="text-[12px] text-ink mt-1.5">
                    <b>{fmtDate(nextSurgery.start, 'd MMM yyyy')}</b>
                    {' · '}
                    <span className="text-ink-2">{fmtTime(nextSurgery.start)}</span>
                    {(nextSurgery.hospital ?? surgicalPlan.hospital) && (
                      <div className="text-[11px] text-ink-3 mt-0.5">
                        {nextSurgery.hospital ?? surgicalPlan.hospital}
                      </div>
                    )}
                  </div>
                ) : surgicalPlan.scheduledFor ? (
                  <div className="text-[11px] text-ink-3 mt-1 font-mono">
                    Scheduled · {fmtDate(surgicalPlan.scheduledFor, 'd MMM yyyy')}
                  </div>
                ) : (
                  <div className="text-[11px] text-ink-3 italic mt-1">
                    Not booked on the calendar yet.
                  </div>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<CalendarCheck />}
                onClick={onScheduleOperation}
              >
                {nextSurgery ? 'Change' : 'Schedule'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Visit tab content ───────────────────────────────────── */

function sameTest(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  return norm(a) === norm(b) || norm(a).includes(norm(b)) || norm(b).includes(norm(a));
}

/** Labs whose order date aligns with the visit. Falls back to matching on
 *  the Rx's test list so the tab stays useful even with imperfect dates. */
function labsForVisit(
  all: LabTest[],
  visit: Visit,
  rx: Prescription | undefined
): LabTest[] {
  const visitDay = visit.date.slice(0, 10);
  const testNames = rx?.tests ?? [];
  const byDay = all.filter((l) => l.orderedOn === visitDay);
  if (byDay.length) return byDay;
  if (!testNames.length) return [];
  return all.filter((l) => testNames.some((t) => sameTest(l.name, t)));
}

/** Wraps the RxPaper for a visit timeline entry with a scoped Print
 *  button. The ref points at the container so the helper tags this
 *  sheet (and only this sheet) before invoking the browser print dialog. */
function VisitRxTab({
  rx,
  doctor,
  patient,
}: {
  rx: Prescription | undefined;
  doctor: ReturnType<typeof useCurrentDoctor>['data'];
  patient: ReturnType<typeof usePatient>['data'];
}) {
  const rxRef = useRef<HTMLDivElement | null>(null);
  if (!rx || !doctor || !patient) {
    return (
      <div className="mt-4 text-[12.5px] text-ink-3 italic px-2 py-6">
        This visit doesn't have a finalised prescription on file.
      </div>
    );
  }
  return (
    <div className="mt-4">
      <div className="mb-3 flex items-center justify-end">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Printer />}
          onClick={() => printRxScoped(rxRef.current)}
        >
          Print
        </Button>
      </div>
      <div ref={rxRef} className="-mx-2 overflow-x-auto">
        <RxPaper
          doctor={doctor}
          patient={patient}
          chamberId={doctor.chambers[0].id}
          rx={rx}
        />
      </div>
    </div>
  );
}

function VisitLabsTab({
  rxTests,
  labs,
  allLabs,
  onUpload,
  onPreview,
}: {
  rxTests: string[];
  labs: LabTest[];
  allLabs: LabTest[];
  onUpload?: (testName?: string) => void;
  onPreview?: (lab: LabTest) => void;
}) {
  const orderedItems = rxTests.length ? rxTests : labs.map((l) => l.name);

  if (orderedItems.length === 0 && labs.length === 0) {
    return (
      <div className="mt-4 rounded-md border border-dashed border-line bg-surface px-4 py-5 text-[12.5px] text-ink-3 flex items-center justify-between gap-3 flex-wrap">
        <span>No tests were ordered at this visit.</span>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Upload />}
          onClick={() => onUpload?.()}
        >
          Upload a report anyway
        </Button>
      </div>
    );
  }

  const rowsFromRx = orderedItems.map((name) => {
    const lab =
      labs.find((l) => sameTest(l.name, name)) ??
      allLabs.find((l) => sameTest(l.name, name));
    return { name, lab };
  });

  const extras = labs.filter(
    (l) => !rowsFromRx.some((r) => r.lab?.id === l.id)
  );

  return (
    <div className="mt-4 flex flex-col gap-3">
      {rowsFromRx.map((row) => (
        <LabReportRow
          key={row.name}
          name={row.name}
          lab={row.lab}
          onUpload={() => onUpload?.(row.name)}
          onPreview={() => row.lab && onPreview?.(row.lab)}
        />
      ))}
      {extras.map((l) => (
        <LabReportRow
          key={l.id}
          name={l.name}
          lab={l}
          onUpload={() => onUpload?.(l.name)}
          onPreview={() => onPreview?.(l)}
        />
      ))}
    </div>
  );
}

function LabReportRow({
  name,
  lab,
  onUpload,
  onPreview,
}: {
  name: string;
  lab?: LabTest;
  onUpload: () => void;
  onPreview?: () => void;
}) {
  const status = lab?.status ?? 'pending';
  const hasResult = !!lab?.summary || !!lab?.reportUrl;
  return (
    <div className="rounded-md border border-line bg-surface p-3.5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="font-serif text-[14.5px] font-semibold text-ink leading-tight">
            {name}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11.5px] text-ink-3 font-mono">
            {lab?.orderedOn && <span>Ordered {lab.orderedOn}</span>}
            <Badge
              tone={
                status === 'completed'
                  ? 'success'
                  : status === 'collected'
                  ? 'info'
                  : 'warn'
              }
              variant="soft"
              uppercase
            >
              {status}
            </Badge>
          </div>
        </div>
        {hasResult && onPreview && (
          <Button variant="secondary" size="sm" leftIcon={<Eye />} onClick={onPreview}>
            Preview
          </Button>
        )}
        {!hasResult && (
          <Button variant="secondary" size="sm" leftIcon={<Upload />} onClick={onUpload}>
            Upload result
          </Button>
        )}
      </div>
      {lab?.summary && (
        <p className="mt-2 text-[12.5px] text-ink-2 leading-relaxed border-t border-line pt-2">
          <span className="text-[10px] font-bold uppercase tracking-[1.2px] text-ink-3 mr-2">
            Summary
          </span>
          {lab.summary}
        </p>
      )}
    </div>
  );
}

function VisitStatusTab({
  visit,
  rx,
  patient,
}: {
  visit: Visit;
  rx?: Prescription;
  patient?: import('../types').Patient;
}) {
  const typeLabel =
    visit.type === 'follow-up'
      ? 'Follow-up'
      : visit.type === 'tele'
      ? 'Virtual consult'
      : 'Consultation';
  const hasAnyStatus =
    !!rx?.followUp || (rx?.advice?.length ?? 0) > 0 || !!patient?.surgicalPlan;
  return (
    <div className="mt-4 flex flex-col gap-3 text-[13px] text-ink-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge tone="accent" variant="soft" uppercase>
          {typeLabel}
        </Badge>
        {visit.duration && (
          <span className="text-[11.5px] text-ink-3 font-mono">{visit.duration}</span>
        )}
      </div>

      {rx?.followUp ? (
        <StatusBlock
          icon={<CalendarCheck className="h-3.5 w-3.5" />}
          label="Next step"
          body={`Follow-up · ${rx.followUp}`}
          tone="accent"
        />
      ) : (
        <StatusBlock
          icon={<CircleCheck className="h-3.5 w-3.5" />}
          label="Next step"
          body="No follow-up scheduled. Patient can return on symptoms."
          tone="success"
        />
      )}

      {patient?.surgicalPlan && (
        <StatusBlock
          icon={<Scissors className="h-3.5 w-3.5" />}
          label="Surgical plan"
          body={`${patient.surgicalPlan.procedure} — ${patient.surgicalPlan.status}`}
          tone="warn"
        />
      )}

      {rx?.advice && rx.advice.length > 0 && (
        <div className="rounded-md border border-line bg-surface p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-ink-3 mb-1.5">
            Advice given
          </div>
          <ul className="list-disc pl-5 text-[13px] text-ink font-serif leading-relaxed marker:text-accent">
            {rx.advice.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {!hasAnyStatus && (
        <div className="text-[12.5px] text-ink-3 italic">
          No explicit follow-up instructions were saved for this visit.
        </div>
      )}
    </div>
  );
}

function StatusBlock({
  icon,
  label,
  body,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  body: string;
  tone: 'accent' | 'success' | 'warn';
}) {
  const toneClass =
    tone === 'success'
      ? 'bg-success-soft border-success/30 text-ink'
      : tone === 'warn'
      ? 'bg-warn-soft border-warn/30 text-ink'
      : 'bg-accent-softer border-accent/30 text-ink';
  const iconToneClass =
    tone === 'success'
      ? 'bg-success text-white'
      : tone === 'warn'
      ? 'bg-warn text-white'
      : 'bg-accent text-white';
  return (
    <div className={cn('rounded-md border p-3.5 flex items-start gap-3', toneClass)}>
      <span
        className={cn(
          'h-7 w-7 rounded-md grid place-items-center shrink-0',
          iconToneClass
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-ink-3">
          {label}
        </div>
        <div className="text-[13px] text-ink mt-0.5">{body}</div>
      </div>
    </div>
  );
}


/* intentional util imports — keeps tree-shake consistent */
export { Mail, parseISO };
