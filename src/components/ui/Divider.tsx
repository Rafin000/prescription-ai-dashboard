import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  label?: ReactNode;
}

export function Divider({ orientation = 'horizontal', label, className, ...rest }: DividerProps) {
  if (orientation === 'vertical') {
    return <div className={cn('w-px self-stretch bg-line', className)} {...rest} />;
  }
  if (label) {
    return (
      <div className={cn('flex items-center gap-3 text-[11px] text-ink-3 uppercase tracking-[1.2px]', className)} {...rest}>
        <span className="flex-1 h-px bg-line" />
        <span>{label}</span>
        <span className="flex-1 h-px bg-line" />
      </div>
    );
  }
  return <div className={cn('h-px w-full bg-line', className)} {...rest} />;
}
