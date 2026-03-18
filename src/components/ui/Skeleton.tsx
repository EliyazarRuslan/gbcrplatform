export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
      <div className="skeleton h-4 w-24"></div>
      <div className="skeleton h-8 w-16"></div>
      <div className="skeleton h-3 w-32"></div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="p-4 border-b border-neutral-200">
        <div className="skeleton h-5 w-48"></div>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-200">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3"><div className="skeleton h-4 w-20"></div></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-neutral-100">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-4 py-3"><div className="skeleton h-4 w-24"></div></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5">
      <div className="skeleton h-5 w-32 mb-4"></div>
      <div className="skeleton h-64 w-full"></div>
    </div>
  );
}
