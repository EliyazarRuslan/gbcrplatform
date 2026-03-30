interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'orange';
  trend?: { value: number; label: string };
}

const colorMap = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
  purple: 'bg-violet-500',
  indigo: 'bg-indigo-500',
  orange: 'bg-primary',
};

export default function StatCard({ title, value, subtitle, icon, color, trend }: StatCardProps) {
  return (
    <div className="card-industrial p-5 group">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-[0.12em] leading-tight">{title}</p>
        <div className={`w-8 h-8 ${colorMap[color]} rounded-lg flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity`}>
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
          </svg>
        </div>
      </div>
      <p className="text-2xl font-bold text-neutral-900 tracking-tight">{value}</p>
      {subtitle && <p className="text-[11px] text-neutral-400 mt-1">{subtitle}</p>}
      {trend && (
        <p className={`text-[11px] font-semibold mt-1 ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
        </p>
      )}
    </div>
  );
}
