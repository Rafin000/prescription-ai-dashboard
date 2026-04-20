import { type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface TabItem<T extends string = string> {
  id: T;
  label: ReactNode;
  count?: number;
  icon?: ReactNode;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  variant?: 'underline' | 'pill';
  className?: string;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  variant = 'underline',
  className,
}: TabsProps<T>) {
  if (variant === 'pill') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1 p-1 bg-bg-muted rounded-md border border-line',
          className
        )}
      >
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 h-7 rounded-sm text-[12.5px] font-semibold transition-colors',
              value === it.id
                ? 'bg-surface text-ink shadow-xs'
                : 'text-ink-3 hover:text-ink-2'
            )}
          >
            {it.icon}
            {it.label}
            {it.count !== undefined && (
              <span
                className={cn(
                  'text-[10px] font-mono px-1.5 rounded-xs',
                  value === it.id ? 'bg-accent-softer text-accent-ink' : 'bg-bg text-ink-3'
                )}
              >
                {it.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-6 border-b border-line', className)}>
      {items.map((it) => {
        const active = value === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={cn(
              'relative inline-flex items-center gap-2 py-3 text-[13px] font-semibold transition-colors',
              active ? 'text-accent-ink' : 'text-ink-3 hover:text-ink-2'
            )}
          >
            {it.icon}
            {it.label}
            {it.count !== undefined && (
              <span
                className={cn(
                  'text-[10px] font-mono px-1.5 py-0.5 rounded-xs',
                  active ? 'bg-accent-soft text-accent-ink' : 'bg-bg-muted text-ink-3'
                )}
              >
                {it.count}
              </span>
            )}
            {active && (
              <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-accent rounded-t" />
            )}
          </button>
        );
      })}
    </div>
  );
}
