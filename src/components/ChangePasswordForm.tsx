"use client";

import { useState } from "react";
import { PasswordInput } from "@/components/PasswordInput";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/profile/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error?.formErrors?.[0] ?? body?.error ?? "Could not change password");
      return;
    }

    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  const labelClass = "text-label-caps font-label-caps text-on-surface-variant block mb-1";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
      <div>
        <label className={labelClass} htmlFor="currentPassword">Current password</label>
        <PasswordInput
          id="currentPassword"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={setCurrentPassword}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="newPassword">New password</label>
        <PasswordInput
          id="newPassword"
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={setNewPassword}
        />
        <p className="text-xs text-on-surface-variant mt-1">At least 8 characters.</p>
      </div>
      <div>
        <label className={labelClass} htmlFor="confirmPassword">Confirm new password</label>
        <PasswordInput
          id="confirmPassword"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
      </div>

      {error && (
        <p className="text-sm text-error bg-error-container px-3 py-2 rounded-lg" role="alert">{error}</p>
      )}
      {success && (
        <p className="text-sm text-success bg-success/10 px-3 py-2 rounded-lg">Password changed successfully.</p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="py-3 bg-primary text-on-primary rounded-lg font-label-caps text-label-caps font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60"
      >
        {saving ? "Saving..." : "Change Password"}
      </button>
    </form>
  );
}
