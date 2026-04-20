import { useState, type ReactNode } from 'react';
import {
  Calendar,
  ChevronRight,
  FileText,
  FlaskConical,
  Lightbulb,
  MessageSquarePlus,
  Pencil,
  Plus,
  Scissors,
  Sparkles,
  Stethoscope,
  X,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { fmtDate } from '../../lib/format';
import type { Doctor, Patient, RxMedicine } from '../../types';

export interface RxLiveDraft {
  chiefComplaint: string;
  oe: string[];
  diagnoses: string[];
  tests: string[];
  advice: string[];
  medicines: RxMedicine[];
  followUp: string;
  /**
   * Surgical plan entries written on the Rx. The first line is taken as
   * the procedure ("Laparoscopic cholecystectomy"); follow-up lines hold
   * indications, urgency, hospital, etc. Finalising an Rx with non-empty
   * `operation` creates or updates the patient's SurgicalPlan, which
   * drives the "Latest status" card.
   */
  operation: string[];
}

interface RxLivePaperProps {
  doctor: Doctor;
  patient: Patient;
  draft: RxLiveDraft;
  setDraft: (updater: (d: RxLiveDraft) => RxLiveDraft) => void;
  onAddMedicine: () => void;
  onEditMedicine: (med: RxMedicine) => void;
  onEditMedicineNote: (med: RxMedicine) => void;
  /** Patient-strip overrides — let the doctor tweak what prints on this Rx
   *  without mutating the underlying patient record. */
  patientName?: string;
  ageSex?: string;
  bp?: string;
  weight?: string;
  date?: string;
  onPatientStripChange?: (patch: Partial<PatientStripOverrides>) => void;
}

export interface PatientStripOverrides {
  patientName: string;
  ageSex: string;
  bp: string;
  weight: string;
  date: string;
}

/* ── Pagination tunables ─────────────────────────────────── */
const MEDS_PAGE_1 = 6;
const MEDS_CONT_PAGE = 14;
const NOTES_BUDGET_PAGE_1 = 30; // rough "lines" — page 1 minus patient strip
const NOTES_BUDGET_CONT = 40;
const NOTES_HEADER_COST = 2;
/**
 * How many lines we're willing to over-shoot a page's budget by, provided
 * the section that would spill is the last one remaining. Keeps short
 * trailing sections (like a 1-line Operation plan) from getting ejected
 * onto a nearly-empty second page.
 */
const PAGE_SPILL_TOLERANCE = 6;

type NotesKey = 'chief' | 'oe' | 'diagnoses' | 'tests' | 'advice' | 'operation';

interface NotesPageContent {
  chief: string[];
  oe: string[];
  diagnoses: string[];
  tests: string[];
  advice: string[];
  operation: string[];
  /** Starting index for each section on this page (for when a section is split). */
  offsets: Record<NotesKey, number>;
}

const emptyNotesPage = (): NotesPageContent => ({
  chief: [],
  oe: [],
  diagnoses: [],
  tests: [],
  advice: [],
  operation: [],
  offsets: { chief: 0, oe: 0, diagnoses: 0, tests: 0, advice: 0, operation: 0 },
});

function paginateNotes(draft: RxLiveDraft): NotesPageContent[] {
  const order: NotesKey[] = ['chief', 'oe', 'diagnoses', 'tests', 'advice', 'operation'];
  const items: Record<NotesKey, string[]> = {
    chief: draft.chiefComplaint ? [draft.chiefComplaint] : [],
    oe: draft.oe,
    diagnoses: draft.diagnoses,
    tests: draft.tests,
    advice: draft.advice,
    operation: draft.operation ?? [],
  };

  const pages: NotesPageContent[] = [];
  let cur = emptyNotesPage();
  let used = 0;
  let budget = NOTES_BUDGET_PAGE_1;

  // Pre-compute: for each section, how much content comes AFTER it in the
  // order? Used to decide whether a near-miss section is the last thing we
  // could squeeze in.
  const remainingAfter: Record<NotesKey, number> = {
    chief: 0, oe: 0, diagnoses: 0, tests: 0, advice: 0, operation: 0,
  };
  for (let i = 0; i < order.length; i++) {
    let total = 0;
    for (let j = i + 1; j < order.length; j++) {
      const next = items[order[j]];
      if (next.length > 0) total += NOTES_HEADER_COST + next.length;
    }
    remainingAfter[order[i]] = total;
  }

  for (const key of order) {
    let remaining = items[key];
    let startOffset = 0;
    if (remaining.length === 0) continue;

    while (remaining.length > 0) {
      const sectionCost = NOTES_HEADER_COST + remaining.length;

      // Whole section fits — add it and move on.
      if (used + sectionCost <= budget) {
        cur[key] = remaining;
        cur.offsets[key] = startOffset;
        used += sectionCost;
        remaining = [];
        break;
      }

      // Near-miss: section doesn't quite fit, but everything we've queued
      // so far + this section stays within the spill tolerance AND there's
      // nothing else waiting. Squeeze it in rather than eject to page 2.
      const overshoot = used + sectionCost - budget;
      if (overshoot <= PAGE_SPILL_TOLERANCE && remainingAfter[key] === 0) {
        cur[key] = remaining;
        cur.offsets[key] = startOffset;
        used += sectionCost;
        remaining = [];
        break;
      }

      // Doesn't fit entirely. Figure out how many items CAN fit on this page.
      const roomForItems = budget - used - NOTES_HEADER_COST;
      if (roomForItems > 0) {
        const head = remaining.slice(0, roomForItems);
        cur[key] = head;
        cur.offsets[key] = startOffset;
        remaining = remaining.slice(roomForItems);
        startOffset += head.length;
      }

      // Flush the current page and start a fresh continuation page.
      pages.push(cur);
      cur = emptyNotesPage();
      used = 0;
      budget = NOTES_BUDGET_CONT;
    }
  }

  if (used > 0) pages.push(cur);
  if (pages.length === 0) pages.push(cur);
  return pages;
}

function paginateMeds(meds: RxMedicine[]): Array<{ meds: RxMedicine[]; startIdx: number }> {
  const pages: Array<{ meds: RxMedicine[]; startIdx: number }> = [
    { meds: meds.slice(0, MEDS_PAGE_1), startIdx: 0 },
  ];
  for (let i = MEDS_PAGE_1; i < meds.length; i += MEDS_CONT_PAGE) {
    pages.push({ meds: meds.slice(i, i + MEDS_CONT_PAGE), startIdx: i });
  }
  return pages;
}

export function RxLivePaper({
  doctor,
  patient,
  draft,
  setDraft,
  onAddMedicine,
  onEditMedicine,
  onEditMedicineNote,
  patientName,
  ageSex,
  bp = '140/90 mmHg',
  weight = '68 kg',
  date,
  onPatientStripChange,
}: RxLivePaperProps) {
  const notesPages = paginateNotes(draft);
  const medPages = paginateMeds(draft.medicines);
  const totalPages = Math.max(notesPages.length, medPages.length || 1);
  const dateStr = date ?? fmtDate(new Date().toISOString(), 'd MMM yyyy');
  const patientStrip = {
    patientName:
      patientName ?? patient.name,
    ageSex:
      ageSex ??
      `${patient.age} / ${patient.sex === 'female' ? 'F' : patient.sex === 'male' ? 'M' : '—'}`,
    bp,
    weight,
    date: dateStr,
  };

  const removeMed = (id: string) =>
    setDraft((d) => ({ ...d, medicines: d.medicines.filter((m) => m.id !== id) }));
  const removeNote = (key: NotesKey, idx: number) =>
    setDraft((d) => {
      if (key === 'chief') return { ...d, chiefComplaint: '' };
      return { ...d, [key]: d[key].filter((_, i) => i !== idx) };
    });
  const addNote = (key: NotesKey, value: string) =>
    setDraft((d) => {
      if (key === 'chief') return { ...d, chiefComplaint: value };
      return { ...d, [key]: [...d[key], value] };
    });

  const pages = Array.from({ length: totalPages }, (_, i) => ({
    idx: i,
    isFirst: i === 0,
    isLast: i === totalPages - 1,
    notes: notesPages[i] ?? null,
    meds: medPages[i] ?? null,
  }));

  return (
    <div className="flex flex-col gap-5">
      {pages.map((pg) => (
        <RxSheet
          key={pg.idx}
          pg={pg}
          totalPages={totalPages}
          doctor={doctor}
          patient={patient}
          patientStrip={patientStrip}
          onPatientStripChange={onPatientStripChange}
          draft={draft}
          setDraft={setDraft}
          onAddMedicine={onAddMedicine}
          onEditMedicine={onEditMedicine}
          onEditMedicineNote={onEditMedicineNote}
          onRemoveMed={removeMed}
          onRemoveNote={removeNote}
          onAddNote={addNote}
          overflowCount={
            pg.isFirst && draft.medicines.length > MEDS_PAGE_1
              ? draft.medicines.length - MEDS_PAGE_1
              : 0
          }
        />
      ))}
    </div>
  );
}

/* ── Single-page sheet (first or continuation) ───────────── */

interface RxSheetProps {
  pg: {
    idx: number;
    isFirst: boolean;
    isLast: boolean;
    notes: NotesPageContent | null;
    meds: { meds: RxMedicine[]; startIdx: number } | null;
  };
  totalPages: number;
  doctor: Doctor;
  patient: Patient;
  patientStrip: PatientStripOverrides;
  onPatientStripChange?: (patch: Partial<PatientStripOverrides>) => void;
  draft: RxLiveDraft;
  setDraft: (updater: (d: RxLiveDraft) => RxLiveDraft) => void;
  onAddMedicine: () => void;
  onEditMedicine: (med: RxMedicine) => void;
  onEditMedicineNote: (med: RxMedicine) => void;
  onRemoveMed: (id: string) => void;
  onRemoveNote: (key: NotesKey, idx: number) => void;
  onAddNote: (key: NotesKey, value: string) => void;
  overflowCount: number;
}

function RxSheet({
  pg,
  totalPages,
  doctor,
  patient,
  patientStrip,
  onPatientStripChange,
  draft,
  setDraft,
  onAddMedicine,
  onEditMedicine,
  onEditMedicineNote,
  onRemoveMed,
  onRemoveNote,
  onAddNote,
  overflowCount,
}: RxSheetProps) {
  return (
    <div
      className="bg-white rounded-lg border border-line shadow-md px-8 pt-7 pb-6 flex flex-col"
      /* Locked to A4 aspect at 820px width (210 × 297 mm). The sheet keeps
         its real dimensions even when there's nothing written yet, so the
         preview always reads as a full prescription page. */
      style={{ width: 820, minHeight: 1160 }}
    >
      {pg.isFirst ? (
        <>
          <DocHeader doctor={doctor} />
          <div
            className="grid gap-2.5 px-3.5 py-2.5 rounded-md border border-line mb-[18px]"
            style={{ background: '#F7FAF9', gridTemplateColumns: 'repeat(4, 1fr) auto' }}
          >
            <PatField
              label="Patient"
              value={patientStrip.patientName}
              onChange={
                onPatientStripChange
                  ? (v) => onPatientStripChange({ patientName: v })
                  : undefined
              }
            />
            <PatField
              label="Age / Sex"
              value={patientStrip.ageSex}
              onChange={
                onPatientStripChange ? (v) => onPatientStripChange({ ageSex: v }) : undefined
              }
            />
            <PatField
              label="BP · Wt"
              value={`${patientStrip.bp} · ${patientStrip.weight}`}
              onChange={
                onPatientStripChange
                  ? (v) => {
                      const [bpPart, wtPart] = v.split('·').map((x) => x.trim());
                      onPatientStripChange({
                        bp: bpPart || patientStrip.bp,
                        weight: wtPart || patientStrip.weight,
                      });
                    }
                  : undefined
              }
            />
            <PatField
              label="Date"
              value={patientStrip.date}
              onChange={
                onPatientStripChange ? (v) => onPatientStripChange({ date: v }) : undefined
              }
            />
            <PatField label="Rx No." value={patient.code} mono align="right" />
          </div>
        </>
      ) : (
        <ContHeader
          doctor={doctor}
          patient={patient}
          dateStr={patientStrip.date}
          pageNum={pg.idx + 1}
          totalPages={totalPages}
        />
      )}

      {/* Two-column body — always rendered with the vertical divider so every
          page (first or continuation) reads with the same structure. Empty
          columns simply stay blank. `flex-1` makes the grid absorb the
          remaining vertical space so the A4 sheet keeps its full height even
          when nothing has been written yet. */}
      <div
        className="grid gap-[22px] flex-1"
        style={{
          gridTemplateColumns: '1fr 1px 1.25fr',
          minHeight: pg.isFirst ? 420 : 360,
        }}
      >
        <NotesColumn
          notes={pg.notes}
          draft={draft}
          isFirst={pg.isFirst}
          isLast={pg.isLast}
          onRemove={onRemoveNote}
          onAdd={onAddNote}
        />
        <div className="bg-line" />
        <MedsColumn
          meds={pg.meds}
          isFirst={pg.isFirst}
          isLast={pg.isLast}
          hasMedicines={draft.medicines.length > 0}
          followUp={draft.followUp}
          setFollowUp={(v) => setDraft((d) => ({ ...d, followUp: v }))}
          overflowCount={overflowCount}
          onRemoveMed={onRemoveMed}
          onAddMedicine={onAddMedicine}
          onEditMedicine={onEditMedicine}
          onEditMedicineNote={onEditMedicineNote}
        />
      </div>

      {/* Footer: signature on last page, continuation marker otherwise */}
      {pg.isLast ? (
        <Signature doctor={doctor} />
      ) : (
        <div className="mt-5 pt-3 border-t border-dashed border-line text-center text-[10.5px] text-ink-3 font-mono uppercase tracking-[1px]">
          Page {pg.idx + 1} of {totalPages} · continued →
        </div>
      )}
      {pg.isLast && totalPages > 1 && (
        <div className="mt-3 pt-2 border-t border-dashed border-line text-center text-[10.5px] text-ink-3 font-mono uppercase tracking-[1px]">
          Page {pg.idx + 1} of {totalPages} · end of prescription
        </div>
      )}
    </div>
  );
}

/* ── Left column: clinical notes (whatever fits on this page) ── */

function NotesColumn({
  notes,
  draft,
  isFirst,
  isLast,
  onRemove,
  onAdd,
}: {
  notes: NotesPageContent | null;
  draft: RxLiveDraft;
  isFirst: boolean;
  isLast: boolean;
  onRemove: (key: NotesKey, i: number) => void;
  onAdd: (key: NotesKey, v: string) => void;
}) {
  // Continuation pages with no notes render an empty column — the vertical
  // divider in the grid still separates it from the meds side.
  if (notes === null) return <div />;
  const hasAnyContent =
    notes.chief.length > 0 ||
    notes.oe.length > 0 ||
    notes.diagnoses.length > 0 ||
    notes.tests.length > 0 ||
    notes.advice.length > 0 ||
    notes.operation.length > 0;
  if (!hasAnyContent && !isFirst) return <div />;

  // Fixed medical order — render every section in the same sequence every
  // time so items never reorder as content is added, removed, or paginated.
  const sections: Array<{
    key: NotesKey;
    baseLabel: string;
    icon: ReactNode;
    placeholder: string;
    tone?: 'dx';
    checkbox?: boolean;
  }> = [
    {
      key: 'chief',
      baseLabel: 'C/O — Chief complaints',
      icon: <FileText className="h-3 w-3" />,
      placeholder: 'Symptoms will show up as the patient speaks…',
    },
    {
      key: 'oe',
      baseLabel: 'O/E — On examination',
      icon: <Stethoscope className="h-3 w-3" />,
      placeholder: 'On-examination findings fill in here…',
    },
    {
      key: 'diagnoses',
      baseLabel: 'Diagnosis',
      icon: <Sparkles className="h-3 w-3" />,
      placeholder: 'Diagnosis is inferred from the conversation…',
      tone: 'dx',
    },
    {
      key: 'tests',
      baseLabel: 'Investigations',
      icon: <FlaskConical className="h-3 w-3" />,
      placeholder: 'Investigations you mention are collected here…',
      checkbox: true,
    },
    {
      key: 'advice',
      baseLabel: 'Advice',
      icon: <Lightbulb className="h-3 w-3" />,
      placeholder: 'Lifestyle advice captured from your words…',
    },
    {
      key: 'operation',
      baseLabel: 'Operation plan',
      icon: <Scissors className="h-3 w-3" />,
      placeholder: 'e.g. Laparoscopic cholecystectomy — elective, after pre-op clearance',
      tone: 'dx',
    },
  ];

  return (
    <div className="flex flex-col gap-3.5">
      {sections.map((s) => {
        const items = notes[s.key];
        const offset = notes.offsets[s.key];
        const hasItems = items.length > 0;
        // Does the draft carry items in this section that live on some
        // *other* page? If so, don't render an empty placeholder here —
        // the user will see the real content on the page where it landed.
        const draftItems =
          s.key === 'chief'
            ? draft.chiefComplaint
              ? [draft.chiefComplaint]
              : []
            : draft[s.key as Exclude<NotesKey, 'chief'>] ?? [];
        const draftHasItems = (draftItems as string[]).length > 0;

        // On continuation pages, only render sections that carry content
        // onto this page (no empty placeholders).
        if (!hasItems && !isFirst) return null;
        // On page 1, suppress the empty placeholder for any section whose
        // content got paginated elsewhere — avoids showing a blank "Operation
        // plan" block here and the actual items on a later page.
        if (!hasItems && draftHasItems) return null;

        const isContinuation = hasItems && offset > 0;
        const label = isContinuation ? `${s.baseLabel} · cont.` : s.baseLabel;

        return (
          <RxSection
            key={s.key}
            label={label}
            icon={s.icon}
            placeholder={hasItems ? '' : s.placeholder}
            items={items}
            tone={s.tone}
            checkbox={s.checkbox}
            onRemove={(i) => onRemove(s.key, offset + i)}
            onAdd={(v) => onAdd(s.key, v)}
            hideAdd={hasItems && !isLast}
          />
        );
      })}
    </div>
  );
}

/* ── Right column: meds + follow-up + add form ───────────── */

function MedsColumn({
  meds,
  isFirst,
  isLast,
  hasMedicines,
  followUp,
  setFollowUp,
  overflowCount,
  onRemoveMed,
  onAddMedicine,
  onEditMedicine,
  onEditMedicineNote,
}: {
  meds: { meds: RxMedicine[]; startIdx: number } | null;
  isFirst: boolean;
  isLast: boolean;
  hasMedicines: boolean;
  followUp: string;
  setFollowUp: (v: string) => void;
  overflowCount: number;
  onRemoveMed: (id: string) => void;
  onAddMedicine: () => void;
  onEditMedicine: (med: RxMedicine) => void;
  onEditMedicineNote: (med: RxMedicine) => void;
}) {
  const rxLabel = isFirst ? 'Treatment' : 'Treatment · continued';
  const hasMedsOnThisPage = meds && meds.meds.length > 0;

  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[1.4px] text-accent-ink mb-2">
        <Stethoscope className="h-3 w-3" />
        {rxLabel}
      </div>
      <div
        className="font-serif italic font-semibold leading-none text-accent"
        style={{ fontSize: 28, marginTop: -6, marginBottom: 8 }}
      >
        ℞
      </div>

      {hasMedsOnThisPage ? (
        <MedList
          meds={meds!.meds}
          startIdx={meds!.startIdx}
          onRemove={onRemoveMed}
          onEdit={onEditMedicine}
          onEditNote={onEditMedicineNote}
        />
      ) : isFirst && !hasMedicines ? (
        <div className="italic text-[11.5px] text-ink-3 py-1">
          Medicines will appear here as you prescribe them…
        </div>
      ) : null}

      {/* Add button + overflow chip — only on last page for the add, first page for the chip */}
      {(isLast || (isFirst && overflowCount > 0)) && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {isFirst && overflowCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warn bg-warn-soft border border-warn/30 rounded-full px-2.5 py-[3px]">
              <ChevronRight className="h-3 w-3" />
              {overflowCount} more on page 2
            </span>
          )}
          {isLast && (
            <button
              type="button"
              onClick={onAddMedicine}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-3 px-2.5 py-1 rounded-full border border-dashed border-line hover:border-accent hover:text-accent-ink transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add medicine
            </button>
          )}
        </div>
      )}

      {isLast && (
        <FollowUpField value={followUp} onChange={setFollowUp} />
      )}
    </div>
  );
}

