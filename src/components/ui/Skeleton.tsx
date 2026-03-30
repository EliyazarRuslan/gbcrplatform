export function SkeletonCard() {
  return (
    <div className="card-industrial p-5 space-y-3">
      <div className="skeleton h-2.5 w-20 rounded-md"></div>
      <div className="skeleton h-7 w-14 rounded-md"></div>
      <div className="skeleton h-2.5 w-28 rounded-md"></div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="card-industrial overflow-hidden">
      <div className="p-5 border-b border-neutral-100">
        <div className="skeleton h-4 w-40 rounded-md"></div>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-100">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-5 py-3"><div className="skeleton h-2.5 w-16 rounded-md"></div></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-neutral-50">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-5 py-3"><div className="skeleton h-3 w-20 rounded-md"></div></td>
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
    <div className="card-industrial p-5">
      <div className="skeleton h-3.5 w-36 mb-5 rounded-md"></div>
      <div className="skeleton h-60 w-full rounded-xl"></div>
    </div>
  );
}
