import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white border border-accent shadow-accent hover:bg-accent-hover hover:border-accent-hover',
  secondary:
    'bg-surface text-ink-2 border border-line shadow-xs hover:bg-bg-muted hover:border-line-strong hover:text-ink',
  outline:
    'bg-transparent text-accent border border-accent hover:bg-accent-softer',
  ghost:
    'bg-transparent text-ink-2 border border-transparent hover:bg-bg-muted hover:text-ink',
  danger:
    'bg-danger text-white border border-danger hover:brightness-95',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-[12.5px] rounded-sm gap-1.5',
  md: 'h-9 px-3.5 text-[13.5px] rounded-md gap-2',
  lg: 'h-11 px-4 text-[14.5px] rounded-md gap-2',
  icon: 'h-9 w-9 rounded-md',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    leftIcon,
    rightIcon,
    loading = false,
    fullWidth = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold leading-none whitespace-nowrap transition-colors duration-150 active:translate-y-px select-none',
        'disabled:opacity-55 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden
          className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-r-transparent animate-spin"
        />
      ) : (
        leftIcon && <span className="inline-flex items-center [&>svg]:w-4 [&>svg]:h-4">{leftIcon}</span>
      )}
      {size !== 'icon' && children}
      {size === 'icon' && !leftIcon && children}
      {!loading && rightIcon && (
        <span className="inline-flex items-center [&>svg]:w-4 [&>svg]:h-4">{rightIcon}</span>
      )}
    </button>
  );
});
