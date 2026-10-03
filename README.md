# Is it over? · האם יצאה שבת?

**Has Shabbat, or the holiday, ended in Tel Aviv?** One static page, in Hebrew (the default, right to left) and English: <https://erezu1.github.io/isitover/>

| It is… | Hebrew | English | And under it |
|---|---|---|---|
| Shabbat or a holiday where work is forbidden, still on (from candle lighting) | **לא** | **no** | `בתוקף` / `IN` · which one · when it began, when it ends, how long to go |
| It ended earlier today, after nightfall | **כן** | **yes** | `יצאה` / `OUT` · which one · when it ended, how long ago |
| Neither | **לא** | **not shabat** | `תצא` / `NEXT` · the next one and when it starts |

Holidays are the days on which work is forbidden: Rosh Hashana, Yom Kippur, Sukkot, Shmini Atzeret, Pesach (first and seventh days), Shavuot (abroad, the second days too, and Simchat Torah is its own day). Back-to-back days (a holiday on Friday, then Shabbat) are one unbroken period. The page works in Tel Aviv time wherever you open it.

**The Hebrew title** asks about Shabbat while Shabbat is on (**האם יצאה שבת?**), and about the holiday once Shabbat is out but the holiday is still on (**האם יצא החג?**); otherwise it asks about the last one, or the next one if nothing has started. A Saturday that is also a holiday counts as Shabbat. The verbs in the line under the name, and in the tags for "ended" and "next", agree with it: feminine for Shabbat, masculine for a holiday. The tag for "on" is the neutral **בתוקף**. The English title is always "Is it over?" and its line talks about the whole period.

Switching language fades the words and buttons out, flips the language and direction while they are invisible, and fades them back in. Buttons at the top (the top right in English, the top left in Hebrew, since the whole layout mirrors), two of them opening a panel that fades in and out:

