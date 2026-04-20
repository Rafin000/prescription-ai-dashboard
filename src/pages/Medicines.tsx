import { useMemo, useState } from 'react';
import { Building2, Check, Heart, Pill, Search, Star, X } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useMedicineSearch, useUpdateMedicineNote } from '../queries/hooks';
import { cn } from '../lib/cn';

export function Medicines() {
  const [q, setQ] = useState('');
  const [companies, setCompanies] = useState<Set<string>>(new Set());
  const { data: meds = [], isLoading } = useMedicineSearch(q);
  const { mutate: updateNote } = useUpdateMedicineNote();

  // Group catalogue by company for the filter row. Counts reflect the current
  // search (`q`) so the chips stay in sync with what the grid shows.
  const companyGroups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of meds) {
      counts.set(m.company, (counts.get(m.company) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name));
  }, [meds]);

  const filtered = useMemo(() => {
    if (companies.size === 0) return meds;
    return meds.filter((m) => companies.has(m.company));
  }, [meds, companies]);

  const toggleCompany = (name: string) => {
    setCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const clearFilters = () => setCompanies(new Set());
  const totalMatches = filtered.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Medicine library"
        description="Rate medicines, keep private notes, and set your preferred brands. Filter by company to pick favourites from a specific manufacturer — your ratings influence AI suggestions on the prescription pad."
      />

      <Card className="p-4 flex flex-col gap-3">
        <Input
          placeholder="Search brand, generic, or company…"
          leftIcon={<Search />}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        {/* Company filter row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.2px] text-ink-3 mr-1">
            <Building2 className="h-3.5 w-3.5" />
            Company
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className={cn(
              'inline-flex items-center gap-1 h-7 px-3 rounded-full text-[11.5px] font-semibold transition-colors border',
              companies.size === 0
                ? 'bg-ink text-white border-ink'
                : 'bg-surface text-ink-2 border-line hover:border-line-strong hover:bg-bg-muted'
            )}
          >
            All
            <span
              className={cn(
                'font-mono text-[10px]',
                companies.size === 0 ? 'text-white/70' : 'text-ink-3'
              )}
            >
              {meds.length}
            </span>
          </button>

          {companyGroups.map((c) => {
            const active = companies.has(c.name);
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => toggleCompany(c.name)}
                aria-pressed={active}
                className={cn(
                  'inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11.5px] font-semibold transition-colors border',
                  active
                    ? 'bg-accent text-white border-accent shadow-xs'
                    : 'bg-surface text-ink-2 border-line hover:border-line-strong hover:bg-bg-muted'
                )}
              >
                {active && <Check className="h-3 w-3" />}
                {c.name}
                <span
                  className={cn(
                    'font-mono text-[10px]',
                    active ? 'text-white/80' : 'text-ink-3'
                  )}
                >
                  {c.count}
                </span>
              </button>
            );
          })}

          {companies.size > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-ink-3 hover:text-ink-2"
              title="Clear filters"
            >
              <X className="h-3 w-3" />
              Clear {companies.size} filter{companies.size === 1 ? '' : 's'}
            </button>
          )}
        </div>

        <div className="text-[11.5px] text-ink-3">
          {companies.size === 0
            ? `Showing ${totalMatches} medicine${totalMatches === 1 ? '' : 's'}`
            : `Showing ${totalMatches} medicine${totalMatches === 1 ? '' : 's'} from ${companies.size} compan${companies.size === 1 ? 'y' : 'ies'}`}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((m) => (
          <Card key={m.id} className="p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-serif text-[16px] font-semibold text-ink">{m.brand}</div>
                <div className="text-[11.5px] text-ink-3 italic mt-0.5">
                  {m.generic} · {m.strength}
                </div>
              </div>
              <Badge tone="neutral" variant="soft" icon={<Pill />}>
                {m.form ?? '—'}
              </Badge>
            </div>
            <button
              type="button"
              onClick={() => toggleCompany(m.company)}
              className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-2 font-semibold self-start px-1.5 py-0.5 -mx-1.5 rounded-xs hover:bg-accent-softer hover:text-accent-ink transition-colors"
              title={
                companies.has(m.company)
                  ? `Clear ${m.company} filter`
                  : `Filter to ${m.company}`
              }
            >
              <Building2 className="h-3 w-3 text-ink-3" />
              {m.company}
            </button>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => updateNote({ id: m.id, rating: n })}
                  className="p-0.5"
                  aria-label={`Rate ${n}`}
                >
                  <Star
                    className={`h-4 w-4 ${
                      (m.rating ?? 0) >= n
                        ? 'text-warn fill-warn'
                        : 'text-ink-4 hover:text-warn'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-1 text-[11px] text-ink-3 font-mono">
                {m.rating ? m.rating.toFixed(1) : '—'}
              </span>
            </div>
            {m.doctorNote && (
              <div className="text-[11.5px] text-ink-2 bg-surface-muted rounded-md p-2.5 italic">
                "{m.doctorNote}"
              </div>
            )}
            <div className="flex items-center gap-2 pt-2 border-t border-line">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Heart />}
                onClick={() =>
                  updateNote({ id: m.id, rating: (m.rating ?? 0) >= 5 ? 0 : 5 })
                }
              >
                {(m.rating ?? 0) >= 5 ? 'Unfavourite' : 'Favourite'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const note = window.prompt(
                    `Note about ${m.brand}`,
                    m.doctorNote ?? '',
                  );
                  if (note !== null) updateNote({ id: m.id, doctorNote: note });
                }}
              >
                {m.doctorNote ? 'Edit note' : 'Add note'}
              </Button>
            </div>
          </Card>
        ))}
        {!isLoading && filtered.length === 0 && (
          <div className="col-span-full text-center text-[13px] text-ink-3 py-10">
            {companies.size > 0
              ? `No medicines from ${Array.from(companies).join(', ')} match "${q}".`
              : `No medicines found for "${q}".`}
          </div>
        )}
      </div>
    </div>
  );
}
