import { BookMarked, Copy, Plus } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Empty } from '../components/ui/Empty';

const starterTemplates = [
  {
    id: 't-1',
    name: 'URTI — adult',
    description: 'Common cold, sore throat, low-grade fever. 5-day course.',
    count: 4,
    tags: ['respiratory', 'adult'],
  },
  {
    id: 't-2',
    name: 'UTI — uncomplicated female',
    description: 'Dysuria, frequency. 5-day Nitrofurantoin + advice.',
    count: 3,
    tags: ['urology', 'adult'],
  },
  {
    id: 't-3',
    name: 'Type 2 DM — follow-up',
    description: 'Metformin + Glimepiride review, HbA1c, diet advice.',
    count: 5,
    tags: ['chronic', 'endocrine'],
  },
  {
    id: 't-4',
    name: 'HTN — stage 1',
    description: 'Amlodipine/Losartan titration + lifestyle counselling.',
    count: 2,
    tags: ['chronic', 'cardiology'],
  },
];

export function Templates() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rx templates"
        description="Save repeat-use prescriptions so you can start a consult 3 clicks away from sending the patient home."
        actions={
          <Button variant="primary" leftIcon={<Plus />} disabled title="Coming soon">
            New template
          </Button>
        }
      />

      <div className="rounded-md border border-warn/30 bg-warn-soft/40 px-4 py-2 text-[12.5px] text-ink-2">
        Templates editor is on the roadmap — the cards below are examples.
        Save &amp; reuse is wired to the backend in a later slice.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {starterTemplates.map((t) => (
          <Card key={t.id} className="p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-serif text-[16px] font-semibold text-ink">{t.name}</div>
                <div className="text-[12.5px] text-ink-3 mt-1 leading-relaxed">
                  {t.description}
                </div>
              </div>
              <Badge tone="accent" variant="soft" icon={<BookMarked />}>
                {t.count} meds
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {t.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10.5px] font-semibold uppercase tracking-[1px] text-ink-3 bg-bg-muted rounded-xs px-1.5 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-line">
              <Button variant="ghost" size="sm" leftIcon={<Copy />} disabled title="Coming soon">
                Use
              </Button>
              <Button variant="ghost" size="sm" disabled title="Coming soon">
                Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Your drafts" icon={<BookMarked />} />
        <div className="p-5">
          <Empty
            icon={<BookMarked />}
            title="No drafts saved yet"
            description="Save an in-progress consultation as a draft and pick it up later — drafts are private to you."
          />
        </div>
      </Card>
    </div>
  );
}
