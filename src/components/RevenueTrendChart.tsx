type Point = { date: string; revenue: number };

/** Lightweight inline-SVG line chart — no charting library needed for a
 * single revenue-over-time series. Renders the same "Business Progress"
 * visual as the approved design mock, driven by real data. */
export function RevenueTrendChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-on-surface-variant text-body-md">
        No wash data yet — record your first wash to see trends here.
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.revenue), 1);
  const stepX = 100 / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = 100 - (d.revenue / max) * 90; // leave 10% headroom at top
    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L 100 100 L 0 100 Z`;

  return (
    <div className="h-64 w-full bg-surface-container-low rounded-lg border border-outline-variant/30 relative overflow-hidden">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
      >
        <path d={areaPath} fill="url(#revenueGradient)" stroke="none" />
        <path d={linePath} className="stroke-primary" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#493ee5" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#493ee5" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute bottom-2 left-3 right-3 flex justify-between text-[10px] font-data-tabular text-on-surface-variant">
        <span>{formatShortDate(data[0]!.date)}</span>
        <span>{formatShortDate(data[data.length - 1]!.date)}</span>
      </div>
    </div>
  );
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
