"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatMoney } from "@/lib/money";

type PayAllResult = {
  paidCount: number;
  totalPaid: number;
  results: { staffId: string; name: string; amount: number; ok: boolean; payoutId?: string }[];
};

export function PayAllButton({
  totalOwed,
  currency,
  periodStart,
  periodEnd,
  rangeLabel,
}: {
  totalOwed: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  rangeLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PayAllResult | null>(null);

  async function payAll(notify: "SMS" | "RECEIPT_PRINT" | "NONE") {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/payouts/pay-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodStart, periodEnd, notify }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not process payouts");
      setResult(body);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="flex flex-col items-end gap-1 text-sm bg-success/10 rounded-lg px-3 py-2">
        <span className="text-success font-medium">
          Paid {result.paidCount} boy{result.paidCount === 1 ? "" : "s"} — {formatMoney(result.totalPaid, currency)}
        </span>
        <div className="flex flex-wrap gap-2 justify-end">
          {result.results
            .filter((r) => r.ok && r.payoutId)
            .map((r) => (
              <Link
                key={r.staffId}
                href={`/receipt/payout/${r.payoutId}`}
                target="_blank"
                className="text-primary text-xs underline"
              >
                {r.name} receipt
              </Link>
            ))}
        </div>
        <button
          onClick={() => {
            setResult(null);
            setOpen(false);
          }}
          className="text-on-surface-variant text-xs underline"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (totalOwed <= 0) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-label-caps font-label-caps font-medium hover:bg-primary/90 transition-colors shadow-sm"
      >
        <span className="material-symbols-outlined text-[18px]">payments</span>
        Pay All ({rangeLabel}) — {formatMoney(totalOwed, currency)}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <p className="text-xs text-on-surface-variant">Notify everyone how?</p>
      <div className="flex gap-1 flex-wrap justify-end">
        <button
          disabled={submitting}
          onClick={() => payAll("SMS")}
          className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs disabled:opacity-60"
        >
          SMS
        </button>
        <button
          disabled={submitting}
          onClick={() => payAll("RECEIPT_PRINT")}
          className="px-3 py-1.5 bg-secondary-container text-on-secondary-container rounded-lg text-xs disabled:opacity-60"
        >
          Print receipts
        </button>
        <button
          disabled={submitting}
          onClick={() => payAll("NONE")}
          className="px-3 py-1.5 bg-surface-container-high text-on-surface rounded-lg text-xs disabled:opacity-60"
        >
          No notice
        </button>
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-on-surface-variant text-xs">
          Cancel
        </button>
      </div>
      {error && <p className="text-error text-xs">{error}</p>}
    </div>
  );
}
