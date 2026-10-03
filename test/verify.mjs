// Checks shabbat.js against the hebcal library (the code behind hebcal.com), for places in Israel and abroad.
// Run with:  npm install && npm test
import { createRequire } from 'node:module';
import { Location, Zmanim, HDate, HebrewCalendar, flags, getHolidaysOnDate, isAssurBemlacha } from '@hebcal/core';

const Shabbat = createRequire(import.meta.url)('../shabbat.js');
const DAY = 86400000, MIN = 60000;
const dayOf = (y, m, d) => Date.UTC(y, m - 1, d) / DAY;
const ymd = day => { const d = new Date(day * DAY); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]; };
const clock = (ms, tz = 'Asia/Jerusalem') => new Date(ms).toLocaleString('sv-SE', { timeZone: tz }).slice(0, 16);

let failed = 0;
const report = (ok, msg) => { console.log((ok ? '  ok  ' : ' FAIL ') + msg); if (!ok) failed++; };

// The places: hebcal's own coordinates and its candle-lighting minutes (Israel 20, Jerusalem 40, Haifa 30, else 18).
const locations = ['Tel Aviv', 'Jerusalem', 'Haifa', 'Beer Sheva', 'London', 'New York', 'Los Angeles', 'Sydney',
  'Johannesburg', 'Buenos Aires', 'Moscow'].map(n => Location.lookup(n));
locations.push(new Location(52.37403, 4.88969, false, 'Europe/Amsterdam', 'Amsterdam', 'NL'));
const candleMinutes = loc => !loc.getIsrael() ? 18 : { Jerusalem: 40, Haifa: 30 }[loc.getName()] ?? 20;
const placeOf = (loc, style, elevation = 0) => ({
  name: loc.getName(), lat: loc.getLatitude(), lon: loc.getLongitude(), tz: loc.getTzid(),
  israel: loc.getIsrael(), candleMinutes: candleMinutes(loc), elevation, style
});
const range = loc => loc.getName() === 'Tel Aviv' ? [2024, 2099] : [2024, 2040];
const label = loc => `${loc.getName()} (${loc.getIsrael() ? 'Israel' : 'Diaspora'})`;
const zmanimOn = (loc, day) => { const [y, m, d] = ymd(day); return new Zmanim(loc, new Date(y, m - 1, d), false); };

// 1. Every single day's times, from hebcal's Zmanim. The sun must agree to the second (hebcal drops the
//    milliseconds) and the 'hebcal' style must give hebcal's minutes. The 'strict' style, at sea level, must be
//    exactly a minute earlier at the start and equal or a minute later at the end.
for (const loc of locations) {
  const hb = Shabbat.create(placeOf(loc, 'hebcal')), st = Shabbat.create(placeOf(loc, 'strict'));
  const [y0, y1] = range(loc), min = candleMinutes(loc);
  let bad = 0, n = 0, later = 0;
  for (let day = dayOf(y0, 1, 1); day <= dayOf(y1, 12, 31); day++, n++) {
    const z = zmanimOn(loc, day);
    const wantStart = z.sunsetOffset(-min, true).getTime(), wantEnd = Zmanim.roundTime(z.tzeit(8.5)).getTime();
    const ok = Math.floor(hb.sunset(day) / 1000) * 1000 === z.sunset().getTime() &&
               Math.floor(hb.nightfall(day) / 1000) * 1000 === z.tzeit(8.5).getTime() &&
               hb.candleLighting(day) === wantStart && hb.havdalah(day) === wantEnd &&
               st.candleLighting(day) === hb.candleLighting(day) - MIN &&
               (st.havdalah(day) === hb.havdalah(day) || st.havdalah(day) === hb.havdalah(day) + MIN);
    later += st.havdalah(day) > hb.havdalah(day);
    if (!ok && bad++ < 3) console.log(`      day ${ymd(day)}: sunset ${hb.sunset(day)} vs ${z.sunset().getTime()}, start ${clock(hb.candleLighting(day), loc.getTzid())} vs ${clock(wantStart, loc.getTzid())}, end ${clock(hb.havdalah(day), loc.getTzid())} vs ${clock(wantEnd, loc.getTzid())}`);
  }
  report(bad === 0, `${label(loc)} ${y0}-${y1}: ${n} days, sun identical to the second, 'hebcal' style identical to hebcal; 'strict' ends a minute later on ${Math.round(100 * later / n)}%`);
}
{ // Elevation lifts the visible sunset a little: 15 m in Tel Aviv is about 35 seconds, and only 'strict' uses it.
  const sea = Shabbat.create({ ...Shabbat.PLACES['tel-aviv'], elevation: 0 }), high = Shabbat.create('tel-aviv'), hbe = Shabbat.create({ ...Shabbat.PLACES['tel-aviv'], style: 'hebcal' });
  let lo = Infinity, hi = -Infinity, ignored = true;
  for (let day = dayOf(2026, 1, 1); day <= dayOf(2026, 12, 31); day++) {
    const d = (high.sunset(day) - sea.sunset(day)) / 1000;
    lo = Math.min(lo, d); hi = Math.max(hi, d);
    ignored = ignored && hbe.sunset(day) === sea.sunset(day);
  }
  report(lo > 25 && hi < 50 && ignored, `Tel Aviv at 15 m: sunset ${lo.toFixed(0)}-${hi.toFixed(0)} s later than at sea level; the 'hebcal' style ignores elevation`);
}

