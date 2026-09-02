"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatMoney } from "@/lib/money";

type CommissionItem = { washId: string; vehiclePlate: string; serviceLabel: string; time: string; amount: number };
type StaffGroup = { staffId: string; name: string; phone: string; items: CommissionItem[]; subtotal: number };
type NotifyChoice = "SMS" | "RECEIPT_PRINT" | "NONE";
type PaidState = { amount: number; payoutId: string };

/**
 * Owns its own copy of the day's groups from the moment it mounts, rather
 * than re-deriving from server props on every refresh. Once a boy is paid,
 * their itemized list + a "Paid" stamp stay on screen for the rest of this
 * session regardless of what a background router.refresh() does — this is
 * a checklist the manager and boy go through together, so the confirmation
 * has to stick around, not vanish the instant the balance hits zero.
 */
export function DailyCommissionBoard({
  initialGroups,
  currency,
  periodStart,
  periodEnd,
}: {
  initialGroups: StaffGroup[];
  currency: string;
  periodStart: string;
  periodEnd: string;
}) {
  const router = useRouter();
  const [groups] = useState(initialGroups);
  const [paid, setPaid] = useState<Record<string, PaidState>>({});
  const [openStaffId, setOpenStaffId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(staffId: string, notify: NotifyChoice) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, periodStart, periodEnd, notify }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not process this payout");
      if (notify === "RECEIPT_PRINT") {
        window.open(`/receipt/payout/${body.id}`, "_blank");
      }
      setPaid((prev) => ({ ...prev, [staffId]: { amount: Number(body.totalAmount), payoutId: body.id } }));
      setOpenStaffId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (groups.length === 0) {
    return (
      <div className="bg-surface-container-lowest rounded-xl shadow-level-1 p-card-padding text-center text-on-surface-variant">
        No completed, unpaid washes for this day yet.
      </div>
    );
  }

  const grandTotal = groups.reduce((sum, g) => sum + g.subtotal, 0);
  const totalRemaining = groups.reduce((sum, g) => sum + (paid[g.staffId] ? 0 : g.subtotal), 0);

  return (
    <div className="flex flex-col gap-gutter">
      <div className="flex justify-end text-sm text-on-surface-variant">
        {totalRemaining > 0 ? (
          <span>
            {formatMoney(totalRemaining, currency)} still to pay out of {formatMoney(grandTotal, currency)}
          </span>
        ) : (
          <span className="text-success font-medium">All boys paid for this day — {formatMoney(grandTotal, currency)}</span>
        )}
      </div>

      {groups.map((g) => {
        const donePaid = paid[g.staffId];
        return (
          <div key={g.staffId} className="bg-surface-container-lowest rounded-xl shadow-level-1 overflow-hidden">
            <div className="p-card-padding border-b border-outline-variant/30 flex items-center justify-between gap-3 bg-surface-bright/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-sm">
                  {g.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-on-surface">{g.name}</p>
                  <p className="text-xs text-on-surface-variant">{g.phone}</p>
                </div>
              </div>

              {donePaid ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-success font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Paid {formatMoney(donePaid.amount, currency)}
                  </span>
                  <Link href={`/receipt/payout/${donePaid.payoutId}`} target="_blank" className="text-primary text-xs underline">
                    Receipt
                  </Link>
                </div>
              ) : openStaffId === g.staffId ? (
                <div className="flex flex-col items-end gap-1">
                  <p className="text-xs text-on-surface-variant">Notify how?</p>
                  <div className="flex gap-1">
                    <button disabled={submitting} onClick={() => pay(g.staffId, "SMS")} className="px-2 py-1 bg-primary text-on-primary rounded text-xs disabled:opacity-60">SMS</button>
                    <button disabled={submitting} onClick={() => pay(g.staffId, "RECEIPT_PRINT")} className="px-2 py-1 bg-secondary-container text-on-secondary-container rounded text-xs disabled:opacity-60">Print receipt</button>
                    <button disabled={submitting} onClick={() => pay(g.staffId, "NONE")} className="px-2 py-1 bg-surface-container-high text-on-surface rounded text-xs disabled:opacity-60">No notice</button>
                    <button onClick={() => setOpenStaffId(null)} className="px-2 py-1 text-on-surface-variant text-xs">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setOpenStaffId(g.staffId)}
                  className="px-4 py-2 bg-primary text-on-primary rounded-lg text-label-caps font-label-caps font-medium hover:bg-primary/90 transition-colors"
                >
                  Pay {formatMoney(g.subtotal, currency)}
                </button>
              )}
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-caps text-label-caps">
                  <th className="py-2 px-4 font-medium">Time</th>
                  <th className="py-2 px-4 font-medium">Vehicle</th>
                  <th className="py-2 px-4 font-medium">Service</th>
                  <th className="py-2 px-4 font-medium text-right">Commission</th>
                </tr>
              </thead>
              <tbody className="text-data-tabular font-data-tabular">
                {g.items.map((item) => (
                  <tr key={item.washId} className="border-b border-outline-variant/20">
                    <td className="py-2 px-4 text-xs text-on-surface-variant">
                      {new Date(item.time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-2 px-4 font-medium text-on-surface">{item.vehiclePlate}</td>
                    <td className="py-2 px-4">{item.serviceLabel}</td>
                    <td className="py-2 px-4 text-right">{formatMoney(item.amount, currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-container-low font-medium">
                  <td className="py-2 px-4" colSpan={3}>Subtotal ({g.items.length} job{g.items.length === 1 ? "" : "s"})</td>
                  <td className="py-2 px-4 text-right">{formatMoney(g.subtotal, currency)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })}

      {error && <p className="text-sm text-error bg-error-container px-3 py-2 rounded-lg">{error}</p>}
    </div>
  );
}
