"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BusinessSettingsForm({
  initial,
  isOwner,
}: {
  initial: { businessName: string; currency: string; address: string | null; phone: string | null };
  isOwner: boolean;
}) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState(initial.businessName);
  const [currency, setCurrency] = useState(initial.currency);
  const [address, setAddress] = useState(initial.address ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName, currency: currency.toUpperCase(), address, phone }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Could not save business settings");
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-level-1 p-card-padding flex flex-col gap-4">
      <h3 className="text-headline-md font-headline-md">Business Settings</h3>
      {!isOwner && (
        <p className="text-sm text-on-surface-variant bg-surface-container-low px-3 py-2 rounded-lg">
          Only the owner account can change these — ask an owner to update them.
        </p>
      )}
      <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-on-surface-variant block mb-1">Business name</label>
          <input
            disabled={!isOwner}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg disabled:bg-surface-container-low disabled:text-on-surface-variant"
          />
        </div>
        <div>
          <label className="text-xs text-on-surface-variant block mb-1">Currency code</label>
          <input
            disabled={!isOwner}
            value={currency}
            maxLength={3}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg font-data-tabular uppercase disabled:bg-surface-container-low disabled:text-on-surface-variant"
          />
        </div>
        <div>
          <label className="text-xs text-on-surface-variant block mb-1">Phone</label>
          <input
            disabled={!isOwner}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg disabled:bg-surface-container-low disabled:text-on-surface-variant"
          />
        </div>
        <div>
          <label className="text-xs text-on-surface-variant block mb-1">Address</label>
          <input
            disabled={!isOwner}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg disabled:bg-surface-container-low disabled:text-on-surface-variant"
          />
        </div>
        {isOwner && (
          <button
            disabled={saving}
            className="sm:col-span-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-label-caps font-label-caps font-medium disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        )}
      </form>
      {saved && <p className="text-success text-sm">Saved.</p>}
      {error && <p className="text-error text-sm">{error}</p>}
    </div>
  );
}
