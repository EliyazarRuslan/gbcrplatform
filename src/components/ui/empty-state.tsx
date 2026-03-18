import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
      {icon && (
        <div className="text-neutral-300 text-5xl">{icon}</div>
      )}
      <p className="font-medium text-neutral-900">{title}</p>
      {description && (
        <p className="text-sm text-neutral-500 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