/* ── Continuation page header ─────────────────────────────── */

function ContHeader({
  doctor,
  patient,
  dateStr,
  pageNum,
  totalPages,
}: {
  doctor: Doctor;
  patient: Patient;
  dateStr: string;
  pageNum: number;
  totalPages: number;
}) {
  return (
    <div
      className="grid grid-cols-[1fr_1fr_auto] items-start gap-4 pb-3 mb-4"
      style={{ borderBottom: '2px solid #0B1F1C' }}
    >
      <div>
        <div className="font-serif font-semibold text-[16px] text-ink leading-tight">
          {doctor.name}
        </div>
        <div className="text-[10.5px] text-ink-3 mt-0.5">
          {doctor.degrees.join(', ')} · BMDC {doctor.bmdcNo}
        </div>
      </div>
      <div>
        <div className="font-serif text-[13px] font-semibold text-ink">
          {patient.name} · {patient.age}/
          {patient.sex === 'female' ? 'F' : patient.sex === 'male' ? 'M' : '—'}
        </div>
        <div className="text-[10.5px] text-ink-3 mt-0.5 font-mono">
          Rx {patient.code} · {dateStr}
        </div>
      </div>
      <div className="text-right">
        <div className="inline-block text-[10.5px] font-bold font-mono text-accent-ink bg-accent-soft border border-accent/30 rounded-xs px-2 py-[3px]">
          Page {pageNum} of {totalPages}
        </div>
        <div className="text-[10.5px] text-ink-3 mt-1">
          continued from page {pageNum - 1}
        </div>
      </div>
    </div>
  );
}

