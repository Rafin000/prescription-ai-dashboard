import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import { initials } from '../../lib/format';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  src?: string;
  size?: AvatarSize;
  tone?: 'accent' | 'neutral';
  ring?: boolean;
}

const sizeMap: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-[13px]',
  lg: 'h-12 w-12 text-[16px]',
  xl: 'h-[52px] w-[52px] text-[22px]',
};

export function Avatar({
  name,
  src,
  size = 'md',
  tone = 'accent',
  ring = false,
  className,
  ...rest
}: AvatarProps) {
  const initial = initials(name);
  const toneClasses =
    tone === 'accent' ? 'bg-accent-soft text-accent-ink' : 'bg-bg-muted text-ink-2';
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-serif font-semibold select-none overflow-hidden shrink-0',
        toneClasses,
        sizeMap[size],
        ring && 'ring-2 ring-white shadow-sm',
        className
      )}
      aria-label={name}
      {...rest}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}
