"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Staff = { id: string; name: string; phone: string; active: boolean };

export function StaffManager({ staff }: { staff: Staff[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error?.formErrors?.[0] ?? body?.error ?? "Could not add staff member");
      return;
    }
    setName("");
    setPhone("");
    router.refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    router.refresh();
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-level-1 p-card-padding flex flex-col gap-4">
      <h3 className="text-headline-md font-headline-md">Washing Boys</h3>

      <form onSubmit={addStaff} className="flex flex-col sm:flex-row gap-2">
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
        <button
          disabled={submitting}
          className="px-4 py-2 bg-primary text-on-primary rounded-lg text-label-caps font-label-caps font-medium disabled:opacity-60"
        >
          Add
        </button>
      </form>
      {error && <p className="text-error text-sm">{error}</p>}

      <ul className="divide-y divide-outline-variant">
        {staff.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-on-surface">{s.name}</p>
              <p className="text-xs text-on-surface-variant font-data-tabular">{s.phone}</p>
            </div>
            <button
              onClick={() => toggleActive(s.id, s.active)}
              className={`px-3 py-1 rounded-full text-xs font-label-caps font-label-caps ${
                s.active ? "bg-success/10 text-success" : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              {s.active ? "Active" : "Inactive"}
            </button>
          </li>
        ))}
        {staff.length === 0 && <p className="text-on-surface-variant text-sm py-2">No washing boys added yet.</p>}
      </ul>
    </div>
  );
}
