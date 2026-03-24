import { format, parseISO, differenceInDays } from 'date-fns';

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '-';
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(amount);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '-';
  try {
    return format(parseISO(date), 'dd MMM yyyy');
  } catch {
    return date;
  }
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '-';
  try {
    return format(parseISO(date), 'dd MMM yyyy HH:mm');
  } catch {
    return date;
  }
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return '-';
  return `${value.toFixed(1)}%`;
}

export function daysBetween(start: string, end: string): number {
  return differenceInDays(parseISO(end), parseISO(start));
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    'HIRED OUT': 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    'NOT READY': 'bg-red-50 text-red-700 border border-red-100',
    'IDLE': 'bg-amber-50 text-amber-700 border border-amber-100',
    'BOOKED': 'bg-blue-50 text-blue-700 border border-blue-100',
    'IN SERVICE': 'bg-purple-50 text-purple-700 border border-purple-100',
    'DECOMMISSIONED': 'bg-neutral-100 text-neutral-600 border border-neutral-200',
    'ACTIVE': 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    'PENDING': 'bg-amber-50 text-amber-700 border border-amber-100',
    'CONFIRMED': 'bg-blue-50 text-blue-700 border border-blue-100',
    'COMPLETED': 'bg-neutral-100 text-neutral-600 border border-neutral-200',
    'CANCELLED': 'bg-red-50 text-red-700 border border-red-100',
  };
  return colors[status] || 'bg-neutral-100 text-neutral-600 border border-neutral-200';
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
