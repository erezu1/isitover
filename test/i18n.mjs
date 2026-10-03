// Checks the page's text: both languages have the same keys and placeholders, the Hebrew grammar comes out right,
// every key index.html uses exists, and the titles and answers only use letters the embedded display fonts contain.
// Run with:  npm test
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const I18N = require('../i18n.js');
const Shabbat = require('../shabbat.js');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

let failed = 0;
const report = (ok, msg) => { console.log((ok ? '  ok  ' : ' FAIL ') + msg); if (!ok) failed++; };
const he = I18N.LANGS.he.strings, en = I18N.LANGS.en.strings;
const placeholders = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
const tags = s => [...new Set([...String(s).matchAll(/<\/?(\w+)/g)].map(m => m[1]))].sort().join(',');   // which tags, not how many

// 1. The same keys, the same {placeholders} and the same <b>/<a> tags in both languages.
{
  const heKeys = Object.keys(he), enKeys = Object.keys(en);
  const missingHe = enKeys.filter(k => !(k in he)), missingEn = heKeys.filter(k => !(k in en));
  report(!missingHe.length && !missingEn.length, `both languages have the same ${enKeys.length} keys` +
    (missingHe.length ? `  (missing in Hebrew: ${missingHe})` : '') + (missingEn.length ? `  (missing in English: ${missingEn})` : ''));
  const bad = enKeys.filter(k => k in he && typeof en[k] === 'string' && typeof he[k] === 'string' &&
    (placeholders(en[k]) !== placeholders(he[k]) || tags(en[k]) !== tags(he[k])));
  report(!bad.length, 'the {placeholders} and the <b>/<a> tags match between the languages' + (bad.length ? `  (differ: ${bad})` : ''));
}

// 2. Every key the page uses exists in both languages (data-i18n attributes, and L.t / L.h calls with a literal key).
{
  const used = new Set();
  for (const m of html.matchAll(/<[a-z][^>]*\sdata-i18n="([\w.]+)"/g)) used.add(m[1]);                  // in tags only, not in comments
  for (const m of html.matchAll(/<[a-z][^>]*\sdata-i18n-attr="([^"]+)"/g)) for (const pair of m[1].split(',')) used.add(pair.split(':')[1].trim());
  for (const m of html.matchAll(/\bL\.[th]\(\s*'([\w.]+)'\s*[,)]/g)) used.add(m[1]);                  // a whole literal key, not a prefix
  const missing = [...used].filter(k => !(k in he) || !(k in en));
  report(used.size > 0 && !missing.length, `${used.size} keys used in index.html all exist in both languages` + (missing.length ? `  (missing: ${missing})` : ''));
  // keys built from parts in the page: title.<kind>, answer.<state>, tag.<state>.<kind>, help.height.*, ...
  const built = ['shabbat', 'chag'].flatMap(k => [`title.${k}`, ...['in', 'out', 'none'].map(s => `tag.${s}.${k}`)]).concat(['in', 'out', 'none'].map(s => `answer.${s}`), ['in', 'out', 'none'].map(s => `detail.${s}`));
  const miss = built.filter(k => !(k in he) || !(k in en));
  report(!miss.length, `the ${built.length} title / answer / tag / detail keys the page builds from parts exist` + (miss.length ? `  (missing: ${miss})` : ''));
  // text that is neither used by the page nor built from parts is probably dead
  const prefixes = ['title.', 'answer.', 'tag.', 'detail.', 'help.'];
  const stale = Object.keys(en).filter(k => !used.has(k) && !prefixes.some(p => k.startsWith(p)) && !html.includes("'" + k + "'"));
  report(!stale.length, 'no unused keys' + (stale.length ? `  (unused: ${stale})` : ''));
}

// 3. The help text: every help.* key is used by renderInfo in index.html.
{
  const helpKeys = Object.keys(en).filter(k => k.startsWith('help.'));
  const referenced = k => new RegExp('[\'":,]' + k.replace(/\./g, '\\.') + '[\'",]').test(html);      // 'key', data-i18n="key", attr:key
  const unused = helpKeys.filter(k => !referenced(k));
  report(!unused.length, `all ${helpKeys.length} help.* keys are used by the "?" panel` + (unused.length ? `  (unused: ${unused})` : ''));
}

