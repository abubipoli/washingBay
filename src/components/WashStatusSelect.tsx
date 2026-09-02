"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WashStatus } from "@prisma/client";

const OPTIONS: { value: WashStatus; label: string }[] = [
  { value: "QUEUED", label: "Queueing" },
  { value: "WASHING", label: "Washing" },
  { value: "DETAILING", label: "Detailing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function WashStatusSelect({
  washId,
  status,
  locked,
}: {
  washId: string;
  status: WashStatus;
  locked: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [saving, setSaving] = useState(false);

  async function handleChange(next: WashStatus) {
    setSaving(true);
    setCurrent(next);
    const res = await fetch(`/api/washes/${washId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSaving(false);
    if (res.ok) {
      router.refresh();
    } else {
      setCurrent(status);
    }
  }

  if (locked) {
    return (
      <span className="text-xs text-on-surface-variant italic" title="Paid out — status locked">
        {OPTIONS.find((o) => o.value === current)?.label} (paid)
      </span>
    );
  }

  return (
    <select
      value={current}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value as WashStatus)}
      className="text-xs border border-outline-variant rounded-md px-2 py-1 bg-surface-container-lowest disabled:opacity-60"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
