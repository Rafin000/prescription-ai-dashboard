import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  inputSize?: InputSize;
  wrapperClassName?: string;
}

const sizeHeights: Record<InputSize, string> = {
  sm: 'h-8 text-[12.5px] px-2.5',
  md: 'h-9 text-[13.5px] px-3',
  lg: 'h-11 text-[14.5px] px-3.5',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hint,
    error,
    leftIcon,
    rightIcon,
    inputSize = 'md',
    wrapperClassName,
    className,
    id,
    disabled,
    ...rest
  },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn('flex flex-col gap-1.5 min-w-0', wrapperClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-[12px] font-semibold text-ink-2 tracking-[0.2px]"
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex items-center gap-2 bg-surface border rounded-md shadow-xs transition-[border-color,box-shadow] duration-150',
          'focus-within:border-accent focus-within:shadow-ring',
          error ? 'border-danger focus-within:shadow-[0_0_0_3px_#FEE2E2]' : 'border-line',
          disabled && 'bg-bg-muted opacity-70',
          className
        )}
      >
        {leftIcon && (
          <span className="pl-3 inline-flex items-center text-ink-3 [&>svg]:w-4 [&>svg]:h-4">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          ref={ref}
          disabled={disabled}
          className={cn(
            'flex-1 min-w-0 border-0 outline-none bg-transparent text-ink placeholder:text-ink-3 focus:ring-0 focus:outline-none',
            sizeHeights[inputSize],
            leftIcon && 'pl-1',
            rightIcon && 'pr-1'
          )}
          {...rest}
        />
        {rightIcon && (
          <span className="pr-3 inline-flex items-center text-ink-3 [&>svg]:w-4 [&>svg]:h-4">
            {rightIcon}
          </span>
        )}
      </div>
      {(error || hint) && (
        <span className={cn('text-[11.5px]', error ? 'text-danger' : 'text-ink-3')}>
          {error || hint}
        </span>
      )}
    </div>
  );
});
