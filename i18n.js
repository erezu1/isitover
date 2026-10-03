/*!
 * The page's text in Hebrew and English, with the grammar and formatting each language needs.
 *
 * To add a piece of UI text:
 *   1. add the same key to BOTH languages below (a string with {placeholders}, or a function for grammar)
 *   2. in index.html put data-i18n="your.key" on the element, or data-i18n-attr="title:your.key,aria-label:your.key"
 *      for attributes, or call L.t('your.key', { name: value }) from the script (L.h for the help text, which is HTML)
 * `npm test` fails when a key is missing from a language, when the {placeholders} differ between the languages,
 * or when a title or answer uses a letter the embedded display fonts do not contain.
 *
 *   const L = I18N.create('he');            // 'he' (the default) or 'en'
 *   L.t('settings.title')                   // 'הגדרות'
 *   L.dir, L.code, L.segmented              // 'rtl', 'he', true
 *   const f = L.format('Asia/Jerusalem');   // times, dates, "today 19:00", "in 30 min" in this language
 *
 * `segmented` is whether the status line talks about the Shabbat or the holiday the title asks about (Hebrew), or about
 * the whole period (English); see `segment` and `period` in shabbat.js.
 */
(function (root) {
  'use strict';

  const MIN = 60000, DAY = 86400000;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const raw = html => ({ html: String(html) });       // a parameter that is already HTML

  // ---- formatting both languages share ----------------------------------------------------------------
  const intl = (locale, tz, options) => new Intl.DateTimeFormat(locale, Object.assign({ timeZone: tz }, options));
  const CLOCK = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
  const SHORT_DAY = { weekday: 'short', day: 'numeric', month: 'short' };
  function base(locale, tz) {
    const t = intl(locale, tz, CLOCK), s = intl(locale, tz, Object.assign({ second: '2-digit' }, CLOCK));
    const d = intl(locale, tz, SHORT_DAY), u = intl(locale, 'UTC', SHORT_DAY);
    return {
      time: ms => t.format(ms),                       // 19:00
      seconds: ms => s.format(ms),                    // 19:00:21
      date: ms => d.format(ms),                       // Fri 9 Oct
      dayLabel: day => u.format(day * DAY)            // the same for an epoch day
    };
  }
  const coordsOf = (lat, lon, N, S, E, W) =>
    Math.abs(lat).toFixed(3) + '° ' + (lat >= 0 ? N : S) + ', ' + Math.abs(lon).toFixed(3) + '° ' + (lon >= 0 ? E : W);

  // ======================================================================================================
  // English
  // ======================================================================================================
  const EN = {
    'tool.help': 'How the times are worked out',
    'tool.settings': 'Settings',
    'common.close': 'Close',

    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.place': 'Place',
    'settings.holidays': 'Holidays',
    'settings.israel': 'Israel',
    'settings.israel.note': 'one day of Yom Tov',
    'settings.diaspora': 'Diaspora',
    'settings.diaspora.note': 'two days of Yom Tov',
    'settings.reset': 'Reset',
    'settings.done': 'Done',

    'title.shabbat': 'Is it over?',
    'title.chag': 'Is it over?',
    'answer.in': 'no',
    'answer.out': 'yes',
    'answer.none': 'not shabat',
    'tag.in.shabbat': 'IN', 'tag.in.chag': 'IN',
    'tag.out.shabbat': 'OUT', 'tag.out.chag': 'OUT',
    'tag.none.shabbat': 'NEXT', 'tag.none.chag': 'NEXT',
    'detail.in': 'Began {start} · ends {end} (in {left})',
    'detail.out': 'Ended {end} ({ago} ago)',
    'detail.none': 'Starts {start} (in {left}) · ends {end}',
    'clock': 'It’s {time} in {place}.',
    'sim': 'Simulated time: {when}',
    'error': 'This browser cannot work out the times ({message}).',

    'help.title': 'How the times are worked out',
    'help.intro': 'The page does the sums itself, on your device: the sun’s position and the Hebrew calendar. Nothing is sent anywhere, and it never goes out of date.',
    'help.settings.h': 'Your settings',
    'help.place': '<b>{place}</b>, {coords}, {height}.',
    'help.height.sea': 'at sea level',
    'help.height.up': '{m} m above sea level',
    'help.holidays.israel': 'Holidays as in Israel: one day of Yom Tov. Times are always in {place} time ({tz}), whatever your own clock says.',
    'help.holidays.diaspora': 'Holidays as in the Diaspora: two days of Yom Tov. Times are always in {place} time ({tz}), whatever your own clock says.',
    'help.answer.h': 'The answer',
    'help.answer.in': '<b>no</b> (<b>IN</b>): Shabbat or a holiday is on, from candle lighting until it ends.',
    'help.answer.out': '<b>yes</b> (<b>OUT</b>): it ended earlier today, after nightfall.',
    'help.answer.none': '<b>not shabat</b> (<b>NEXT</b>): neither is on, and the next one is shown.',
    'help.begins.h': 'When it begins',
    'help.begins': 'Shabbat and holidays begin at candle lighting. Sunset is when the sun’s upper edge meets the horizon, {from}{note}. Candle lighting is that minute (seconds dropped) minus {minutes} minutes, and one more minute to be safe: {total} minutes in all.',
    'help.begins.from.sea': 'seen from sea level',
    'help.begins.from.up': 'seen from {m} m above sea level',
    'help.begins.note': ' (about {lift} later than at sea level)',
    'help.ends.h': 'When it ends',
    'help.ends.degrees': 'It ends when the sun is {deg}° below the horizon (when three small stars can be seen), rounded up to the next whole minute.',
    'help.ends.minutes': 'It ends {n} minutes after sunset, rounded up to the next whole minute.',
    'help.days.h': 'Which days',
    'help.days': 'Every Shabbat, and the holidays on which work is forbidden: {days}.',
    'help.days.israel': 'both days of Rosh Hashana, Yom Kippur, the first day of Sukkot, Shmini Atzeret, the first and seventh days of Pesach, and Shavuot',
    'help.days.diaspora': 'both days of Rosh Hashana, Yom Kippur, the first two days of Sukkot, Shmini Atzeret and Simchat Torah, the first two and last two days of Pesach, and the two days of Shavuot',
    'help.days.touch': 'Days that touch, such as a holiday followed by Shabbat, are one period: it begins at the first candle lighting and ends at the last nightfall.',
    'help.numbers.h': 'The numbers for the one on the page',
    'help.num.sunset': 'Sunset, {day}',
    'help.num.candle': 'Candle lighting',
    'help.num.candle.v': '{time} ({sunsetMinute} minus {minutes} min)',
    'help.num.night': 'Nightfall, {day}',
    'help.num.ends': 'Ends',
    'help.num.ends.v': '{time} (rounded up)',
    'help.differ.h': 'Why another site can differ by a minute',
    'help.differ': 'There is no single official time, because sites round differently. This page rounds the stringent way, an earlier start and a later end, as yeshiva.org.il does for Tel Aviv. hebcal.com cuts the sunset to the minute and rounds nightfall to the nearest minute, so its end can be a minute earlier. These are calculated times, not a ruling: follow your own community’s custom.',
    'help.checked.h': 'How it was checked',
    'help.checked.yeshiva': 'yeshiva.org.il, Tel Aviv, Hebrew year 5787: the same end of Shabbat on 59 of 59 days and the same candle lighting on 58 of 59; the rest a minute off.',
    'help.checked.hebcal': 'The hebcal library: the same sun and the same Shabbat and holiday periods for Tel Aviv on every day from 2024 to 2099, and for 12 other places in Israel and abroad from 2024 to 2040. hebcal.com’s own site agrees too.',
    'help.checked.usno': 'The US Naval Observatory: sunset within 29 seconds.',
    'help.checked.only': 'Only Tel Aviv was compared with yeshiva.org.il; the other places use the same rules.',
    'help.source': 'Source code and tests: <a href="https://github.com/erezu1/isitover">github.com/erezu1/isitover</a>'
  };

  function formatEn(tz) {
    const b = base('en-GB', tz);
    return Object.assign(b, {
      when(ms, today, civilDay) {                     // today 19:00, tomorrow 19:00, Fri 9 Oct 17:55
        const diff = civilDay(ms) - today;
        return (diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : diff === -1 ? 'yesterday' : b.date(ms)) + ' ' + b.time(ms);
      },
      span(ms) {                                      // 30 min, 1 h 12 min, 5 days
        const m = Math.round(Math.abs(ms) / MIN);
        if (m < 1) return 'less than a minute';
        if (m < 60) return m + ' min';
        const h = Math.floor(m / 60);
        if (h < 48) return h + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
        return Math.floor(h / 24) + ' days';
      },
      coords: (lat, lon) => coordsOf(lat, lon, 'N', 'S', 'E', 'W'),
      lift: sec => sec < 120 ? sec + ' seconds' : (sec / 60).toFixed(1) + ' minutes'
    });
  }

  // ======================================================================================================
  // Hebrew. The verbs agree with what the title asks about: feminine for Shabbat, masculine for a holiday.
  // ======================================================================================================
  const HE_VERBS = {
    shabbat: { entered: 'נכנסה', exited: 'יצאה', willExit: 'תצא', willEnter: 'תיכנס' },
    chag: { entered: 'נכנס', exited: 'יצא', willExit: 'יצא', willEnter: 'יכנס' }
  };

  const HE = {
    'tool.help': 'איך הזמנים מחושבים',
    'tool.settings': 'הגדרות',
    'common.close': 'סגירה',

    'settings.title': 'הגדרות',
    'settings.language': 'שפה',
    'settings.place': 'מקום',
    'settings.holidays': 'חגים',
    'settings.israel': 'ארץ ישראל',
    'settings.israel.note': 'יום טוב אחד',
    'settings.diaspora': 'חו״ל',
    'settings.diaspora.note': 'שני ימים טובים',
    'settings.reset': 'איפוס',
    'settings.done': 'סיום',

    'title.shabbat': 'האם יצאה שבת?',
    'title.chag': 'האם יצא החג?',
    'answer.in': 'לא',
    'answer.out': 'כן',
    'answer.none': 'לא',
    'tag.in.shabbat': 'בתוקף', 'tag.in.chag': 'בתוקף',
    'tag.out.shabbat': HE_VERBS.shabbat.exited, 'tag.out.chag': HE_VERBS.chag.exited,
    'tag.none.shabbat': HE_VERBS.shabbat.willExit, 'tag.none.chag': HE_VERBS.chag.willExit,
    'detail.in': p => HE_VERBS[p.kind].entered + ' ' + p.start + ' · ' + HE_VERBS[p.kind].willExit + ' ' + p.end + ' (בעוד ' + p.left + ')',
    'detail.out': p => HE_VERBS[p.kind].exited + ' ' + p.end + ' (לפני ' + p.ago + ')',
    'detail.none': p => HE_VERBS[p.kind].willEnter + ' ' + p.start + ' (בעוד ' + p.left + ') · ' + HE_VERBS[p.kind].willExit + ' ' + p.end,
    'clock': 'עכשיו {time} ב{place}.',
    'sim': 'זמן מדומה: {when}',
    'error': 'הדפדפן הזה לא מצליח לחשב את הזמנים ({message}).',

    'help.title': 'איך הזמנים מחושבים',
    'help.intro': 'הדף מחשב הכול בעצמו, על המכשיר שלך: מיקום השמש ולוח השנה העברי. שום דבר לא נשלח לשום מקום, ולא צריך לעדכן אותו לעולם.',
    'help.settings.h': 'ההגדרות שלך',
    'help.place': '<b>{place}</b>, {coords}, {height}.',
    'help.height.sea': 'בגובה פני הים',
    'help.height.up': '{m} מ׳ מעל פני הים',
    'help.holidays.israel': 'ארץ ישראל: יום טוב אחד. השעות הן תמיד לפי הזמן ב{place} ({tz}), בלי קשר לשעון שלך.',
    'help.holidays.diaspora': 'חגים כמו בחו״ל: שני ימים טובים. השעות הן תמיד לפי הזמן ב{place} ({tz}), בלי קשר לשעון שלך.',
    'help.answer.h': 'התשובה',
    'help.answer.in': '<b>לא</b> (התגית <b>בתוקף</b>): שבת או חג עדיין בתוקף, מהדלקת נרות ועד היציאה.',
    'help.answer.out': '<b>כן</b> (התגית <b>יצאה</b> / <b>יצא</b>): שבת או חג יצאו מוקדם יותר היום, אחרי צאת הכוכבים.',
    'help.answer.none': '<b>לא</b> (התגית <b>תצא</b> / <b>יצא</b>): שבת או חג עוד לא נכנסו, ומוצג הבא בתור.',
    'help.begins.h': 'הכניסה',
    'help.begins': 'שבת וחגים נכנסים בהדלקת נרות. השקיעה היא הרגע שבו שפת השמש העליונה נוגעת באופק, {from}{note}. הדלקת נרות היא דקת השקיעה (בלי השניות) פחות {minutes} דקות, ועוד דקה אחת ליתר ביטחון: {total} דקות בסך הכול.',
    'help.begins.from.sea': 'כפי שנראה מגובה פני הים',
    'help.begins.from.up': 'כפי שנראה מגובה של {m} מ׳ מעל פני הים',
    'help.begins.note': ' (בערך {lift} מאוחר יותר מאשר בגובה פני הים)',
    'help.ends.h': 'היציאה',
    'help.ends.degrees': 'שבת וחגים יוצאים כשהשמש נמצאת {deg}° מתחת לאופק (כשרואים שלושה כוכבים קטנים). הזמן מעוגל כלפי מעלה לדקה השלמה הבאה.',
    'help.ends.minutes': 'שבת וחגים יוצאים {n} דקות אחרי השקיעה. הזמן מעוגל כלפי מעלה לדקה השלמה הבאה.',
    'help.days.h': 'אילו מועדים?',
    'help.days': 'כל שבת או חג שבהם אסור לעשות מלאכה: {days}.',
    'help.days.israel': 'שני ימי ראש השנה, יום הכיפורים, היום הראשון של סוכות, שמיני עצרת, היום הראשון והשביעי של פסח, ושבועות',
    'help.days.diaspora': 'שני ימי ראש השנה, יום הכיפורים, שני הימים הראשונים של סוכות, שמיני עצרת ושמחת תורה, שני הימים הראשונים ושני הימים האחרונים של פסח, ושני ימי שבועות',
    'help.days.touch': 'ימים צמודים, כמו חג ואחריו שבת, הם רצף אחד: הוא מתחיל בהדלקת הנרות הראשונה ומסתיים בצאת הכוכבים האחרון.',
    'help.numbers.h': 'החישוב למה שמוצג בדף',
    'help.num.sunset': 'שקיעה, {day}',
    'help.num.candle': 'הדלקת נרות',
    'help.num.candle.v': '{time} ({sunsetMinute} פחות {minutes} דקות)',
    'help.num.night': 'צאת הכוכבים, {day}',
    'help.num.ends': 'יציאה',
    'help.num.ends.v': '{time} (מעוגל כלפי מעלה)',
    'help.differ.h': 'למה אתר אחר יכול להציג הפרש של דקה',
    'help.differ': 'אין זמן רשמי אחד, כי אתרים מעגלים אחרת. הדף מעגל לחומרה: כניסה מוקדמת יותר ויציאה מאוחרת יותר, כמו שאתר ישיבה (yeshiva.org.il) מפרסם לתל אביב. האתר hebcal.com חותך את השקיעה לדקה ומעגל את צאת הכוכבים לדקה הקרובה, ולכן היציאה אצלו יכולה להיות דקה מוקדם יותר. אלה זמנים מחושבים, לא פסיקה: יש לנהוג לפי מנהג הקהילה שלך.',
    'help.checked.h': 'איך זה נבדק',
    'help.checked.yeshiva': 'אתר ישיבה (yeshiva.org.il), תל אביב, שנת תשפ״ז: אותה יציאת שבת ב-59 מתוך 59 ימים, ואותה הדלקת נרות ב-58 מתוך 59; השאר הפרש של דקה.',
    'help.checked.hebcal': 'ספריית hebcal: אותה שמש ואותן תקופות של שבת וחג בתל אביב בכל יום מ-2024 עד 2099, ובעוד 12 מקומות בישראל ובחו״ל מ-2024 עד 2040. גם האתר hebcal.com מסכים.',
    'help.checked.usno': 'המצפה הימי של ארה״ב: שקיעה בטווח של 29 שניות.',
    'help.checked.only': 'רק תל אביב הושוותה לאתר ישיבה; שאר המקומות משתמשים באותם כללים.',
    'help.source': 'קוד המקור והבדיקות: <a href="https://github.com/erezu1/isitover">github.com/erezu1/isitover</a>'
  };

  const heMinutes = n => n === 1 ? 'דקה' : n === 2 ? 'שתי דקות' : n + ' דקות';
  const heHours = n => n === 1 ? 'שעה' : n === 2 ? 'שעתיים' : n + ' שעות';
  const heDays = n => n === 1 ? 'יום' : n === 2 ? 'יומיים' : n + ' ימים';
  const heAnd = s => /^\d/.test(s) ? 'ו-' + s : 'ו' + s;        // ו-12 דקות, ושתי דקות

  function formatHe(tz) {
    const b = base('he-IL', tz);
    return Object.assign(b, {
      when(ms, today, civilDay) {                     // היום ב-19:00, מחר ב-19:00, ביום ו׳, 9 באוק׳ ב-17:55
        const diff = civilDay(ms) - today;
        return (diff === 0 ? 'היום' : diff === 1 ? 'מחר' : diff === -1 ? 'אתמול' : 'ב' + b.date(ms)) + ' ב-' + b.time(ms);
      },
      span(ms) {                                      // 30 דקות, שעה ושתי דקות, 5 ימים
        const m = Math.round(Math.abs(ms) / MIN);
        if (m < 1) return 'פחות מדקה';
        if (m < 60) return heMinutes(m);
        const h = Math.floor(m / 60);
        if (h < 48) return heHours(h) + (m % 60 ? ' ' + heAnd(heMinutes(m % 60)) : '');
        return heDays(Math.floor(h / 24));
      },
      coords: (lat, lon) => coordsOf(lat, lon, 'צפון', 'דרום', 'מזרח', 'מערב'),
      lift: sec => sec < 120 ? sec + ' שניות' : (sec / 60).toFixed(1) + ' דקות'
    });
  }

  // ======================================================================================================
  const LANGS = {
    he: { name: 'עברית', dir: 'rtl', locale: 'he-IL', segmented: true, strings: HE, format: formatHe },
    en: { name: 'English', dir: 'ltr', locale: 'en-GB', segmented: false, strings: EN, format: formatEn }
  };
  const DEFAULT = 'he';

  const fill = (template, params, escapeValues) => template.replace(/\{(\w+)\}/g, (whole, key) => {
    if (!params || params[key] === undefined) return whole;
    const v = params[key];
    return v && v.html !== undefined ? v.html : escapeValues ? esc(v) : String(v);
  });

  function create(code) {
    if (!LANGS[code]) code = DEFAULT;
    const def = LANGS[code];
    const L = { code, name: def.name, dir: def.dir, locale: def.locale, segmented: def.segmented, format: def.format };
    L.has = key => Object.prototype.hasOwnProperty.call(def.strings, key);
    L.t = (key, params) => {                          // plain text
      const v = def.strings[key];
      if (v === undefined) return '[' + key + ']';
      return typeof v === 'function' ? v(params || {}, L) : fill(v, params, false);
    };
    L.h = (key, params) => {                          // HTML: the parameters are escaped, the text may hold <b> and <a>
      const v = def.strings[key];
      return typeof v === 'string' ? fill(v, params, true) : '[' + key + ']';
    };
    L.itemName = item => code === 'he' ? item.he : item.en;
    L.placeName = place => code === 'he' ? place.nameHe : place.name;
    return L;
  }

  const api = { create, LANGS, DEFAULT, esc, raw };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.I18N = api;
})(typeof self !== 'undefined' ? self : this);
