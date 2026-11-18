/*
 * BP Trainer service worker: makes the app work offline.
 * - The page (index.html) is fetched from the network first, so updates
 *   arrive as soon as the phone is online; offline, or when the server
 *   answers with an error (5xx), the last working copy is used.
 * - Icons and the manifest are served from the cache and refreshed in the
 *   background, so a new icon or manifest arrives at the next launch.
 * - version.json (is there a newer version?) always goes to the network.
 * Projects are not here: they live in IndexedDB.
 *
 * Every site of the account shares the origin infinitereliefstudio-eng.github.io:
 * only BP Trainer's own caches (CACHE_PREFIX) are ever deleted.
 */
const CACHE_PREFIX = 'bp-trainer-';
const CACHE = `${CACHE_PREFIX}v2`;
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** The last working copy of a request (the page for a navigation). */
async function cached(request) {
  const cache = await caches.open(CACHE);
  const page = request.mode === 'navigate' ? './index.html' : request;
  return (await cache.match(page)) ?? (await cache.match('./index.html'));
}

/** Network first, with a short timeout so a weak signal does not freeze the start. */
async function networkFirst(request) {
  let response;
  try {
    response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
    ]);
  } catch {
    return (await cached(request)) ?? Response.error();
  }
  if (response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request.mode === 'navigate' ? './index.html' : request, response.clone());
    return response;
  }
  // A server error is no reason to lose a working app: the cached copy, if any.
  if (response.status >= 500) return (await cached(request)) ?? response;
  return response;
}

/** The cached copy at once; the network refreshes the cache for the next launch. */
async function staleWhileRevalidate(event) {
  const request = event.request;
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) return cache.put(request, response.clone()).then(() => response);
      return response;
    })
    .catch(() => undefined);
  if (hit) {
    event.waitUntil(refresh);
    return hit;
  }
  return (await refresh) ?? Response.error();
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/version.json')) return;
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/index.html');
  event.respondWith(isPage ? networkFirst(req) : staleWhileRevalidate(event));
});