// 2. Which days are Shabbat / Yom Tov (work forbidden), 1900-2200, Israel and Diaspora, from hebcal's holiday list.
for (const israel of [true, false]) {
  const place = { name: 'x', lat: 32, lon: 35, tz: 'Asia/Jerusalem', israel };
  const S = Shabbat.create(place);
  const from = dayOf(1900, 1, 1), to = dayOf(2200, 12, 31);
  let bad = 0;
  for (let day = from; day <= to; day++) {
    const [y, m, d] = ymd(day);
    const hd = new HDate(new Date(y, m - 1, d));
    const holidays = getHolidaysOnDate(hd, israel) || [];
    const want = hd.getDay() === 6 || holidays.some(ev => ev.getFlags() & flags.CHAG);
    if (want !== (S.itemsOn(day).length > 0) && bad++ < 5)
      console.log(`      ${y}-${m}-${d}: hebcal says rest=${want} (${holidays.map(h => h.getDesc())}), mine ${S.itemsOn(day).map(i => i.en)}`);
  }
  report(bad === 0, `${to - from + 1} days 1900-2200: same Shabbat / Yom Tov days as hebcal (${israel ? 'Israel' : 'Diaspora'})`);
}

// 3. Whole periods: hebcal's own candle-lighting / Havdalah events ('hebcal' rounding).
for (const loc of locations) {
  const S = Shabbat.create(placeOf(loc, 'hebcal'));
  const [y0, y1] = range(loc);
  const events = HebrewCalendar.calendar({
    start: new Date(y0 - 1, 11, 1), end: new Date(y1 + 1, 0, 31),
    location: loc, il: loc.getIsrael(), candlelighting: true, sedrot: false
  });
  const timed = events.filter(e => ['Candle lighting', 'Havdalah'].includes(e.getDesc()))
    .map(e => ({ kind: e.getDesc(), t: e.eventTime.getTime() })).sort((a, b) => a.t - b.t);
  const want = [];                                  // the first candle lighting opens, the next Havdalah closes
  for (let open = null, i = 0; i < timed.length; i++) {
    if (timed[i].kind === 'Candle lighting') { if (open === null) open = timed[i].t; }
    else if (open !== null) { want.push([open, timed[i].t]); open = null; }
  }
  const got = [];
  for (let p = S.nextPeriod(dayOf(y0 - 1, 12, 1)); p.first <= dayOf(y1 + 1, 1, 31); p = S.nextPeriod(p.last + 1)) got.push([p.start, p.end, p.names.join(' + ')]);
  const a = want.slice(1, -1), b = got.slice(1, -1);  // the ends of the range are cut off in hebcal's list
  let bad = a.length === b.length ? 0 : 1;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if ((a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) && bad++ < 3)
      console.log(`      #${i}: hebcal ${clock(a[i][0], loc.getTzid())} -> ${clock(a[i][1], loc.getTzid())}, mine ${clock(b[i][0], loc.getTzid())} -> ${clock(b[i][1], loc.getTzid())} (${b[i][2]})`);
  }
  if (a.length !== b.length) console.log(`      hebcal has ${a.length} periods, mine ${b.length}`);
  report(bad === 0, `${label(loc)} ${y0}-${y1}: ${a.length} periods (every Shabbat and holiday), start and end identical to hebcal's calendar`);
}

