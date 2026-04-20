import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Coins,
  ExternalLink,
  MessageSquareCode,
  Mic,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Empty } from '../components/ui/Empty';
import { useUpcomingInvoice, useUsageEvents, useUsageSummary } from '../queries/hooks';
import type { UsageEvent, UsageKind } from '../types';
import { USAGE_KIND_LABEL, USAGE_RATES_BDT } from '../types';
import { cn } from '../lib/cn';

const ICON: Record<UsageKind, React.ReactNode> = {
  transcription: <Mic className="h-3.5 w-3.5" />,
  'ai-fill': <Wand2 className="h-3.5 w-3.5" />,
  'talk-to-ai': <MessageSquareCode className="h-3.5 w-3.5" />,
  summary: <Sparkles className="h-3.5 w-3.5" />,
  other: <Activity className="h-3.5 w-3.5" />,
};

const KIND_ORDER: UsageKind[] = ['transcription', 'ai-fill', 'talk-to-ai', 'summary', 'other'];

export function Usage() {
  const { data: summary, isLoading: sumLoading } = useUsageSummary();
  const { data: upcoming } = useUpcomingInvoice();
  const [filterKind, setFilterKind] = useState<UsageKind | 'all'>('all');
  const { data: events = [], isLoading: evLoading } = useUsageEvents(
    filterKind === 'all' ? undefined : { kind: filterKind }
  );

  const maxDaily = useMemo(() => {
    if (!summary?.daily?.length) return 0;
    return Math.max(...summary.daily.map((d) => d.tokens));
  }, [summary]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="AI usage"
        description="Every metered AI interaction this billing cycle — live transcription, Rx auto-fills, Talk-to-AI commands. Totals here feed directly into your next invoice."
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          icon={<Coins />}
          label="Tokens consumed"
          value={summary ? summary.totalTokens.toLocaleString() : '—'}
          hint={
            summary
              ? `${summary.eventsCount} event${summary.eventsCount === 1 ? '' : 's'} logged`
              : 'No data yet'
          }
        />
        <SummaryCard
          icon={<Activity />}
          label="Usage charges so far"
          value={summary ? `৳${summary.totalCostBdt.toLocaleString()}` : '—'}
          hint={
            upcoming
              ? `+ ৳${upcoming.subscriptionBdt.toLocaleString()} base subscription`
              : undefined
          }
          accent
        />
        <SummaryCard
          icon={<Sparkles />}
          label="Period"
          value={summary ? periodLabel(summary.periodStart, summary.periodEnd) : '—'}
          hint="Resets on your renewal date"
        />
      </div>

      {/* Per-kind breakdown + daily chart */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
        <Card>
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.4px] text-accent-ink">
                <Coins className="h-3 w-3" />
                By AI feature
              </div>
              <Link
                to="/billing"
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-accent-ink hover:underline"
              >
                View full invoice
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            {sumLoading && <div className="py-6 text-[12.5px] text-ink-3">Loading…</div>}
            {!sumLoading && summary && (
              <div className="flex flex-col gap-2.5">
                {KIND_ORDER.filter((k) => (summary.byKind[k]?.tokens ?? 0) > 0).map((k) => {
                  const row = summary.byKind[k];
                  const pct =
                    summary.totalTokens > 0 ? (row.tokens / summary.totalTokens) * 100 : 0;
                  return (
                    <div key={k}>
                      <div className="flex items-center justify-between text-[12.5px]">
                        <div className="inline-flex items-center gap-1.5 font-medium text-ink">
                          <span className="h-6 w-6 rounded-md bg-accent-softer text-accent-ink grid place-items-center">
                            {ICON[k]}
                          </span>
                          {USAGE_KIND_LABEL[k]}
                          <span className="text-[11px] text-ink-3 ml-1">
                            · ৳{USAGE_RATES_BDT[k]} / 1K tokens
                          </span>
                        </div>
                        <div className="flex items-baseline gap-3">
                          <span className="text-[11.5px] text-ink-3 font-mono">
                            {row.tokens.toLocaleString()} tok
                          </span>
                          <span className="font-serif text-[14px] font-semibold text-ink w-[72px] text-right">
                            ৳{row.costBdt.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-bg-muted overflow-hidden">
                        <span
                          className="block h-full bg-accent"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                {KIND_ORDER.every((k) => (summary.byKind[k]?.tokens ?? 0) === 0) && (
                  <div className="text-[12.5px] text-ink-3 italic">
                    No AI usage yet this cycle.
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-5">
            <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.4px] text-accent-ink mb-3">
              <Activity className="h-3 w-3" />
              Daily consumption
            </div>
            {summary?.daily?.length ? (
              <div className="flex items-end gap-1 h-[140px]">
                {summary.daily.map((d) => {
                  const h = maxDaily > 0 ? Math.max(4, (d.tokens / maxDaily) * 100) : 4;
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className="w-full rounded-sm bg-accent/80 hover:bg-accent transition-colors"
                        style={{ height: `${h}%` }}
                        title={`${d.date} · ${d.tokens.toLocaleString()} tokens · ৳${d.costBdt.toLocaleString()}`}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-[12.5px] text-ink-3">No daily data yet.</div>
            )}
            {summary?.daily?.length ? (
              <div className="flex items-center justify-between text-[10.5px] text-ink-3 font-mono mt-2">
                <span>{fmtShort(summary.daily[0].date)}</span>
                <span>{fmtShort(summary.daily[summary.daily.length - 1].date)}</span>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      {/* Event log */}
      <Card>
        <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.4px] text-accent-ink">
            <Activity className="h-3 w-3" />
            Event log
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <FilterChip label="All" active={filterKind === 'all'} onClick={() => setFilterKind('all')} />
            {KIND_ORDER.filter((k) => k !== 'other' || (summary?.byKind.other?.tokens ?? 0) > 0).map(
              (k) => (
                <FilterChip
                  key={k}
                  label={USAGE_KIND_LABEL[k]}
                  active={filterKind === k}
                  onClick={() => setFilterKind(k)}
                  icon={ICON[k]}
                />
              )
            )}
          </div>
        </div>

        <div className="hidden md:grid grid-cols-[150px_160px_1fr_140px_110px] gap-4 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[1.2px] text-ink-3 bg-surface-muted border-b border-line">
          <div>When</div>
          <div>Feature</div>
          <div>Event</div>
          <div className="text-right">Tokens</div>
          <div className="text-right">Charge</div>
        </div>
        <div className="divide-y divide-line">
          {evLoading && (
            <div className="px-5 py-6 text-[12.5px] text-ink-3">Loading events…</div>
          )}
          {!evLoading && events.length === 0 && (
            <div className="p-6">
              <Empty
                icon={<Coins />}
                title="No usage yet"
                description="Start a consult or video call and the AI events will show up here — one row per metered interaction."
              />
            </div>
          )}
          {events.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Card className={cn(accent && 'border-accent/30 bg-accent-softer/30')}>
      <div className="p-4">
        <div
          className={cn(
            'inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.4px]',
            accent ? 'text-accent-ink' : 'text-ink-3'
          )}
        >
          <span className="h-6 w-6 rounded-md grid place-items-center [&>svg]:h-3.5 [&>svg]:w-3.5 bg-surface border border-line">
            {icon}
          </span>
          {label}
        </div>
        <div className="mt-2 font-serif text-[26px] font-semibold text-ink leading-tight">
          {value}
        </div>
        {hint && <div className="text-[11.5px] text-ink-3 mt-1">{hint}</div>}
      </div>
    </Card>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11.5px] font-semibold border transition-colors',
        active
          ? 'bg-accent text-white border-accent'
          : 'bg-surface text-ink-2 border-line hover:border-line-strong hover:text-ink'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function EventRow({ event }: { event: UsageEvent }) {
  return (
    <div className="grid md:grid-cols-[150px_160px_1fr_140px_110px] gap-4 px-5 py-3 items-center hover:bg-bg-muted transition-colors">
      <div className="leading-tight">
        <div className="font-serif text-[13.5px] font-semibold text-ink">
          {fmtDateTime(event.at)}
        </div>
      </div>
      <div>
        <Badge tone="neutral" variant="soft" icon={ICON[event.kind]}>
          {USAGE_KIND_LABEL[event.kind]}
        </Badge>
      </div>
      <div className="min-w-0">
        <div className="text-[13px] text-ink truncate">{event.summary ?? '—'}</div>
        {event.patientName && (
          <Link
            to={`/patients/${event.patientId}`}
            className="text-[11px] text-ink-3 hover:text-accent-ink truncate inline-flex items-center gap-1"
          >
            {event.patientName}
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="text-right font-mono text-[12px] text-ink-2">
        {event.tokens.toLocaleString()}
      </div>
      <div className="text-right font-serif text-[13.5px] font-semibold text-ink">
        ৳{event.costBdt.toLocaleString()}
      </div>
    </div>
  );
}

function fmtDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function fmtShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return iso;
  }
}

function periodLabel(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameYear = start.getFullYear() === end.getFullYear();
  const fmtS = start.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
  });
  const fmtE = end.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${fmtS} – ${fmtE}`;
}