function DocHeader({ doctor }: { doctor: Doctor }) {
  return (
    <header
      className="grid grid-cols-2 gap-4 items-start pb-[18px] mb-[18px]"
      style={{ borderBottom: '2px solid #0F766E' }}
    >
      <div className="text-[12px] text-ink-2 leading-[1.5]">
        <div className="font-serif font-semibold text-[20px] text-ink leading-tight tracking-tight mb-0.5">
          {doctor.name}
        </div>
        <div>{doctor.degrees.join(', ')}</div>
        <div>{doctor.specialty}</div>
        <div className="text-accent-ink font-semibold mt-1 text-[11px]">
          BMDC Reg. No. {doctor.bmdcNo}
        </div>
      </div>
      <div className="text-right text-[12px] text-ink-2 leading-[1.5]">
        <div className="font-semibold text-ink text-[13px]">Chamber</div>
        <div>{doctor.chambers[0].name}</div>
        <div>
          {doctor.chambers[0].days[0]}-
          {doctor.chambers[0].days[doctor.chambers[0].days.length - 1]} ·{' '}
          {doctor.chambers[0].time}
        </div>
        {doctor.chambers[0].phone && (
          <div className="font-mono text-[11.5px]">{doctor.chambers[0].phone}</div>
        )}
      </div>
    </header>
  );
}

