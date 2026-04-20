import type { ReactNode } from 'react';

interface Props {
  eyebrow?: ReactNode;
  title: string;
  description?: string;
}

export function StepHeader({ eyebrow, title, description }: Props) {
  return (
    <header>
      {eyebrow && (
        <div className="text-[10.5px] font-bold uppercase tracking-[1.4px] text-accent-ink mb-1.5">
          {eyebrow}
        </div>
      )}
      <h1 className="font-serif text-[28px] font-semibold text-ink leading-tight">{title}</h1>
      {description && (
        <p className="text-[13.5px] text-ink-2 mt-2 leading-relaxed max-w-[560px]">
          {description}
        </p>
      )}
    </header>
  );
}
