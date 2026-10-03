// Puts a content hash on the script URLs in index.html (shabbat.js?v=..., i18n.js?v=...). GitHub Pages lets browsers
// keep a file for 10 minutes, so without this a visitor can get a new index.html with an old i18n.js. A new hash is a
// new URL, so the new script is fetched at once.
//
// Run it after changing shabbat.js or i18n.js:   npm run stamp      (npm test fails when the stamp is out of date)
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const hash = file => createHash('sha1').update(readFileSync(new URL(file, root))).digest('hex').slice(0, 8);
let html = readFileSync(new URL('index.html', root), 'utf8');
for (const file of ['shabbat.js', 'i18n.js']) {
  const tag = new RegExp(`src="${file.replace('.', '\\.')}(\\?v=[0-9a-f]+)?"`);
  if (!tag.test(html)) throw new Error(`index.html has no <script src="${file}">`);
  html = html.replace(tag, `src="${file}?v=${hash(file)}"`);
}
writeFileSync(new URL('index.html', root), html);
console.log('stamped:', [...html.matchAll(/src="((?:shabbat|i18n)\.js\?v=[0-9a-f]+)"/g)].map(m => m[1]).join('  '));
