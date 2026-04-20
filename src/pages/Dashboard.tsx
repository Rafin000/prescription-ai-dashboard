import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ChevronRight,
  Clock,
  FileText,
  Phone,
  Stethoscope,
  TrendingUp,
  Users,
  Video,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { VirtualActions } from '../components/appointment/VirtualActions';
import {
  useAppointments,
  useCurrentDoctor,
  usePatients,
} from '../queries/hooks';
import { fmtDate, fmtTime } from '../lib/format';
import type { AppointmentType } from '../types';

export function Dashboard() {
  const { data: doctor } = useCurrentDoctor();
  const { data: appointments = [] } = useAppointments();
  const { data: patients = [] } = usePatients();

  const today = appointments
    .filter((a) => a.start.startsWith('2026-04-19'))
    .sort((a, b) => a.start.localeCompare(b.start));

  const upcoming = appointments
    .filter((a) => a.start > '2026-04-19T23:59:59')
    .slice(0, 4);

  const chamber = doctor?.chambers[0];
  const doctorFirstName = doctor?.name.split(' ').slice(0, 2).join(' ') ?? 'Doctor';

  const kpis = [
    {
      label: 'Patients today',
      value: today.length,
      delta: '+2 vs. yesterday',
      icon: <Users className="h-4 w-4" />,
      tone: 'accent' as const,
    },
    {
      label: 'Prescriptions this week',
      value: 47,
      delta: '+12% vs. last week',
      icon: <FileText className="h-4 w-4" />,
      tone: 'success' as const,
    },
    {
      label: 'Avg. consult',
      value: '14m 32s',
      delta: '-2m, great pace',
      icon: <Clock className="h-4 w-4" />,
      tone: 'info' as const,
    },
    {
      label: 'AI accuracy',
      value: '92.4%',
      delta: 'Based on 120 edits',
      icon: <TrendingUp className="h-4 w-4" />,
      tone: 'warn' as const,
    },
  ];

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        eyebrow="Sunday, 19 April 2026"
        title={
          <>
            Assalamu alaikum, <span className="text-accent-ink">{doctorFirstName}</span>
          </>
        }
        description={`You have ${today.length} appointments at ${chamber?.name.split('—')[1]?.trim() ?? 'your chamber'} this evening. 2 patients need lab review.`}
        actions={
          <Button variant="secondary" leftIcon={<CalendarDays />}>
            Today's schedule
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <Badge tone={k.tone} variant="soft" icon={k.icon}>
                {k.label}
              </Badge>
            </div>
            <div className="font-serif text-[32px] font-semibold text-ink leading-none tracking-tight">
              {k.value}
            </div>
            <div className="mt-2 text-[11.5px] text-ink-3 font-medium">{k.delta}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Today's schedule"
            subtitle={`${today.length} appointments · ${chamber?.name ?? ''}`}
            icon={<CalendarDays />}
            actions={
              <Link to="/appointments">
                <Button variant="ghost" size="sm" rightIcon={<ChevronRight />}>
                  Calendar
                </Button>
              </Link>
            }
          />
          <div className="divide-y divide-line">
            {today.map((a) => (
              <AppointmentRow
                key={a.id}
                appointment={a}
                time={fmtTime(a.start)}
                name={a.patientName}
                kind={a.type}
                note={a.note}
                status={a.status}
                patientId={a.patientId}
              />
            ))}
            {today.length === 0 && (
              <div className="px-5 py-8 text-center text-[13px] text-ink-3">
                No appointments today. Enjoy the quiet.
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Upcoming" subtitle="Next 7 days" icon={<Clock />} />
          <div className="divide-y divide-line">
            {upcoming.map((a) => (
              <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-bg-muted border border-line flex flex-col items-center justify-center leading-none shrink-0">
                  <div className="text-[9px] font-bold uppercase text-ink-3">
                    {fmtDate(a.start, 'MMM')}
                  </div>
                  <div className="text-[14px] font-serif font-semibold text-ink">
                    {fmtDate(a.start, 'd')}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink truncate">
                    {a.patientName}
                  </div>
                  <div className="text-[11.5px] text-ink-3 font-mono">
                    {fmtTime(a.start)} · {a.type}
                  </div>
                </div>
                <Badge tone={a.status === 'confirmed' ? 'success' : 'neutral'} variant="soft">
                  {a.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent patients"
            subtitle="Last seen in your clinic"
            icon={<Users />}
            actions={
              <Link to="/patients">
                <Button variant="ghost" size="sm" rightIcon={<ChevronRight />}>
                  See all
                </Button>
              </Link>
            }
          />
          <div className="divide-y divide-line">
            {patients.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                to={`/patients/${p.id}`}
                className="block px-5 py-4 hover:bg-bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={p.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-[15px] font-semibold text-ink">
                        {p.name}
                      </span>
                      <span className="text-[11px] text-ink-3">· {p.code}</span>
                    </div>
                    <div className="text-[12.5px] text-ink-3 mt-0.5 truncate">
                      {(p.conditions ?? []).map((c) => c.name).join(' · ') || '—'}
                    </div>
                  </div>
                  <div className="text-right text-[11.5px] text-ink-3 shrink-0">
                    <div className="font-mono">{p.visits} visits</div>
                    <div>{fmtDate(p.patientSince, 'MMM yyyy')}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Your chambers" icon={<Phone />} />
          <div className="p-5 flex flex-col gap-4">
            {(doctor?.chambers ?? []).map((c) => (
              <div key={c.id}>
                <div className="font-serif text-[14.5px] font-semibold text-ink">{c.name}</div>
                <div className="text-[12px] text-ink-3 mt-1">{c.address}</div>
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  {c.days.map((d) => (
                    <span
                      key={d}
                      className="text-[10.5px] font-bold uppercase tracking-wider bg-accent-softer text-accent-ink rounded-xs px-1.5 py-0.5"
                    >
                      {d}
                    </span>
                  ))}
                  <span className="text-[11.5px] text-ink-2 font-mono ml-1">{c.time}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function AppointmentRow({
  appointment,
  time,
  name,
  kind,
  status,
  note,
  patientId,
}: {
  appointment: import('../types').Appointment;
  time: string;
  name: string;
  kind: AppointmentType;
  status: string;
  note?: string;
  patientId: string;
}) {
  const kindLabel =
    kind === 'consultation' ? 'New visit' : kind === 'follow-up' ? 'Follow-up' : 'Tele-consult';
  const kindTone: 'info' | 'accent' | 'neutral' =
    kind === 'tele' ? 'info' : kind === 'follow-up' ? 'accent' : 'neutral';
  const KindIcon = kind === 'tele' ? Video : Stethoscope;
  const isVirtual = kind === 'tele';

  return (
    <div className="px-5 py-4 flex items-center gap-4 hover:bg-bg-muted transition-colors">
      <div className="w-[60px] shrink-0 text-right font-mono text-[13px] font-semibold text-ink-2">
        {time}
      </div>
      <div className="h-10 w-px bg-line" />
      <Avatar name={name} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-serif text-[15px] font-semibold text-ink truncate">{name}</span>
          <Badge tone={kindTone} icon={<KindIcon />}>
            {kindLabel}
          </Badge>
        </div>
        {note && <div className="text-[12px] text-ink-3 mt-0.5 truncate">{note}</div>}
      </div>
      <Badge
        tone={status === 'confirmed' ? 'success' : 'neutral'}
        variant="soft"
        uppercase
      >
        {status}
      </Badge>
      {isVirtual ? (
        <VirtualActions appointment={appointment} />
      ) : (
        <Link to={`/consult/${patientId}`}>
          <Button variant="ghost" size="sm" rightIcon={<ChevronRight />}>
            Open
          </Button>
        </Link>
      )}
    </div>
  );
}
