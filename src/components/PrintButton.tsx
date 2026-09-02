"use client";

export function PrintButton({ label = "Print Receipt" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="no-print px-4 py-2 bg-primary text-on-primary rounded-lg text-label-caps font-label-caps font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
    >
      <span className="material-symbols-outlined text-[18px]">print</span>
      {label}
    </button>
  );
}
