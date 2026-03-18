import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

export default function Input({
  label,
  error,
  hint,
  required,
  className,
  id,
  ...rest
}: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-neutral-700"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <input
        id={inputId}
        required={required}
        className={cn(
          'w-full rounded-lg border px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary',
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
            : 'border-neutral-300',
        )}
        {...rest}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}
