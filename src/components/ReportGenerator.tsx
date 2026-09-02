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

export function ReportGenerator() {
  const [from, setFrom] = useState(isoDate(startOfMonth(today())));
  const [to, setTo] = useState(isoDate(today()));

  const printUrl = `/reports/print?from=${from}&to=${to}`;

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-level-1 p-card-padding flex flex-col gap-4">
      <div>
        <h3 className="text-headline-md font-headline-md">Generate a Report</h3>
        <p className="text-sm text-on-surface-variant mt-1">
          Pick a date range, then open the report — it opens in a new tab styled for printing, so you can use your
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

      <a
        href={printUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-label-caps font-label-caps font-medium hover:bg-primary/90 transition-colors shadow-sm"
      >
        <span className="material-symbols-outlined text-[18px]">description</span>
        Generate &amp; Print Report
      </a>
    </div>
  );
}