- **?** explains how the times are worked out, with the numbers for the period on the page;
- **gear** has the settings, kept in a cookie on the device: **language** (Hebrew by default), **place** (Tel Aviv by default; Petah Tikva, Jerusalem, Haifa, Be'er Sheva, Amsterdam, London, New York) and **holidays** (Israel, or Diaspora with second days; in Hebrew **ארץ ישראל** or **גלויות**).

**Install button.** Between the **?** and the gear: it installs the page as an app. Chrome and Edge show their own prompt; where there is none (Safari, Firefox, or a browser that has not offered one yet) it opens the card with the steps (on iOS: Share, then Add to Home Screen; elsewhere: the browser's menu). It is there whenever the page is not running as the installed app, and a browser tab cannot tell that the app is already installed, so there it may still show.

**As an app.** The page installs (Chrome: Install; Safari on iOS: Share, then Add to Home Screen), opens on its own with its icon, a red no-sign with a black ש (David Libre Bold, on top of the bar), and opens with no network once it has been opened with one. [`sw.js`](sw.js) keeps the page, its two scripts and its icons on the device. The page is asked for fresh every time, so an update arrives at once; if the network fails, answers with an error or takes more than 3 seconds, the kept copy is shown. A script is kept by its hash (`?v=`), so a kept copy is always the right one, and the old copy goes when a new hash arrives. The icons are drawn by [`tools/icons.mjs`](tools/icons.mjs) (`npm install --no-save @resvg/resvg-js`, then `node tools/icons.mjs`): a round one for the browser tab, a cream rounded one for "any", a full-bleed one for "maskable" with the sign inside the circle every launcher keeps, and the opaque 180 px one iOS wants. On a phone that can install it, a card slides up after a few seconds: Chrome gets an Install button that opens its own prompt, Safari on iOS gets the steps (Share, then Add to Home Screen). Not now keeps it quiet for two weeks; the install button by the settings works any time. `?install=ios`, `?install=android` or `?install=menu` shows the card on any device, to preview it. On iOS the home-screen app has its own cookies, so its settings are set there once.

## How the times are worked out

On the device, with no network. Shabbat and holiday times are pure astronomy and calendar arithmetic, so there is nothing to fetch and nothing to go stale:

| | network | works offline | goes stale | weight |
|---|---|---|---|---|
| ask a site's API on every visit | a request per visit, a third party that can be down | no | no | tiny |
| ship a table of times | none | yes | yes, it runs out | tens of KB |
| **work it out on the device** (this) | none | yes | never | about 60 KB gzipped, fonts included |

[`shabbat.js`](shabbat.js) is the NOAA / Meeus sun position (the form hebcal uses) plus the Hebrew calendar (Reingold & Dershowitz), with no dependencies.

**The rules** (the default `strict` style, which follows how yeshiva.org.il publishes Tel Aviv):

- candle lighting: sunset as seen from the place's elevation, rounded down to the minute, minus the place's minutes (20 in Tel Aviv, 40 Jerusalem, 30 Haifa, 18 abroad) and one more minute;
- the end: the sun 8.5° below the horizon (three small stars), always rounded **up** to the next minute;
- the other style, `hebcal`, is exactly hebcal.com's calendar: sea-level sunset cut to the minute, nightfall to the nearest minute. It can show the end a minute earlier than `strict`.

There is no single official source; the sites differ by up to a minute because they round differently. Rounding the end up is also the safe direction for "is it over?".

## How it was checked

- **hebcal library** (`npm test`, [`test/verify.mjs`](test/verify.mjs)): for Tel Aviv every day 2024-2099, and 12 other places in Israel and abroad 2024-2040: the sun is identical to the second, the `hebcal` style gives hebcal's minutes, every Shabbat and holiday period starts and ends exactly as in hebcal's calendar (Israel and Diaspora, 109,938 days of 1900-2200 for the holiday dates), and "is it on right now?" agrees with hebcal's `isAssurBemlacha()` at 35,000 random moments. Run under five machine time zones. The Shabbat / holiday runs the Hebrew title depends on are checked on Rosh Hashana, Shavuot and every period 2024-2099.
- **hebcal.com website** (its public REST API, Tel Aviv, 2026-2027): all 110 Havdalah times and all 112 candle lightings identical to the `hebcal` style (its two second-night Rosh Hashana lightings, after nightfall, set aside). Against the default `strict` style every time is within a minute.
- **yeshiva.org.il**, Tel Aviv, Hebrew year 5787 (12 Sep 2026 to 25 Sep 2027, 60 Shabbat and holiday days), compared once by hand: the same end of Shabbat on **59 of 59** rows and the same candle lighting on 58 of 59. The rest are a minute off. The same table's Rabbeinu Tam column (`havdalahMinutes: 72` in the code, not offered on the page) matches on 58 of 59. The table is theirs, so it is not in this repo. One Jerusalem Shabbat checked too: end and Rabbeinu Tam the same, candle lighting a minute earlier than theirs.
- **US Naval Observatory** (its sunrise and sunset API), 12 dates across the year: sunset and the 6°-below-horizon time within 29 seconds, which is their own whole-minute rounding.
- **the text** (`npm test`, [`test/i18n.mjs`](test/i18n.mjs)): both languages have the same keys and `{placeholders}`, every key the page uses exists, the Hebrew verb forms, plurals and "ו-17 דקות" come out right, every place and holiday has a Hebrew name, and the titles and answers only use letters the embedded display fonts contain.
- **the app** (`npm test`, [`test/pwa.mjs`](test/pwa.mjs)): the manifest and every icon in it (size and type as claimed; the maskable and iOS icons opaque, and the drawing in the maskable ones inside the safe zone), the links and meta tags in `index.html`, and `sw.js` run against a fake network and cache: it keeps the page and its scripts, shows them offline, takes an update at once, drops a script when a new hash arrives, and falls back to the kept page when the network hangs or answers with an error. Also tried by hand: installed on localhost, server stopped, page reloaded: it opens.

To compare any other site: put its times in a CSV and run `node test/compare-csv.mjs times.csv tel-aviv` (format at the top of [`test/compare-csv.mjs`](test/compare-csv.mjs)).

## Adding UI text, or a language

All the page's text lives in [`i18n.js`](i18n.js), one key per string, the same keys in both languages.

1. Add the key to **both** `EN` and `HE`: a string with `{placeholders}`, or a function when the grammar needs logic (the Hebrew detail lines pick their verbs by `kind`).
2. In `index.html` put `data-i18n="your.key"` on the element, or `data-i18n-attr="title:your.key,aria-label:your.key"` for attributes. From the script use `L.t('your.key', { name: value })`, or `L.h(...)` for the help text, which is HTML.
3. `npm test` fails if a language lacks the key, if a `{placeholder}` differs, or if a title or answer needs a letter the display fonts do not have.
4. After changing `i18n.js` or `shabbat.js` run `npm run stamp`. It puts the hash of each file in its `<script src="...?v=hash">` in `index.html`: GitHub Pages lets a browser keep a file for 10 minutes, and a new address makes it fetch the new script at once. `npm test` fails while the stamp is out of date.

Styles use logical properties (`inset-inline-end`, `padding-inline-start`, `text-align: start`), so right to left is the exact mirror of left to right; Hebrew-only tweaks (no capitals, no letter spacing) sit under `:lang(he)`. A new language is a new entry in `LANGS` with `dir`, `locale`, its strings and a `format` function for times, dates and durations.

**Fonts**, all embedded in `index.html`, so there is no network request and it works offline:

- The big answer and the title use a display font: **Syne ExtraBold** for English and **Rubik Black** for Hebrew, cut down to their letters (Latin letters, and Hebrew letters with the space and punctuation), about 10 KB in all. The answer shrinks to fit the screen.
- The small texts (everything else, both languages) use **IBM Plex Sans Hebrew**, Regular and SemiBold (a bold request gets the SemiBold), with one face for the Latin letters and one for the Hebrew: about 27 KB, cut down to ASCII plus ` ° · × – — ’ “ ” … −` and the Hebrew letters, maqaf, geresh and gershayim. The `unicode-range` lines in the four `@font-face` rules are exactly what the files were cut to, and `npm test` fails if any text the page can show (the strings, place and holiday names, formatted times, dates and durations, in both languages) needs a character outside them, since it would quietly fall back to the system font.
- To cut a font again (a new character, or another font): `subset-font` (with `targetFormat: 'woff2'` and `keepFeatures: ['kern', 'liga', 'ccmp', 'locl', 'mark', 'mkmk', 'rlig', 'calt']`) on the `latin` and `hebrew` woff2 files of the `@fontsource` package, with the characters in the `unicode-range` as the text; then base64 into the `@font-face` rules and update the ranges.
- The ש in the app icon is David Libre Bold, outlined (see `tools/icons.mjs`).

Licenses are in `fonts/`.

## Using it from code

```js
const tlv = Shabbat.create('tel-aviv');            // a preset, or a place object (below)
const s = tlv.status(Date.now());

s.state;                  // 'in' | 'out' | 'none'
s.kind;                   // 'shabbat' | 'chag': what a question about it should be about
s.segment;                // that run of days: { kind, start, end, names, items, days }
s.period.names;           // ['Shabbat', 'Shmini Atzeret']: which one it is, or was
s.period.items;           // the same with ids, Hebrew names, kind ('shabbat' | 'yomtov')
s.period.start;           // candle lighting, ms since the epoch
s.period.end;             // Havdalah
s.period.segments;        // the period cut into runs of Shabbat and holiday days
s.untilEnd;               // ms until it ends (negative once it has); s.untilStart likewise
s.upcoming;               // the next three periods
```

A place is `{ name, nameHe, lat, lon, tz, israel, elevation, candleMinutes, havdalahDegrees | havdalahMinutes, style }`, so another location is one line:

```js
Shabbat.create({ name: 'Safed', nameHe: 'צפת', lat: 32.96, lon: 35.5, tz: 'Asia/Jerusalem', israel: true, candleMinutes: 20 });
```

Add it to `PLACES` in `shabbat.js` and it appears in the settings. `havdalahMinutes: 72` gives the Rabbeinu Tam end. Places abroad use the sea-level sunset by default (`elevation` 0). Only Tel Aviv was calibrated against yeshiva.org.il; other places use the same rules unchecked.

`?now=2026-10-03T19:06:00+03:00` on the page pretends it is that moment, to preview each state.

## Files

- `index.html`: the page (markup, styles, the settings, the "?" panel, the install card, the embedded fonts)
- `shabbat.js`: the times, holidays, runs and state, no dependencies
- `i18n.js`: the text in Hebrew and English, and the grammar and formatting each needs
- `manifest.webmanifest`, `sw.js`, `icons/`: the app: its name and icons, the offline service worker, the icon files
- `tools/icons.mjs`: draws the icons (SVG and PNG); `tools/stamp.mjs`: puts the script hashes in `index.html` (`npm run stamp`)
- `test/verify.mjs`: checks against the hebcal library (`npm install && npm test`)
- `test/i18n.mjs`: checks the text, the Hebrew grammar and the fonts' letters
- `test/pwa.mjs`: checks the manifest, the icons, the links and the service worker
- `test/compare-csv.mjs`: checks against a table copied from any website
- `fonts/`: licenses of the fonts (display, text, and the icon's ש), all SIL Open Font License 1.1
