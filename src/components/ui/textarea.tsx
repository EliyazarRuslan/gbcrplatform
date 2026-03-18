import React from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  rows?: number;
  required?: boolean;
  className?: string;
}

export default function Textarea({
  label,
  error,
  rows = 3,
  required,
  className,
  id,
  ...rest
}: TextareaProps) {
  const textareaId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label
          htmlFor={textareaId}
          className="text-sm font-medium text-neutral-700"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        required={required}
        className={cn(
          'w-full rounded-lg border px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors resize-y',
          'focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary',
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
            : 'border-neutral-300',
        )}
        {...rest}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
