"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AppUser = { id: string; name: string; email: string; role: "OWNER" | "MANAGER"; active: boolean };

const inputClass = "w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-sm";

export function UserManager({ users, currentUserId }: { users: AppUser[]; currentUserId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"OWNER" | "MANAGER">("MANAGER");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"OWNER" | "MANAGER">("MANAGER");
  const [editPassword, setEditPassword] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error?.formErrors?.[0] ?? body?.error ?? "Could not add user");
      return;
    }
    setName("");
    setEmail("");
    setPassword("");
    setRole("MANAGER");
    router.refresh();
  }

  async function toggleActive(u: AppUser) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body?.error ?? "Could not update user");
      return;
    }
    router.refresh();
  }

  function startEdit(u: AppUser) {
    setEditingId(u.id);
    setEditName(u.name);
    setEditRole(u.role);
    setEditPassword("");
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function saveEdit(u: AppUser) {
    setEditError(null);
    setSavingEdit(true);
    const isSelf = u.id === currentUserId;
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        ...(isSelf ? {} : { role: editRole }),
        ...(editPassword ? { password: editPassword } : {}),
      }),
    });
    setSavingEdit(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setEditError(body?.error?.formErrors?.[0] ?? body?.error ?? "Could not update user");
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-level-1 p-card-padding flex flex-col gap-4">
      <div>
        <h3 className="text-headline-md font-headline-md">Users &amp; Roles</h3>
        <p className="text-sm text-on-surface-variant mt-1">
          Add the people who can sign in, and whether they're an Owner (full access) or a Manager (day-to-day
          operations, no settings or payout SMS credentials).
        </p>
      </div>

      <form onSubmit={addUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={inputClass} />
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@firstclass.com"
          className={`${inputClass} font-data-tabular`}
        />
        <input
          required
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Temporary password (min 8 chars)"
          className={inputClass}
        />
        <select value={role} onChange={(e) => setRole(e.target.value as "OWNER" | "MANAGER")} className={inputClass}>
          <option value="MANAGER">Manager</option>
          <option value="OWNER">Owner</option>
        </select>
        <button
          disabled={submitting}
          className="sm:col-span-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-label-caps font-label-caps font-medium disabled:opacity-60"
        >
          {submitting ? "Adding..." : "Add User"}
        </button>
      </form>
      {error && <p className="text-error text-sm">{error}</p>}

      <ul className="divide-y divide-outline-variant">
        {users.map((u) =>
          editingId === u.id ? (
            <li key={u.id} className="py-3 flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className={`flex-1 ${inputClass}`} />
                {u.id === currentUserId ? (
                  <span className="flex items-center px-3 text-xs text-on-surface-variant">
                    Role can't be changed on your own account
                  </span>
                ) : (
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as "OWNER" | "MANAGER")}
                    className={inputClass}
                  >
                    <option value="MANAGER">Manager</option>
                    <option value="OWNER">Owner</option>
                  </select>
                )}
              </div>
              <input
                type="password"
                minLength={8}
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Reset password (leave blank to keep current)"
                className={inputClass}
              />
              {editError && <p className="text-error text-xs">{editError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => saveEdit(u)}
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
            <li key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2 sm:gap-3">
              <div className="min-w-0">
                <p className="font-medium text-on-surface truncate">
                  {u.name} {u.id === currentUserId && <span className="text-xs text-on-surface-variant">(you)</span>}
                </p>
                <p className="text-xs text-on-surface-variant font-data-tabular truncate">{u.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-label-caps ${
                    u.role === "OWNER" ? "bg-primary/10 text-primary" : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {u.role === "OWNER" ? "Owner" : "Manager"}
                </span>
                <button
                  onClick={() => startEdit(u)}
                  className="px-3 py-1 rounded-full text-xs font-label-caps text-on-surface-variant hover:bg-surface-container-high"
                >
                  Edit
                </button>
                <button
                  onClick={() => toggleActive(u)}
                  disabled={u.id === currentUserId}
                  title={u.id === currentUserId ? "You can't deactivate your own account" : undefined}
                  className={`px-3 py-1 rounded-full text-xs font-label-caps disabled:opacity-40 disabled:cursor-not-allowed ${
                    u.active ? "bg-success/10 text-success" : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {u.active ? "Active" : "Inactive"}
                </button>
              </div>
            </li>
          )
        )}
        {users.length === 0 && <p className="text-on-surface-variant text-sm py-2">No users yet.</p>}
      </ul>
    </div>
  );
}
