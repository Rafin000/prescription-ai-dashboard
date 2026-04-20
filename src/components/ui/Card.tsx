import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  padded?: boolean;
  children: ReactNode;
}

export function Card({ elevated = false, padded = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-line rounded-xl',
        elevated ? 'shadow-md' : 'shadow-sm',
        padded && 'p-6',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
}

export function CardHeader({
  title,
  subtitle,
  actions,
  icon,
  className,
  children,
  ...rest
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-5 py-4 border-b border-line',
        className
      )}
      {...rest}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-accent-softer text-accent-ink [&>svg]:w-4 [&>svg]:h-4">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          {title && <div className="text-[14px] font-semibold text-ink truncate">{title}</div>}
          {subtitle && <div className="text-[12px] text-ink-3 mt-0.5 truncate">{subtitle}</div>}
          {children}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-5 py-3 border-t border-line bg-surface-muted flex items-center gap-2', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardSectionLabel({
  children,
  count,
  className,
}: {
  children: ReactNode;
  count?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between mb-2', className)}>
      <span className="pai-section-label">{children}</span>
      {count !== undefined && (
        <span className="text-[10px] text-ink-3 font-mono">{count}</span>
      )}
    </div>
  );
}