// 4. "Is it in right now?" at random moments, against hebcal's isAssurBemlacha(). Hebcal starts at sunset and
//    ends at the unrounded nightfall; the page starts at candle lighting and ends on the rounded minute,
//    so those narrow windows are skipped.
{
  let seed = 20261003;
  const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  let checked = 0, bad = 0, inside = 0;
  for (const loc of locations) {
    const S = Shabbat.create(placeOf(loc, 'hebcal'));
    const [y0, y1] = range(loc);
    const from = Date.UTC(y0, 0, 1), span = Date.UTC(y1 + 1, 0, 1) - from;
    for (let i = 0; i < 3000; i++) {
      const t = from + Math.floor(rnd() * span), today = S.civilDay(t);
      if ([today, today + 1].some(x => (t >= S.candleLighting(x) - MIN && t < S.sunset(x) + MIN) || Math.abs(t - S.nightfall(x)) <= 61000)) continue;
      const want = isAssurBemlacha(new Date(t), loc, false), got = S.status(t).state === 'in';
      checked++; inside += got;
      if (want !== got && bad++ < 5) console.log(`      ${label(loc)} ${clock(t, loc.getTzid())}: hebcal ${want}, mine ${got}`);
    }
  }
  report(bad === 0, `${checked} random moments in ${locations.length} places (${inside} inside Shabbat/Yom Tov): same answer as hebcal's isAssurBemlacha()`);
}

// 5. Fixed cases, so a regression is easy to read. Tel Aviv uses the default ('strict') rounding.
{
  const tlv = Shabbat.create('tel-aviv'), ams = Shabbat.create('amsterdam');
  const at = (S, iso) => S.status(Date.parse(iso));
  const cases = [
    [tlv, '2026-10-03T19:06:00+03:00', 'out', 'Shabbat + Shmini Atzeret, 6 minutes after it ended'],
    [tlv, '2026-10-03T18:59:00+03:00', 'in', 'one minute before the end'],
    [tlv, '2026-10-02T18:03:00+03:00', 'none', 'Friday, a minute before candle lighting'],
    [tlv, '2026-10-02T18:04:00+03:00', 'in', 'Friday, candle lighting'],
    [tlv, '2026-10-04T10:00:00+03:00', 'none', 'Sunday morning'],
    [tlv, '2026-09-21T12:00:00+03:00', 'in', 'Yom Kippur, a Monday'],
    [ams, '2026-10-04T12:00:00+02:00', 'in', 'Amsterdam, Simchat Torah (second day abroad, still Yom Tov)'],
  ];
  for (const [S, iso, state, what] of cases) {
    const got = at(S, iso).state;
    report(got === state, `${S.place.name.padEnd(9)} ${iso}  ${state.padEnd(4)}  ${what}${got === state ? '' : '  (got ' + got + ')'}`);
  }
  const s = at(tlv, '2026-10-03T12:00:00+03:00'), p = s.period;
  report(clock(p.start) === '2026-10-02 18:04' && clock(p.end) === '2026-10-03 19:00' &&
         p.names.join('|') === 'Shabbat|Shmini Atzeret / Simchat Torah' && p.hasShabbat && p.hasYomTov &&
         s.untilEnd === p.end - Date.parse('2026-10-03T12:00:00+03:00') && p.items[1].he === 'שמיני עצרת / שמחת תורה',
         `period: ${clock(p.start)} -> ${clock(p.end)}  ${p.names.join(' + ')}  (${(s.untilEnd / 3600000).toFixed(2)} h to go)`);
  const a = at(ams, '2026-10-03T12:00:00+02:00').period;
  report(clock(a.start, 'Europe/Amsterdam').startsWith('2026-10-02') && clock(a.end, 'Europe/Amsterdam').startsWith('2026-10-04') &&
         a.names.join('|') === 'Shabbat|Shmini Atzeret|Simchat Torah' && a.days.length === 2 && a.days[1].items[0].id === 'simchat-torah',
         `Amsterdam: ${clock(a.start, 'Europe/Amsterdam')} -> ${clock(a.end, 'Europe/Amsterdam')}  ${a.names.join(' + ')} (one unbroken period)`);
  let threw = false;
  try { Shabbat.create({ name: 'Nowhere', lat: 90, lon: 0, tz: 'UTC', israel: false }).status(Date.UTC(2026, 5, 20)); } catch (e) { threw = true; }
  report(threw, 'no sunset at the pole: status() throws instead of returning nonsense');
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
