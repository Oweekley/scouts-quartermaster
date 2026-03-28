/* eslint-disable no-restricted-globals */

const VERSION = "sq-sw-v1";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const DATA_CACHE = `${VERSION}-data`;

const OFFLINE_DB = "sq_offline";
const OFFLINE_DB_VERSION = 1;

function openOfflineDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB, OFFLINE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("snapshot")) db.createObjectStore("snapshot");
      if (!db.objectStoreNames.contains("queue")) db.createObjectStore("queue", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open IndexedDB."));
  });
}

async function readQueueItems() {
  const db = await openOfflineDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("queue", "readonly");
      const store = tx.objectStore("queue");
      const items = [];
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return resolve(items);
        items.push(cursor.value);
        cursor.continue();
      };
      req.onerror = () => reject(req.error ?? new Error("Could not read queue."));
    });
  } finally {
    db.close();
  }
}

async function deleteQueueItem(id) {
  const db = await openOfflineDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction("queue", "readwrite");
      const store = tx.objectStore("queue");
      const req = store.delete(id);
      req.onsuccess = () => resolve(undefined);
      req.onerror = () => reject(req.error ?? new Error("Could not delete queue item."));
    });
  } finally {
    db.close();
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  const fresh = await fetch(req);
  if (fresh && fresh.ok) cache.put(req, fresh.clone());
  return fresh;
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw new Error("offline");
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(["/manifest.webmanifest", "/pwa-icon.svg", "/pwa-maskable.svg"]);
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag !== "sq-sync") return;
  event.waitUntil(
    (async () => {
      const items = await readQueueItems();
      if (!items || items.length === 0) return;

      // Only supports the minimal "consume_one" queue in v1.
      const payload = {
        items: items
          .filter((it) => it && it.type === "consume_one" && it.payload && it.payload.equipmentId)
          .slice(0, 50)
          .map((it) => ({
            id: it.id,
            type: it.type,
            equipmentId: it.payload.equipmentId,
            baseUpdatedAtMs: it.payload.baseUpdatedAtMs,
          })),
      };
      if (payload.items.length === 0) return;

      const res = await fetch("/api/offline/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) return;

      const data = await res.json().catch(() => null);
      const results = Array.isArray(data?.results) ? data.results : [];
      for (const r of results) {
        if (r && r.ok === true && typeof r.id === "string") {
          await deleteQueueItem(r.id);
        }
      }
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Next build artifacts
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // Offline snapshot data (store cupboard mode)
  if (url.pathname === "/api/store-cupboard/snapshot") {
    event.respondWith(networkFirst(req, DATA_CACHE));
    return;
  }

  // App navigation: network-first, fall back to cached page.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await networkFirst(req, RUNTIME_CACHE);
        } catch {
          const cache = await caches.open(RUNTIME_CACHE);
          const cached = await cache.match(req);
          if (cached) return cached;
          return new Response(
            `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title></head><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:20px;line-height:1.4"><h1 style="margin:0 0 8px 0;font-size:18px">You’re offline</h1><p style="margin:0 0 12px 0;color:#334155">Open <strong>Store cupboard mode</strong> for offline kit lookup.</p><p style="margin:0"><a href="/store-cupboard">Go to store cupboard</a></p></body></html>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }
      })(),
    );
    return;
  }

  // Default: try cache, then network.
  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      const fresh = await fetch(req);
      if (fresh && fresh.ok) cache.put(req, fresh.clone());
      return fresh;
    })(),
  );
});
