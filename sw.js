// Lets the page open with no network, once it has been opened with one: the page, its scripts and its icons are kept on the
// device. The times are worked out on the device, so nothing else is needed.
//   - the page: asked for fresh every time (so an update arrives at once); the kept copy is shown only when the network
//     fails, answers with an error, or takes longer than WAIT
//   - the scripts: their address carries a hash of the file (?v=...), so a kept copy is the right one for good; when a new
//     hash arrives the old copy is dropped
//   - everything else (icons, the manifest): the kept copy at once, and a fresh one kept for next time
const CACHE = 'isitover';
const SCOPE = self.registration.scope;
const PAGE = new URL('./', SCOPE).href;                         // the address every visit to the page is kept under
const PAGES = [new URL(PAGE).pathname, new URL('index.html', SCOPE).pathname];
const WAIT = 3000;                                              // ms: a connection that hangs, show the kept page after this long

const hashed = href => new URL(href).searchParams.has('v');

async function keep(cache, request) {                           // fetch a file, keep it, and forget older copies of a hashed one
  const res = await fetch(request);
  if (!res.ok) return res;
  await cache.put(request, res.clone());
  if (hashed(request.url)) {
    const now = new URL(request.url);
    for (const old of await cache.keys()) {
      const url = new URL(old.url);
      if (url.pathname === now.pathname && url.search !== now.search) await cache.delete(old);
    }
  }
  return res;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const res = await fetch(PAGE, { cache: 'reload' });
    if (!res.ok) throw new Error('the page answered ' + res.status);
    const html = await res.clone().text();
    await cache.put(PAGE, res);
    const files = new Set();                                    // whatever the page itself points to: scripts, icons, manifest
    for (const m of html.matchAll(/\b(?:src|href)="([^"#]+)"/g)) {
      const url = new URL(m[1], PAGE);
      if (url.origin === location.origin && url.href !== PAGE) files.add(url.href);
    }
    await Promise.allSettled([...files].map(href => keep(cache, new Request(href, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || !url.href.startsWith(SCOPE)) return;
  if (req.mode === 'navigate') { if (PAGES.includes(url.pathname)) event.respondWith(page(event)); }
  else event.respondWith(file(event));
});

async function page(event) {                                    // any query (?now=...) gets the same page
  const cache = await caches.open(CACHE);
  const kept = await cache.match(PAGE);
  const fresh = fetch(PAGE, { cache: 'no-cache' }).then(res => {
    if (res.ok) cache.put(PAGE, res.clone()).catch(() => {});
    return res;
  });
  event.waitUntil(fresh.catch(() => {}));                       // finish keeping it, even if the visit has moved on
  if (!kept) return fresh;                                      // the first visit has nothing else to show
  const late = new Promise(done => setTimeout(() => done(kept), WAIT));
  const res = await Promise.race([fresh, late]).catch(() => kept);
  return res.ok ? res : kept;
}

async function file(event) {
  const req = event.request, cache = await caches.open(CACHE);
  const kept = await cache.match(req);
  if (kept && hashed(req.url)) return kept;
  const fresh = keep(cache, new Request(req, { cache: hashed(req.url) ? 'default' : 'no-cache' }));
  if (!kept) return fresh;
  event.waitUntil(fresh.catch(() => {}));
  return kept;
}
