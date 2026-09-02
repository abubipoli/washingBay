import { dbAdd, dbGetAll, dbDelete, dbPut } from "./db";

export type PendingWriteKind = "wash" | "expense";

export type PendingWrite = {
  id: number;
  kind: PendingWriteKind;
  /** Human-readable one-liner for the sync status list, e.g. "GR 1234-24 — GHS 30.00". */
  label: string;
  endpoint: string;
  payload: Record<string, unknown>;
  createdAt: string;
  error?: string;
};

const QUEUE_CHANGED_EVENT = "washbay:queue-changed";

function notifyQueueChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
}

/** Subscribes to both queue mutations and the browser coming back online —
 * the two events that should make any "pending sync" UI re-check itself.
 * Returns an unsubscribe function. */
export function onQueueChanged(cb: () => void): () => void {
  window.addEventListener(QUEUE_CHANGED_EVENT, cb);
  window.addEventListener("online", cb);
  return () => {
    window.removeEventListener(QUEUE_CHANGED_EVENT, cb);
    window.removeEventListener("online", cb);
  };
}

export async function enqueueWrite(
  kind: PendingWriteKind,
  label: string,
  endpoint: string,
  payload: Record<string, unknown>
): Promise<number> {
  const id = await dbAdd({ kind, label, endpoint, payload, createdAt: new Date().toISOString() });
  notifyQueueChanged();
  return id;
}

export async function listPendingWrites(): Promise<PendingWrite[]> {
  const items = await dbGetAll<PendingWrite>();
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removePendingWrite(id: number): Promise<void> {
  await dbDelete(id);
  notifyQueueChanged();
}

/** A fetch() that throws (rather than just resolving with a non-ok status)
 * means the request never reached the network — the one reliable
 * cross-browser signal for "actually offline" (TypeError: "Failed to
 * fetch" in Chrome, "NetworkError when attempting to fetch resource" in
 * Firefox, "Load failed" in Safari — all surface as a TypeError). */
export function isNetworkFailure(err: unknown): boolean {
  return err instanceof TypeError;
}

/**
 * Replays queued writes in the order they were created. A genuine network
 * failure stops the pass early (still offline, nothing further will
 * succeed either) so the rest stay queued for the next attempt. A
 * server-side rejection (validation error, etc.) is different — that item
 * is flagged with the error instead of retried forever, but the pass keeps
 * going since it says nothing about the other queued items.
 */
export async function flushPendingWrites(): Promise<{ synced: number; failed: number }> {
  const items = await listPendingWrites();
  let synced = 0;
  let failed = 0;
  for (const item of items) {
    try {
      const res = await fetch(item.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        await dbPut({
          ...item,
          error: body?.error?.formErrors?.[0] ?? body?.error ?? `Server rejected this (HTTP ${res.status})`,
        });
        notifyQueueChanged();
        failed++;
        continue;
      }
      await removePendingWrite(item.id);
      synced++;
    } catch (err) {
      if (isNetworkFailure(err)) break;
      failed++;
    }
  }
  return { synced, failed };
}
