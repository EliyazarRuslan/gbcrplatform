import React from 'react';
import { cn } from '@/lib/utils';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function Select({
  label,
  options,
  error,
  placeholder,
  required,
  className,
  id,
  ...rest
}: SelectProps) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-neutral-700"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <select
        id={selectId}
        required={required}
        className={cn(
          'w-full rounded-lg border px-4 py-2.5 text-sm text-neutral-900 transition-colors appearance-none bg-white',
          'focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary',
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
            : 'border-neutral-300',
        )}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
