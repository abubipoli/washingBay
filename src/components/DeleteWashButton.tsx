"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteWashButton({
  washId,
  vehiclePlate,
  locked,
  isOwner,
}: {
  washId: string;
  vehiclePlate: string;
  locked: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (locked) {
    return (
      <span className="text-on-surface-variant" title="Paid out — locked from deleting">
        —
      </span>
    );
  }
  if (!isOwner) {
    return (
      <span className="text-on-surface-variant" title="Only the owner account can delete wash records">
        —
      </span>
    );
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/washes/${washId}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? "Could not delete this wash");
      return;
    }
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-start gap-1">
        <div className="flex items-center gap-1">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-2 py-1 bg-error text-on-error rounded text-xs font-medium disabled:opacity-60"
          >
            {deleting ? "Deleting..." : `Delete ${vehiclePlate}?`}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className="px-2 py-1 text-on-surface-variant text-xs"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-error text-xs">{error}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-error text-xs font-medium hover:underline flex items-center gap-1"
    >
      <span className="material-symbols-outlined text-[16px]">delete</span>
      Delete
    </button>
  );
}
