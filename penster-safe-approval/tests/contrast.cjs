// WCAG contrast check for the dark and light token sets in ../index.html.
// Run: node tests/contrast.cjs
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function tokens(name) {
  const m = html.match(new RegExp('/\\* tokens:' + name + ' \\*/([\\s\\S]*?)/\\* end tokens:' + name + ' \\*/'));
  if (!m) throw new Error('No token block for ' + name);
  const out = {};
  for (const [, k, v] of m[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[k] = v;
  return out;
}

function lum(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }

// [foreground, background, minimum, what it is]
const PAIRS = [
  ['text', 'bg', 4.5, 'Body text on page'],
  ['text', 'surface', 4.5, 'Body text on cards'],
  ['text', 'surface-2', 4.5, 'Text on raised areas'],
  ['muted', 'bg', 4.5, 'Hint text on page'],
  ['muted', 'surface', 4.5, 'Hint text on cards'],
  ['muted', 'surface-2', 4.5, 'Hint text on raised areas'],
  ['primary-fg', 'bg', 4.5, 'Links and back buttons on page'],
  ['primary-fg', 'surface', 4.5, 'Links on cards'],
  ['primary-fg', 'surface-2', 4.5, 'Links on raised areas'],
  ['on-primary', 'primary', 4.5, 'Text on green buttons'],
  ['ok-fg', 'ok-bg', 4.5, 'Approved chip and banner'],
  ['warn-fg', 'warn-bg', 4.5, 'Needs a look chip and flagged words'],
  ['danger-fg', 'danger-bg', 4.5, 'Rejected chip and errors banner'],
  ['info-fg', 'info-bg', 4.5, 'Ready chip and "why this post"'],
  ['neutral-fg', 'neutral-bg', 4.5, 'Edited chip, tags, locked Approve'],
  ['warn-fg', 'surface', 4.5, 'Flag heading on card'],
  ['warn-fg', 'bg', 4.5, 'Flag note text on page'],
  ['danger-fg', 'bg', 4.5, 'Inline error text on page'],
  ['danger-fg', 'surface', 4.5, 'Inline error text in dialogs'],
  ['bg', 'text', 4.5, 'Toast text (inverted)'],
  ['text', 'bg', 4.5, 'Toast Undo button (inverted)'],
  ['primary', 'bg', 3, 'UI: green button edge on page'],
  ['primary', 'surface', 3, 'UI: green button edge on card'],
  ['border-strong', 'bg', 3, 'UI: input and button borders on page'],
  ['border-strong', 'surface', 3, 'UI: input borders on cards'],
  ['focus', 'bg', 3, 'UI: focus ring on page'],
  ['focus', 'surface', 3, 'UI: focus ring on cards'],
  ['warn-fg', 'surface', 3, 'UI: flag card border'],
  ['primary-fg', 'neutral-bg', 3, 'UI: progress fill on track'],
];

let failures = 0;
for (const theme of ['dark', 'light']) {
  const t = tokens(theme);
  console.log('\n' + theme.toUpperCase() + ' THEME');
  console.log('Result  Ratio   Need  Pair                              Use');
  for (const [fg, bg, min, what] of PAIRS) {
    if (!t[fg] || !t[bg]) { console.log('MISSING ' + fg + ' / ' + bg); failures++; continue; }
    const r = ratio(t[fg], t[bg]);
    const ok = r >= min;
    if (!ok) failures++;
    console.log((ok ? 'PASS  ' : 'FAIL  ') + '  ' + r.toFixed(2).padStart(5) + '   ' + String(min).padEnd(4) + '  ' +
      (fg + ' on ' + bg).padEnd(32) + '  ' + what);
  }
}
console.log('\n' + (failures ? failures + ' pair(s) failed.' : 'All pairs pass WCAG AA.'));
process.exit(failures ? 1 : 0);
