import { cn } from '../../lib/cn';

interface BrandMarkProps {
  collapsed?: boolean;
  tone?: 'light' | 'dark';
  className?: string;
}

export function BrandMark({ collapsed, tone = 'light', className }: BrandMarkProps) {
  const isDark = tone === 'dark';
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <PaiGlyph />
      {!collapsed && (
        <div className="leading-tight">
          <div
            className={cn(
              'font-serif text-[16px] font-semibold tracking-tight',
              isDark ? 'text-white' : 'text-ink'
            )}
          >
            Prescription
          </div>
          <div
            className={cn(
              'text-[10px] font-bold tracking-[1.6px] uppercase',
              isDark ? 'text-accent-soft' : 'text-accent'
            )}
          >
            AI for doctors
          </div>
        </div>
      )}
    </div>
  );
}

/** Brand glyph — flat teal badge. Italic serif "P" with a visibly readable
 *  italic "ai" baseline-aligned right beside the leg. */
export function PaiGlyph({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-10 w-10 rounded-lg bg-accent grid place-items-center shrink-0 text-white',
        className
      )}
      aria-label="Prescription AI"
    >
      <span
        className="inline-flex items-baseline leading-none"
        style={{ transform: 'translateY(1px)' }}
      >
        <span
          className="font-serif italic"
          style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.5 }}
        >
          P
        </span>
        <span
          className="font-serif italic"
          style={{
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: 0.1,
            marginLeft: 1,
          }}
        >
          ai
        </span>
      </span>
    </div>
  );
}

export function RxGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M6 4h5.2c2.1 0 3.8 1.5 3.8 3.5S13.3 11 11.2 11H7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M7 4v13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M11.5 11 18 19M14 15l4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
