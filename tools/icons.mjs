// Draws the app icon, a red no-sign with a black ש, and writes the SVG and PNG files to icons/ (or to --out DIR).
//
//   npm install --no-save @resvg/resvg-js     (draws the SVG into PNG; not kept as a dependency)
//   node tools/icons.mjs [--shin above|below] [--size 0.64] [--out DIR] [--keep-svgs]
//
// The ש is the glyph of David Libre Bold (SIL Open Font License 1.1, see fonts/), outlined and centred. --shin chooses its
// place against the red bar: "above" draws the ש over the bar (the letter stays whole at home-screen sizes), "below" lets the
// bar cross it, the way a no-sign is usually drawn. --size is how large the letter is next to the white circle (its larger
// side, as a share of the circle's width). Everything comes from sign() below, so the colours and proportions live in one place.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SHIN = 'M-58.3 271.2Q-80.3 271.2-104 254.4Q-127.7 237.5-137.5 201.4Q-147.7 164.3-159.2 126.2Q-170.7 88.1-191.2 29.1Q-204.3-9-221.4-49.3Q-238.5-89.6-257.6-124.3Q-261-130.1-264.2-137.7Q-267.3-145.3-267.3-151.1Q-267.3-155-265.6-159.9Q-263.9-164.8-262-168.7Q-255.1-181.4-243.2-199.2Q-231.2-217-217.8-234.4Q-204.3-251.7-193.6-262.5Q-190.2-265.9-187.5-268.6Q-184.8-271.2-179.4-271.2Q-173.1-271.2-169.2-267.6Q-165.3-263.9-160.4-257.1Q-155.5-250.2-147.2-229.7Q-138.9-209.2-130.1-183.6Q-121.3-158-115-135.5Q-105.2-101.3-97.7-71Q-90.1-40.8-86.7-22.7Q-86.7-22.2-85.4-18.1Q-84.2-13.9-80.8-13.9Q-67.6-13.9-54.9-36.6Q-42.2-59.3-42.2-89.1Q-42.2-106.7-46.1-122.1Q-50-137.5-53.5-146.2Q-57.4-154.1-57.4-158.4Q-57.4-163.8-55.4-167Q-53.5-170.2-51-175Q-36.9-196.5-18.8-220.9Q-0.7-245.4 16.4-262.5Q18.8-264.9 22.7-268.1Q26.6-271.2 31-271.2Q43.2-271.2 49.6-259.5Q55.4-251.2 60.8-232.2Q66.2-213.1 69.8-192.6Q73.5-172.1 73.5-158.4Q73.5-131.6 65.9-117.2Q58.3-102.8 51-90.1Q37.4-65.7 7.8-32.2Q-21.7 1.2-59.8 35.9Q-60.3 36.4-64.7 40Q-69.1 43.7-69.1 47.6Q-69.1 52-68.6 54.4Q-65.2 67.6-61.3 82.5Q-57.4 97.4-53.5 104.2Q-48.1 113.5-42.2 118.7Q-36.4 123.8-19.3 123.8Q5.1 123.8 32.7 113.8Q60.3 103.8 83.7 90.1Q107.2 76.4 119.4 66.7Q139.4 50.5 150.4 36.1Q161.4 21.7 161.4-5.1Q161.4-26.1 154.1-55.4Q146.7-84.7 138.7-109.1Q130.6-133.5 128.7-139.4Q123.8-150.6 123.8-156.5Q123.8-161.9 126.7-165.3Q137.9-183.8 159.4-213.1Q180.9-242.4 207.3-265.4Q209.7-267.3 214.4-269.3Q219-271.2 221.9-271.2Q230.2-271.2 234.6-265.9Q239-260.5 241.5-254.6Q246.8-241.9 252.9-217.5Q259-193.1 263.2-166Q267.3-138.9 267.3-117.9Q267.3-86.7 261-60.3Q254.6-33.9 249.8-14.9Q234.1 45.2 217.3 78.6Q200.4 112.1 193.1 126.2Q182.4 146.2 161.4 171.6Q140.4 197 118.9 210.2Q102.3 220 69.1 234.6Q35.9 249.3 0.7 260.3Q-34.4 271.2-58.3 271.2', SHIN_BOX = [535, 542];   // the ש outline (David Libre Bold, 1000 units per em) and its width and height
const RED = '#dc2626', INK = '#111111', PAPER = '#faf8f4';        // the page's red, near black, the page's background

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes('--' + name) ? args[args.indexOf('--' + name) + 1] : fallback;
const outDir = option('out', fileURLToPath(new URL('../icons/', import.meta.url)));
const shin = option('shin', 'above'), size = Number(option('size', 0.64));
if (!['above', 'below'].includes(shin) || !(size > 0.2 && size < 1)) { console.error('--shin above|below, --size between 0.2 and 1'); process.exit(1); }

// The sign, centred on (0,0), with outer radius R: white inside, then the ש and the bar (in the order --shin says), then the red ring.
function sign(R) {
  const T = R * 0.2, ring = R - T / 2, inner = R - T, d = ring / Math.SQRT2;
  const k = (inner * 2 * size) / Math.max(...SHIN_BOX);
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
