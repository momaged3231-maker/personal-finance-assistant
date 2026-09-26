/* Sahby PWA service worker — runtime caching, offline shell fallback.
 * Registered at /sw.js from components/PwaBoot.tsx.
 * Version bump forces re-activation of the latest cache. */
const VERSION = "sahby-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // cross-origin (supabase/images) → network

  // Never intercept the app API — the client IDB layer owns those responses.
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network-first with cached copy / offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((hit) => hit || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Static assets & images: cache-first, then refresh in background.
  event.respondWith(
    caches.match(req).then((hit) => {
      const refreshed = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          if (hit) return hit;
          return new Response("", { status: 504 });
        });
      if (hit) {
        event.waitUntil(refreshed.then((r) => r && r.clone && r.clone().body && r.body.cancel().catch(() => {})));
        event.waitUntil(refreshed);
        return hit;
      }
      return refreshed;
    })
  );
});

/* Web Push (for future reminders) — harmless if nothing ever sends a push. */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "صحبي", body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "صحبي", {
      body: data.body || "",
      icon: data.icon || "/icon-192.png",
      badge: data.badge || "/icon-192.png",
      vibrate: [100, 50, 100],
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});