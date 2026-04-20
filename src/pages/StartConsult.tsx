import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Search,
  Sparkles,
  Stethoscope,
  UserPlus,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Empty } from '../components/ui/Empty';
import { NewPatientModal } from '../components/patient/NewPatientModal';
import { usePatients } from '../queries/hooks';
import { fmtDate } from '../lib/format';
import { cn } from '../lib/cn';

export function StartConsult() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [newOpen, setNewOpen] = useState(false);

  const { data: patients = [], isLoading } = usePatients(q);

  const term = q.trim().toLowerCase();
  const looksLikePhone = /^\+?\d[\d\s-]{3,}$/.test(term);
  const filtered = useMemo(() => patients, [patients]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            AI-assisted consultation
          </span>
        }
        title="Who are you consulting?"
        description="Search for an existing patient, or register someone new. The AI pad, live transcript, and Rx editor start the moment you pick."
      />

      <Card className="p-4 flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            placeholder="Search by name, code, or phone…"
            leftIcon={<Search />}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            wrapperClassName="flex-1 min-w-[260px]"
            inputSize="lg"
            autoFocus
          />
          <Button
            variant="primary"
            size="lg"
            leftIcon={<UserPlus />}
            onClick={() => setNewOpen(true)}
          >
            Register new patient
          </Button>
        </div>
        {term && (
          <div className="text-[11.5px] text-ink-3">
            {filtered.length > 0
              ? `${filtered.length} match${filtered.length === 1 ? '' : 'es'} for "${q}"`
              : `No existing patient matches "${q}". Tap "Register new patient" to add them.`}
          </div>
        )}
      </Card>

      {/* Results */}
      <Card>
        <div className="px-5 py-3 border-b border-line flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.4px] text-accent-ink">
            {term ? 'Matches' : 'Recent patients'}
          </div>
          <span className="text-[11.5px] text-ink-3 font-mono">
            {filtered.length} shown
          </span>
        </div>

        <div className="divide-y divide-line">
          {isLoading && (
            <div className="px-5 py-10 text-center text-[13px] text-ink-3">
              Looking up patients…
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="p-6">
              <Empty
                icon={<UserPlus />}
                title={term ? `No one found for "${q}"` : 'No recent patients'}
                description={
                  term
                    ? 'Double-check the spelling or register a new patient with this name.'
                    : 'Once you start consulting, recent patients show up here for one-tap access.'
                }
                action={
                  <Button
                    variant="primary"
                    leftIcon={<UserPlus />}
                    onClick={() => setNewOpen(true)}
                  >
                    Register new patient
                  </Button>
                }
              />
            </div>
          )}

          {!isLoading &&
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/consult/${p.id}`)}
                className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-bg-muted transition-colors"
              >
                <Avatar name={p.name} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif text-[15px] font-semibold text-ink truncate">
                      {p.name}
                    </span>
                    {p.nameBn && (
                      <span className="font-bn text-[12px] text-ink-3 truncate">
                        {p.nameBn}
                      </span>
                    )}
                    <Badge tone="neutral" variant="soft">
                      {p.code}
                    </Badge>
                  </div>
                  <div className="text-[11.5px] text-ink-3 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>
                      {p.age}y ·{' '}
                      {p.sex === 'female' ? 'Female' : p.sex === 'male' ? 'Male' : '—'}
                    </span>
                    <span>· {p.phone}</span>
                    {p.patientSince && (
                      <span>· since {fmtDate(p.patientSince, 'MMM yyyy')}</span>
                    )}
                    {(p.conditions ?? []).slice(0, 2).map((c) => (
                      <span
                        key={c.name}
                        className={cn(
                          'text-[10.5px] font-semibold px-1.5 py-[1px] rounded-xs border',
                          c.status === 'uncontrolled'
                            ? 'bg-warn-soft text-warn border-warn/30'
                            : 'bg-bg-muted text-ink-2 border-line'
                        )}
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
                <Stethoscope className="h-4 w-4 text-ink-3 shrink-0" />
                <ChevronRight className="h-4 w-4 text-ink-3 shrink-0" />
              </button>
            ))}
        </div>
      </Card>

      <NewPatientModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={(p) => {
          setNewOpen(false);
          navigate(`/consult/${p.id}`);
        }}
        prefill={{
          name: !looksLikePhone ? term : undefined,
          phone: looksLikePhone ? term : undefined,
        }}
      />
    </div>
  );
}
