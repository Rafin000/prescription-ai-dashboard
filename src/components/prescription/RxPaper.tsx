import type { ReactNode } from 'react';
import {
  Calendar,
  CheckSquare,
  FlaskConical,
  Lightbulb,
  NotepadText,
  Scissors,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import type { Doctor, Patient, Prescription } from '../../types';
import { cn } from '../../lib/cn';
import { fmtDate } from '../../lib/format';
import { useResolvedSettings } from '../../stores/settingsStore';

// Real paper sizes at ~96dpi screen rendering for preview. Print CSS in
// global.css then forces the correct physical size.
const PAPER_DIMENSIONS: Record<'A5' | 'A4', { minHeight: number; padding: string }> = {
  A5: { minHeight: 700, padding: 'px-9 pt-8 pb-7' },
  A4: { minHeight: 1050, padding: 'px-12 pt-10 pb-9' },
};

const LETTERHEAD_STYLES: Record<string, { borderColor: string; titleColor: string }> = {
  'Clinical & calm (default)': { borderColor: '#0F766E', titleColor: '#0B1F1C' },
  'Minimal monochrome': { borderColor: '#0B1F1C', titleColor: '#0B1F1C' },
  'Modern colour band': { borderColor: '#1D4ED8', titleColor: '#1D4ED8' },
};

/** Bangla equivalents for the labels visible on the printed Rx. */
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
  'Tear-off · for pharmacy': 'ফার্মেসির জন্য',
  Patient: 'রোগী',
};

function labelFor(en: string, mode: 'en' | 'bn' | 'bilingual'): string {
  const bn = RX_LABELS_BN[en];
  if (mode === 'bn' && bn) return bn;
  if (mode === 'bilingual' && bn) return `${en} · ${bn}`;
  return en;
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
  const paper = PAPER_DIMENSIONS[settings.printing.paperSize] ?? PAPER_DIMENSIONS.A5;
  const letterhead =
    LETTERHEAD_STYLES[settings.printing.letterhead] ?? LETTERHEAD_STYLES['Clinical & calm (default)'];
  const lang = settings.rxLanguage;
  const tr = (en: string) => labelFor(en, lang);

  return (
    <>
    {/* Declare the print page size so the browser produces a true A4/A5
        sheet that matches the Rx paper layout the doctor configured. */}
    <style>{`@media print { @page { size: ${settings.printing.paperSize} portrait; margin: 10mm; } }`}</style>
    <div
      className={cn(
        'rx-print-root',
        'bg-white rounded-lg shadow-md border border-line overflow-hidden',
        paper.padding,
        'font-sans text-ink',
        className
      )}
      style={{ minHeight: paper.minHeight }}
      data-paper-size={settings.printing.paperSize}
    >
      {/* ─── Doctor header ───────────────────────────────────────── */}
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

      {/* ─── Patient strip ───────────────────────────────────────── */}
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
        <PatField label="Rx No." value={rx.id.toUpperCase()} mono align="right" />
      </div>

      {/* ─── Two-column body ──────────────────────────────────────── */}
      <div
        className="grid gap-[22px]"
        style={{ gridTemplateColumns: '1fr 1px 1.25fr', minHeight: 420 }}
      >
        {/* LEFT — clinical notes */}
        <div>
          {rx.chiefComplaint && (
            <ClinicalSection
              label={tr('Chief complaint')}
              icon={<NotepadText className="h-3 w-3" />}
            >
              <ClinicalItem>{rx.chiefComplaint}</ClinicalItem>
            </ClinicalSection>
          )}
          {rx.diagnoses.length > 0 && (
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
          {rx.tests.length > 0 && (
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
          {rx.advice.length > 0 && (
            <ClinicalSection label={tr('Advice')} icon={<Lightbulb className="h-3 w-3" />}>
              {rx.advice.map((a, i) => (
                <ClinicalItem key={i}>{a}</ClinicalItem>
              ))}
            </ClinicalSection>
          )}
          {rx.operation && rx.operation.trim() && (
            <ClinicalSection
              label={tr('Operation plan')}
              icon={<Scissors className="h-3 w-3" />}
            >
              {rx.operation.split('\n').map((line, i) =>
                line.trim() ? <ClinicalItem key={i}>{line}</ClinicalItem> : null
              )}
            </ClinicalSection>
          )}
          {rx.chiefComplaint === undefined &&
            rx.diagnoses.length === 0 &&
            rx.tests.length === 0 &&
            rx.advice.length === 0 && (
              <div className="italic text-[11.5px] text-ink-3 pl-3.5 py-2">
                Clinical notes will appear here as you examine the patient.
              </div>
            )}
        </div>

        {/* Vertical divider */}
        <div className="bg-line" />

        {/* RIGHT — Rx / meds */}
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

          {rx.medicines.length === 0 ? (
            <div className="italic text-[11.5px] text-ink-3 py-2">
              Medicines will appear here.
            </div>
          ) : (
            <ol className="flex flex-col list-none pl-0 m-0">
              {rx.medicines.map((m, i) => (
                <li
                  key={m.id}
                  className="grid gap-2.5 py-2.5 items-baseline border-b border-dotted border-line last:border-b-0"
                  style={{ gridTemplateColumns: '24px 1fr' }}
                >
                  <span className="font-serif font-semibold text-[16px] text-accent leading-none">
                    {i + 1}.
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

          {/* Follow-up pill */}
          <div
            className={cn(
              'mt-3.5 flex items-center gap-2 px-2.5 py-2 rounded-md text-[12px]',
              rx.followUp
                ? 'bg-accent-softer/60 text-accent-ink'
                : 'border border-dashed border-line text-ink-3 italic'
            )}
          >
            <Calendar className="h-3 w-3" />
            <span>
              <b className="font-semibold not-italic">{tr('Follow-up')}:</b>{' '}
              <span className="font-serif">
                {rx.followUp || 'Not set'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ─── Signature block ───────────────────────────────────── */}
      <div
        className="rx-keep-together mt-6 pt-4 border-t border-line flex items-end justify-between gap-6"
      >
        <div className="text-[11.5px] text-ink-3 leading-relaxed">
          {rx.notes && (
            <div className="italic font-serif text-ink-2 mb-1.5">{rx.notes}</div>
          )}
          <div>
            Pharmacist: please dispense as written · Keep this prescription safe
          </div>
        </div>
        <div className="text-right shrink-0">
          {doctor.signatureUrl ? (
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
              className="font-serif italic text-[18px] text-ink-2 pb-1"
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

    </div>
    </>
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
          mono && 'font-mono'
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
    <section className="mb-4">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[1.4px] text-accent-ink mb-2">
        {icon}
        {label}
      </div>
      <div>{children}</div>
    </section>
  );
}

function ClinicalItem({
  children,
  tone,
  checkbox,
}: {
  children: ReactNode;
  tone?: 'dx' | 'warn';
  checkbox?: boolean;
}) {
  const dotColor =
    tone === 'dx' ? 'bg-accent' : tone === 'warn' ? 'bg-warn' : 'bg-ink-3';
  return (
    <div
      className="relative pl-3.5 text-[13.5px] text-ink font-serif"
      style={{ lineHeight: 1.85 }}
    >
      <span
        className={cn('absolute left-[2px] w-[5px] h-[5px] rounded-full', dotColor)}
        style={{ top: 10 }}
      />
      {checkbox && (
        <span className="text-accent-ink mr-1.5 font-mono inline-block">□</span>
      )}
      {children}
    </div>
  );
}

/* Export alias used by CheckSquare etc. if needed */
export { CheckSquare };
