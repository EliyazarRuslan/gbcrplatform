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
    <div className="card-industrial p-5 group relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
      <div className="flex items-start justify-between mb-3">
        <p className="text-[12px] font-bold text-neutral-400 uppercase tracking-[0.12em] leading-tight">{title}</p>
        <div className={`w-9 h-9 ${colorMap[color]} rounded-lg flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity`}>
          <svg className="w-[18px] h-[18px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
          </svg>
        </div>
      </div>
      <p className="text-[36px] font-bold text-neutral-900 tracking-tight leading-none">{value}</p>
      {subtitle && <p className="text-[13px] font-medium text-neutral-400 mt-2">{subtitle}</p>}
      {trend && (
        <p className={`text-[13px] font-bold mt-2 ${trend.value >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
          {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
        </p>
      )}
    </div>
  );
}
