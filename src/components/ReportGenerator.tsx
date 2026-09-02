"use client";

import { useState } from "react";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function today() {
  return new Date();
}
function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - diff);
  return x;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const PRESETS = [
  { label: "Today", from: () => today(), to: () => today() },
  { label: "This Week", from: () => startOfWeek(today()), to: () => today() },
  { label: "This Month", from: () => startOfMonth(today()), to: () => today() },
];

const REPORT_TYPES = [
  { type: "summary", label: "Summary Report", description: "Revenue, splits, expenses, and net profit at a glance." },
  {
    type: "commissions",
    label: "Commissions & Staff Performance",
    description: "Per-boy washes, gross revenue, and commission payouts.",
  },
  { type: "expenses", label: "Expenses Report", description: "Every operating expense recorded in the period." },
  { type: "washes", label: "Wash Report", description: "The full list of wash records in the period." },
] as const;

export function ReportGenerator() {
  const [from, setFrom] = useState(isoDate(startOfMonth(today())));
  const [to, setTo] = useState(isoDate(today()));

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-level-1 p-card-padding flex flex-col gap-4">
      <div>
        <h3 className="text-headline-md font-headline-md">Generate a Report</h3>
        <p className="text-sm text-on-surface-variant mt-1">
          Pick a date range, then open a report — it opens in a new tab styled for printing, so you can use your
          browser's Print dialog to save it as a PDF or send it straight to a printer.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => {
              setFrom(isoDate(p.from()));
              setTo(isoDate(p.to()));
            }}
            className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm hover:bg-surface-container-high transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
        <div>
          <label className="text-xs text-on-surface-variant block mb-1">From</label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg font-data-tabular"
          />
        </div>
        <div>
          <label className="text-xs text-on-surface-variant block mb-1">To</label>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg font-data-tabular"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {REPORT_TYPES.map((r) => (
          <a
            key={r.type}
            href={`/reports/print?from=${from}&to=${to}&type=${r.type}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col gap-1 p-4 border border-outline-variant rounded-lg hover:bg-surface-container-high hover:border-primary transition-colors"
          >
            <span className="flex items-center gap-2 text-on-surface font-medium">
              <span className="material-symbols-outlined text-[18px] text-primary">description</span>
              {r.label}
            </span>
            <span className="text-xs text-on-surface-variant">{r.description}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
