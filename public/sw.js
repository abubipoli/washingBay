// Minimal service worker: just enough to satisfy PWA installability
// (a controlling SW with a fetch handler) without caching anything.
// Financial data must always be fetched fresh, so this intentionally does
// NOT cache API responses or pages — everything passes straight to the
// network. If you later want offline support for the static shell, add a
// CacheStorage precache here for /icons and /manifest.webmanifest only.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
