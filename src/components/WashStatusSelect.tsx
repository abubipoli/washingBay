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
  /** True once paid out — status can never change after that. */
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

  // A completed wash is final — it feeds straight into the boy's commission
  // total, so it can't be flipped to Cancelled (or anything else) afterward
  // by mistake. Paying it out locks it a second, permanent way (payoutId).
  const completedLocked = current === "COMPLETED";

  if (locked || completedLocked) {
    return (
      <span
        className="text-xs text-on-surface-variant italic"
        title={locked ? "Paid out — status locked" : "Completed — locked from further status changes"}
      >
        {OPTIONS.find((o) => o.value === current)?.label}
        {locked ? " (paid)" : ""}
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
