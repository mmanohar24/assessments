// WCAG AA contrast check for ../index.html.
// Part A: every text and control colour pair from the design tokens.
// Part B: a live sweep of every visible text element on each screen, with its real background.
// Run: NODE_PATH=<folder with playwright>/node_modules node tests/contrast.cjs
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const root = html.match(/:root\s*{([\s\S]*?)}/)[1];
const T = {};
root.replace(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g, (_, k, v) => { T[k] = v; });

function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255].map(c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); })
    .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
}
function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
const c = v => (v.startsWith('#') ? v : T[v]);

// [foreground, background, minimum, where it is used]
const PAIRS = [
  ['ink', 'paper', 4.5, 'Body text'], ['ink', 'surface', 4.5, 'Text on cards and inputs'], ['ink', 'surface-2', 4.5, 'Unselected segment text'],
  ['ink-2', 'paper', 4.5, 'Secondary text'], ['ink-2', 'surface', 4.5, 'Secondary text on cards'], ['ink-2', 'surface-2', 4.5, 'Segment sub-labels, step labels'],
  ['ink-2', 'accent-soft', 4.5, 'Pressed demo button detail'], ['accent-ink', 'accent-soft', 4.5, 'Pressed demo button state'],
  ['accent-ink', 'paper', 4.5, 'Eyebrows, links'], ['accent-ink', 'surface', 4.5, 'Links on cards'],
  ['on-accent', 'accent', 4.5, 'Primary button, badge'], ['on-accent', '#8A3820', 4.5, 'Primary button hover'],
  ['ok', 'paper', 4.5, 'In stock, success'], ['ok', 'surface', 4.5, 'Success on cards'], ['ok', 'ok-soft', 4.5, 'Promo applied, done steps'],
  ['warn', 'paper', 4.5, 'Low stock'], ['warn', 'surface', 4.5, 'Low stock on cards'],
  ['err', 'paper', 4.5, 'Field errors'], ['err', 'surface', 4.5, 'Errors on cards'], ['err', 'err-soft', 4.5, 'Error alert'], ['ink', 'err-soft', 4.5, 'Error alert body'],
  ['paper', 'ink', 4.5, 'Selected segment, toast, concept label'], ['#E4DACB', 'ink', 4.5, 'Selected segment sub-label'],
  ['#6F655B', 'surface', 4.5, 'Placeholder text'],
  ['ink-2', 'surface-2', 4.5, 'Disabled buttons'],
  // Non-text: control boundaries, focus rings and progress (WCAG 1.4.11, 3:1)
  ['control', 'paper', 3, 'Input, select and card borders'], ['control', 'surface', 3, 'Borders on cards'], ['control', 'surface-2', 3, 'Segment and bar borders'],
  ['err', 'surface', 3, 'Invalid input border'], ['ink', 'paper', 3, 'Focus ring'], ['accent', 'surface-2', 3, 'Segment focus ring, progress fill'],
  ['ok', 'surface-2', 3, 'Progress fill when complete'], ['ink', 'surface-2', 3, 'Selected segment indicator'], ['ink', 'surface', 3, 'Selected choice card border'],
  ['accent', 'paper', 3, 'Primary button against page']
];

let failed = 0;
const lines = [];
console.log('Part A: token pairs');
for (const [f, b, min, where] of PAIRS) {
  const r = ratio(c(f), c(b));
  const ok = r >= min;
  if (!ok) failed++;
  lines.push(`${ok ? 'PASS' : 'FAIL'} ${r.toFixed(2).padStart(5)}:1 (needs ${min}) ${f} on ${b}  ${where}`);
}
console.log(lines.join('\n'));

// Part B: live sweep
const { chromium } = require('playwright');
const FILE = 'file://' + path.join(__dirname, '..', 'index.html');

