/* PJ Digitals service worker.
 * - App shell and hashed build files are cached so the site opens fast and shows an offline page without a connection.
 * - API calls, Clerk, payments and anything on another origin are never touched: they always go straight to the network.
 * Bump VERSION to force every phone to drop its old caches. */
const VERSION = "v1";
const SHELL = `pj-shell-${VERSION}`;
const ASSETS = `pj-assets-${VERSION}`;
const IMAGES = `pj-images-${VERSION}`;
const KEEP = [SHELL, ASSETS, IMAGES];
const PRECACHE = ["/offline.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];
const MAX_IMAGES = 60;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith("pj-") && !KEEP.includes(n)).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API, Clerk, Razorpay, maps, image hosts: network only
  if (url.pathname.startsWith("/api/")) return;

  // Page loads: network first, fall back to the cached app shell, then the offline page.
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        // every route serves the same single-page shell; keep one copy (skip login handshakes with a query string)
        if (res.ok && !url.search) { const c = await caches.open(SHELL); c.put("/", res.clone()); }
        return res;
      } catch {
        const cache = await caches.open(SHELL);
        return (await cache.match("/")) || (await cache.match("/offline.html")) || Response.error();
      }
    })());
    return;
  }

  // Hashed build files never change: cache first.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith((async () => {
      const cache = await caches.open(ASSETS);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  // Same-origin images and icons: show the cached copy at once, refresh it in the background.
  if (req.destination === "image" || url.pathname.startsWith("/icons/")) {
    event.respondWith((async () => {
      const cache = await caches.open(IMAGES);
      const hit = await cache.match(req);
      const refresh = fetch(req).then((res) => { if (res.ok) { cache.put(req, res.clone()); trim(IMAGES, MAX_IMAGES); } return res; }).catch(() => hit);
      return hit || refresh;
    })());
  }
});
