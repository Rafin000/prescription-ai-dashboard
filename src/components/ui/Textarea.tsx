import { forwardRef, useId, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, wrapperClassName, className, id, ...rest },
  ref
) {
  const autoId = useId();
  const taId = id ?? autoId;
  return (
    <div className={cn('flex flex-col gap-1.5 min-w-0', wrapperClassName)}>
      {label && (
        <label htmlFor={taId} className="text-[12px] font-semibold text-ink-2">
          {label}
        </label>
      )}
      <textarea
        id={taId}
        ref={ref}
        className={cn(
          'w-full bg-surface border rounded-md shadow-xs text-ink px-3 py-2.5 text-[13.5px] placeholder:text-ink-3 resize-y min-h-[90px] transition-[border-color,box-shadow] duration-150',
          'focus:outline-none focus:shadow-ring focus:border-accent focus:ring-0',
          error ? 'border-danger' : 'border-line',
          className
        )}
        {...rest}
      />
      {(error || hint) && (
        <span className={cn('text-[11.5px]', error ? 'text-danger' : 'text-ink-3')}>
          {error || hint}
        </span>
      )}
    </div>
  );
});
