// Service worker: caches the app shell (pages + static assets) so the app
// still opens with no signal, but deliberately never caches /api/* — every
// read stays live when online, exactly as before. Bump the cache names
// below on any change to this file's caching behavior so old entries get
// cleaned out in `activate`.
const SHELL_CACHE = "washbay-shell-v1";
const STATIC_CACHE = "washbay-static-v1";
const PRECACHE_URLS = ["/manifest.webmanifest", "/icons/icon.svg", "/brand/logo-emblem.png", "/brand/logo.png", "/offline.html"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== STATIC_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Financial data must always be fetched fresh — never intercept the API.
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Page navigations: try the network first (so an online visit always
  // shows current data), fall back to whatever was last cached for that
  // same URL, and finally to a generic offline page if it's never been
  // visited at all.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(SHELL_CACHE);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          const cached = await cache.match(request);
          return cached || (await caches.match("/offline.html"));
        }
      })()
    );
    return;
  }

  // Next's fingerprinted build assets, plus images/fonts: cache-first,
  // since the filename itself changes on every new deploy.
  if (url.pathname.startsWith("/_next/static/") || request.destination === "image" || request.destination === "font") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const fresh = await fetch(request);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          return cached || Response.error();
        }
      })()
    );
  }
});
