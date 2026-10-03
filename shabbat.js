/*!
 * Shabbat and Yom Tov times for any place. Runs on the device: no network, no dependencies.
 *
 *   const tlv = Shabbat.create('tel-aviv');            // a preset, or your own place (below)
 *   const s = tlv.status(Date.now());
 *
 *   s.state       'in'    inside Shabbat / Yom Tov (candle lighting up to Havdalah)
 *                 'out'   one ended earlier today (the place's calendar day)
 *                 'none'  neither; s.period is then the next one
 *   s.period      the one that is on, that just ended, or that comes next:
 *                   start, end            instants in ms: candle lighting, Havdalah
 *                   names                 ['Shabbat', 'Shmini Atzeret / Simchat Torah']
 *                   items                 the same with ids, Hebrew names and kind ('shabbat' | 'yomtov')
 *                   days                  [{ day, items }] for each rest day, with the day of the festival
 *                   segments              the same period cut into runs of one kind (below)
 *                   hasShabbat, hasYomTov
 *   s.untilEnd    ms until it ends (negative once it has);  s.untilStart  ms until it starts
 *   s.upcoming    the periods after that one (default three)
 *   s.kind        'shabbat' or 'chag': what a question about "it" should be about (below)
 *   s.segment     that run: { kind, first, last, start, end, items, names, days }
 *
 * A Saturday is Shabbat even when it is also a holiday; any other rest day is a holiday ('chag'). A period is cut
 * into runs of one kind: Shabbat hands over to a holiday when Shabbat ends, and a holiday to Shabbat at Friday's
 * candle lighting. s.segment is the run that is on now, the last one once the period has ended, and the first one
 * while the period is still to come, so the question is always about the current, or else the last, or else the next.
 *
 * A "period" runs from candle lighting on the evening before the first rest day (Shabbat or Yom Tov) to
 * Havdalah on the last day of an unbroken run, so Yom Tov followed by Shabbat is one period.
 *
 * A place is { name, lat, lon, tz,            degrees (north / east positive) and an IANA time zone
 *              israel,                         true: one-day Yom Tov (Israel). false: second days too (Diaspora)
 *              elevation,                      metres above sea level, used by the 'strict' style (default 0)
 *              candleMinutes,                  before sunset; default 20 in Israel, 18 elsewhere
 *              havdalahDegrees  or             the end: sun this far below the horizon (default 8.5, three small stars)
 *              havdalahMinutes,                or this long after sunset (42, 50, 72 for Rabbeinu Tam ...)
 *              style }                         'strict' (default) or 'hebcal'
 *
 * The style says how the exact sun becomes the minute that gets published:
 *   'strict'  as yeshiva.org.il publishes Tel Aviv: sunset as seen from `elevation`, candle lighting one minute earlier
 *             than sunset minus candleMinutes, the end always rounded up. Against its Tel Aviv table for Hebrew year 5787
 *             (elevation 15) it gives the same end time on 59 of 59 rows, the same start on 58 of 59 and the same Rabbeinu
 *             Tam end on 58 of 59; the rest are a minute off. Other places use the same rules but are not checked.
 *   'hebcal'  exactly as hebcal.com's calendars: sea-level sunset cut to the minute, nightfall to the nearest minute.
 *
 * The sun is the NOAA / Meeus equations in the two-pass form hebcal uses. test/verify.mjs checks it, the holidays and
 * the whole periods against the hebcal library for places in Israel and abroad (Tel Aviv for every day of 2024-2099).
 */