function MedList({
  meds,
  startIdx,
  onRemove,
  onEdit,
  onEditNote,
}: {
  meds: RxMedicine[];
  startIdx: number;
  onRemove: (id: string) => void;
  onEdit: (m: RxMedicine) => void;
  onEditNote: (m: RxMedicine) => void;
}) {
  return (
    <ol className="flex flex-col list-none pl-0 m-0">
      {meds.map((m, i) => (
        <li
          key={m.id}
          className="grid gap-2.5 py-2.5 items-start border-b border-dotted border-line last:border-b-0 group"
          style={{ gridTemplateColumns: '24px 1fr auto' }}
        >
          <span className="font-serif font-semibold text-[16px] text-accent leading-none pt-0.5">
            {startIdx + i + 1}.
          </span>
          <div className="min-w-0">
            <div className="font-serif font-semibold text-[14.5px] text-ink leading-tight">
              {m.brand}
              {m.generic && (
                <span className="font-sans font-normal text-[12px] text-ink-3 ml-1.5">
                  · {m.generic}
                </span>
              )}
              {m.strength && (
                <span className="font-mono font-medium text-[12.5px] text-ink-2 ml-1.5">
                  {m.strength}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-[12px] text-ink-2 font-mono flex-wrap">
              <span
                className="font-serif font-semibold px-[7px] py-[1px] rounded-xs text-accent-ink text-[13px]"
                style={{ background: '#F0F7F5', border: '1px solid #D5E6E1' }}
              >
                {m.dose}
              </span>
              {m.duration && <span>× {m.duration}</span>}
              {m.instruction && (
                <span className="text-ink-3 italic not-italic">· {m.instruction}</span>
              )}
            </div>
            {/* Doctor's free-form comment — prints under the medicine line */}
            {m.note ? (
              <div
                className="mt-2 text-[11.5px] text-ink-2 font-serif italic leading-relaxed border-l-2 border-accent/40 pl-2.5"
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {m.note}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onEditNote(m)}
                className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-medium text-ink-3 px-2 py-[2px] rounded-full border border-dashed border-line hover:border-accent hover:text-accent-ink transition-colors opacity-0 group-hover:opacity-100"
              >
                <MessageSquarePlus className="h-3 w-3" />
                Add comment
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {m.note && (
              <button
                type="button"
                aria-label="Edit comment"
                title="Edit comment"
                className="h-6 w-6 rounded-full bg-white shadow-sm border border-line text-ink-3 grid place-items-center hover:text-accent-ink"
                onClick={() => onEditNote(m)}
              >
                <MessageSquarePlus className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              aria-label="Edit"
              title="Edit medicine"
              className="h-6 w-6 rounded-full bg-white shadow-sm border border-line text-ink-3 grid place-items-center hover:text-accent-ink"
              onClick={() => onEdit(m)}
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              aria-label="Remove"
              title="Remove"
              className="h-6 w-6 rounded-full bg-white shadow-sm border border-line text-ink-3 grid place-items-center hover:text-danger"
              onClick={() => onRemove(m.id)}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}

function FollowUpField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className={cn(
        'mt-4 flex items-center gap-2 px-2.5 py-2 rounded-md text-[12px]',
        value
          ? 'bg-accent-softer/60 text-accent-ink'
          : 'border border-dashed border-line text-ink-3 italic'
      )}
    >
      <Calendar className="h-3 w-3" />
      <span className="flex-1">
        <b className="font-semibold not-italic">Follow-up:</b>{' '}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. 7 days"
          className="bg-transparent border-0 outline-none font-serif text-[12.5px] text-ink placeholder:text-ink-3 placeholder:italic focus:ring-0 p-0 w-[60%]"
        />
      </span>
    </div>
  );
}

function Signature({ doctor }: { doctor: Doctor }) {
  const hasImage = !!doctor.signatureUrl;
  return (
    <div className="mt-6 pt-4 border-t border-line flex items-end justify-between gap-6">
      <div className="text-[11.5px] text-ink-3 leading-relaxed">
        Pharmacist: please dispense as written · Keep this prescription safe
      </div>
      <div className="text-right shrink-0">
        {hasImage ? (
          <div
            className="flex items-end justify-end"
            style={{
              borderBottom: '1px solid #0B1F1C',
              minWidth: 200,
              padding: '2px 40px 2px 0',
              minHeight: 44,
            }}
          >
            <img
              src={doctor.signatureUrl}
              alt={`${doctor.name} signature`}
              className="max-h-[50px] max-w-[200px] object-contain mix-blend-multiply"
            />
          </div>
        ) : (
          <div
            className="font-serif italic text-[18px] text-ink-2"
            style={{
              borderBottom: '1px solid #0B1F1C',
              minWidth: 200,
              padding: '2px 40px 2px 0',
            }}
          >
            {doctor.name}
          </div>
        )}
        <div className="text-[10px] text-ink-3 mt-1 tracking-[1px] uppercase">
          {doctor.name} · Signature &amp; seal
        </div>
      </div>
    </div>
  );
}

function PatField({
  label,
  value,
  mono,
  align,
  onChange,
}: {
  label: string;
  value: string;
  mono?: boolean;
  align?: 'left' | 'right';
  onChange?: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const editable = !!onChange;

  const commit = () => {
    const v = draft.trim() || value;
    if (editable && v !== value) onChange!(v);
    setEditing(false);
  };

  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <div className="text-[9px] font-bold uppercase tracking-[1px] text-ink-3">{label}</div>
      {editing && editable ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
            if (e.key === 'Escape') {
              setDraft(value);
              setEditing(false);
            }
          }}
          className={cn(
            'w-full bg-white border border-accent rounded-xs outline-none text-[13px] text-ink mt-[2px] px-1 py-[1px]',
            mono && 'font-mono',
            align === 'right' && 'text-right'
          )}
        />
      ) : (
        <div
          role={editable ? 'button' : undefined}
          tabIndex={editable ? 0 : undefined}
          onClick={() => {
            if (!editable) return;
            setDraft(value);
            setEditing(true);
          }}
          onKeyDown={(e) => {
            if (editable && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              setDraft(value);
              setEditing(true);
            }
          }}
          title={editable ? 'Click to edit' : undefined}
          className={cn(
            'text-[13px] text-ink mt-[2px] font-medium',
            mono && 'font-mono',
            editable && 'rounded-xs cursor-text hover:bg-white hover:ring-1 hover:ring-accent/30 px-1 -mx-1 transition-colors'
          )}
        >
          {value}
        </div>
      )}
    </div>
  );
}

/* ── RxSection — inline editable list ────────────────────── */
function RxSection({
  label,
  icon,
  items,
  placeholder,
  tone,
  checkbox,
  onRemove,
  onAdd,
  hideAdd,
}: {
  label: string;
  icon: ReactNode;
  items: string[];
  placeholder: string;
  tone?: 'dx';
  checkbox?: boolean;
  onRemove: (i: number) => void;
  onAdd: (v: string) => void;
  hideAdd?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const commit = () => {
    if (draft.trim()) onAdd(draft.trim());
    setDraft('');
    setAdding(false);
  };

  return (
    <section>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[1.4px] text-accent-ink mb-1.5">
        {icon}
        {label}
      </div>
      {items.length === 0 && !adding ? (
        placeholder ? (
          <div className="italic text-[11.5px] text-ink-3 py-0.5 leading-relaxed pl-4">
            {placeholder}
          </div>
        ) : null
      ) : (
        <div>
          {items.map((it, i) => (
            <div
              key={i}
              className="relative pl-4 pr-6 text-[13px] text-ink font-serif group"
              style={{ lineHeight: 1.75 }}
            >
              {checkbox ? (
                <span
                  className="absolute left-0 font-mono text-accent-ink"
                  style={{ top: 1 }}
                >
                  □
                </span>
              ) : (
                <span
                  className={cn(
                    'absolute left-[2px] w-[5px] h-[5px] rounded-full',
                    tone === 'dx' ? 'bg-accent' : 'bg-ink-3'
                  )}
                  style={{ top: 9 }}
                />
              )}
              <span>{it}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label="Remove"
                className="absolute right-0 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-ink-3 hover:text-danger"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {adding && (
            <div className="relative pl-4" style={{ lineHeight: 1.75 }}>
              {checkbox ? (
                <span
                  className="absolute left-0 font-mono text-accent-ink"
                  style={{ top: 1 }}
                >
                  □
                </span>
              ) : (
                <span
                  className={cn(
                    'absolute left-[2px] w-[5px] h-[5px] rounded-full',
                    tone === 'dx' ? 'bg-accent' : 'bg-ink-3'
                  )}
                  style={{ top: 9 }}
                />
              )}
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit();
                  if (e.key === 'Escape') {
                    setDraft('');
                    setAdding(false);
                  }
                }}
                placeholder={`New ${label.split('—').pop()?.trim().toLowerCase().replace(' · cont.', '')}…`}
                className="bg-transparent border-0 border-b border-dashed border-accent outline-none font-serif text-[13px] text-ink placeholder:text-ink-3 placeholder:italic w-full focus:ring-0 p-0"
              />
            </div>
          )}
        </div>
      )}
      {!hideAdd && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-1.5 ml-4 inline-flex items-center gap-1 text-[11px] font-medium text-ink-3 px-2 py-[2px] rounded-full border border-dashed border-line hover:border-accent hover:text-accent-ink transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      )}
    </section>
  );
}
