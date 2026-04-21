import type { ReactNode } from 'react';
import {
  Calendar,
  CheckSquare,
  FlaskConical,
  Lightbulb,
  NotepadText,
  Sparkles,
  Scissors,
  Stethoscope,
} from 'lucide-react';
import type { Doctor, Patient, Prescription, RxMedicine } from '../../types';
import { cn } from '../../lib/cn';
import { fmtDate } from '../../lib/format';
import { useResolvedSettings } from '../../stores/settingsStore';
import { resolveAsset } from '../../config/env';

const PAPER_DIMENSIONS: Record<'A5' | 'A4', { minHeight: number; padding: string }> = {
  // On-screen heights tuned to the real paper aspect ratio (A4 ≈ 0.707,
  // A5 ≈ 0.707) so at the container's natural width the sheet looks
  // proportionally correct — roughly 21×29.7 cm (A4) or 14.8×21 cm (A5).
  A5: { minHeight: 1000, padding: 'px-9 pt-8 pb-7' },
  A4: { minHeight: 1226, padding: 'px-12 pt-10 pb-9' },
};

const LETTERHEAD_STYLES: Record<string, { borderColor: string; titleColor: string }> = {
  'Clinical & calm (default)': { borderColor: '#0F766E', titleColor: '#0B1F1C' },
  'Minimal monochrome': { borderColor: '#0B1F1C', titleColor: '#0B1F1C' },
  'Modern colour band': { borderColor: '#1D4ED8', titleColor: '#1D4ED8' },
};

const RX_LABELS_BN: Record<string, string> = {
  Chamber: 'চেম্বার',
  'Chief complaint': 'মূল অভিযোগ',
  Diagnoses: 'রোগনির্ণয়',
  Tests: 'পরীক্ষা',
  Advice: 'পরামর্শ',
  Treatment: 'চিকিৎসা',
  'On examination': 'পরীক্ষা',
  'Operation plan': 'অপারেশন পরিকল্পনা',
  'Follow-up': 'পরবর্তী সাক্ষাৎ',
  Patient: 'রোগী',
};

/** Paper-aware pagination. A5 (148×210mm) has about half the usable
 *  height of A4 (210×297mm), so the per-page caps differ. These values
 *  are tuned so each JS-rendered Sheet reliably fits on ONE printed
 *  page — otherwise the browser re-splits the sheet and page 2 loses
 *  its header. Must stay in sync with RxLivePaper. */
const MEDS_PAGE_LIMITS: Record<'A4' | 'A5', { first: number; cont: number }> = {
  // Caps reserve vertical room for the per-page footer (pharmacist
  // note + signature). Each sheet fits on one printed page.
  A4: { first: 7, cont: 12 },
  A5: { first: 3, cont: 6 },
};

function shortRxId(id: string): string {
  const clean = id.replace(/-/g, '');
  if (clean.length >= 8) return clean.slice(-8).toUpperCase();
  return id.toUpperCase();
}

function labelFor(en: string, mode: 'en' | 'bn' | 'bilingual'): string {
  const bn = RX_LABELS_BN[en];
  if (mode === 'bn' && bn) return bn;
  if (mode === 'bilingual' && bn) return `${en} · ${bn}`;
  return en;
}

function paginateMeds(
  meds: RxMedicine[],
  paperSize: 'A4' | 'A5',
): Array<{ meds: RxMedicine[]; startIdx: number }> {
  const { first, cont } = MEDS_PAGE_LIMITS[paperSize];
  if (meds.length === 0) return [{ meds: [], startIdx: 0 }];
  const pages = [{ meds: meds.slice(0, first), startIdx: 0 }];
  for (let i = first; i < meds.length; i += cont) {
    pages.push({ meds: meds.slice(i, i + cont), startIdx: i });
  }
  return pages;
}

interface RxPaperProps {
  doctor: Doctor;
  patient: Patient;
  rx: Prescription;
  className?: string;
  chamberId?: string;
  bp?: string;
  weight?: string;
}

