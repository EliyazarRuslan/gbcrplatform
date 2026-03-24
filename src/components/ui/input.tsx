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
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-neutral-500 uppercase tracking-wider"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <input
        id={inputId}
        required={required}
        className={cn(
          'w-full rounded-xl border px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 transition-all duration-200 bg-neutral-50/50',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-white',
          error
            ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
            : 'border-neutral-200/80',
        )}
        {...rest}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}
