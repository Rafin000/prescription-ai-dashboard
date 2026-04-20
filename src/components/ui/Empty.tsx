import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface EmptyProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  dashed?: boolean;
}

export function Empty({ icon, title, description, action, className, dashed = true }: EmptyProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-6 py-10 gap-3 rounded-xl',
        dashed ? 'border border-dashed border-line bg-surface-muted' : 'bg-surface',
        className
      )}
    >
      {icon && (
        <div className="h-11 w-11 rounded-full bg-accent-softer text-accent-ink inline-flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5">
          {icon}
        </div>
      )}
      <div className="font-serif text-[15px] font-semibold text-ink">{title}</div>
      {description && (
        <div className="text-[12.5px] text-ink-3 max-w-[360px] leading-relaxed">{description}</div>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
