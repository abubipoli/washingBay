"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { enqueueWrite, isNetworkFailure } from "@/lib/offline/queue";

type Expense = {
  id: string;
  category: string;
  amount: string;
  description: string | null;
  date: string;
  recordedBy: { name: string };
};

const CATEGORIES = [
  { value: "ELECTRICITY", label: "Electricity" },
  { value: "WATER", label: "Water Bill" },
  { value: "SOAP_CHEMICALS", label: "Soap & Chemicals" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "SALARY", label: "Manager Salary" },
  { value: "RENT", label: "Rent" },
  { value: "OTHER", label: "Other" },
];

export function ExpenseForm({ expenses, currency }: { expenses: Expense[]; currency: string }) {
  const router = useRouter();
  const [category, setCategory] = useState("ELECTRICITY");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [queuedOffline, setQueuedOffline] = useState(false);

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setQueuedOffline(false);
    setSubmitting(true);
    const payload = { category, amount, description: description || undefined };
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSubmitting(false);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error?.formErrors?.[0] ?? body?.error ?? "Could not record expense");
        return;
      }
      setAmount("");
      setDescription("");
      router.refresh();
    } catch (err) {
      setSubmitting(false);
      if (isNetworkFailure(err)) {
        await enqueueWrite("expense", `${CATEGORIES.find((c) => c.value === category)?.label} — ${currency} ${amount}`, "/api/expenses", payload);
        setAmount("");
        setDescription("");
        setQueuedOffline(true);
        setTimeout(() => setQueuedOffline(false), 4000);
      } else {
        setError("Something went wrong");
      }
    }
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-level-1 p-card-padding flex flex-col gap-4">
      <h3 className="text-headline-md font-headline-md">Expenses</h3>

      <form onSubmit={addExpense} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
        <div>
          <label className="text-xs text-on-surface-variant block mb-1">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg">
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-on-surface-variant block mb-1">Amount ({currency})</label>
          <input required type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg font-data-tabular" />
        </div>
        <div className="sm:col-span-1">
          <label className="text-xs text-on-surface-variant block mb-1">Note (optional)</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg" />
        </div>
        <button
          disabled={submitting}
          className="px-4 py-2 bg-primary text-on-primary rounded-lg text-label-caps font-label-caps font-medium disabled:opacity-60"
        >
          Record Expense
        </button>
      </form>
      {error && <p className="text-error text-sm">{error}</p>}
      {queuedOffline && (
        <p className="text-primary text-sm">Saved offline — it'll sync automatically once you're back online.</p>
      )}

      <ul className="divide-y divide-outline-variant max-h-72 overflow-y-auto">
        {expenses.map((e) => (
          <li key={e.id} className="flex items-center justify-between py-2 text-sm">
            <div>
              <p className="font-medium text-on-surface">{CATEGORIES.find((c) => c.value === e.category)?.label ?? e.category}</p>
              <p className="text-xs text-on-surface-variant">
                {new Date(e.date).toLocaleDateString("en-GB")} · {e.recordedBy.name}
                {e.description ? ` · ${e.description}` : ""}
              </p>
            </div>
            <span className="font-data-tabular font-medium text-error">{formatMoney(e.amount, currency)}</span>
          </li>
        ))}
        {expenses.length === 0 && <p className="text-on-surface-variant text-sm py-2">No expenses recorded yet.</p>}
      </ul>
    </div>
  );
}
