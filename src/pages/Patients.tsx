import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Filter, Plus, Scissors, Search, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Tabs, type TabItem } from '../components/ui/Tabs';
import { Can } from '../auth/Can';
import { NewPatientModal } from '../components/patient/NewPatientModal';
import { usePatients } from '../queries/hooks';
import { fmtDate } from '../lib/format';

type FilterId = 'all' | 'surgery' | 'chronic' | 'recent' | 'followup';

function isAwaitingSurgery(p: import('../types').Patient): boolean {
  const s = p.surgicalPlan;
  return !!s && s.status !== 'done' && s.status !== 'cancelled';
}

export function Patients() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<FilterId>('all');
  const [newOpen, setNewOpen] = useState(false);
  const { data: patients = [], isLoading } = usePatients(q);

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      if (tab === 'surgery' && !isAwaitingSurgery(p)) return false;
      if (tab === 'chronic' && !(p.conditions && p.conditions.length > 1)) return false;
      if (tab === 'recent' && p.visits < 5) return false;
      return true;
    });
  }, [patients, tab]);

  const surgeryCount = patients.filter(isAwaitingSurgery).length;

  const tabs: TabItem<FilterId>[] = [
    { id: 'all', label: 'All patients', count: patients.length },
    {
      id: 'surgery',
      label: 'Awaiting operation',
      count: surgeryCount,
      icon: <Scissors className="h-3.5 w-3.5" />,
    },
    {
      id: 'chronic',
      label: 'Chronic',
      count: patients.filter((p) => (p.conditions?.length ?? 0) > 1).length,
    },
    { id: 'recent', label: 'Frequent', count: patients.filter((p) => p.visits >= 5).length },
    { id: 'followup', label: 'Awaiting follow-up', count: 3 },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Patients"
        description="All records your clinic has on file. Search by name, code, or phone."
        actions={
          <>
            <Button variant="secondary" leftIcon={<SlidersHorizontal />}>
              Filters
            </Button>
            <Can permission="patient:create">
              <Button
                variant="primary"
                leftIcon={<Plus />}
                onClick={() => setNewOpen(true)}
              >
                New patient
              </Button>
            </Can>
          </>
        }
      />

      <Card className="p-4 flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            placeholder="Search by name, code, or phone…"
            leftIcon={<Search />}
            wrapperClassName="flex-1 min-w-[240px]"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button variant="ghost" leftIcon={<Filter />}>
            Sort: recent visit
          </Button>
        </div>
        <Tabs items={tabs} value={tab} onChange={setTab} />
      </Card>

      <Card>
        <div className="hidden md:grid grid-cols-[1.4fr_1fr_1.3fr_1fr_0.7fr] gap-4 px-5 py-3 text-[10.5px] font-bold uppercase tracking-[1.2px] text-ink-3 bg-surface-muted border-b border-line">
          <span>Patient</span>
          <span>Code · Phone</span>
          <span>Conditions</span>
          <span>Since / Visits</span>
          <span className="text-right">Age · Sex</span>
        </div>
        <div className="divide-y divide-line">
          {isLoading && (
            <div className="px-5 py-12 text-center text-[13px] text-ink-3">Loading patients…</div>
          )}
          {!isLoading &&
            filtered.map((p) => (
              <Link
                key={p.id}
                to={`/patients/${p.id}`}
                className="grid md:grid-cols-[1.4fr_1fr_1.3fr_1fr_0.7fr] gap-4 px-5 py-4 items-center hover:bg-bg-muted transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={p.name} size="md" />
                  <div className="min-w-0">
                    <div className="font-serif text-[15px] font-semibold text-ink truncate">
                      {p.name}
                    </div>
                    {p.nameBn && (
                      <div className="font-bn text-[12px] text-ink-3 truncate">{p.nameBn}</div>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] text-ink-3 font-mono">{p.code}</div>
                  <div className="text-[12.5px] text-ink-2 truncate">{p.phone}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isAwaitingSurgery(p) && (
                    <Badge
                      tone={p.surgicalPlan!.urgency === 'emergency' ? 'danger' : 'warn'}
                      variant="soft"
                      icon={<Scissors />}
                      uppercase
                    >
                      Operation · {p.surgicalPlan!.procedure}
                    </Badge>
                  )}
                  {(p.conditions ?? []).slice(0, 3).map((c) => (
                    <Badge
                      key={c.name}
                      tone={c.status === 'uncontrolled' ? 'warn' : 'neutral'}
                      variant="soft"
                    >
                      {c.name}
                    </Badge>
                  ))}
                  {(p.conditions?.length ?? 0) > 3 && (
                    <Badge tone="neutral">+{(p.conditions?.length ?? 0) - 3}</Badge>
                  )}
                </div>
                <div className="text-[12px] text-ink-3">
                  <div>Since {fmtDate(p.patientSince, 'MMM yyyy')}</div>
                  <div>
                    <span className="text-ink-2 font-semibold">{p.visits}</span> visits
                  </div>
                </div>
                <div className="md:text-right">
                  <Badge tone="accent" variant="soft">
                    {p.age}y · {p.sex === 'female' ? 'F' : p.sex === 'male' ? 'M' : 'X'}
                  </Badge>
                </div>
              </Link>
            ))}
          {!isLoading && filtered.length === 0 && (
            <div className="px-5 py-12 text-center text-[13px] text-ink-3">
              No patients match your search.
            </div>
          )}
        </div>
      </Card>

      <NewPatientModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={(p) => {
          setNewOpen(false);
          navigate(`/patients/${p.id}`);
        }}
        prefill={{ name: q.trim() || undefined }}
        submitLabel="Save & open profile"
        description="Add their core details — you can edit anything later from the profile."
      />
    </div>
  );
}
