import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warn'
  | 'danger'
  | 'info'
  | 'live';

export type BadgeVariant = 'soft' | 'solid' | 'outline';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  icon?: ReactNode;
  dot?: boolean;
  uppercase?: boolean;
  children: ReactNode;
}

const softTone: Record<BadgeTone, string> = {
  neutral: 'bg-bg-muted text-ink-2 border-line',
  accent: 'bg-accent-soft text-accent-ink border-accent-soft',
  success: 'bg-success-soft text-success border-success-soft',
  warn: 'bg-warn-soft text-warn border-warn-soft',
  danger: 'bg-danger-soft text-danger border-danger-soft',
  info: 'bg-info-soft text-info border-info-soft',
  live: 'bg-live-soft text-live border-live-soft',
};

const solidTone: Record<BadgeTone, string> = {
  neutral: 'bg-ink-2 text-white border-ink-2',
  accent: 'bg-accent text-white border-accent',
  success: 'bg-success text-white border-success',
  warn: 'bg-warn text-white border-warn',
  danger: 'bg-danger text-white border-danger',
  info: 'bg-info text-white border-info',
  live: 'bg-live text-white border-live',
};

const outlineTone: Record<BadgeTone, string> = {
  neutral: 'bg-transparent text-ink-2 border-line-strong',
  accent: 'bg-transparent text-accent border-accent',
  success: 'bg-transparent text-success border-success',
  warn: 'bg-transparent text-warn border-warn',
  danger: 'bg-transparent text-danger border-danger',
  info: 'bg-transparent text-info border-info',
  live: 'bg-transparent text-live border-live',
};

const dotTone: Record<BadgeTone, string> = {
  neutral: 'bg-ink-3',
  accent: 'bg-accent',
  success: 'bg-success',
  warn: 'bg-warn',
  danger: 'bg-danger',
  info: 'bg-info',
  live: 'bg-live',
};

export function Badge({
  tone = 'neutral',
  variant = 'soft',
  icon,
  dot,
  uppercase,
  className,
  children,
  ...rest
}: BadgeProps) {
  const toneClasses =
    variant === 'solid' ? solidTone[tone] : variant === 'outline' ? outlineTone[tone] : softTone[tone];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-[3px] rounded-sm border text-[11px] font-semibold leading-none',
        uppercase && 'uppercase tracking-[1px] text-[10px] font-bold',
        toneClasses,
        className
      )}
      {...rest}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotTone[tone])} />}
      {icon && <span className="inline-flex items-center [&>svg]:w-3 [&>svg]:h-3">{icon}</span>}
      {children}
    </span>
  );
}
