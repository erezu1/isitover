// Checks the app parts: the manifest, the icons (sizes, opaque where they must be, the maskable ones inside the safe zone),
// the links and meta tags in index.html, and what the service worker does (offline, updates, a hanging network) against a
// fake network and a fake cache.
// Run with:  npm test
import { readFileSync, existsSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (file, enc) => readFileSync(new URL(file, root), enc);
const html = read('index.html', 'utf8');

let failed = 0;
const report = (ok, msg) => { console.log((ok ? '  ok  ' : ' FAIL ') + msg); if (!ok) failed++; };

// A small PNG reader for what the icon tool writes (8-bit RGBA, not interlaced); other kinds give the size only.
function png(file) {
  const b = read(file);
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error(file + ' is not a PNG');
  const width = b.readUInt32BE(16), height = b.readUInt32BE(20);
  if (b[24] !== 8 || b[25] !== 6 || b[28] !== 0) return { width, height, px: null };
  const idat = [];
  for (let o = 8; o < b.length;) {
    const len = b.readUInt32BE(o);
    if (b.toString('latin1', o + 4, o + 8) === 'IDAT') idat.push(b.subarray(o + 8, o + 8 + len));
    o += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), stride = width * 4, px = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const kind = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const left = x >= 4 ? px[y * stride + x - 4] : 0, up = y ? px[(y - 1) * stride + x] : 0, corner = x >= 4 && y ? px[(y - 1) * stride + x - 4] : 0;
      let v = raw[y * (stride + 1) + 1 + x];
      if (kind === 1) v += left;
      else if (kind === 2) v += up;
      else if (kind === 3) v += (left + up) >> 1;
      else if (kind === 4) {
        const p = left + up - corner, pl = Math.abs(p - left), pu = Math.abs(p - up), pc = Math.abs(p - corner);
        v += pl <= pu && pl <= pc ? left : pu <= pc ? up : corner;
      }
      px[y * stride + x] = v & 255;
    }
  }
  return { width, height, px };
}
const opaque = img => { for (let i = 3; i < img.px.length; i += 4) if (img.px[i] !== 255) return false; return true; };
// the farthest any pixel that is not the corner colour lies from the centre, as a fraction of the width
function reach(img) {
  const { width: w, height: h, px } = img, [r, g, b] = px;                  // the corner pixel is the background
  let far = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (Math.abs(px[i] - r) + Math.abs(px[i + 1] - g) + Math.abs(px[i + 2] - b) > 24) far = Math.max(far, Math.hypot(x + .5 - w / 2, y + .5 - h / 2));
  }
  return far / w;
}

