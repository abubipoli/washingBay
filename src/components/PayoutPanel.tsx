"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatMoney } from "@/lib/money";

export function PayoutPanel({
  staffId,
  pendingPayout,
  currency,
  periodStart,
  periodEnd,
}: {
  staffId: string;
  pendingPayout: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState<{ amount: number; payoutId: string } | null>(null);

  async function pay(notify: "SMS" | "RECEIPT_PRINT" | "NONE") {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, periodStart, periodEnd, notify }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error ?? "Could not process this payout");
      }
      if (notify === "RECEIPT_PRINT") {
        window.open(`/receipt/payout/${body.id}`, "_blank");
      }
      setOpen(false);
      setPaid({ amount: Number(body.totalAmount), payoutId: body.id });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  // Shown regardless of pendingPayout so this confirmation survives the
  // parent re-fetching pendingPayout down to 0 after a successful pay.
  if (paid) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-success font-medium">Paid {formatMoney(paid.amount, currency)}</span>
        <Link href={`/receipt/payout/${paid.payoutId}`} target="_blank" className="text-primary underline">
          Receipt
        </Link>
        <button onClick={() => setPaid(null)} className="text-on-surface-variant underline">
          Dismiss
        </button>
      </div>
    );
  }

  if (pendingPayout <= 0) {
    return <span className="text-xs text-on-surface-variant italic">Nothing owed</span>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-primary text-on-primary rounded-md text-xs font-label-caps font-medium hover:bg-primary/90 transition-colors"
      >
        Pay {formatMoney(pendingPayout, currency)}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1 items-start">
      <p className="text-xs text-on-surface-variant">Notify how?</p>
      <div className="flex gap-1 flex-wrap">
        <button
          disabled={submitting}
          onClick={() => pay("SMS")}
          className="px-2 py-1 bg-primary text-on-primary rounded text-xs disabled:opacity-60"
        >
          SMS
        </button>
        <button
          disabled={submitting}
          onClick={() => pay("RECEIPT_PRINT")}
          className="px-2 py-1 bg-secondary-container text-on-secondary-container rounded text-xs disabled:opacity-60"
        >
          Print receipt
        </button>
        <button
          disabled={submitting}
          onClick={() => pay("NONE")}
          className="px-2 py-1 bg-surface-container-high text-on-surface rounded text-xs disabled:opacity-60"
        >
          No notice
        </button>
        <button onClick={() => setOpen(false)} className="px-2 py-1 text-on-surface-variant text-xs">
          Cancel
        </button>
      </div>
      {error && <p className="text-error text-xs">{error}</p>}
    </div>
  );
}
