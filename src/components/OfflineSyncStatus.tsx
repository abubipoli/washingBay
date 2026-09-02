"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { flushPendingWrites, listPendingWrites, onQueueChanged, removePendingWrite, type PendingWrite } from "@/lib/offline/queue";

/** Small status badge shown in the header on every page: online/offline
 * dot, and — only when there's something queued — a pending count that
 * expands into the list of not-yet-synced entries. Syncing happens
 * automatically the moment the browser comes back online, or on demand via
 * the button here. */
export function OfflineSyncStatus() {
  const online = useOnlineStatus();
  const router = useRouter();
  const [pending, setPending] = useState<PendingWrite[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    setPending(await listPendingWrites());
  }, []);

  useEffect(() => {
    refresh();
    return onQueueChanged(refresh);
  }, [refresh]);

  const sync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    const result = await flushPendingWrites();
    setSyncing(false);
    await refresh();
    if (result.synced > 0) router.refresh();
  }, [syncing, refresh, router]);

  useEffect(() => {
    if (online) sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  if (online && pending.length === 0) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-on-surface-variant px-2">
        <span className="w-2 h-2 rounded-full bg-success shrink-0" />
        <span className="hidden sm:inline">Online</span>
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => (pending.length > 0 ? setOpen((o) => !o) : sync())}
        title={online ? "Sync queued entries now" : "Waiting for a connection to sync"}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
          online ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-error/10 text-error"
        }`}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${online ? "bg-primary animate-pulse" : "bg-error"}`} />
        <span className="whitespace-nowrap">
          {online
            ? syncing
              ? "Syncing..."
              : `${pending.length} pending`
            : pending.length > 0
              ? `Offline · ${pending.length} queued`
              : "Offline"}
        </span>
      </button>

      {open && pending.length > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 max-h-80 overflow-y-auto bg-surface-container-lowest rounded-xl shadow-level-2 border border-outline-variant z-50 p-2">
            <p className="text-xs text-on-surface-variant px-2 py-1">
              Saved on this device, not yet on the server. {online ? "Synced automatically." : "Will sync once you're back online."}
            </p>
            <ul className="flex flex-col gap-1">
              {pending.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-container-high">
                  <div className="min-w-0">
                    <p className="text-sm text-on-surface truncate">{item.label}</p>
                    {item.error && <p className="text-xs text-error truncate">{item.error}</p>}
                  </div>
                  {item.error && (
                    <button
                      onClick={async () => {
                        await removePendingWrite(item.id);
                      }}
                      className="text-xs text-on-surface-variant hover:text-error shrink-0"
                    >
                      Discard
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {online && (
              <button
                onClick={sync}
                disabled={syncing}
                className="w-full mt-1 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-medium disabled:opacity-60"
              >
                {syncing ? "Syncing..." : "Sync now"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