// 1. The manifest.
const manifest = JSON.parse(read('manifest.webmanifest', 'utf8'));
const bgs = [...html.matchAll(/--bg:\s*(#[0-9a-f]{6})/gi)].map(m => m[1].toLowerCase());          // light, then dark
{
  const need = ['name', 'short_name', 'start_url', 'scope', 'display', 'background_color', 'theme_color', 'icons'];
  const missing = need.filter(k => !manifest[k]);
  report(!missing.length && manifest.display === 'standalone' && manifest.start_url === './' && manifest.scope === './',
    'the manifest has name, short name, start_url and scope "./", display standalone' + (missing.length ? `  (missing: ${missing})` : ''));
  report(manifest.lang === 'he' && manifest.dir === 'rtl' && /[א-ת]/.test(manifest.name), 'the manifest is Hebrew, right to left, like the page');
  report(manifest.background_color.toLowerCase() === bgs[0] && manifest.theme_color.toLowerCase() === bgs[0],
    `the manifest colours are the page's background (${bgs[0]})`);
}

// 2. Every icon in the manifest exists, is the size it says and the type it says; there is a 192 and a 512 of each purpose.
{
  const problems = [];
  for (const icon of manifest.icons) {
    if (!existsSync(new URL(icon.src, root))) { problems.push(icon.src + ' is missing'); continue; }
    if (icon.type === 'image/png') {
      const img = png(icon.src);
      if (icon.sizes !== `${img.width}x${img.height}`) problems.push(`${icon.src} is ${img.width}x${img.height}, the manifest says ${icon.sizes}`);
    } else if (icon.type === 'image/svg+xml') {
      if (!/^<svg[\s>]/.test(read(icon.src, 'utf8').trim())) problems.push(icon.src + ' is not an SVG');
    } else problems.push(icon.src + ' has an unexpected type ' + icon.type);
  }
  const has = (purpose, size) => manifest.icons.some(i => i.purpose === purpose && i.sizes === `${size}x${size}` && i.type === 'image/png');
  const gaps = ['any', 'maskable'].flatMap(p => [192, 512].filter(s => !has(p, s)).map(s => `${p} ${s}`));
  report(!problems.length && !gaps.length, `all ${manifest.icons.length} icons in the manifest exist with the size and type they claim, any and maskable at 192 and 512` +
    (problems.length ? `  (${problems})` : '') + (gaps.length ? `  (missing: ${gaps})` : ''));
}

// 3. The maskable icons and the iOS icon are opaque (a launcher fills a transparent corner with black), and in the maskable
//    ones everything but the background lies inside the circle every launcher keeps: 40% of the width from the centre.
{
  const maskable = manifest.icons.filter(i => i.purpose === 'maskable').map(i => i.src);
  const files = [...maskable, 'icons/apple-touch-icon.png'];
  const solid = files.filter(f => existsSync(new URL(f, root)) && png(f).px && !opaque(png(f)));
  report(files.every(f => existsSync(new URL(f, root))) && !solid.length, `${files.length} icons that must be opaque are (${files.join(', ')})` + (solid.length ? `  (transparent pixels in: ${solid})` : ''));
  const wide = maskable.map(f => [f, reach(png(f))]).filter(([, r]) => r > 0.4 + 1.5 / 192);
  report(!wide.length, `the maskable icons keep their drawing inside the central circle (the safe zone)` + (wide.length ? `  (too wide: ${wide.map(([f, r]) => f + ' ' + r.toFixed(3))})` : ''));
}

// 4. index.html: the links, the meta tags, the registration, and that everything it points to exists.
{
  const link = (rel, attr) => [...html.matchAll(new RegExp(`<link\\s[^>]*rel="${rel}"[^>]*>`, 'g'))].map(m => (new RegExp(`${attr}="([^"]*)"`).exec(m[0]) || [])[1]);
  const [manifestHref] = link('manifest', 'href'), [apple] = link('apple-touch-icon', 'href'), icons = link('icon', 'href');
  report(manifestHref === 'manifest.webmanifest' && icons.length >= 2 && icons.some(h => h.endsWith('.svg')) && icons.some(h => h.endsWith('.png')) && apple,
    'index.html links the manifest, an SVG and a PNG icon, and the apple-touch-icon');
  const apple180 = apple && existsSync(new URL(apple, root)) ? png(apple) : {};
  report(apple180.width === 180 && apple180.height === 180, 'the apple-touch-icon is 180x180');
  const themes = [...html.matchAll(/<meta name="theme-color" content="(#[0-9a-f]{6})" media="\(prefers-color-scheme: (light|dark)\)"/gi)];
  report(themes.length === 2 && themes.find(m => m[2] === 'light')?.[1].toLowerCase() === bgs[0] && themes.find(m => m[2] === 'dark')?.[1].toLowerCase() === bgs[1],
    `the theme colours follow the page's light (${bgs[0]}) and dark (${bgs[1]}) background`);
  report(/apple-mobile-web-app-capable/.test(html) && /mobile-web-app-capable/.test(html) && /apple-mobile-web-app-title/.test(html), 'the home-screen meta tags (capable, title) are there');
  report(/serviceWorker\.register\('sw\.js'\)/.test(html) && existsSync(new URL('sw.js', root)), 'index.html registers sw.js, and it exists');
  report(/<button[^>]*id="installBtn"[^>]*\shidden[\s>]/.test(html) && /<aside[^>]*id="install"[^>]*\shidden[\s>]/.test(html) &&
    /beforeinstallprompt/.test(html) && /appinstalled/.test(html),
    'the install button and the invitation start hidden, and the script listens for beforeinstallprompt and appinstalled');
  const local = [...html.matchAll(/<(?:link|script|img)\s[^>]*?(?:href|src)="([^"#]+)"/g)].map(m => m[1]).filter(u => !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(u));
  const gone = local.filter(u => !existsSync(new URL(u.split('?')[0], root)));
  report(local.length >= 6 && !gone.length, `the ${local.length} local files index.html points to all exist` + (gone.length ? `  (missing: ${gone})` : ''));
}

// 5. The service worker, run against a fake network and a fake cache (the real ones are the browser's).
{
  const ORIGIN = 'https://example.test', SCOPE = ORIGIN + '/isitover/', PAGE = SCOPE;
  const swSource = read('sw.js', 'utf8');
  const page = (s, i) => `<!doctype html><link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icons/icon.svg">` +
    `<script src="shabbat.js?v=${s}"></script><script src="i18n.js?v=${i}"></script><style>@font-face{src:url(data:font/woff2;base64,AAAA)}</style>` +
    `<a href="https://elsewhere.test/x">x</a><a href="#top">top</a>`;
  const put = (site, path, body, status = 200) => site.set('/isitover/' + path, { body, status });

  function world(old = {}) {
    const site = new Map(), net = { online: true, hang: false, calls: [] }, stores = new Map(Object.entries(old).map(([n, e]) => [n, new Map(e)]));
    const key = r => typeof r === 'string' ? r : r.url;
    const open = async name => {
      if (!stores.has(name)) stores.set(name, new Map());
      const s = stores.get(name);
      return { match: async r => { const v = s.get(key(r)); return v && v.clone(); }, put: async (r, v) => { s.set(key(r), v); },
        keys: async () => [...s.keys()].map(url => ({ url })), delete: async r => s.delete(key(r)) };
    };
    const caches = { open, keys: async () => [...stores.keys()], delete: async n => stores.delete(n) };
    const fetch = async (input, init = {}) => {
      const req = new Request(input, init);
      net.calls.push(req.url + ' [' + (init.cache || req.cache) + ']');
      if (net.hang) return new Promise(() => {});
      if (!net.online) throw new TypeError('offline');
      const hit = site.get(new URL(req.url).pathname);
      return new Response(hit ? hit.body : 'not found', { status: hit ? hit.status : 404 });
    };
    const handlers = {};
    const self = { registration: { scope: SCOPE }, addEventListener: (type, fn) => { handlers[type] = fn; }, skipWaiting: async () => {}, clients: { claim: async () => { net.claimed = true; } } };
    const ctx = vm.createContext({ self, caches, fetch, location: new URL(ORIGIN), Request, Response, URL, setTimeout: (fn, ms) => setTimeout(fn, ms / 1000) });
    vm.runInContext(swSource, ctx);
    const lifecycle = async type => { const waits = []; handlers[type]({ waitUntil: p => waits.push(p) }); await Promise.all(waits); };
    const ask = async (url, { mode = 'no-cors', method = 'GET' } = {}) => {          // a request from the page; null when the worker lets it go
      const request = mode === 'navigate' ? { url, mode, method } : new Request(url, { method });
      const ev = { request, response: null, waits: [], respondWith(p) { this.response = p; }, waitUntil(p) { this.waits.push(p); } };
      handlers.fetch(ev);
      const res = ev.response && await ev.response;
      if (!net.hang) await Promise.all(ev.waits);                                     // a hanging fetch would never finish keeping it
      return res ? { status: res.status, text: await res.text() } : null;
    };
    const kept = name => [...(stores.get(name || 'isitover') || new Map()).keys()].map(u => u.replace(ORIGIN + '/isitover/', ''));
    return { site, net, ask, lifecycle, kept, stores, caches };
  }

  const check = (ok, msg) => report(ok, 'service worker: ' + msg);
  const w = world();
  put(w.site, '', page('s1', 'i1')); put(w.site, 'shabbat.js', 'S1'); put(w.site, 'i18n.js', 'I1');
  put(w.site, 'manifest.webmanifest', '{}'); put(w.site, 'icons/icon.svg', '<svg/>');

  await w.lifecycle('install');
  const want = ['', 'shabbat.js?v=s1', 'i18n.js?v=i1', 'manifest.webmanifest', 'icons/icon.svg'];
  check(want.every(k => w.kept().includes(k)) && w.kept().length === want.length, `installing keeps the page and what it points to, nothing else (${w.kept().length} files)`);
  check(w.net.calls.every(c => c.endsWith('[reload]')), 'installing asks the network for fresh copies, not the browser cache');

  let r = await w.ask(PAGE + '?now=2026-10-03T19:06:00%2B03:00', { mode: 'navigate' });
  check(r && r.text.includes('shabbat.js?v=s1') && w.net.calls.some(c => c === PAGE + ' [no-cache]'), 'online, the page comes fresh from the network (revalidated), whatever the query');

  put(w.site, '', page('s2', 'i1'));                                                      // a deploy
  r = await w.ask(PAGE + 'index.html', { mode: 'navigate' });
  const again = await w.caches.open('isitover').then(c => c.match(PAGE)).then(x => x.text());
  check(r.text.includes('s2') && again.includes('s2'), 'an updated page is shown at once and kept for later');

  w.net.online = false;
  r = await w.ask(PAGE + '?now=x', { mode: 'navigate' });
  check(r && r.status === 200 && r.text.includes('s2'), 'offline, the kept page is shown (with or without a query)');
  r = await w.ask(PAGE + 'i18n.js?v=i1');
  check(r && r.text === 'I1', 'offline, a kept script is served');
  w.net.online = true;

  put(w.site, 'shabbat.js', 'S2');
  w.net.calls.length = 0;
  r = await w.ask(PAGE + 'shabbat.js?v=s2');
  check(r.text === 'S2' && w.kept().includes('shabbat.js?v=s2') && !w.kept().includes('shabbat.js?v=s1'), 'a script with a new hash is fetched, kept, and its older copy dropped');
  w.net.calls.length = 0;
  r = await w.ask(PAGE + 'shabbat.js?v=s2');
  check(r.text === 'S2' && !w.net.calls.length, 'a kept script is not fetched again (its address is its content)');

  put(w.site, 'icons/icon.svg', '<svg id="new"/>');
  r = await w.ask(PAGE + 'icons/icon.svg');
  const next = await w.ask(PAGE + 'icons/icon.svg');
  check(r.text === '<svg/>' && next.text === '<svg id="new"/>', 'an icon is served from the kept copy at once, and refreshed for next time');

  w.net.hang = true;
  r = await w.ask(PAGE, { mode: 'navigate' });
  check(r && r.text.includes('s2'), 'a network that never answers: the kept page is shown after a few seconds');
  w.net.hang = false;

  put(w.site, '', 'Bad gateway', 502);
  r = await w.ask(PAGE, { mode: 'navigate' });
  check(r.status === 200 && r.text.includes('s2'), 'an error answer from the server does not replace the kept page');
  const fresh = world();
  put(fresh.site, '', 'Bad gateway', 502);
  r = await fresh.ask(PAGE, { mode: 'navigate' });
  check(r.status === 502, 'with nothing kept yet, the error is shown as it is');

  const other = [await w.ask('https://elsewhere.test/x.js'), await w.ask(PAGE + 'x', { method: 'POST' }), await w.ask(PAGE + 'other.html', { mode: 'navigate' }), await w.ask(ORIGIN + '/doei/', { mode: 'navigate' })];
  check(other.every(x => x === null), 'other sites, other methods, other pages are left alone');

  const old = world({ isitover: [], 'isitover-old': [] });
  await old.lifecycle('activate');
  check(!old.stores.has('isitover-old') && old.net.claimed, 'activating drops caches of other names and takes over the open pages');
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
