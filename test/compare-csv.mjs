// Compares shabbat.js with a table of times copied from any website.
//
//   node test/compare-csv.mjs times.csv [place] [strict|hebcal] [--tolerance MINUTES]
//
// times.csv has one rest day per line:  date,entry,exit[,rabbeinu-tam]
//   date          YYYY-MM-DD, the Shabbat or Yom Tov day
//   entry         HH:MM candle lighting, on the evening before that date ('-' if the site gives none)
//   exit          HH:MM Havdalah, on that date                            ('-' if the site gives none)
//   rabbeinu-tam  HH:MM the later end (72 minutes after sunset), optional ('-' if none)
// Lines starting with # are ignored. The place is a preset name (default tel-aviv).
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const Shabbat = createRequire(import.meta.url)('../shabbat.js');
const args = process.argv.slice(2);
const tolAt = args.indexOf('--tolerance');
const tolerance = tolAt >= 0 ? +args.splice(tolAt, 2)[1] : 0;
const [file, placeName = 'tel-aviv', style] = args;
if (!file) { console.error('usage: node test/compare-csv.mjs times.csv [place] [strict|hebcal] [--tolerance MINUTES]'); process.exit(2); }

const base = Shabbat.PLACES[placeName];
if (!base) { console.error(`unknown place "${placeName}", presets: ${Object.keys(Shabbat.PLACES).join(', ')}`); process.exit(2); }
const S = Shabbat.create(style ? { ...base, style } : base);
const RT = Shabbat.create({ ...(style ? { ...base, style } : base), havdalahMinutes: 72 });
const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: S.place.tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const minutes = ms => { const [h, m] = fmt.format(ms).split(':'); return +h * 60 + +m; };
const hm = s => +s.slice(0, 2) * 60 + +s.slice(3);

const kinds = { entry: 'candle lighting', exit: 'Havdalah', rt: 'Rabbeinu Tam' };
const n = { entry: 0, exit: 0, rt: 0 }, ok = { entry: 0, exit: 0, rt: 0 }, off = [], notRest = [];
for (const line of readFileSync(file, 'utf8').split('\n')) {
  if (!line.trim() || line.startsWith('#')) continue;
  const [date, entry, exit, rt] = line.split(',').map(s => s.trim());
  const [y, m, d] = date.split('-').map(Number), day = Date.UTC(y, m - 1, d) / 86400000;
  const names = S.itemsOn(day).map(i => i.en).join(' + ');
  if (!names) notRest.push(date);
  for (const [kind, theirs, mine] of [['entry', entry, () => S.candleLighting(day - 1)], ['exit', exit, () => S.havdalah(day)], ['rt', rt, () => RT.havdalah(day)]]) {
    if (!/^\d\d:\d\d$/.test(theirs)) continue;
    n[kind]++;
    const diff = minutes(mine()) - hm(theirs);
    if (Math.abs(diff) <= tolerance) ok[kind]++;
    else off.push(`${date} ${names || '(not a rest day for me)'}: ${kinds[kind]}  theirs ${theirs}  mine ${fmt.format(mine())}  (${diff > 0 ? '+' : ''}${diff} min)`);
  }
}
console.log(`${S.place.name}, ${S.place.style} style, tolerance ${tolerance} min`);
for (const k of Object.keys(kinds)) if (n[k]) console.log(`${(kinds[k] + ':').padEnd(17)}${ok[k]}/${n[k]} agree`);
if (notRest.length) console.log(`days they list that I do not treat as Shabbat / Yom Tov: ${notRest.join(', ')}`);
if (off.length) console.log('differences:\n  ' + off.join('\n  '));
process.exit(off.length || notRest.length ? 1 : 0);
