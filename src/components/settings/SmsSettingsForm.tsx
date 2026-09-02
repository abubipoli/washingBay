"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/PasswordInput";
import { buildPayoutSmsMessage, DEFAULT_PAYOUT_SMS_TEMPLATE, PAYOUT_SMS_PLACEHOLDERS } from "@/lib/sms";

export function SmsSettingsForm({
  initial,
  isOwner,
}: {
  initial: {
    smsProvider: string;
    kairosAccessKey: string | null;
    kairosAccessSecret: string | null;
    kairosSenderId: string | null;
    payoutSmsTemplate: string | null;
  };
  isOwner: boolean;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState(initial.smsProvider);
  const [accessKey, setAccessKey] = useState(initial.kairosAccessKey ?? "");
  const [accessSecret, setAccessSecret] = useState(initial.kairosAccessSecret ?? "");
  const [senderId, setSenderId] = useState(initial.kairosSenderId ?? "");
  const [template, setTemplate] = useState(initial.payoutSmsTemplate ?? DEFAULT_PAYOUT_SMS_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [checkingBalance, setCheckingBalance] = useState(false);
  const [balanceResult, setBalanceResult] = useState<{ ok: boolean; message: string } | null>(null);

  function currentProviderFields() {
    return {
      smsProvider: provider,
      kairosAccessKey: accessKey,
      kairosAccessSecret: accessSecret,
      kairosSenderId: senderId,
    };
  }

  async function sendTestSms() {
    if (!testPhone.trim()) {
      setTestResult({ ok: false, message: "Enter a phone number to test with" });
      return;
    }
    setTesting(true);
    setTestResult(null);
    const res = await fetch("/api/settings/sms-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: testPhone, ...currentProviderFields() }),
    });
    const body = await res.json().catch(() => ({}));
    setTesting(false);
    setTestResult(
      res.ok
        ? { ok: true, message: "Test SMS sent — check the phone (or the server log in Console mode)." }
        : { ok: false, message: body?.error ?? "Test SMS failed" }
    );
  }

  async function checkBalance() {
    setCheckingBalance(true);
    setBalanceResult(null);
    const res = await fetch("/api/settings/sms-balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentProviderFields()),
    });
    const body = await res.json().catch(() => ({}));
    setCheckingBalance(false);
    setBalanceResult(
      res.ok ? { ok: true, message: `Balance: ${body.balance}` } : { ok: false, message: body?.error ?? "Could not check balance" }
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        smsProvider: provider,
        kairosAccessKey: accessKey,
        kairosAccessSecret: accessSecret,
        kairosSenderId: senderId,
        payoutSmsTemplate: template,
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

  const preview = buildPayoutSmsMessage({
    staffName: "Daniel T.",
    amount: "GHS 35.00",
    washCount: 3,
    periodLabel: new Date().toLocaleDateString("en-GB"),
    businessName: "First Class Washing Bay",
    template,
  });

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
              <label className="text-xs text-on-surface-variant block mb-1">Sender ID</label>
              <input
                disabled={!isOwner}
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                placeholder="FirstClass"
                className={`w-full px-3 py-2 border border-[#D0D5DD] rounded-lg ${disabledInput}`}
              />
              <p className="text-xs text-on-surface-variant mt-1">
                Must already be an approved sender ID on your Kairos Africa account.
              </p>
            </div>
            <div>
              <label className="text-xs text-on-surface-variant block mb-1">API Access Key</label>
              <PasswordInput
                id="kairosAccessKey"
                disabled={!isOwner}
                value={accessKey}
                onChange={setAccessKey}
                placeholder="From Kairos Africa's API Access Credential panel"
                className={disabledInput}
              />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant block mb-1">API Access Secret</label>
              <PasswordInput
                id="kairosAccessSecret"
                disabled={!isOwner}
                value={accessSecret}
                onChange={setAccessSecret}
                placeholder="Also from that same panel"
                className={disabledInput}
              />
            </div>
          </>
        )}

        {isOwner && (
          <div className="sm:col-span-2 border-t border-outline-variant pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-on-surface-variant block mb-1">Send a test SMS</label>
              <div className="flex gap-2">
                <input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+233201234567"
                  className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg font-data-tabular"
                />
                <button
                  type="button"
                  disabled={testing}
                  onClick={sendTestSms}
                  className="shrink-0 px-3 py-2 bg-secondary-container text-on-secondary-container rounded-lg text-label-caps font-label-caps font-medium disabled:opacity-60"
                >
                  {testing ? "Sending..." : "Send Test"}
                </button>
              </div>
              {testResult && (
                <p className={`text-xs mt-1 ${testResult.ok ? "text-success" : "text-error"}`}>{testResult.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-on-surface-variant block mb-1">Account balance</label>
              <button
                type="button"
                disabled={checkingBalance}
                onClick={checkBalance}
                className="px-3 py-2 bg-secondary-container text-on-secondary-container rounded-lg text-label-caps font-label-caps font-medium disabled:opacity-60"
              >
                {checkingBalance ? "Checking..." : "Check Balance"}
              </button>
              {balanceResult && (
                <p className={`text-xs mt-1 ${balanceResult.ok ? "text-success" : "text-error"}`}>{balanceResult.message}</p>
              )}
            </div>
          </div>
        )}

        <div className="sm:col-span-2 border-t border-outline-variant pt-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-on-surface-variant" htmlFor="payoutSmsTemplate">
              Payout SMS Message
            </label>
            {isOwner && template !== DEFAULT_PAYOUT_SMS_TEMPLATE && (
              <button
                type="button"
                onClick={() => setTemplate(DEFAULT_PAYOUT_SMS_TEMPLATE)}
                className="text-primary text-xs underline"
              >
                Reset to default
              </button>
            )}
          </div>
          <textarea
            id="payoutSmsTemplate"
            disabled={!isOwner}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border border-[#D0D5DD] rounded-lg font-data-tabular text-sm ${disabledInput}`}
          />
          <p className="text-xs text-on-surface-variant mt-1">
            Placeholders you can use: {PAYOUT_SMS_PLACEHOLDERS.join(", ")}
          </p>
          <div className="mt-2 bg-surface-container-low rounded-lg px-3 py-2">
            <p className="text-xs text-on-surface-variant mb-1">Preview (sample data):</p>
            <p className="text-sm text-on-surface">{preview}</p>
          </div>
        </div>

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
