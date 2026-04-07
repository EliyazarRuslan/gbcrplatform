const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  'HIRED OUT': { bg: 'bg-emerald-50', text: 'text-emerald-800', dot: 'bg-emerald-600' },
  'NOT READY': { bg: 'bg-red-50', text: 'text-red-800', dot: 'bg-red-600' },
  'IDLE': { bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-600' },
  'BOOKED': { bg: 'bg-blue-50', text: 'text-blue-800', dot: 'bg-blue-600' },
  'IN SERVICE': { bg: 'bg-violet-50', text: 'text-violet-800', dot: 'bg-violet-600' },
  'DECOMMISSIONED': { bg: 'bg-neutral-100', text: 'text-neutral-600', dot: 'bg-neutral-500' },
  'ACTIVE': { bg: 'bg-emerald-50', text: 'text-emerald-800', dot: 'bg-emerald-600' },
  'PENDING': { bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-600' },
  'CONFIRMED': { bg: 'bg-blue-50', text: 'text-blue-800', dot: 'bg-blue-600' },
  'COMPLETED': { bg: 'bg-neutral-100', text: 'text-neutral-600', dot: 'bg-neutral-500' },
  'CANCELLED': { bg: 'bg-red-50', text: 'text-red-800', dot: 'bg-red-600' },
};

const defaultConfig = { bg: 'bg-neutral-100', text: 'text-neutral-600', dot: 'bg-neutral-500' };

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || defaultConfig;
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider ${config.bg} ${config.text}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot} ${status === 'ACTIVE' || status === 'HIRED OUT' ? 'pulse-dot' : ''}`} />
      {status}
    </span>
  );
}
