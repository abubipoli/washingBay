"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SmsSettingsForm({
  initial,
  isOwner,
}: {
  initial: {
    smsProvider: string;
    kairosBaseUrl: string | null;
    kairosApiKey: string | null;
    kairosSenderId: string | null;
  };
  isOwner: boolean;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState(initial.smsProvider);
  const [baseUrl, setBaseUrl] = useState(initial.kairosBaseUrl ?? "");
  const [apiKey, setApiKey] = useState(initial.kairosApiKey ?? "");
  const [senderId, setSenderId] = useState(initial.kairosSenderId ?? "");
  const [showKey, setShowKey] = useState(false);
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
      body: JSON.stringify({
        smsProvider: provider,
        kairosBaseUrl: baseUrl,
        kairosApiKey: apiKey,
        kairosSenderId: senderId,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Could not save SMS settings");
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  const disabledInput = "disabled:bg-surface-container-low disabled:text-on-surface-variant";

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-level-1 p-card-padding flex flex-col gap-4">
      <div>
        <h3 className="text-headline-md font-headline-md">SMS Notifications</h3>
        <p className="text-sm text-on-surface-variant mt-1">
          Controls the messages sent to washing boys when they're paid. Leave on &ldquo;Console (testing)&rdquo; until
          you have real Kairos Africa credentials — it just prints the message to the server log instead of sending
          it, so nothing here can accidentally cost money while you're testing.
        </p>
      </div>
      {!isOwner && (
        <p className="text-sm text-on-surface-variant bg-surface-container-low px-3 py-2 rounded-lg">
          Only the owner account can change these — ask an owner to update them.
        </p>
      )}
      <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs text-on-surface-variant block mb-1">Provider</label>
          <select
            disabled={!isOwner}
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className={`w-full px-3 py-2 border border-[#D0D5DD] rounded-lg ${disabledInput}`}
          >
            <option value="console">Console (testing — no real SMS sent)</option>
            <option value="kairos">Kairos Africa</option>
          </select>
        </div>

        {provider === "kairos" && (
          <>
            <div>
              <label className="text-xs text-on-surface-variant block mb-1">Kairos API Base URL</label>
              <input
                disabled={!isOwner}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.kairosafrica.example/v1"
                className={`w-full px-3 py-2 border border-[#D0D5DD] rounded-lg font-data-tabular ${disabledInput}`}
              />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant block mb-1">Sender ID</label>
              <input
                disabled={!isOwner}
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                placeholder="FirstClass"
                className={`w-full px-3 py-2 border border-[#D0D5DD] rounded-lg ${disabledInput}`}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-on-surface-variant block mb-1">API Key</label>
              <div className="flex gap-2">
                <input
                  disabled={!isOwner}
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste the API key Kairos Africa gave you"
                  className={`flex-1 px-3 py-2 border border-[#D0D5DD] rounded-lg font-data-tabular ${disabledInput}`}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="px-3 py-2 bg-surface-container-high rounded-lg text-sm shrink-0"
                >
                  {showKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </>
        )}

        {isOwner && (
          <button
            disabled={saving}
            className="sm:col-span-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-label-caps font-label-caps font-medium disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save SMS Settings"}
          </button>
        )}
      </form>
      {saved && <p className="text-success text-sm">Saved.</p>}
      {error && <p className="text-error text-sm">{error}</p>}
    </div>
  );
}
