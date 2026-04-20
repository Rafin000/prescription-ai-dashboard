import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  selectSize?: 'sm' | 'md' | 'lg';
  wrapperClassName?: string;
}

const sizeHeights = {
  sm: 'h-8 text-[12.5px] pl-2.5 pr-8',
  md: 'h-9 text-[13.5px] pl-3 pr-9',
  lg: 'h-11 text-[14.5px] pl-3.5 pr-10',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    hint,
    error,
    options,
    placeholder,
    selectSize = 'md',
    wrapperClassName,
    className,
    id,
    ...rest
  },
  ref
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={cn('flex flex-col gap-1.5 min-w-0', wrapperClassName)}>
      {label && (
        <label htmlFor={selectId} className="text-[12px] font-semibold text-ink-2">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'w-full bg-surface border rounded-md shadow-xs text-ink appearance-none transition-[border-color,box-shadow] duration-150',
            'focus:outline-none focus:shadow-ring focus:border-accent focus:ring-0',
            error ? 'border-danger' : 'border-line',
            sizeHeights[selectSize],
            className
          )}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" />
      </div>
      {(error || hint) && (
        <span className={cn('text-[11.5px]', error ? 'text-danger' : 'text-ink-3')}>
          {error || hint}
        </span>
      )}
    </div>
  );
});
