import type { ReactNode } from "react";

export function KpiCard({
  icon,
  iconColorClass = "text-primary",
  label,
  value,
  sublabel,
  trend,
  className = "",
}: {
  icon: string;
  iconColorClass?: string;
  label: string;
  value: string;
  sublabel?: string;
  trend?: { direction: "up" | "down"; label: string };
  className?: string;
}) {
  return (
    <div
      className={`bg-surface-container-lowest rounded-xl shadow-level-1 p-card-padding flex flex-col justify-between min-h-[160px] ${className}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className={`material-symbols-outlined ${iconColorClass}`}>{icon}</span>
          <span className="text-label-caps font-label-caps">{label}</span>
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-label-caps font-label-caps ${
              trend.direction === "up" ? "text-success bg-success/10" : "text-error bg-error-container"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {trend.direction === "up" ? "arrow_upward" : "arrow_downward"}
            </span>
            {trend.label}
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="text-headline-md font-headline-md font-bold text-on-surface mb-1">{value}</div>
        {sublabel && <p className="text-data-tabular font-data-tabular text-on-surface-variant">{sublabel}</p>}
      </div>
    </div>
  );
}
