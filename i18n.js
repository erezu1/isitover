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
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

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
    'tool.install': 'Install as an app',
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

    'install.title': 'Add it to your home screen',
    'install.text': 'It opens like an app and works without a network.',
    'install.ios': 'Tap {share}, then <b>Add to Home Screen</b>.',
    'install.yes': 'Install',
    'install.later': 'Not now',
    'install.ok': 'Got it',

    'title.shabbat': 'Is it over?',
    'title.chag': 'Is it over?',
    'answer.in': 'no',
    'answer.out': 'yes',
    'answer.none': 'not shabat',
    'tag.in.shabbat': 'IN', 'tag.in.chag': 'IN',
    'tag.out.shabbat': 'OUT', 'tag.out.chag': 'OUT',
    'tag.none.shabbat': 'NEXT', 'tag.none.chag': 'NEXT',
    'detail.in': 'Began {start} · ends {end} (in {left})',
    'detail.out': p => cap(p.end) + ' (' + p.ago + ' ago)',                     // the tag already says OUT
    'detail.none': 'Starts {start} (in {left}) · ends {end}',
    'clock': 'It’s {time} in {place}.',
    'sim': 'Simulated time: {when}',
    'error': 'This browser cannot work out the times ({message}).',

    'help.title': 'How the times are worked out',
    'help.intro': 'Worked out on your device, from the sun and the Hebrew calendar. Nothing is sent anywhere.',
    'help.place': '<b>{place}</b> · {coords} · {height} · {holidays}',
    'help.height.sea': 'sea level',
    'help.height.up': '{m} m above sea level',
    'help.holidays.israel': 'one day of Yom Tov (Israel)',
    'help.holidays.diaspora': 'two days of Yom Tov (Diaspora)',
    'help.begins.h': 'When it begins',
    'help.begins': 'Sunset: the sun’s top edge meets the horizon, {from}{note}. Candle lighting: that minute, minus {total} minutes ({minutes}, and one more to be safe).',
    'help.begins.from.sea': 'seen from sea level',
    'help.begins.from.up': 'seen from {m} m above sea level',
    'help.begins.note': ' (about {lift} later than at sea level)',
    'help.ends.h': 'When it ends',
    'help.ends.degrees': 'Nightfall: the sun is {deg}° below the horizon, when three small stars can be seen. The end is that moment rounded up to the next minute.',
    'help.ends.minutes': 'It ends {n} minutes after sunset, rounded up to the next minute.',
    'help.numbers.h': 'The numbers for the one on the page',
    'help.num.sunset': 'Sunset, {day}',
    'help.num.candle': 'Candle lighting',
    'help.num.candle.v': '{time} ({sunsetMinute} minus {minutes} min)',
    'help.num.night': 'Nightfall, {day}',
    'help.num.ends': 'Ends',
    'help.num.ends.v': '{time} (rounded up)',
    'help.days.h': 'Which days',
    'help.days': 'Every Shabbat, and the holidays on which work is forbidden: {days}. Days that touch are one period.',
    'help.days.israel': 'both days of Rosh Hashana, Yom Kippur, the first day of Sukkot, Shmini Atzeret, the first and seventh days of Pesach, and Shavuot',
    'help.days.diaspora': 'both days of Rosh Hashana, Yom Kippur, the first two days of Sukkot, Shmini Atzeret and Simchat Torah, the first two and last two days of Pesach, and the two days of Shavuot',
    'help.checked.h': 'How it was checked',
    'help.checked': 'Sites can differ by a minute because they round differently. This page rounds the stringent way, like yeshiva.org.il: the same end on 59 of 59 Tel Aviv days in 5787. It also agrees with hebcal and the US Naval Observatory.',
    'help.source': 'Source code and tests: <a href="https://github.com/erezu1/isitover">github.com/erezu1/isitover</a>',

    'ill.sunset': 'Sunset',
    'ill.candle': 'Candle lighting',
    'ill.min': '{n} min',
    'ill.height': '{m} m',
    'ill.end': 'Ends',
    'ill.now': 'now',
    'ill.begins.aria': 'The sun setting on the horizon, and candle lighting {n} minutes before',
    'ill.ends.aria': 'The sun {deg}° below the horizon, and three small stars',
    'ill.period.aria': 'A timeline from candle lighting to the end'
  };

  function formatEn(tz) {
    const b = base('en-GB', tz);
    return Object.assign(b, {
      when(ms, today, civilDay) {                     // today at 19:00, tomorrow at 19:00, Fri 9 Oct at 17:55
        const diff = civilDay(ms) - today;
        return (diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : diff === -1 ? 'yesterday' : b.date(ms)) + ' at ' + b.time(ms);
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
    'tool.install': 'התקנה כאפליקציה',
    'common.close': 'סגירה',

    'settings.title': 'הגדרות',
    'settings.language': 'שפה',
    'settings.place': 'מקום',
    'settings.holidays': 'חגים',
    'settings.israel': 'ארץ ישראל',
    'settings.israel.note': 'יום טוב אחד',
    'settings.diaspora': 'גלויות',
    'settings.diaspora.note': 'שני ימים טובים',
    'settings.reset': 'איפוס',
    'settings.done': 'סיום',

    'install.title': 'להוסיף למסך הבית?',
    'install.text': 'נפתח כמו אפליקציה, ועובד גם בלי רשת.',
    'install.ios': 'לוחצים על {share} ואז על <b>הוספה למסך הבית</b>.',
    'install.yes': 'התקנה',
    'install.later': 'לא עכשיו',
    'install.ok': 'הבנתי',

    'title.shabbat': 'האם יצאה שבת?',
    'title.chag': 'האם יצא החג?',
    'answer.in': 'לא',
    'answer.out': 'כן',
    'answer.none': 'לא',
    'tag.in.shabbat': 'בתוקף', 'tag.in.chag': 'בתוקף',
    'tag.out.shabbat': HE_VERBS.shabbat.exited, 'tag.out.chag': HE_VERBS.chag.exited,
    'tag.none.shabbat': HE_VERBS.shabbat.willExit, 'tag.none.chag': HE_VERBS.chag.willExit,
    'detail.in': p => HE_VERBS[p.kind].entered + ' ' + p.start + ' · ' + HE_VERBS[p.kind].willExit + ' ' + p.end + ' (בעוד ' + p.left + ')',
    'detail.out': p => p.end + ' (לפני ' + p.ago + ')',                         // the tag already says יצאה / יצא
    'detail.none': p => HE_VERBS[p.kind].willEnter + ' ' + p.start + ' (בעוד ' + p.left + ') · עד ' + p.until,       // the tag already says תצא / יצא
    'clock': 'עכשיו {time} ב{place}.',
    'sim': 'זמן מדומה: {when}',
    'error': 'הדפדפן הזה לא מצליח לחשב את הזמנים ({message}).',

    'help.title': 'איך הזמנים מחושבים',
    'help.intro': 'מחושב על המכשיר שלך, לפי השמש ולוח השנה העברי. שום דבר לא נשלח לשום מקום.',
    'help.place': '<b>{place}</b> · {coords} · {height} · {holidays}',
    'help.height.sea': 'בגובה פני הים',
    'help.height.up': '{m} מ׳ מעל פני הים',
    'help.holidays.israel': 'ארץ ישראל: יום טוב אחד',
    'help.holidays.diaspora': 'גלויות: שני ימים טובים',
    'help.begins.h': 'הכניסה',
    'help.begins': 'שקיעה: שפת השמש העליונה נוגעת באופק, {from}{note}. הדלקת נרות: דקת השקיעה, פחות {total} דקות ({minutes}, ועוד דקה ליתר ביטחון).',
    'help.begins.from.sea': 'כפי שנראה מגובה פני הים',
    'help.begins.from.up': 'כפי שנראה מגובה של {m} מ׳ מעל פני הים',
    'help.begins.note': ' (בערך {lift} מאוחר יותר מאשר בגובה פני הים)',
    'help.ends.h': 'היציאה',
    'help.ends.degrees': 'צאת הכוכבים: השמש {deg}° מתחת לאופק, כשרואים שלושה כוכבים קטנים. היציאה היא הרגע הזה, מעוגל כלפי מעלה לדקה הבאה.',
    'help.ends.minutes': 'שבת וחגים יוצאים {n} דקות אחרי השקיעה, מעוגל כלפי מעלה לדקה הבאה.',
    'help.numbers.h': 'החישוב למה שמוצג בדף',
    'help.num.sunset': 'שקיעה, {day}',
    'help.num.candle': 'הדלקת נרות',
    'help.num.candle.v': '{time} ({sunsetMinute} פחות {minutes} דקות)',
    'help.num.night': 'צאת הכוכבים, {day}',
    'help.num.ends': 'יציאה',
    'help.num.ends.v': '{time} (מעוגל כלפי מעלה)',
    'help.days.h': 'אילו מועדים?',
    'help.days': 'כל שבת או חג שבהם אסור לעשות מלאכה: {days}. ימים צמודים הם רצף אחד.',
    'help.days.israel': 'שני ימי ראש השנה, יום הכיפורים, היום הראשון של סוכות, שמיני עצרת, היום הראשון והשביעי של פסח, ושבועות',
    'help.days.diaspora': 'שני ימי ראש השנה, יום הכיפורים, שני הימים הראשונים של סוכות, שמיני עצרת ושמחת תורה, שני הימים הראשונים ושני הימים האחרונים של פסח, ושני ימי שבועות',
    'help.checked.h': 'איך זה נבדק',
    'help.checked': 'אתרים יכולים להציג הפרש של דקה, כי הם מעגלים אחרת. הדף מעגל לחומרה, כמו אתר ישיבה (yeshiva.org.il): אותה יציאה ב-59 מתוך 59 ימים בתל אביב בתשפ״ז. הוא מסכים גם עם hebcal ועם המצפה הימי של ארה״ב.',
    'help.source': 'קוד המקור והבדיקות: <a href="https://github.com/erezu1/isitover">github.com/erezu1/isitover</a>',

    'ill.sunset': 'שקיעה',
    'ill.candle': 'הדלקת נרות',
    'ill.min': '{n} דק׳',
    'ill.height': '{m} מ׳',
    'ill.end': 'יציאה',
    'ill.now': 'עכשיו',
    'ill.begins.aria': 'השמש שוקעת באופק, והדלקת נרות {n} דקות לפני',
    'ill.ends.aria': 'השמש {deg}° מתחת לאופק, ושלושה כוכבים קטנים',
    'ill.period.aria': 'ציר זמן מהדלקת הנרות ועד היציאה'
  };

  const heMinutes = n => n === 1 ? 'דקה' : n === 2 ? 'שתי דקות' : n + ' דקות';
  const heHours = n => n === 1 ? 'שעה' : n === 2 ? 'שעתיים' : n + ' שעות';
  const heDays = n => n === 1 ? 'יום' : n === 2 ? 'יומיים' : n + ' ימים';
  const heAnd = s => /^\d/.test(s) ? 'ו-' + s : 'ו' + s;        // ו-12 דקות, ושתי דקות

  function formatHe(tz) {
    const b = base('he-IL', tz);
    return Object.assign(b, {
      when(ms, today, civilDay, bare) {               // היום ב-19:00, מחר ב-19:00, ביום ו׳, 9 באוק׳ ב-17:55 (bare, for after "עד": יום ו׳, 9 באוק׳ ב-17:55)
        const diff = civilDay(ms) - today;
        return (diff === 0 ? 'היום' : diff === 1 ? 'מחר' : diff === -1 ? 'אתמול' : (bare ? '' : 'ב') + b.date(ms)) + ' ב-' + b.time(ms);
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