function sweep(scope) {
  function parse(s) { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
  function over(top, bot) { const a = top.a + bot.a * (1 - top.a); return { r: (top.r * top.a + bot.r * bot.a * (1 - top.a)) / a, g: (top.g * top.a + bot.g * bot.a * (1 - top.a)) / a, b: (top.b * top.a + bot.b * bot.a * (1 - top.a)) / a, a }; }
  function L(c) { return [c.r, c.g, c.b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); }
  function bgOf(el) {
    const layers = [];
    // Use what is actually painted under the text (this catches sibling layers such as the
    // sliding selection indicator). Fall back to the ancestor chain when the text is off-screen.
    const r = el.getBoundingClientRect(), x = r.left + Math.min(8, r.width / 2), y = r.top + r.height / 2;
    const stack = (x >= 0 && y >= 0 && x < innerWidth && y < innerHeight) ? document.elementsFromPoint(x, y) : [];
    const i = stack.indexOf(el);
    if (i >= 0) {
      for (const n of stack.slice(i)) {
        const b = parse(getComputedStyle(n).backgroundColor);
        if (b && b.a > 0) { layers.push(b); if (b.a >= 1) break; }
      }
      let bg = { r: 244, g: 238, b: 227, a: 1 };
      for (let k = layers.length - 1; k >= 0; k--) bg = over(layers[k], bg);
      return bg;
    }
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const b = parse(getComputedStyle(n).backgroundColor);
      if (b && b.a > 0) { layers.push(b); if (b.a >= 1) break; }
    }
    let bg = { r: 244, g: 238, b: 227, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg);
    return bg;
  }
  function opacityOf(el) { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= +getComputedStyle(n).opacity; return o; }
  const out = [];
  const rootEl = document.querySelector(scope);
  rootEl.querySelectorAll('*').forEach(el => {
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!own) return;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    if (cs.visibility === 'hidden' || r.width === 0 || r.height === 0 || el.closest('.sr-only, [hidden], svg, option')) return;
    const bg = bgOf(el);
    const fg0 = parse(cs.color); fg0.a *= opacityOf(el);
    const fg = over(fg0, bg);
    const a = L(fg), b = L(bg), ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const min = large ? 3 : 4.5;
    out.push({ text: el.textContent.trim().slice(0, 40), ratio: +ratio.toFixed(2), min, ok: ratio >= min });
  });
  return out;
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(FILE);
  await page.waitForTimeout(400);
  const go = async h => { await page.evaluate(x => { location.hash = x; }, h); await page.waitForTimeout(300); };
  const screens = [];
  const run = async (name, scope) => screens.push([name, await page.evaluate(sweep, scope || 'body')]);

  await run('Shop and demo panel');
  await go('#/p/planter');
  await page.click('[data-action="notify"]');
  await run('Product, sold-out size, notify');
  await go('#/p/throw?opt=clay');
  await page.click('#add'); await page.waitForTimeout(800);
  await run('Product, added');
  await page.click('[data-action="sim-slow"]');
  await page.waitForTimeout(200);
  await run('Demo button pressed');
  await page.click('[data-action="sim-slow"]');
  await go('#/p/mug'); await page.click('#add'); await page.waitForTimeout(800);
  await page.click('#bag-btn'); await page.waitForTimeout(400);
  await page.click('[data-action="remove"][data-key="mug"]');
  await page.fill('#promo', 'bad'); await page.click('#promo-form button[type=submit]');
  await run('Bag with error and toast', '#bag');
  await page.click('.toast button');
  await page.fill('#promo', 'WELCOME10'); await page.click('#promo-form button[type=submit]');
  await page.click('[data-action="qty"][data-d="1"][data-key="throw:clay"]');
  await run('Bag with promo', '#bag');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await go('#/checkout/delivery');
  await page.click('#f-delivery button[type=submit]');
  await run('Delivery with errors');
  await page.click('.choice-card:has-text("Pick up in store")');
  await run('Store pickup');
  await page.click('.choice-card:has-text("Home delivery")');
  await page.fill('#d-name', 'Asha Rao'); await page.fill('#d-phone', '9876543210');
  await page.fill('#d-address', '12, 4th Cross, Indiranagar'); await page.fill('#d-pin', '560038');
  await page.click('#f-delivery button[type=submit]'); await page.waitForTimeout(300);
  await page.fill('#p-upi', 'fail@upi'); await page.click('#f-payment button[type=submit]'); await page.waitForTimeout(300);
  await page.click('#place'); await page.waitForSelector('#pay-error');
  await run('Payment failed');
  await page.click('[data-action="sim-soldout"]'); await page.waitForTimeout(300);
  await run('Sold out on review');
  await page.click('[data-action="soldout-remove"]');
  await page.click('[data-action="pay-other"]'); await page.waitForTimeout(300);
  await page.click('.choice-card:has(input[value="card"])');
  await run('Card payment');
  await page.click('.choice-card:has(input[value="cod"])');
  await page.click('#f-payment button[type=submit]'); await page.waitForTimeout(300);
  await page.click('#place'); await page.waitForFunction(() => location.hash.startsWith('#/order/'));
  await page.waitForTimeout(800);
  await run('Order placed');
  await page.click('#bag-btn'); await page.waitForTimeout(400);
  await run('Empty bag', '#bag');
  await browser.close();

  console.log('\nPart B: live sweep of visible text');
  for (const [name, items] of screens) {
    const bad = items.filter(i => !i.ok);
    const worst = items.reduce((m, i) => Math.min(m, i.ratio), 99);
    console.log(`${bad.length ? 'FAIL' : 'PASS'} ${name}: ${items.length} text elements, lowest ${worst.toFixed(2)}:1`);
    bad.forEach(b => console.log(`     ${b.ratio}:1 (needs ${b.min}) "${b.text}"`));
    failed += bad.length;
  }
  console.log(`\n${failed ? failed + ' contrast failures' : 'All pairs meet WCAG AA'}`);
  process.exit(failed ? 1 : 0);
})();
