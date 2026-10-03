# shabos

**Has Shabbat ended in Tel Aviv?** One static page: <https://erezu1.github.io/shabos/>

| It is… | The page says | And under it |
|---|---|---|
| Shabbat or a holiday where work is forbidden, still on (from candle lighting) | **no** | `IN` · which one · when it began, when it ends, how long to go |
| It ended earlier today, after nightfall | **yes** | `OUT` · which one · when it ended, how long ago |
| Neither | **not shabat** | `NEXT` · the next one and when it starts |

Holidays are the days on which work is forbidden: Rosh Hashana, Yom Kippur, Sukkot, Shmini Atzeret / Simchat Torah, Pesach (first and seventh days), Shavuot. Back-to-back days (a holiday on Friday, then Shabbat) are one unbroken period. The page works in Tel Aviv time wherever you open it.

The gear button has the settings, kept in a cookie on the device: **place** (Tel Aviv by default; Jerusalem, Haifa, Be'er Sheva, Amsterdam, London, New York), **holidays** (Israel, or Diaspora with second days) and **Rabbeinu Tam** (off by default: the end is then 72 minutes after sunset).

## How the times are worked out

On the device, with no network. Shabbat and holiday times are pure astronomy and calendar arithmetic, so there is nothing to fetch and nothing to go stale:

| | network | works offline | goes stale | weight |
|---|---|---|---|---|
| ask a site's API on every visit | a request per visit, a third party that can be down | no | no | tiny |
| ship a table of times | none | yes | yes, it runs out | tens of KB |
| **work it out on the device** (this) | none | yes | never | 11 KB gzipped, the whole page |

[`shabbat.js`](shabbat.js) is the NOAA / Meeus sun position (the form hebcal uses) plus the Hebrew calendar (Reingold & Dershowitz), with no dependencies.

**The rules** (the default `strict` style, which follows how yeshiva.org.il publishes Tel Aviv):

- candle lighting: sunset as seen from the place's elevation, rounded down to the minute, minus the place's minutes (20 in Tel Aviv, 40 Jerusalem, 30 Haifa, 18 abroad) and one more minute;
- the end: the sun 8.5° below the horizon (three small stars), always rounded **up** to the next minute (or 72 minutes after sunset for Rabbeinu Tam);
- the other style, `hebcal`, is exactly hebcal.com's calendar: sea-level sunset cut to the minute, nightfall to the nearest minute. It can show the end a minute earlier than `strict`.

There is no single official source; the sites differ by up to a minute because they round differently. Rounding the end up is also the safe direction for "is it over?".

## How it was checked

- **hebcal library** (`npm test`, [`test/verify.mjs`](test/verify.mjs)): for Tel Aviv every day 2024-2099, and 11 other places in Israel and abroad 2024-2040: the sun is identical to the second, the `hebcal` style gives hebcal's minutes, every Shabbat and holiday period starts and ends exactly as in hebcal's calendar (Israel and Diaspora, 109,938 days of 1900-2200 for the holiday dates), and "is it on right now?" agrees with hebcal's `isAssurBemlacha()` at 35,000 random moments. Run under five machine time zones.
- **hebcal.com website** (its public REST API, Tel Aviv, 2026-2027): all 110 Havdalah times and all 112 candle lightings identical to the `hebcal` style (its two second-night Rosh Hashana lightings, after nightfall, set aside). Against the default `strict` style every time is within a minute.
- **yeshiva.org.il**, Tel Aviv, Hebrew year 5787 (12 Sep 2026 to 25 Sep 2027, 60 Shabbat and holiday days), compared once by hand: the same end of Shabbat on **59 of 59** rows, the same candle lighting on 58 of 59 and the same Rabbeinu Tam end on 58 of 59. The rest are a minute off. The table is theirs, so it is not in this repo. One Jerusalem Shabbat checked too: end and Rabbeinu Tam the same, candle lighting a minute earlier than theirs.
- **US Naval Observatory** (its sunrise and sunset API), 12 dates across the year: sunset and the 6°-below-horizon time within 29 seconds, which is their own whole-minute rounding.

To compare any other site: put its times in a CSV and run `node test/compare-csv.mjs times.csv tel-aviv` (format at the top of [`test/compare-csv.mjs`](test/compare-csv.mjs)).

## Using it from code

```js
const tlv = Shabbat.create('tel-aviv');            // a preset, or a place object (below)
const s = tlv.status(Date.now());

s.state;                  // 'in' | 'out' | 'none'
s.period.names;           // ['Shabbat', 'Shmini Atzeret / Simchat Torah']: which one it is, or was
s.period.items;           // the same with ids, Hebrew names, kind ('shabbat' | 'yomtov')
s.period.start;           // candle lighting, ms since the epoch
s.period.end;             // Havdalah
s.untilEnd;               // ms until it ends (negative once it has); s.untilStart likewise
s.upcoming;               // the next three periods
```

A place is `{ name, lat, lon, tz, israel, elevation, candleMinutes, havdalahDegrees | havdalahMinutes, style }`, so another location is one line:

```js
Shabbat.create({ name: 'Safed', lat: 32.96, lon: 35.5, tz: 'Asia/Jerusalem', israel: true, candleMinutes: 20 });
```

Add it to `PLACES` in `shabbat.js` and it appears in the settings. Places abroad use the sea-level sunset by default (`elevation` 0). Only Tel Aviv was calibrated against yeshiva.org.il; other places use the same rules unchecked.

`?now=2026-10-03T19:06:00+03:00` on the page pretends it is that moment, to preview each state.

## Files

- `index.html`: the page
- `shabbat.js`: the times, holidays and state, no dependencies
- `test/verify.mjs`: checks against the hebcal library (`npm install && npm test`)
- `test/compare-csv.mjs`: checks against a table copied from any website
