"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Customer = { id: string; name: string; phone: string; notes: string | null; active: boolean };

export function CustomerManager({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function addCustomer(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, notes: notes || undefined }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error?.formErrors?.[0] ?? body?.error ?? "Could not add customer");
      return;
    }
    setName("");
    setPhone("");
    setNotes("");
    router.refresh();
  }

  function startEdit(c: Customer) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditPhone(c.phone);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function saveEdit(id: string) {
    setEditError(null);
    setSavingEdit(true);
    const res = await fetch(`/api/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, phone: editPhone }),
    });
    setSavingEdit(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setEditError(body?.error?.formErrors?.[0] ?? body?.error ?? "Could not update customer");
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function deleteCustomer(id: string) {
    if (!confirm("Remove this customer? This can't be undone.")) return;
    await fetch(`/api/customers/${id}`, { method: "DELETE" });
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    router.refresh();
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === customers.length ? new Set() : new Set(customers.map((c) => c.id))));
  }

  async function send(customerIds: string[]) {
    if (!message.trim()) {
      setSendResult({ ok: false, message: "Write a message first" });
      return;
    }
    if (customerIds.length === 0) {
      setSendResult({ ok: false, message: "Select at least one customer" });
      return;
    }
    setSending(true);
    setSendResult(null);
    const res = await fetch("/api/customers/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerIds, message }),
    });
    const body = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setSendResult({ ok: false, message: body?.error?.formErrors?.[0] ?? body?.error ?? "Could not send SMS" });
      return;
    }
    const failedNote = body.failed?.length ? ` (${body.failed.length} failed: ${body.failed.map((f: { name: string }) => f.name).join(", ")})` : "";
    setSendResult({
      ok: body.failed?.length === 0,
      message: `Sent to ${body.sent}/${body.total}.${failedNote}`,
    });
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-level-1 p-card-padding flex flex-col gap-4">
      <div>
        <h3 className="text-headline-md font-headline-md">Customers</h3>
        <p className="text-sm text-on-surface-variant mt-1">
          Keep a contact list for promos or reminders, and send them a direct or bulk SMS below.
        </p>
      </div>

      <form onSubmit={addCustomer} className="flex flex-col sm:flex-row gap-2">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="flex-1 px-3 py-2 border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        <input
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+233201234567"
          className="flex-1 px-3 py-2 border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-data-tabular"
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Note (optional)"
          className="flex-1 px-3 py-2 border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        <button
          disabled={submitting}
          className="px-4 py-2 bg-primary text-on-primary rounded-lg text-label-caps font-label-caps font-medium disabled:opacity-60"
        >
          Add
        </button>
      </form>
      {error && <p className="text-error text-sm">{error}</p>}

      <div className="border-t border-outline-variant pt-4">
        <label className="text-xs text-on-surface-variant block mb-1">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="Type the SMS to send..."
          className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-sm"
        />
        <div className="flex items-center justify-between mt-2">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="text-xs text-primary underline"
            disabled={customers.length === 0}
          >
            {selected.size === customers.length && customers.length > 0 ? "Deselect all" : "Select all"}
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={() => send([...selected])}
            className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-label-caps font-medium disabled:opacity-60"
          >
            {sending ? "Sending..." : `Send Bulk SMS (${selected.size} selected)`}
          </button>
        </div>
        {sendResult && (
          <p className={`text-xs mt-2 ${sendResult.ok ? "text-success" : "text-error"}`}>{sendResult.message}</p>
        )}
      </div>

      <ul className="divide-y divide-outline-variant">
        {customers.map((c) =>
          editingId === c.id ? (
            <li key={c.id} className="py-2 flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-[#D0D5DD] rounded-lg text-sm"
                />
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-[#D0D5DD] rounded-lg text-sm font-data-tabular"
                />
              </div>
              {editError && <p className="text-error text-xs">{editError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => saveEdit(c.id)}
                  disabled={savingEdit}
                  className="px-3 py-1 bg-primary text-on-primary rounded-lg text-xs font-label-caps font-medium disabled:opacity-60"
                >
                  {savingEdit ? "Saving..." : "Save"}
                </button>
                <button onClick={cancelEdit} className="px-3 py-1 border border-outline-variant rounded-lg text-xs font-label-caps">
                  Cancel
                </button>
              </div>
            </li>
          ) : (
            <li key={c.id} className="flex items-center justify-between py-2 gap-3">
              <label className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggleSelected(c.id)}
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-medium text-on-surface truncate">{c.name}</p>
                  <p className="text-xs text-on-surface-variant font-data-tabular">
                    {c.phone}
                    {c.notes ? ` · ${c.notes}` : ""}
                  </p>
                </div>
              </label>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => send([c.id])}
                  className="px-3 py-1 rounded-full text-xs font-label-caps text-primary hover:bg-surface-container-high disabled:opacity-60"
                >
                  Send SMS
                </button>
                <button
                  onClick={() => startEdit(c)}
                  className="px-3 py-1 rounded-full text-xs font-label-caps text-on-surface-variant hover:bg-surface-container-high"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteCustomer(c.id)}
                  className="px-3 py-1 rounded-full text-xs font-label-caps text-error hover:bg-error/10"
                >
                  Remove
                </button>
              </div>
            </li>
          )
        )}
        {customers.length === 0 && <p className="text-on-surface-variant text-sm py-2">No customers added yet.</p>}
      </ul>
    </div>
  );
}
