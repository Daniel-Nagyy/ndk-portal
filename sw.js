const CACHE_NAME = "ndk-owner-app-v10";

// Re-subscribe helper: browsers periodically rotate/expire push subscriptions.
// If we don't renew them, push silently dies until the user manually re-enables.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

async function renewPushSubscription() {
  try {
    const res = await fetch("/api/push/vapid-public-key");
    const info = await res.json();
    if (!info || !info.key) return;
    const sub = await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(info.key),
    });
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub }),
    });
  } catch (_) { /* best-effort; the app also refreshes on launch */ }
}

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(renewPushSubscription());
});

// Only real, existing files. (v6 referenced /manifest.json and /icons/* which 404'd,
// causing cache.addAll to reject and the whole service worker to fail installing —
// which silently broke push subscription.)
const ASSETS = [
  "/",
  "/index.html",
  "/app.js",
  "/styles.css",
  "/manifest.webmanifest",
  "/ndk.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Cache each asset independently so one missing/failed file can never
      // block installation (and therefore never block push registration).
      Promise.all(
        ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn("SW cache skip:", url, err.message))
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Web Push: fires even when the app is fully closed
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: "NDK Alert", body: event.data ? event.data.text() : "" };
  }
  const critical = Boolean(data.critical || data.requireInteraction);
  const title = data.title || "NDK Dispatch";
  const options = {
    body: data.body || "",
    icon: data.icon || "/ndk.png",
    badge: data.badge || "/ndk.png",
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),                       // re-alert even with same tag
    requireInteraction: critical,                       // critical stays until dismissed
    vibrate: critical ? [300, 120, 300, 120, 300] : [200], // stronger buzz for critical
    silent: false,
    data: { url: data.url || "/index.html" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "./index.html";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Always hit the network for API calls.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }
  if (url.origin !== location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first for the app shell (HTML/JS/CSS/manifest) so updates always land
  // when online; fall back to cache only when offline. This prevents stale app code.
  const isAppShell = event.request.mode === 'navigate' ||
    /\.(?:js|css|html|webmanifest)$/.test(url.pathname) ||
    url.pathname === '/';

  if (isAppShell) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets (images, icons).
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((networkResponse) => {
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return networkResponse;
      });
    })
  );
});