// 4. Functions return text for both kinds of title (feminine for Shabbat, masculine for a holiday).
{
  const L = I18N.create('he');
  const p = { start: 'S', end: 'E', left: 'L', ago: 'A' };
  const expect = {
    'detail.in:shabbat': 'נכנסה S · תצא E (בעוד L)', 'detail.in:chag': 'נכנס S · יצא E (בעוד L)',
    'detail.out:shabbat': 'יצאה E (לפני A)', 'detail.out:chag': 'יצא E (לפני A)',
    'detail.none:shabbat': 'תיכנס S (בעוד L) · תצא E', 'detail.none:chag': 'יכנס S (בעוד L) · יצא E',
  };
  const bad = Object.entries(expect).filter(([k, want]) => { const [key, kind] = k.split(':'); return L.t(key, { ...p, kind }) !== want; });
  report(!bad.length, 'Hebrew detail lines use the right verb forms (נכנסה / יצאה / תצא for Shabbat, נכנס / יצא / יצא for a holiday)' +
    (bad.length ? '  ' + bad.map(([k]) => k + ' => ' + L.t(k.split(':')[0], { ...p, kind: k.split(':')[1] })).join(' | ') : ''));
  const En = I18N.create('en');
  report(En.t('detail.in', { start: 'S', end: 'E', left: 'L' }) === 'Began S · ends E (in L)' && En.t('detail.out', { end: 'E', ago: 'A' }) === 'Ended E (A ago)',
    'English detail lines');
}

// 5. The words and titles you asked for, exactly.
{
  const L = I18N.create('he'), En = I18N.create('en');
  const want = [
    [L.t('title.shabbat'), 'האם יצאה שבת?'], [L.t('title.chag'), 'האם יצא החג?'],
    [L.t('answer.in'), 'לא'], [L.t('answer.out'), 'כן'], [L.t('answer.none'), 'לא'],
    [L.t('tag.in.shabbat'), 'בתוקף'], [L.t('tag.out.shabbat'), 'יצאה'], [L.t('tag.none.shabbat'), 'תצא'],
    [L.t('tag.in.chag'), 'בתוקף'], [L.t('tag.out.chag'), 'יצא'], [L.t('tag.none.chag'), 'יצא'],
    [En.t('title.shabbat'), 'Is it over?'], [En.t('title.chag'), 'Is it over?'],
    [En.t('answer.in'), 'no'], [En.t('answer.out'), 'yes'], [En.t('answer.none'), 'not shabat'],
    [L.t('clock', { time: '19:35', place: 'תל אביב' }), 'עכשיו 19:35 בתל אביב.'], [En.t('clock', { time: '19:35', place: 'Tel Aviv' }), 'It’s 19:35 in Tel Aviv.'],
  ];
  const bad = want.filter(([got, w]) => got !== w);
  report(!bad.length, 'titles, answers and tags are the exact words asked for' + (bad.length ? '  ' + bad.map(([g, w]) => `${g} != ${w}`).join(' | ') : ''));
  report(I18N.DEFAULT === 'he' && I18N.create('xx').code === 'he' && L.dir === 'rtl' && En.dir === 'ltr', 'Hebrew is the default and right to left, English is left to right');
}