export function RxPaper({
  doctor,
  patient,
  rx,
  className,
  chamberId,
  bp = '140/90',
  weight = '68 kg',
}: RxPaperProps) {
  const chamber = doctor.chambers.find((c) => c.id === chamberId) ?? doctor.chambers[0];
  const settings = useResolvedSettings();
  const paper = PAPER_DIMENSIONS[settings.printing.paperSize] ?? PAPER_DIMENSIONS.A4;
  const letterhead =
    LETTERHEAD_STYLES[settings.printing.letterhead] ??
    LETTERHEAD_STYLES['Clinical & calm (default)'];
  const lang = settings.rxLanguage;
  const tr = (en: string) => labelFor(en, lang);

  const pages = paginateMeds(rx.medicines, settings.printing.paperSize);

  return (
    <>
      {/* Page size + zero browser margin so the browser doesn't print
          its own date/URL/page-number headers. Padding inside the sheet
          handles the paper margin instead. */}
      <style>{`@media print { @page { size: ${settings.printing.paperSize} portrait; margin: 0; } }`}</style>

      <div className={cn('flex flex-col gap-6', className)}>
        {pages.map((pg, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === pages.length - 1;
          return (
            <Sheet
              key={idx}
              doctor={doctor}
              patient={patient}
              rx={rx}
              chamber={chamber}
              bp={bp}
              weight={weight}
              meds={pg.meds}
              startIdx={pg.startIdx}
              isFirst={isFirst}
              isLast={isLast}
              paper={paper}
              paperSize={settings.printing.paperSize}
              letterhead={letterhead}
              tr={tr}
            />
          );
        })}
      </div>
    </>
  );
}

/* ── Single sheet (one printed page worth of content) ──────────── */

interface SheetProps {
  doctor: Doctor;
  patient: Patient;
  rx: Prescription;
  chamber: Doctor['chambers'][number];
  bp: string;
  weight: string;
  meds: RxMedicine[];
  startIdx: number;
  isFirst: boolean;
  isLast: boolean;
  paper: (typeof PAPER_DIMENSIONS)['A4'];
  paperSize: 'A4' | 'A5';
  letterhead: (typeof LETTERHEAD_STYLES)[string];
  tr: (en: string) => string;
}

