const CACHE_NAME = "ndk-owner-app-v7";

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
  const title = data.title || "NDK Dispatch";
  const options = {
    body: data.body || "",
    icon: data.icon || "/ndk.png",
    badge: data.badge || "/ndk.png",
    tag: data.tag || undefined,
    requireInteraction: Boolean(data.requireInteraction),
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
  // Bypass caching for API calls to ensure fresh data
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }
  // Only handle same-origin requests
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          // Cache the fetched response for future use
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  } else {
    // For cross-origin requests, just fetch normally
    event.respondWith(fetch(event.request));
  }
});