(function (root) {
  'use strict';

  const MIN = 60000, DAY = 86400000;
  const floorMin = ms => Math.floor(ms / MIN) * MIN;
  const ceilMin = ms => Math.ceil(ms / MIN) * MIN;
  const roundMin = ms => Math.floor(ms / MIN + 0.5) * MIN;
  const END_SLACK = 1500;                              // 'strict': ms of grace before rounding the end up, calibrated on yeshiva.org.il
  const rad = d => d * Math.PI / 180;
  const deg = r => r * 180 / Math.PI;

  // ---- the sun -------------------------------------------------------------------------------------
  // t = Julian centuries since J2000  ->  [declination in degrees, equation of time in minutes]
  function sun(t) {
    const L0 = (((280.46646 + t * (36000.76983 + 0.0003032 * t)) % 360) + 360) % 360;
    const M = rad(357.52911 + t * (35999.05029 - 0.0001537 * t));
    const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
    const C = Math.sin(M) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
              Math.sin(2 * M) * (0.019993 - 0.000101 * t) + Math.sin(3 * M) * 0.000289;
    const om = rad(125.04 - 1934.136 * t);
    const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(om);
    const eps = rad(23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60 +
                    0.00256 * Math.cos(om));
    const decl = deg(Math.asin(Math.sin(eps) * Math.sin(rad(lambda))));
    const y = Math.tan(eps / 2) ** 2, l0 = rad(L0);
    const eq = y * Math.sin(2 * l0) - 2 * e * Math.sin(M) + 4 * e * y * Math.sin(M) * Math.cos(2 * l0) -
               0.5 * y * y * Math.sin(4 * l0) - 1.25 * e * e * Math.sin(2 * M);
    return [decl, deg(eq) * 4];
  }
  const centuries = jd => (jd - 2451545) / 36525;

  function solarNoon(jd, lonW) {                      // minutes after 0h UTC
    const noon = 720 + lonW * 4 - sun(centuries(jd + lonW / 360))[1];
    return 720 + lonW * 4 - sun(centuries(jd - 0.5 + noon / 1440))[1];
  }

  // Minutes after 0h UTC of Julian day `jd` (0h UT) at which the sun, going down, reaches the zenith angle
  // `zenith`. lonW is degrees west. NaN if it never does (far north in summer).
  function settingMinutes(jd, lat, lonW, zenith) {
    const pass = at => {
      const [decl, eq] = sun(centuries(at));
      const ha = Math.acos(Math.cos(rad(zenith)) / (Math.cos(rad(lat)) * Math.cos(rad(decl))) -
                           Math.tan(rad(lat)) * Math.tan(rad(decl)));
      return 720 + 4 * (lonW + deg(ha)) - eq;
    };
    return pass(jd + pass(jd + solarNoon(jd, lonW) / 1440) / 1440);
  }
  const SUNSET_ZENITH = 90 + 16 / 60 + 34 / 60;        // the sun's radius plus refraction
  const dipOf = metres => deg(Math.acos(6356.9 / (6356.9 + metres / 1000)));   // how much further the horizon drops

  // ---- the calendar --------------------------------------------------------------------------------
  // Day number of Rosh Hashana of Hebrew year y (Reingold & Dershowitz, "Calendrical Calculations").
  // Days are "epoch days": whole days since 1970-01-01.
  const elapsed = y => {
    const m = Math.floor((235 * y - 234) / 19);
    const d = 29 * m + Math.floor((12084 + 13753 * m) / 25920);
    return (3 * (d + 1)) % 7 < 3 ? d + 1 : d;
  };
  const roshHashana = y => {
    const e = elapsed(y);
    const fix = elapsed(y + 1) - e === 356 ? 2 : e - elapsed(y - 1) === 382 ? 1 : 0;
    return -1373427 - 719163 + e + fix;               // Hebrew epoch minus Unix epoch, in days
  };

  const NAMES = {
    'shabbat': ['Shabbat', 'שבת'],
    'rosh-hashana': ['Rosh Hashana', 'ראש השנה'],
    'yom-kippur': ['Yom Kippur', 'יום הכיפורים'],
    'sukkot': ['Sukkot', 'סוכות'],
    'shmini-atzeret': ['Shmini Atzeret', 'שמיני עצרת'],
    'simchat-torah': ['Simchat Torah', 'שמחת תורה'],
    'pesach': ['Pesach', 'פסח'],
    'shavuot': ['Shavuot', 'שבועות']
  };
  const ISRAEL_NAMES = { 'shmini-atzeret': ['Shmini Atzeret / Simchat Torah', 'שמיני עצרת / שמחת תורה'] };

  // Days when work is forbidden: [anchor, days from it, festival, day of the festival, kept in Israel?].
  // Anchor 'rh' is Rosh Hashana of the Hebrew year, 'next' that of the following year; from 1 Nisan to the next
  // Rosh Hashana it is always 177 days, which pins down the spring festivals.
  const YOM_TOV = [
    ['rh', 0, 'rosh-hashana', 1, true], ['rh', 1, 'rosh-hashana', 2, true],
    ['rh', 9, 'yom-kippur', 1, true],
    ['rh', 14, 'sukkot', 1, true], ['rh', 15, 'sukkot', 2, false],
    ['rh', 21, 'shmini-atzeret', 1, true], ['rh', 22, 'simchat-torah', 1, false],
    ['next', -163, 'pesach', 1, true], ['next', -162, 'pesach', 2, false],
    ['next', -157, 'pesach', 7, true], ['next', -156, 'pesach', 8, false],
    ['next', -113, 'shavuot', 1, true], ['next', -112, 'shavuot', 2, false]
  ];

  const festivalCache = new Map();
  function festivals(Y, israel) {                     // Map(day -> [festival, day of the festival])
    const key = Y + (israel ? 'i' : 'd');
    let m = festivalCache.get(key);
    if (!m) {
      const rh = roshHashana(Y), next = roshHashana(Y + 1);
      m = new Map();
      for (const [anchor, off, id, n, inIsrael] of YOM_TOV) {
        if (inIsrael || !israel) m.set((anchor === 'rh' ? rh : next) + off, [id, n]);
      }
      festivalCache.set(key, m);
    }
    return m;
  }

  const weekday = day => (((day + 4) % 7) + 7) % 7;   // 0 = Sunday ... 6 = Saturday
  function makeItem(id, n, israel) {
    const names = (israel && ISRAEL_NAMES[id]) || NAMES[id];
    return { id, en: names[0], he: names[1], kind: id === 'shabbat' ? 'shabbat' : 'yomtov', day: n };
  }
  function itemsOn(day, israel) {                     // [] on an ordinary day
    const items = [];
    if (weekday(day) === 6) items.push(makeItem('shabbat', null, israel));
    const g = new Date(day * DAY).getUTCFullYear();
    for (const Y of [g + 3760, g + 3761]) {
      const f = festivals(Y, israel).get(day);
      if (f) items.push(makeItem(f[0], f[1], israel));
    }
    return items;
  }

  // ---- places --------------------------------------------------------------------------------------
  // Coordinates and elevations are hebcal's. Israeli places use their elevation (as yeshiva.org.il does for
  // Tel Aviv and Jerusalem); abroad the sea-level sunset is the usual practice.
  // `name` is English and `nameHe` Hebrew; add both for a new place.
  const PLACES = {
    'tel-aviv':   { name: 'Tel Aviv',    nameHe: 'תל אביב',   lat: 32.08088, lon: 34.78057,  tz: 'Asia/Jerusalem',   israel: true,  elevation: 15,  candleMinutes: 20 },
    'jerusalem':  { name: 'Jerusalem',   nameHe: 'ירושלים',   lat: 31.76904, lon: 35.21633,  tz: 'Asia/Jerusalem',   israel: true,  elevation: 786, candleMinutes: 40 },
    'haifa':      { name: 'Haifa',       nameHe: 'חיפה',      lat: 32.81841, lon: 34.9885,   tz: 'Asia/Jerusalem',   israel: true,  elevation: 40,  candleMinutes: 30 },
    'beer-sheva': { name: "Be'er Sheva", nameHe: 'באר שבע',   lat: 31.25181, lon: 34.7913,   tz: 'Asia/Jerusalem',   israel: true,  elevation: 285, candleMinutes: 20 },
    'amsterdam':  { name: 'Amsterdam',   nameHe: 'אמסטרדם',   lat: 52.37403, lon: 4.88969,   tz: 'Europe/Amsterdam', israel: false, candleMinutes: 18 },
    'london':     { name: 'London',      nameHe: 'לונדון',    lat: 51.50853, lon: -0.12574,  tz: 'Europe/London',    israel: false, candleMinutes: 18 },
    'new-york':   { name: 'New York',    nameHe: 'ניו יורק',  lat: 40.71427, lon: -74.00597, tz: 'America/New_York', israel: false, candleMinutes: 18 }
  };

  function normalize(place) {
    const p = typeof place === 'string' ? PLACES[place] : place;
    if (!p || !isFinite(p.lat) || !isFinite(p.lon) || !p.tz) throw new Error('a place needs lat, lon and tz (or use a preset name)');
    const israel = !!p.israel;
    const byMinutes = p.havdalahMinutes != null;
    const q = {
      name: p.name || 'here', nameHe: p.nameHe || p.name || 'here', lat: +p.lat, lon: +p.lon, tz: p.tz, israel,
      elevation: p.elevation != null ? +p.elevation : 0,
      candleMinutes: p.candleMinutes != null ? +p.candleMinutes : israel ? 20 : 18,
      havdalahDegrees: byMinutes ? null : p.havdalahDegrees != null ? +p.havdalahDegrees : 8.5,
      havdalahMinutes: byMinutes ? +p.havdalahMinutes : null,
      style: p.style || 'strict'
    };
    if (q.style !== 'strict' && q.style !== 'hebcal') throw new Error("style must be 'strict' or 'hebcal'");
    new Intl.DateTimeFormat('en', { timeZone: q.tz });  // throws for an unknown time zone
    return Object.freeze(q);
  }

  function create(place) {
    const P = normalize(place);
    const strict = P.style === 'strict';
    const lonW = -P.lon;                              // the sun maths counts longitude positive to the west
    const sunsetZenith = SUNSET_ZENITH + (strict ? dipOf(P.elevation) : 0);
    const cache = new Map();
    const memo = (key, fn) => {
      let v = cache.get(key);
      if (v === undefined) cache.set(key, v = fn());
      return v;
    };

    const dateParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: P.tz, calendar: 'gregory', numberingSystem: 'latn', year: 'numeric', month: 'numeric', day: 'numeric'
    });
    function civilDay(ms) {                           // the place's calendar day of an instant
      const p = {};
      for (const { type, value } of dateParts.formatToParts(ms)) p[type] = value;
      return Date.UTC(+p.year, +p.month - 1, +p.day) / DAY;
    }

    const eventMs = (day, zenith) => day * DAY + Math.trunc(settingMinutes(day + 2440587.5, P.lat, lonW, zenith) * MIN);
    const sunset = day => memo('s' + day, () => eventMs(day, sunsetZenith));
    const nightfall = day => memo('n' + day, () => P.havdalahMinutes != null
      ? sunset(day) + P.havdalahMinutes * MIN
      : eventMs(day, 90 + P.havdalahDegrees));
    const candleLighting = day => floorMin(sunset(day)) - (P.candleMinutes + (strict ? 1 : 0)) * MIN;
    const havdalah = day => strict
      ? ceilMin(nightfall(day) + (P.havdalahMinutes != null ? 0 : END_SLACK))   // the grace is for the sun's angle only
      : roundMin(nightfall(day));

    const items = day => memo('i' + day, () => itemsOn(day, P.israel));

    const distinct = days => {                        // the items of some days, each once, in order
      const seen = new Map();
      for (const d of days) for (const it of d.items) if (!seen.has(it.id)) seen.set(it.id, it);
      return [...seen.values()];
    };

    function periodAround(day) {                      // the unbroken run of rest days that includes `day`
      let first = day, last = day;
      while (items(first - 1).length) first--;
      while (items(last + 1).length) last++;
      const days = [];
      for (let d = first; d <= last; d++) days.push({ day: d, items: items(d) });
      const start = candleLighting(first - 1), end = havdalah(last);
      if (!isFinite(start) || !isFinite(end)) throw new Error('no sunset or nightfall in ' + P.name + ' on that day');

      // runs of one kind. Shabbat hands over to a holiday when it ends, a holiday to Shabbat at Friday's candle lighting
      const segments = [];
      for (const d of days) {
        const kind = weekday(d.day) === 6 ? 'shabbat' : 'chag', prev = segments[segments.length - 1];
        if (prev && prev.kind === kind) { prev.last = d.day; prev.days.push(d); }
        else segments.push({ kind, first: d.day, last: d.day, days: [d] });
      }
      segments.forEach((s, i) => {
        s.start = i === 0 ? start : s.kind === 'shabbat' ? candleLighting(s.first - 1) : havdalah(segments[i - 1].last);
      });
      segments.forEach((s, i) => {
        s.end = i + 1 < segments.length ? segments[i + 1].start : end;
        s.items = distinct(s.days);
        s.names = s.items.map(it => it.en);
      });

      const list = distinct(days);
      return {
        first, last, start, end, days, segments, items: list, names: list.map(i => i.en),
        hasShabbat: list.some(i => i.id === 'shabbat'), hasYomTov: list.some(i => i.kind === 'yomtov')
      };
    }
    function nextPeriod(day) {                        // the one that includes `day`, or else the next to come
      while (!items(day).length) day++;
      return periodAround(day);
    }

    function status(nowMs, howManyUpcoming = 3) {
      const today = civilDay(nowMs);
      const period = nextPeriod(today);
      let state;
      if (period.first <= today) state = nowMs < period.end ? 'in' : 'out';
      else state = nowMs >= period.start ? 'in' : 'none';
      const upcoming = [];
      for (let p = period; upcoming.length < howManyUpcoming;) upcoming.push(p = nextPeriod(p.last + 1));
      const segs = period.segments;                   // the one on now, else the last (it ended), else the first (to come)
      const segment = state === 'none' ? segs[0]
        : state === 'out' ? segs[segs.length - 1]
        : segs.find(s => nowMs >= s.start && nowMs < s.end) || segs[segs.length - 1];
      return {
        state, kind: segment.kind, segment, now: nowMs, today, period, upcoming,
        untilStart: period.start - nowMs, untilEnd: period.end - nowMs
      };
    }

    return { place: P, status, civilDay, nextPeriod, periodAround, itemsOn: items, sunset, nightfall, candleLighting, havdalah };
  }

  const api = { create, PLACES, roshHashana };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Shabbat = api;
})(typeof self !== 'undefined' ? self : this);
