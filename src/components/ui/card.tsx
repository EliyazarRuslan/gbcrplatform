import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

const paddingClasses: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export default function Card({
  title,
  description,
  actions,
  padding = 'md',
  children,
  className,
}: CardProps) {
  const hasHeader = title || description || actions;

  return (
    <div className={cn('card-industrial', className)}>
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-neutral-100">
          <div className="min-w-0">
            {title && (
              <h3 className="font-bold text-neutral-900 text-[15px]">{title}</h3>
            )}
            {description && (
              <p className="text-xs text-neutral-400 mt-0.5">{description}</p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      <div className={paddingClasses[padding]}>{children}</div>
    </div>
  );
}
