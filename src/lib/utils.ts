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
    'HIRED OUT': 'bg-green-100 text-green-800',
    'NOT READY': 'bg-red-100 text-red-800',
    'IDLE': 'bg-yellow-100 text-yellow-800',
    'BOOKED': 'bg-blue-100 text-blue-800',
    'IN SERVICE': 'bg-purple-100 text-purple-800',
    'DECOMMISSIONED': 'bg-gray-100 text-gray-800',
    'ACTIVE': 'bg-green-100 text-green-800',
    'PENDING': 'bg-yellow-100 text-yellow-800',
    'CONFIRMED': 'bg-blue-100 text-blue-800',
    'COMPLETED': 'bg-gray-100 text-gray-800',
    'CANCELLED': 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
