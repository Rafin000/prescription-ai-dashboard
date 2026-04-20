import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Scissors,
  Stethoscope,
  Video,
} from 'lucide-react';
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs, type TabItem } from '../components/ui/Tabs';
import { Avatar } from '../components/ui/Avatar';
import { VirtualActions } from '../components/appointment/VirtualActions';
import { NewAppointmentModal } from '../components/appointment/NewAppointmentModal';
import { useAppointments } from '../queries/hooks';
import { fmtTime } from '../lib/format';
import type { Appointment } from '../types';

type View = 'week' | 'day' | 'list';

export function Appointments() {
  const [cursor, setCursor] = useState(() => new Date('2026-04-19'));
  const [view, setView] = useState<View>('week');
  const [bookOpen, setBookOpen] = useState(false);
  const { data: appointments = [] } = useAppointments();

  const weekStart = startOfWeek(cursor, { weekStartsOn: 6 }); // Sat start
  const weekEnd = endOfWeek(cursor, { weekStartsOn: 6 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const key = format(parseISO(a.start), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [appointments]);

  const tabs: TabItem<View>[] = [
    { id: 'week', label: 'Week' },
    { id: 'day', label: 'Day' },
    { id: 'list', label: 'List' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Appointments"
        description="Your chamber schedule across both clinics. Drag patients to reschedule."
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={<CalendarDays />}
              disabled
              title="Coming soon — Google Calendar / iCloud / Outlook sync"
            >
              Sync calendar
            </Button>
            <Button
              variant="primary"
              leftIcon={<Plus />}
              onClick={() => setBookOpen(true)}
            >
              New appointment
            </Button>
          </>
        }
      />

      <Card className="p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setCursor((c) => subWeeks(c, 1))}
            aria-label="Previous week"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setCursor((c) => addWeeks(c, 1))}
            aria-label="Next week"
          >
            <ChevronRight />
          </Button>
          <div className="ml-2">
            <div className="font-serif text-[18px] font-semibold text-ink leading-tight">
              {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
            </div>
            <div className="text-[11.5px] text-ink-3 font-mono">
              {appointments.length} appointments this week
            </div>
          </div>
        </div>
        <Tabs items={tabs} value={view} onChange={setView} variant="pill" />
      </Card>

      {view === 'week' && (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 bg-surface-muted border-b border-line">
            {days.map((d) => {
              const isToday = isSameDay(d, new Date('2026-04-19'));
              return (
                <div
                  key={d.toISOString()}
                  className={`px-3 py-3 text-center border-r border-line last:border-r-0 ${
                    isToday ? 'bg-accent-softer' : ''
                  }`}
                >
                  <div
                    className={`text-[10.5px] font-bold uppercase tracking-[1.2px] ${
                      isToday ? 'text-accent-ink' : 'text-ink-3'
                    }`}
                  >
                    {format(d, 'EEE')}
                  </div>
                  <div
                    className={`font-serif text-[18px] mt-1 leading-none ${
                      isToday ? 'text-accent-ink font-bold' : 'text-ink font-semibold'
                    }`}
                  >
                    {format(d, 'd')}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-7 min-h-[520px]">
            {days.map((d) => {
              const key = format(d, 'yyyy-MM-dd');
              const appts = byDay.get(key) ?? [];
              return (
                <div
                  key={d.toISOString()}
                  className="border-r border-line last:border-r-0 p-2 flex flex-col gap-2"
                >
                  {appts.map((a) => (
                    <AppointmentChip key={a.id} a={a} />
                  ))}
                  {appts.length === 0 && (
                    <div className="flex-1 grid place-items-center text-[10.5px] text-ink-3 font-mono uppercase tracking-[1.2px]">
                      Open
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {view === 'day' && (
        <Card>
          <CardHeader
            title={format(cursor, 'EEEE, d MMMM yyyy')}
            icon={<CalendarDays />}
          />
          <div className="divide-y divide-line">
            {[...(byDay.get(format(cursor, 'yyyy-MM-dd')) ?? [])].map((a) => (
              <DayRow key={a.id} a={a} />
            ))}
            {(byDay.get(format(cursor, 'yyyy-MM-dd')) ?? []).length === 0 && (
              <div className="px-5 py-12 text-center text-[13px] text-ink-3">
                Nothing booked for this day.
              </div>
            )}
          </div>
        </Card>
      )}

      {view === 'list' && (
        <Card>
          <div className="divide-y divide-line">
            {appointments
              .slice()
              .sort((a, b) => a.start.localeCompare(b.start))
              .map((a) => (
                <DayRow key={a.id} a={a} />
              ))}
          </div>
        </Card>
      )}

      <NewAppointmentModal
        open={bookOpen}
        onClose={() => setBookOpen(false)}
      />
    </div>
  );
}

function AppointmentChip({ a }: { a: Appointment }) {
  const Icon =
    a.type === 'tele'
      ? Video
      : a.type === 'surgery'
      ? Scissors
      : Stethoscope;
  const tone =
    a.type === 'surgery'
      ? 'bg-danger-soft border-danger/40 text-danger'
      : a.type === 'tele'
      ? 'bg-info-soft border-info/30 text-info'
      : a.type === 'follow-up'
      ? 'bg-accent-softer border-accent/30 text-accent-ink'
      : 'bg-warn-soft border-warn/30 text-warn';
  const to =
    a.type === 'tele'
      ? `/call/${a.id}`
      : a.type === 'surgery'
      ? `/patients/${a.patientId}`
      : `/consult/${a.patientId}`;
  return (
    <Link
      to={to}
      className={`rounded-md border px-2 py-1.5 block hover:shadow-sm transition-all ${tone}`}
    >
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[1.2px] mb-0.5">
        <Icon className="h-3 w-3" />
        {a.type === 'surgery' ? 'OT · ' : ''}
        {fmtTime(a.start)}
      </div>
      <div className="text-[12px] font-semibold text-ink truncate">
        {a.type === 'surgery' && a.procedure ? a.procedure : a.patientName}
      </div>
      {a.type === 'surgery' && (
        <div className="text-[10.5px] text-ink-3 truncate">{a.patientName}</div>
      )}
    </Link>
  );
}

function DayRow({ a }: { a: Appointment }) {
  const Icon =
    a.type === 'tele' ? Video : a.type === 'surgery' ? Scissors : Stethoscope;
  const isVirtual = a.type === 'tele';
  const isSurgery = a.type === 'surgery';
  const openPath = isVirtual
    ? `/call/${a.id}`
    : isSurgery
    ? `/patients/${a.patientId}`
    : `/consult/${a.patientId}`;
  const badgeTone = isSurgery ? 'danger' : a.type === 'tele' ? 'info' : 'accent';
  const badgeLabel = isSurgery ? 'Surgery' : a.type === 'tele' ? 'virtual' : a.type;
  return (
    <Link
      to={openPath}
      className="flex items-center gap-4 px-5 py-4 hover:bg-bg-muted transition-colors"
    >
      <div className="w-[76px] shrink-0 text-right font-mono text-[13px] font-semibold text-ink-2">
        {fmtTime(a.start)}
        <div className="text-[10px] text-ink-3 uppercase mt-0.5 tracking-[1.2px]">
          {format(parseISO(a.start), 'EEE')}
        </div>
      </div>
      <div className="h-10 w-px bg-line" />
      <Avatar name={a.patientName} size="md" />
      <div className="min-w-0 flex-1">
        <div className="font-serif text-[14.5px] font-semibold text-ink truncate">
          {isSurgery && a.procedure ? a.procedure : a.patientName}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge tone={badgeTone} variant="soft" icon={<Icon />}>
            {badgeLabel}
          </Badge>
          {isSurgery && <span className="text-[11.5px] text-ink-2">{a.patientName}</span>}
          {isSurgery && a.hospital && (
            <span className="text-[11.5px] text-ink-3 truncate">· {a.hospital}</span>
          )}
          {!isSurgery && a.note && (
            <span className="text-[11.5px] text-ink-3 truncate">· {a.note}</span>
          )}
        </div>
      </div>
      <Badge
        tone={a.status === 'confirmed' ? 'success' : 'neutral'}
        variant="soft"
        uppercase
      >
        {a.status}
      </Badge>
      {isVirtual && <VirtualActions appointment={a} />}
    </Link>
  );
}
