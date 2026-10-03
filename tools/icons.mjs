// Draws the app icon, a red no-sign with a black ש, and writes the SVG and PNG files to icons/ (or to --out DIR).
//
//   npm install --no-save @resvg/resvg-js     (draws the SVG into PNG; not kept as a dependency)
//   node tools/icons.mjs [--shin above|below] [--size 0.74] [--out DIR] [--keep-svgs]
//
// The ש is the glyph of Rubik Bold (the page's Hebrew display font family, SIL Open Font License 1.1, see fonts/), outlined and
// centred. --shin chooses its place against the red bar: "above" draws the ש over the bar (it stays readable at home-screen
// sizes), "below" lets the bar cross it, the way a no-sign is usually drawn. --size is the ש's width as a share of the white
// circle's width. Everything comes from sign() below, so the colours and proportions live in one place.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SHIN = 'M-27 158.5L-3 158.5Q51 159.5 91.5 138Q132 116.5 154.5 78.5Q177 40.5 177-6.5L177-265.5Q177-275.5 184.5-282.5Q192-289.5 203-289.5L302-289.5Q313-289.5 320-282.5Q327-275.5 327-264.5L327-1.5Q327 66.5 304 120.5Q281 174.5 240 212.5Q199 250.5 144.5 270.5Q90 290.5 27 289.5L-67 289.5Q-148 289.5-206.5 258Q-265 226.5-296 173.5Q-327 120.5-327 56.5L-327-264.5Q-327-275.5-319.5-282.5Q-312-289.5-302-289.5L-202-289.5Q-192-289.5-184.5-282.5Q-177-275.5-177-265.5L-176-21.5Q-141-23.5-120-38.5Q-94-56.5-83-89.5Q-72-122.5-72-167.5L-72-263.5Q-72-275.5-65-282.5Q-58-289.5-47-289.5L52-289.5Q62-289.5 69.5-281.5Q77-273.5 77-263.5L77-165.5Q77-84.5 45.5-27Q14 30.5-46 60.5Q-91 83.5-152 89.5Q-144 102.5-133 113.5Q-91 158.5-27 158.5', SHIN_WIDTH = 654;                     // the ש outline and its width in the same units
const RED = '#dc2626', INK = '#111111', PAPER = '#faf8f4';        // the page's red, near black, the page's background

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes('--' + name) ? args[args.indexOf('--' + name) + 1] : fallback;
const outDir = option('out', fileURLToPath(new URL('../icons/', import.meta.url)));
const shin = option('shin', 'above'), size = Number(option('size', 0.74));
if (!['above', 'below'].includes(shin) || !(size > 0.2 && size < 1)) { console.error('--shin above|below, --size between 0.2 and 1'); process.exit(1); }

// The sign, centred on (0,0), with outer radius R: white inside, then the ש and the bar (in the order --shin says), then the red ring.
function sign(R) {
  const T = R * 0.2, ring = R - T / 2, inner = R - T, d = ring / Math.SQRT2;
  const k = (inner * 2 * size) / SHIN_WIDTH;
  const glyph = '<path d="' + SHIN + '" fill="' + INK + '" transform="scale(' + k.toFixed(4) + ')"/>';
  const bar = '<line x1="' + (-d).toFixed(2) + '" y1="' + (-d).toFixed(2) + '" x2="' + d.toFixed(2) + '" y2="' + d.toFixed(2) + '" stroke="' + RED + '" stroke-width="' + T.toFixed(2) + '"/>';
  return '<circle r="' + (inner + 1).toFixed(2) + '" fill="#fff"/>' + (shin === 'above' ? bar + glyph : glyph + bar) +
    '<circle r="' + ring.toFixed(2) + '" fill="none" stroke="' + RED + '" stroke-width="' + T.toFixed(2) + '"/>';
}
const svg = body => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">' + body + '</svg>';
const group = R => '<g transform="translate(256 256)">' + sign(R) + '</g>';

const FILES = {
  // the sign alone on a transparent background: the favicon, and a vector icon for browsers that take one
  'icon.svg': svg(group(248)),
  // a rounded cream tile with a large sign: purpose "any"
  'tile-any.svg': svg('<rect width="512" height="512" rx="112" fill="' + PAPER + '"/>' + group(212)),
  // full bleed, the sign inside the central 80% circle that every launcher keeps: purpose "maskable", and the iOS icon
  'tile-maskable.svg': svg('<rect width="512" height="512" fill="' + PAPER + '"/>' + group(184)),
};
const PNGS = [   // [file, source, pixels]
  ['icon-192.png', 'tile-any.svg', 192], ['icon-512.png', 'tile-any.svg', 512],
  ['maskable-192.png', 'tile-maskable.svg', 192], ['maskable-512.png', 'tile-maskable.svg', 512],
  ['apple-touch-icon.png', 'tile-maskable.svg', 180], ['favicon-32.png', 'icon.svg', 32],
];

mkdirSync(outDir, { recursive: true });
const keep = ['icon.svg'];                                          // the tiles are only drawn to make the PNGs
for (const [name, text] of Object.entries(FILES)) if (keep.includes(name) || args.includes('--keep-svgs')) writeFileSync(outDir + '/' + name, text);

let Resvg;
try { ({ Resvg } = await import('@resvg/resvg-js')); }
catch { console.error('needs @resvg/resvg-js:  npm install --no-save @resvg/resvg-js'); process.exit(1); }
for (const [file, source, px] of PNGS) {
  const png = new Resvg(FILES[source], { fitTo: { mode: 'width', value: px } }).render().asPng();
  writeFileSync(outDir + '/' + file, png);
  console.log(file.padEnd(22), px + 'x' + px, String(png.length).padStart(6), 'bytes');
}