function Sheet({
  doctor,
  patient,
  rx,
  chamber,
  bp,
  weight,
  meds,
  startIdx,
  isFirst,
  isLast,
  paper,
  paperSize,
  letterhead,
  tr,
}: SheetProps) {
  return (
    <div
      className={cn(
        'rx-print-root',
        'bg-white rounded-lg shadow-md border border-line overflow-hidden',
        paper.padding,
        'font-sans text-ink flex flex-col',
      )}
      style={{ minHeight: paper.minHeight }}
      data-paper-size={paperSize}
    >
      {isFirst ? (
        <>
          {/* ─── Full doctor header on the first sheet ───────── */}
          <header
            className="grid grid-cols-2 gap-4 items-start pb-[18px] mb-[18px]"
            style={{ borderBottom: `2px solid ${letterhead.borderColor}` }}
          >
            <div className="text-[12px] text-ink-2 leading-[1.5]">
              <div
                className="font-serif font-semibold text-[20px] leading-tight tracking-tight mb-0.5"
                style={{ color: letterhead.titleColor }}
              >
                {doctor.name}
              </div>
              <div>{doctor.degrees.join(', ')}</div>
              <div>{doctor.specialty}</div>
              <div className="text-accent-ink font-semibold mt-1 text-[11px]">
                BMDC Reg. No. {doctor.bmdcNo}
              </div>
            </div>
            <div className="text-right text-[12px] text-ink-2 leading-[1.5]">
              <div className="font-semibold text-ink text-[13px]">{tr('Chamber')}</div>
              <div>{chamber.name}</div>
              <div>
                {chamber.days.join(', ')} · {chamber.time}
              </div>
              {chamber.phone && (
                <div className="text-accent-ink font-mono text-[11.5px]">{chamber.phone}</div>
              )}
            </div>
          </header>

          {/* ─── Patient strip ───────────────────────────────── */}
          <div
            className="grid gap-2.5 px-3.5 py-2.5 rounded-md border border-line mb-[18px]"
            style={{
              background: '#F7FAF9',
              gridTemplateColumns: 'repeat(4, 1fr) auto',
            }}
          >
            <PatField label={tr('Patient')} value={patient.name} />
            <PatField
              label="Age / Sex"
              value={`${patient.age} / ${patient.sex === 'female' ? 'F' : patient.sex === 'male' ? 'M' : '—'}`}
            />
            <PatField label="BP · Wt" value={`${bp} · ${weight}`} />
            <PatField label="Date" value={fmtDate(rx.date, 'd MMM yyyy')} />
            <PatField label="Rx No." value={shortRxId(rx.id)} mono align="right" />
          </div>
        </>
      ) : (
        /* Slim continuation header on page 2+. Mirrors RxLivePaper's
            ContHeader: compact doctor line on the left, patient +
            Rx id + date on the right. No chamber block. */
        <div
          className="grid gap-4 items-start pb-3 mb-4"
          style={{
            borderBottom: `2px solid ${letterhead.borderColor}`,
            gridTemplateColumns: '1fr 1fr',
          }}
        >
          <div>
            <div
              className="font-serif font-semibold text-[16px] leading-tight"
              style={{ color: letterhead.titleColor }}
            >
              {doctor.name}
            </div>
            <div className="text-[10.5px] text-ink-3 mt-0.5">
              {doctor.degrees.join(', ')} · BMDC {doctor.bmdcNo}
            </div>
          </div>
          <div className="text-right">
            <div className="font-serif text-[13px] font-semibold text-ink">
              {patient.name} ·{' '}
              {`${patient.age}/${patient.sex === 'female' ? 'F' : patient.sex === 'male' ? 'M' : '—'}`}
            </div>
            <div className="text-[10.5px] text-ink-3 mt-0.5 font-mono">
              Rx {shortRxId(rx.id)} · {fmtDate(rx.date, 'd MMM yyyy')}
            </div>
          </div>
        </div>
      )}

      {/* ─── Two-column body ──────────────────────────────────── */}
      <div
        className="grid gap-[22px]"
        style={{ gridTemplateColumns: '1fr 1px 1.25fr', minHeight: 420 }}
      >
        {/* LEFT — clinical notes. Only on the first sheet; continuation
            sheets leave the column empty so the divider stays centered. */}
        <div>
          {isFirst && rx.chiefComplaint && (
            <ClinicalSection
              label={tr('Chief complaint')}
              icon={<NotepadText className="h-3 w-3" />}
            >
              <ClinicalItem>{rx.chiefComplaint}</ClinicalItem>
            </ClinicalSection>
          )}
          {isFirst && rx.diagnoses.length > 0 && (
            <ClinicalSection
              label={tr('Diagnoses')}
              icon={<Sparkles className="h-3 w-3" />}
            >
              {rx.diagnoses.map((d, i) => (
                <ClinicalItem key={i} tone="dx">
                  {d}
                </ClinicalItem>
              ))}
            </ClinicalSection>
          )}
          {isFirst && rx.tests.length > 0 && (
            <ClinicalSection
              label={tr('Tests')}
              icon={<FlaskConical className="h-3 w-3" />}
            >
              {rx.tests.map((t, i) => (
                <ClinicalItem key={i} checkbox>
                  {t}
                </ClinicalItem>
              ))}
            </ClinicalSection>
          )}
          {isFirst && rx.advice.length > 0 && (
            <ClinicalSection
              label={tr('Advice')}
              icon={<Lightbulb className="h-3 w-3" />}
            >
              {rx.advice.map((a, i) => (
                <ClinicalItem key={i}>{a}</ClinicalItem>
              ))}
            </ClinicalSection>
          )}
          {isFirst && rx.operation && rx.operation.trim() && (
            <ClinicalSection
              label={tr('Operation plan')}
              icon={<Scissors className="h-3 w-3" />}
            >
              {rx.operation.split('\n').map((line, i) =>
                line.trim() ? <ClinicalItem key={i}>{line}</ClinicalItem> : null,
              )}
            </ClinicalSection>
          )}
        </div>

        {/* Vertical divider */}
        <div className="bg-line" />

        {/* RIGHT — Treatment / meds (this sheet's slice) */}
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[1.4px] text-accent-ink mb-2">
            <Stethoscope className="h-3 w-3" />
            {tr('Treatment')}
          </div>
          <div
            className="font-serif italic font-semibold leading-none text-accent"
            style={{ fontSize: 28, marginTop: -6, marginBottom: 6 }}
          >
            ℞
          </div>

          {meds.length === 0 ? (
            <div className="italic text-[11.5px] text-ink-3 py-2">
              Medicines will appear here.
            </div>
          ) : (
            <ol className="flex flex-col list-none pl-0 m-0">
              {meds.map((m, i) => (
                <li
                  key={m.id ?? `${startIdx + i}`}
                  className="rx-keep-together grid gap-2.5 py-1.5 items-baseline border-b border-dotted border-line last:border-b-0"
                  style={{ gridTemplateColumns: '24px 1fr' }}
                >
                  <span className="font-serif font-semibold text-[16px] text-accent leading-none">
                    {startIdx + i + 1}.
                  </span>
                  <div className="min-w-0">
                    <div className="font-serif font-semibold text-[14.5px] text-ink leading-tight">
                      {m.brand}
                      {m.strength && (
                        <span className="font-mono font-medium text-[12.5px] text-ink-2 ml-1.5">
                          {m.strength}
                        </span>
                      )}
                    </div>
                    {m.generic && (
                      <div className="text-[11px] text-ink-3 mt-0.5">{m.generic}</div>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[12px] text-ink-2 font-mono flex-wrap">
                      <span
                        className="font-serif font-semibold px-[7px] py-[1px] rounded-xs text-accent-ink text-[13px]"
                        style={{
                          background: '#F0F7F5',
                          border: '1px solid #D5E6E1',
                        }}
                      >
                        {m.dose}
                      </span>
                      {m.duration && (
                        <span>
                          × <span>{m.duration}</span>
                        </span>
                      )}
                    </div>
                    {m.instruction && (
                      <div className="text-[11px] text-ink-3 italic mt-1">
                        — {m.instruction}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Spacer keeps the footer pinned to the bottom of the sheet
          when the content is short. */}
      <div className="flex-1" />

      {/* Follow-up pill — only on the last sheet and only if the
          doctor actually set one. Nothing appears otherwise. */}
      {isLast && rx.followUp && (
        <div className="rx-keep-together mt-5 flex items-center gap-2 px-2.5 py-2 rounded-md text-[12px] bg-accent-softer/60 text-accent-ink">
          <Calendar className="h-3 w-3" />
          <span>
            <b className="font-semibold not-italic">{tr('Follow-up')}:</b>{' '}
            <span className="font-serif">{rx.followUp}</span>
          </span>
        </div>
      )}

      {/* Footer: pharmacist note on the left, signature on the right.
          Rendered on every sheet so each printed page is self-
          contained — no page that's missing a signature. */}
      {(
        <div className="rx-keep-together mt-3 flex items-end justify-between gap-6">
          <div className="text-[11px] text-ink-3 leading-snug">
            Pharmacist: please dispense as written · Keep this prescription safe
          </div>
          <div className="shrink-0 inline-block">
            <div
              className="flex items-end justify-center"
              style={{
                borderBottom: '1px solid #0B1F1C',
                minHeight: 44,
                padding: '2px 0',
              }}
            >
              {doctor.signatureUrl ? (
                <img
                  src={resolveAsset(doctor.signatureUrl)}
                  alt={`${doctor.name} signature`}
                  className="max-h-[42px] max-w-[180px] object-contain mix-blend-multiply"
                />
              ) : (
                <div className="font-serif italic text-[15px] text-ink-2 pb-0.5 min-w-[160px]">
                  {doctor.name}
                </div>
              )}
            </div>
            <div className="text-[9.5px] text-ink-3 mt-0.5 tracking-[1px] uppercase text-center">
              Signature
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── sub-components ────────────────────────────────────────── */

function PatField({
  label,
  value,
  mono,
  align,
}: {
  label: string;
  value: string;
  mono?: boolean;
  align?: 'left' | 'right';
}) {
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <div className="text-[9px] font-bold uppercase tracking-[1px] text-ink-3">{label}</div>
      <div
        className={cn(
          'text-[13px] text-ink mt-[2px] font-medium',
          mono && 'font-mono',
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ClinicalSection({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mb-3.5 last:mb-0">
      <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[1.4px] text-accent-ink mb-1.5">
        {icon}
        {label}
      </div>
      <div className="pl-[6px] border-l-2 border-accent-soft">{children}</div>
    </div>
  );
}

function ClinicalItem({
  children,
  tone,
  checkbox,
}: {
  children: ReactNode;
  tone?: 'dx';
  checkbox?: boolean;
}) {
  return (
    <div
      className={cn(
        'pl-2.5 py-0.5 text-[12.5px] leading-relaxed flex items-start gap-2',
        tone === 'dx' ? 'text-ink font-semibold' : 'text-ink-2',
      )}
    >
      {checkbox && <CheckSquare className="h-3 w-3 mt-1 shrink-0 text-ink-3" />}
      <span className="min-w-0">{children}</span>
    </div>
  );
}
