import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'soft' | 'solid';
  size?: 'sm' | 'md' | 'lg';
  tone?: 'neutral' | 'accent' | 'danger';
  children: ReactNode;
}

const sizeMap = {
  sm: 'h-7 w-7 [&>svg]:w-3.5 [&>svg]:h-3.5',
  md: 'h-9 w-9 [&>svg]:w-4 [&>svg]:h-4',
  lg: 'h-11 w-11 [&>svg]:w-5 [&>svg]:h-5',
};

const toneGhost = {
  neutral: 'text-ink-3 hover:text-ink hover:bg-bg-muted',
  accent: 'text-accent hover:bg-accent-softer',
  danger: 'text-danger hover:bg-danger-soft',
};

const toneSoft = {
  neutral: 'bg-bg-muted text-ink-2 hover:bg-line',
  accent: 'bg-accent-softer text-accent-ink hover:bg-accent-soft',
  danger: 'bg-danger-soft text-danger hover:brightness-95',
};

const toneSolid = {
  neutral: 'bg-ink text-white hover:bg-ink-2',
  accent: 'bg-accent text-white hover:bg-accent-hover',
  danger: 'bg-danger text-white hover:brightness-95',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'ghost', size = 'md', tone = 'neutral', className, children, type = 'button', ...rest },
  ref
) {
  const variantClasses =
    variant === 'ghost' ? toneGhost[tone] : variant === 'soft' ? toneSoft[tone] : toneSolid[tone];
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-md transition-colors',
        sizeMap[size],
        variantClasses,
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
