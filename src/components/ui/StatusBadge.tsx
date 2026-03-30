const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  'HIRED OUT': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'NOT READY': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  'IDLE': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'BOOKED': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'IN SERVICE': { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  'DECOMMISSIONED': { bg: 'bg-neutral-100', text: 'text-neutral-500', dot: 'bg-neutral-400' },
  'ACTIVE': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'PENDING': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'CONFIRMED': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'COMPLETED': { bg: 'bg-neutral-100', text: 'text-neutral-500', dot: 'bg-neutral-400' },
  'CANCELLED': { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
};

const defaultConfig = { bg: 'bg-neutral-100', text: 'text-neutral-500', dot: 'bg-neutral-400' };

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || defaultConfig;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === 'ACTIVE' || status === 'HIRED OUT' ? 'pulse-dot' : ''}`} />
      {status}
    </span>
  );
}