// 6. Durations and days in Hebrew: plurals, "and", and the English ones.
{
  const f = I18N.create('he').format('Asia/Jerusalem'), e = I18N.create('en').format('Asia/Jerusalem');
  const m = n => n * 60000;
  const he = [[0.2, 'פחות מדקה'], [1, 'דקה'], [2, 'שתי דקות'], [30, '30 דקות'], [60, 'שעה'], [61, 'שעה ודקה'], [62, 'שעה ושתי דקות'], [72, 'שעה ו-12 דקות'],
    [77, 'שעה ו-17 דקות'], [120, 'שעתיים'], [150, 'שעתיים ו-30 דקות'], [180, '3 שעות'], [48 * 60, 'יומיים'], [5 * 24 * 60, '5 ימים']];
  const bad = he.filter(([n, want]) => f.span(m(n)) !== want);
  report(!bad.length, 'Hebrew durations' + (bad.length ? '  ' + bad.map(([n, w]) => `${n} min: ${f.span(m(n))} != ${w}`).join(' | ') : ''));
  const en2 = [[0.2, 'less than a minute'], [30, '30 min'], [72, '1 h 12 min'], [120, '2 h'], [5 * 24 * 60, '5 days']];
  const bad2 = en2.filter(([n, want]) => e.span(m(n)) !== want);
  report(!bad2.length, 'English durations' + (bad2.length ? '  ' + bad2.map(([n, w]) => `${n} min: ${e.span(m(n))} != ${w}`).join(' | ') : ''));
  const S = Shabbat.create('tel-aviv');
  const t = Date.parse('2026-10-03T19:00:00+03:00'), today = S.civilDay(t), DAYMS = 86400000;
  // 3 Oct 2026 is a Saturday, so +6 days is Friday 9 Oct and +7 days is Saturday 10 Oct
  const cases = [
    [f.when(t, today, S.civilDay), 'היום ב-19:00'], [f.when(t + DAYMS, today, S.civilDay), 'מחר ב-19:00'], [f.when(t - DAYMS, today, S.civilDay), 'אתמול ב-19:00'],
    [f.when(t + 6 * DAYMS, today, S.civilDay), 'ביום ו׳, 9 באוק׳ ב-19:00'], [f.when(t + 7 * DAYMS, today, S.civilDay), 'בשבת, 10 באוק׳ ב-19:00'],
    [e.when(t, today, S.civilDay), 'today 19:00'], [e.when(t + 6 * DAYMS, today, S.civilDay), 'Fri 9 Oct 19:00'],
  ];
  const bad3 = cases.filter(([got, want]) => got !== want);
  report(!bad3.length, 'Hebrew and English day words (today / tomorrow / yesterday / a weekday and date)' + (bad3.length ? '  ' + bad3.map(([g, w]) => `${g} != ${w}`).join(' | ') : ''));
}

// 7. Every place has a Hebrew name, and every holiday a Hebrew name.
{
  const hebrew = s => /[א-ת]/.test(s) && !/[A-Za-z]/.test(s.replace(/yeshiva|hebcal/g, ''));
  const noName = Object.entries(Shabbat.PLACES).filter(([, p]) => !p.nameHe || !hebrew(p.nameHe));
  report(!noName.length, `all ${Object.keys(Shabbat.PLACES).length} places have a Hebrew name` + (noName.length ? `  (missing: ${noName.map(([k]) => k)})` : ''));
  const ids = new Map();
  for (const israel of [true, false]) {
    const S = Shabbat.create({ ...Shabbat.PLACES['tel-aviv'], israel });
    for (let day = Date.UTC(2026, 0, 1) / 86400000; day < Date.UTC(2028, 0, 1) / 86400000; day++) for (const it of S.itemsOn(day)) ids.set(it.id + (israel ? '' : ' (diaspora)') + ':' + it.he, it);
  }
  const bad = [...ids.values()].filter(it => !hebrew(it.he));
  report(ids.size >= 9 && !bad.length, `${ids.size} holiday names (Israel and Diaspora) all have Hebrew text`);
}

// 8. The display fonts are cut down to certain letters: the titles and answers must stay inside them.
//    Syne (English): Latin letters. Rubik (Hebrew): Hebrew letters, geresh, gershayim, maqaf. Both: space ? ! . , : -
{
  const allowed = {
    he: c => /[א-ת׳״־]/.test(c) || ' ?!.,:-'.includes(c),
    en: c => /[A-Za-z]/.test(c) || " ?!.,:-’".includes(c),
  };
  const bad = [];
  for (const code of ['he', 'en']) {
    const strings = I18N.LANGS[code].strings;
    for (const key of Object.keys(strings).filter(k => k.startsWith('title.') || k.startsWith('answer.'))) {
      for (const c of strings[key]) if (!allowed[code](c)) bad.push(`${code} ${key}: "${c}" (U+${c.codePodePoint?.(0) ?? c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')})`);
    }
  }
  report(!bad.length, 'titles and answers only use letters the embedded display fonts contain' + (bad.length ? `  (regenerate the fonts or change the text: ${bad})` : ''));
}

