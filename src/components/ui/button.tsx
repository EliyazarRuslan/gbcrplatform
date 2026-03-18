'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import Spinner from './spinner';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit';
  onClick?: () => void;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark',
  secondary: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100',
  outline: 'border border-neutral-300 bg-transparent text-neutral-700 hover:bg-neutral-50',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  children,
  className,
  type = 'button',
  onClick,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-light',
        variantClasses[variant],
        sizeClasses[size],
        isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className,
      )}
    >
      {loading ? (
        <Spinner size="sm" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
