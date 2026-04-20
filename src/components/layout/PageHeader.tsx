import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

interface Crumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  crumbs?: Crumb[];
  actions?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  crumbs,
  actions,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-6 flex-wrap', className)}>
      <div className="min-w-0">
        {crumbs && crumbs.length > 0 && (
          <div className="flex items-center gap-1.5 text-[12px] text-ink-3 mb-2">
            {crumbs.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                {c.to ? (
                  <Link to={c.to} className="hover:text-accent-ink transition-colors">
                    {c.label}
                  </Link>
                ) : (
                  <span className={cn(i === crumbs.length - 1 && 'text-ink-2 font-medium')}>
                    {c.label}
                  </span>
                )}
                {i < crumbs.length - 1 && <ChevronRight className="h-3 w-3 text-ink-4" />}
              </span>
            ))}
          </div>
        )}
        {eyebrow && (
          <div className="text-[11px] font-bold uppercase tracking-[1.4px] text-accent-ink mb-1.5">
            {eyebrow}
          </div>
        )}
        <h1 className="font-serif text-[26px] sm:text-[30px] font-semibold text-ink tracking-tight leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-[13.5px] text-ink-2 mt-2 max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