// 9. index.html starts in Hebrew, right to left, and sets the language before the first paint.
{
  report(/<html lang="he" dir="rtl">/.test(html) && /document\.documentElement\.dir/.test(html.slice(0, html.indexOf('<style'))), 'index.html starts as lang="he" dir="rtl" and sets the language from the cookie before the first paint');
}

// 10. The script URLs in index.html carry the hash of the file, so a browser that cached an older script fetches the new one.
{
  const { createHash } = await import('node:crypto');
  const hash = file => createHash('sha1').update(readFileSync(new URL('../' + file, import.meta.url))).digest('hex').slice(0, 8);
  const stale = ['shabbat.js', 'i18n.js'].filter(f => !html.includes(`src="${f}?v=${hash(f)}"`));
  report(!stale.length, 'index.html loads the current shabbat.js and i18n.js (their URLs carry the content hash)' + (stale.length ? `  (out of date: ${stale}; run npm run stamp)` : ''));
}

// 11. The embedded text font (IBM Plex Sans Hebrew) has every character the page's text can show: the strings, the place
//     and holiday names, the formatted times, dates and durations in both languages, and the static text in index.html.
//     A character outside its unicode-range would quietly fall back to the system font.
{
  const faces = [...html.matchAll(/font-family: "Plex Text";[^}]*?unicode-range:\s*([^;]+);/g)];
  const ranges = faces.flatMap(m => m[1].split(',').map(r => r.trim().replace(/^U\+/i, '').split('-').map(h => parseInt(h, 16))))
    .map(([from, to]) => [from, to ?? from]);
  const covered = ch => ranges.some(([from, to]) => ch.codePointAt(0) >= from && ch.codePointAt(0) <= to);
  const used = new Map();                                                    // character -> where it was seen
  const see = (where, text) => { for (const ch of String(text)) if (!/\s/.test(ch) && !used.has(ch)) used.set(ch, where); };
  const S = Shabbat.create('tel-aviv');
  const t0 = Date.UTC(2026, 9, 3, 16, 0), today = S.civilDay(t0);
  for (const code of ['en', 'he']) {
    const L = I18N.create(code), f = L.format('Asia/Jerusalem');
    for (const [key, value] of Object.entries(I18N.LANGS[code].strings)) if (typeof value === 'string') see(`${code} ${key}`, value.replace(/<[^>]*>/g, ''));
    for (const place of Object.values(Shabbat.PLACES)) see(`${code} place`, L.placeName(place));
    for (const dt of [0, 36e5, 864e5, -864e5, 3 * 864e5, 40 * 864e5, -40 * 864e5]) see(`${code} when`, f.when(t0 + dt, today, S.civilDay));
    for (const ms of [1000, 59e3, 61e3, 3600e3, 3660e3, 7320e3, 86400e3, 90000e3, 172800e3]) see(`${code} span`, f.span(ms));
    see(`${code} time`, f.time(t0)); see(`${code} date`, f.date(t0)); see(`${code} seconds`, f.seconds(t0));
    see(`${code} coords`, f.coords(32.087, 34.887)); see(`${code} lift`, f.lift(90)); see(`${code} day`, f.dayLabel(today));
    for (const israel of [true, false]) {
      const T = Shabbat.create({ ...Shabbat.PLACES['tel-aviv'], israel });
      for (let d = today; d < today + 400; d++) for (const item of T.itemsOn(d)) see(`${code} holiday`, L.itemName(item));
    }
  }
  const page = html.slice(html.indexOf('<body>')).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]*>/g, ' ');
  see('index.html', page);
  const missing = [...used].filter(([ch]) => !covered(ch)).map(([ch, where]) => `${JSON.stringify(ch)} U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} (${where})`);
  report(faces.length === 4 && used.size > 100 && !missing.length, `the embedded text font covers all ${used.size} characters the page's text uses` +
    (missing.length ? `  (not covered: ${missing}; cut the font again with them, see the README)` : '') + (faces.length !== 4 ? `  (found ${faces.length} Plex Text faces, expected 4)` : ''));
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
