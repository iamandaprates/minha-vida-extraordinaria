/* Mive service worker. The version and the precache list below are filled in at build time (vite.config.ts). */
const VERSION = '__VERSION__';
const CACHE = `mive-${VERSION}`;
const PRECACHE = __PRECACHE__;
const SHELL = '/index.html';

self.addEventListener('install', event => {
  // `cache: 'reload'` skips the HTTP cache: the precache always holds this exact build.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE.map(url => new Request(url, { cache: 'reload' })))));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('mive-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Supabase, Google and Spotify always go to the network: only the app shell is cached.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Online: the newest page. Offline: the shell that was precached with this build.
    event.respondWith((async () => {
      try { return await fetch(request); }
      catch { return (await caches.match(SHELL, { cacheName: CACHE, ignoreVary: true })) ?? Response.error(); }
    })());
    return;
  }

  event.respondWith((async () => {
    // `ignoreVary`: hosts answer with `Vary: Origin`, and the page asks for its files in CORS mode.
    const cached = await caches.match(request, { cacheName: CACHE, ignoreVary: true, ignoreSearch: url.pathname.startsWith('/assets/') });
    if (cached) return cached;
    const response = await fetch(request);
    // Hashed files of a newer build, fetched while this worker is still in charge.
    if (response.ok && url.pathname.startsWith('/assets/')) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy))); }
    return response;
  })());
});
