/*
 * BP Trainer service worker: makes the app work offline.
 * - The page (index.html) is fetched from the network first, so updates
 *   arrive as soon as the phone is online; offline, the cached copy is used.
 * - Icons and the manifest are served from the cache.
 * Projects are not here: they live in IndexedDB.
 */
const CACHE = 'bp-trainer-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Network first, with a short timeout so a weak signal does not freeze the start. */
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
    ]);
    if (response.ok) cache.put(request.mode === 'navigate' ? './index.html' : request, response.clone());
    return response;
  } catch {
    return (await cache.match(request.mode === 'navigate' ? './index.html' : request)) ?? (await cache.match('./index.html')) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const isPage = req.mode === 'navigate' || new URL(req.url).pathname.endsWith('/index.html');
  event.respondWith(isPage ? networkFirst(req) : cacheFirst(req));
});
