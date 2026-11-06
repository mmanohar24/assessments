// End-to-end checks and screenshots. Uses the installed Google Chrome, plus real WebKit when available.
// Run: NODE_PATH=<dir with playwright, axe-core> node tests/checks.cjs [baseUrl]
const fs = require('fs');
const path = require('path');
const { chromium, webkit, devices } = require('playwright');
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const BASE = process.argv[2] || 'http://localhost:4173/';
const SHOTS = path.join(__dirname, 'screenshots', 'cream');
fs.mkdirSync(SHOTS, { recursive: true });

let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
};

// Size of every control, and the gap between neighbors in the same layer.
const audit = (page, scope = 'body') => page.evaluate(scope => {
  const de = document.documentElement;
  const root = document.querySelector(scope);
  const controls = [...root.querySelectorAll('a, button, summary')]
    .filter(el => el.getClientRects().length && !el.closest('.sr-only') && el.id !== 'skip' && !el.closest('.agent'));
  const label = el => `${el.tagName} "${(el.getAttribute('aria-label') || el.innerText || '').trim().slice(0, 24)}"`;
  const small = controls.map(el => [el, el.getBoundingClientRect()]).filter(([, r]) => r.height < 44 || r.width < 44).map(([el, r]) => `${label(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  const tight = [];
  for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) {
    const a = controls[i].getBoundingClientRect(), b = controls[j].getBoundingClientRect();
    const dx = Math.max(a.left - b.right, b.left - a.right), dy = Math.max(a.top - b.bottom, b.top - a.bottom);
    if (Math.max(dx, dy) < 7.5) tight.push(`${label(controls[i])} / ${label(controls[j])} ${Math.round(Math.max(dx, dy))}px`);
  }
  const wide = [...document.querySelectorAll('main *, header *, footer *')]
    .filter(el => !el.closest('.sr-only, .tbl-box') && !el.classList.contains('draw-cover') && el.getClientRects().length && el.getBoundingClientRect().right > de.clientWidth + 0.5)
    .map(el => el.tagName + '.' + el.className).slice(0, 5);
  const clipped = [...root.querySelectorAll('*')].filter(el => {
    const s = getComputedStyle(el);
    return el.getClientRects().length && !el.closest('.sr-only, .tbl-box') && /hidden|clip/.test(s.overflowX + s.overflowY) && el.scrollWidth > el.clientWidth + 1;
  }).map(el => el.tagName + '.' + el.className).slice(0, 5);
  return { overflow: de.scrollWidth - de.clientWidth, small, tight, wide, clipped };
}, scope);
async function axe(page) {
  await page.evaluate(axeSource);
  const res = await page.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }));
  return res.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`);
}

// Every piece of text against what is really behind it. Translucent layers are judged at their worst:
// composited over the darkest ink that can scroll underneath.
const contrastAudit = page => page.evaluate(() => {
  const parse = s => { const m = s.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m[3] === undefined ? 1 : m[3] }; };
  const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
  const DARKEST = { r: 26, g: 26, b: 26, a: 1 };
  const bgOf = el => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && !/transparent/.test(s.backgroundColor)) {
        const c = parse(s.backgroundColor);
        layers.push(c);
        if (c.a === 1) break;
      }
    }
    let base = layers.length && layers[layers.length - 1].a === 1 ? layers.pop() : DARKEST;
    for (const l of layers.reverse()) base = over(l, base);
    return base;
  };
  const out = { checked: 0, worst: 99, worstText: '', fails: [] };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const el = t.parentElement;
    if (!t.textContent.trim() || !el.getClientRects().length || el.closest('.sr-only, script, style, .skip')) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden') continue;
    const bg = bgOf(el), r = ratio(over(parse(s.color), bg), bg);
    out.checked++;
    if (r < out.worst) { out.worst = r; out.worstText = t.textContent.trim().slice(0, 30); }
    if (r < 4.5) out.fails.push(`"${t.textContent.trim().slice(0, 24)}" ${r.toFixed(2)}`);
  }
  return out;
});
const chartLabels = page => page.evaluate(() => {
  const vis = [...document.querySelectorAll('.x-lab:not(.off)')];
  const all = [...vis, ...document.querySelectorAll('.tick')];
  const boxes = vis.map(l => l.getBoundingClientRect());
  return {
    sizes: all.map(l => parseFloat(getComputedStyle(l).fontSize) * (l.getBoundingClientRect().height / l.offsetHeight)),
    shown: vis.map(l => l.textContent),
    ticks: [...document.querySelectorAll('.tick')].map(l => l.textContent),
    overlap: boxes.some((b, i) => i && b.left < boxes[i - 1].right),
    markers: [...document.querySelectorAll('.pt')].map(p => p.getBoundingClientRect().width),
    inCard: vis.every(l => { const r = l.getBoundingClientRect(), c = document.querySelector('.chart-card').getBoundingClientRect(); return r.left >= c.left && r.right <= c.right; }),
  };
});
const openTable = page => page.evaluate(() => document.querySelector('details.tbl').open = true);
const settle = page => page.waitForTimeout(500);
const PAST = /\b(Mon|Tue|Tues|Wed|Thu|Thur|Thurs|Fri|Sat|Sun)(day|sday|nesday|rsday|urday)?\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? \d{1,2}\b/;
const SIZES = [['320', 320, 568], ['360', 360, 740], ['390', 390, 844], ['414', 414, 896], ['768', 768, 1024], ['1024', 1024, 768], ['1280', 1280, 800], ['667x375', 667, 375]];
const noMotion = { content: '*,*::before,*::after{animation:none!important;transition:none!important}' };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });

  // Every size: all three screens
  for (const [label, width, height] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: width < 768, isMobile: width < 768, deviceScaleFactor: ['320', '390', '1280'].includes(label) ? 2 : 1 });
    const page = await ctx.newPage();
    const errors = [], external = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => m.type() === 'error' && errors.push(m.text()));
    page.on('request', r => { const u = new URL(r.url()); if (/^http/.test(u.protocol) && u.hostname !== new URL(BASE).hostname) external.push(u.hostname); });
    const shot = ['320', '390', '1280'].includes(label);

    const visit = async (name, scope) => {
      await settle(page);
      const a = await audit(page, scope);
      check(`${label} ${name}: no sideways scroll`, a.overflow <= 0 && !a.wide.length, a.wide.join(', '));
      check(`${label} ${name}: tap targets 44px`, !a.small.length, a.small.join('; '));
      check(`${label} ${name}: 8px between targets`, !a.tight.length, a.tight.slice(0, 4).join('; '));
      check(`${label} ${name}: nothing clipped`, !a.clipped.length, a.clipped.join(', '));
    };

    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(2700);
    if (shot) await page.screenshot({ path: path.join(SHOTS, `${label}-0-first-screen.png`) });
    if (height > 480) {
      const clear = await page.evaluate(() => { const n = document.querySelector('.agent-note').getBoundingClientRect(); return ['#headline', '#subline', '#eyebrow'].filter(s => { const e = document.querySelector(s).getBoundingClientRect(); return e.bottom > n.top && e.top < n.bottom && e.right > n.left && e.left < n.right; }); });
      check(`${label} bubble clears the hero`, !clear.length, clear.join(','));
    }
    if (width <= 667) {
      const b = await page.evaluate(() => { const r = document.querySelector('.agent-note').getBoundingClientRect(); return { l: r.left, right: innerWidth - r.right, h: r.height, vh: innerHeight }; });
      check(`${label} bubble is full width with 12px margins`, Math.abs(b.l - 12) < 1 && (Math.abs(b.right - 12) < 1 || b.right > 12), JSON.stringify(b));
    }
    await openTable(page);
    await page.evaluate(() => document.querySelectorAll('.day').forEach(d => d.open = true));
    await visit('dashboard');
    const lines = await page.evaluate(() => { const h = document.getElementById('headline'); return Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight)); });
    if (width === 320) check('320 headline is 3 lines or fewer', lines <= 3, `${lines} lines`);
    const together = await page.evaluate(() => { const r = document.querySelector('.hero em.i').getClientRects(); return r.length; });
    check(`${label} "14 things" stays on one line`, together === 1, String(together));
    if (width >= 1024 && height > 480) check(`${label} headline is 2 lines`, lines === 2, `${lines} lines`);
    const cols = await page.evaluate(() => getComputedStyle(document.getElementById('needs')).gridTemplateColumns.split(' ').length);
    check(`${label} cards: ${width < 760 ? 'one column' : 'two columns'}`, cols === (width < 760 ? 1 : 2), String(cols));
    const c = await chartLabels(page);
    check(`${label} chart labels are 12px or larger`, c.sizes.every(s => s >= 12), c.sizes.map(s => s.toFixed(1)).join(','));
    check(`${label} chart labels do not overlap`, !c.overlap && c.inCard, c.shown.join(' | '));
    check(`${label} chart axis is $20k, $10k, $0`, c.ticks.join() === '$20k,$10k,$0', c.ticks.join());
    check(`${label} chart markers at least 10px`, c.markers.every(m => m >= 10), c.markers.join(','));
    if (width <= 390) check(`${label} chart shows fewer week labels`, c.shown.length < 6 && c.shown[0] === 'Sep 21' && c.shown.at(-1) === 'Oct 26', c.shown.join(' | '));
    if (width >= 768) check(`${label} chart shows all week labels`, c.shown.length === 6, c.shown.join(' | '));
    const tbl = await page.evaluate(() => { const b = document.querySelector('.tbl-box'); return { box: b.getBoundingClientRect().right <= innerWidth, focus: b.tabIndex === 0 }; });
    check(`${label} table stays in its own box`, tbl.box && tbl.focus);
    const v = await axe(page);
    check(`${label} dashboard: axe clean`, !v.length, v.join(' || '));
    const cr = await contrastAudit(page);
    check(`${label} dashboard: ${cr.checked} text pairs pass 4.5:1`, !cr.fails.length, cr.fails.slice(0, 6).join('; ') || `worst ${cr.worst.toFixed(2)}:1 "${cr.worstText}"`);
    if (shot) {
      const pin = await page.addStyleTag({ content: '.agent{position:absolute!important;display:none}' });
      await page.screenshot({ path: path.join(SHOTS, `${label}-1-dashboard.png`), fullPage: true });
      await pin.evaluate(el => el.remove());
    }

    await page.locator('#agent-btn').click();
    await page.waitForSelector('#sheet[open]');
    await page.waitForTimeout(650);
    check(`${label} thread: title`, /Update from your office manager/.test(await page.title()));
    await visit('thread', '#sheet');
    const sg = await page.evaluate(() => { const r = document.getElementById('sheet').getBoundingClientRect(); return { w: r.width, h: r.height, top: r.top, right: innerWidth - r.right, vw: innerWidth, vh: innerHeight, scrolls: document.getElementById('sheet-body').scrollHeight > document.getElementById('sheet-body').clientHeight, lock: getComputedStyle(document.documentElement).overflow }; });
    check(`${label} sheet is ${width < 760 ? 'full height and width' : 'a side panel'}`, width < 760 ? Math.abs(sg.h - sg.vh) < 1 && sg.w === sg.vw : sg.right === 0 && Math.abs(sg.h - sg.vh) < 1, JSON.stringify(sg));
    check(`${label} sheet scrolls inside, page is locked`, sg.scrolls && sg.lock === 'hidden');
    const sv = await axe(page);
    check(`${label} thread: axe clean`, !sv.length, sv.join(' || '));
    const sc = await contrastAudit(page);
    check(`${label} thread: text pairs pass 4.5:1`, !sc.fails.length, sc.fails.slice(0, 6).join('; '));
    if (shot) {
      await page.locator('#sheet [data-card="rebate"]').scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(SHOTS, `${label}-2-update.png`) });
    }
    await page.locator('#sheet [data-card="rebate"] [data-approve]').click();
    await page.waitForSelector('.confirm');
    await visit('confirmation');
    const av = await axe(page);
    check(`${label} confirmation: axe clean`, !av.length, av.join(' || '));
    if (shot) await page.screenshot({ path: path.join(SHOTS, `${label}-3-approved.png`), fullPage: true });
    check(`${label} no console errors`, !errors.length, errors.join(' | '));
    check(`${label} no outside requests, fonts are self-hosted`, !external.length, [...new Set(external)].join(', '));
    await ctx.close();
  }

  // Real phone profiles, in Chrome's mobile emulation
  for (const name of ['iPhone SE', 'iPhone 13', 'Pixel 7', 'Galaxy S9+', 'iPhone 13 landscape']) {
    const { defaultBrowserType, ...profile } = devices[name];
    const ctx = await browser.newContext({ ...profile, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForSelector('.agent-note');
    await page.waitForTimeout(800);
    const a = await audit(page);
    check(`${name}: no sideways scroll`, a.overflow <= 0 && !a.wide.length, a.wide.join(','));
    check(`${name}: tap targets and spacing`, !a.small.length && !a.tight.length, [...a.small, ...a.tight].slice(0, 4).join('; '));
    const covered = await page.evaluate(() => { const b = document.getElementById('agent-btn').getBoundingClientRect(), f = document.querySelector('.foot p'); f.scrollIntoView({ block: 'end' }); return null; });
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(350);
    const foot = await page.evaluate(() => { const hit = (a, c) => a.left < c.right && a.right > c.left && a.top < c.bottom && a.bottom > c.top; const b = document.getElementById('agent-btn').getBoundingClientRect(); return [...document.querySelectorAll('.foot p, .foot a')].some(e => hit(e.getBoundingClientRect(), b)); });
    check(`${name}: avatar never hides the footer`, covered === null && !foot);
    await page.locator('#agent-btn').tap();
    await page.waitForSelector('#sheet[open]');
    await page.waitForTimeout(650);
    await page.locator('#sheet [data-card="rebate"] [data-approve]').tap();
    await page.waitForSelector('.confirm');
    check(`${name}: tap through to confirmation`, /approved\/rebate/.test(page.url()));
    if (name === 'iPhone 13' || name === 'Pixel 7') await page.screenshot({ path: path.join(SHOTS, `device-${name.replace(/ /g, '-')}-confirm.png`) });
    await ctx.close();
  }

  // First screen at 390x844: the first card shows without scrolling
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'load' });
    const top = await page.evaluate(() => document.querySelector('[data-card="rebate"]').getBoundingClientRect().top);
    check('390x844: first card is in the first screen', top < 844 - 100, `card top ${Math.round(top)}`);
    await ctx.close();
  }

  // Large text, two ways, at the sizes most likely to break
  const big = await chromium.launch({ channel: 'chrome', args: ['--blink-settings=defaultFontSize=32'] });
  for (const [how, launcher, style] of [['browser font large', big, null], ['text zoom 200%', browser, 'html{font-size:200%!important}']]) {
    for (const [width, height] of [[320, 568], [390, 844], [768, 1024]]) {
      const ctx = await launcher.newContext({ viewport: { width, height }, isMobile: width < 768, hasTouch: width < 768 });
      const page = await ctx.newPage();
      await page.goto(BASE, { waitUntil: 'load' });
      if (style) await page.addStyleTag({ content: style });
      await page.evaluate(() => { document.querySelector('details.tbl').open = true; document.querySelectorAll('.day').forEach(d => d.open = true); });
      await page.waitForTimeout(400);
      const root = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
      check(`${how} ${width}: text really is large`, root >= 32, String(root));
      const a = await audit(page);
      check(`${how} ${width}: no sideways scroll or clipping`, a.overflow <= 0 && !a.wide.length && !a.clipped.length, [...a.wide, ...a.clipped].join(', '));
      const c = await chartLabels(page);
      check(`${how} ${width}: chart labels do not overlap`, !c.overlap && c.inCard, c.shown.join(' | '));
      const rows = await page.evaluate(() => {
        const hit = (a, c) => a.left < c.right - 1 && a.right > c.left + 1 && a.top < c.bottom - 1 && a.bottom > c.top + 1;
        const blocks = [...document.querySelectorAll('.hero > *, .need, .note, .num-item, .sect > h2, .sect > .sub, .chart-card, .day, .why, .foot p')].filter(e => e.getClientRects().length);
        const bad = [];
        for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) if (!blocks[i].contains(blocks[j]) && !blocks[j].contains(blocks[i]) && hit(blocks[i].getBoundingClientRect(), blocks[j].getBoundingClientRect())) bad.push(blocks[i].className + '/' + blocks[j].className);
        return bad;
      });
      check(`${how} ${width}: nothing overlaps`, !rows.length, rows.slice(0, 4).join('; '));
      await page.locator('#agent-btn').click();
      await page.waitForSelector('#sheet[open]');
      await page.waitForTimeout(650);
      const s = await audit(page, '#sheet');
      check(`${how} ${width}: sheet holds up`, s.overflow <= 0 && !s.clipped.length, s.clipped.join(', '));
      await page.locator('#sheet [data-card="rebate"] [data-approve]').click();
      await page.waitForSelector('.confirm');
      await page.waitForTimeout(300);
      const f = await audit(page);
      check(`${how} ${width}: confirmation holds up`, f.overflow <= 0 && !f.wide.length && !f.clipped.length, [...f.wide, ...f.clipped].join(', '));
      await ctx.close();
    }
  }
  await big.close();

  // Data agreement, the flow, undo and live announcements
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(1600);
  const facts = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('tbody tr')].map(r => [...r.children].map(c => c.textContent));
    const byType = {};
    document.querySelectorAll('.day li').forEach(l => { byType[l.dataset.type] = (byType[l.dataset.type] || 0) + +l.dataset.n; });
    const order = [...document.querySelectorAll('main .wrap > *, main .hero > *')].map(e => e.id || e.className.split(' ')[0]);
    return {
      summary: document.getElementById('headline').textContent.replace(/ /g, ' '),
      label: document.getElementById('headline').getAttribute('aria-label'),
      sub: document.getElementById('subline').textContent,
      eyebrow: document.getElementById('eyebrow').textContent,
      invoiced: document.getElementById('stat-invoiced').textContent,
      collected: document.getElementById('stat-collected').textContent,
      rebates: document.getElementById('stat-rebates').textContent,
      kpis: document.querySelectorAll('.num-item').length,
      title: document.getElementById('chart-title').textContent.replace(/ /g, ' '),
      summaryLine: document.getElementById('chart-summary').textContent,
      byType,
      days: [...document.querySelectorAll('.day-count')].map(n => parseInt(n.textContent)),
      didCount: document.getElementById('did-count').textContent,
      needs: document.querySelectorAll('#needs .need').length,
      needTitles: [...document.querySelectorAll('#needs .need-title')].map(n => n.textContent),
      lastRow: rows.at(-1), firstRow: rows[0], rowCount: rows.length,
      alt: document.querySelector('[role="img"]').getAttribute('aria-label'),
      sample: document.querySelector('.bar .pill').textContent,
      why: document.querySelectorAll('#why-list li').length,
      inputs: document.querySelectorAll('input, textarea, [contenteditable]').length,
      order,
      italicPerHeading: [...document.querySelectorAll('h1, h2.dsp')].map(h => h.querySelectorAll('em.i').length),
      header: (() => { const s = getComputedStyle(document.querySelector('.bar')); return { bg: s.backgroundColor, blur: s.backdropFilter || 'none', pos: s.position }; })(),
      theme: document.querySelector('meta[name=theme-color]').content,
      vp: document.querySelector('meta[name=viewport]').content,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      fonts: [getComputedStyle(document.getElementById('headline')).fontFamily, getComputedStyle(document.body).fontFamily],
    };
  });
  const money = s => +s.replace(/[$,]/g, '');
  check('hero sentence is exact', facts.summary === 'Your office manager handled 14 things this week.', facts.summary);
  check('headline label never exposes the count-up', facts.label === 'Your office manager handled 14 things this week.', facts.label);
  check('supporting line is exact', facts.sub === '2 need you. The rest is handled.', facts.sub);
  check('sample week is labeled', /Sample week: Oct 26 to Nov 1, 2026/.test(facts.eyebrow), facts.eyebrow);
  check('order matches version A', ['eyebrow', 'headline', 'hero-sub', 'needs', 'provenance', 'nums', 'sect', 'sect', 'why'].every((k, i, a) => { const at = facts.order.indexOf(k, i && a[i - 1] === k ? facts.order.indexOf(k) + 1 : 0); return at > -1; }), facts.order.join(' '));
  check('3 quiet numbers', facts.kpis === 3);
  check('timeline adds up to the hero', facts.days.reduce((a, b) => a + b, 0) === 14 && facts.didCount === '14', facts.days.join('+'));
  const t = facts.byType;
  check('work types are 2+2+2+6+1+1', [t.rebates, t.permits, t.registrations, t.invoicing, t.ar, t.expenses].join('+') === '2+2+2+6+1+1', JSON.stringify(t));
  check('the exact 2 Needs-you items', facts.needs === 2 && facts.needTitles.join('|') === 'Heat pump rebate form|Overdue payment reminder', facts.needTitles.join('|'));
  const growth = Math.round((money(facts.lastRow[2]) / money(facts.firstRow[2]) - 1) * 100);
  check('growth is computed and correct', growth === 29 && facts.title === `Cash collected is up ${growth}% in six weeks.`, facts.title);
  check('collected = last chart point = table', facts.collected === '$15,200' && facts.lastRow[2] === facts.collected && facts.summaryLine.includes(facts.collected) && facts.alt.includes(facts.collected), facts.collected);
  check('invoiced = table', facts.invoiced === facts.lastRow[1], facts.invoiced);
  check('chart weeks match the displayed week', facts.rowCount === 6 && facts.lastRow[0] === 'Oct 26 to Nov 1', facts.lastRow[0]);
  check('chart has a text alternative', /starts at zero/.test(facts.alt), facts.alt);
  check('Sample data label', facts.sample === 'Sample data');
  check('why box has 3 points', facts.why === 3);
  check('no typing box', facts.inputs === 0);
  check('one italic blue phrase per heading', facts.italicPerHeading.every(n => n === 1), facts.italicPerHeading.join());
  check('header is solid, nothing shows through', /^rgb\(251, 248, 242\)$/.test(facts.header.bg) && facts.header.blur === 'none' && facts.header.pos === 'sticky', JSON.stringify(facts.header));
  check('theme color matches the cream page', facts.theme === '#fbf8f2' && facts.bodyBg === 'rgb(251, 248, 242)', facts.theme);
  check('viewport-fit=cover', /viewport-fit=cover/.test(facts.vp));
  check('EB Garamond and Figtree', /EB Garamond/.test(facts.fonts[0]) && /Figtree/.test(facts.fonts[1]));
  check('fonts really loaded', await page.evaluate(() => document.fonts.check('400 40px "EB Garamond"') && document.fonts.check('italic 400 40px "EB Garamond"') && document.fonts.check('500 17px Figtree')));

  // The axis starts at 0, and the points are placed on that axis
  const axis = await page.evaluate(() => {
    const plot = document.getElementById('plot'), r = plot.getBoundingClientRect();
    const pos = el => (el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2 - r.top) / r.height;
    return {
      lo: plot.dataset.lo, hi: plot.dataset.hi,
      zero: pos(plot.querySelector('.tick[data-value="0"]')),
      last: [...plot.querySelectorAll('.pt')].map(p => [+p.dataset.value, pos(p)]),
    };
  });
  check('chart axis starts at $0', axis.lo === '0' && Math.abs(axis.zero - 1) < .01, `${axis.lo}, ${axis.zero.toFixed(3)}`);
  check('chart points sit on a zero-based axis', axis.last.every(([v, y]) => Math.abs((1 - v / +axis.hi) - y) < .012), JSON.stringify(axis.last.map(([, y]) => +y.toFixed(3))));

  // Tap to open, with a clear open or closed state
  const table = page.locator('details.tbl');
  await table.locator('summary').click();
  check('table toggle opens', await table.evaluate(d => d.open) && await page.locator('details.tbl table').isVisible());
  const chev = () => table.locator('.chev').evaluate(c => getComputedStyle(c).transform);
  await page.waitForTimeout(350);
  const openChev = await chev();
  await table.locator('summary').click();
  await page.waitForTimeout(350);
  check('table toggle closes, chevron shows the state', !(await table.evaluate(d => d.open)) && openChev !== await chev(), openChev);
  const monday = page.locator('.day').first();
  check('timeline days start closed', await page.locator('.day[open]').count() === 0);
  await monday.locator('summary').click();
  check('timeline day opens', await monday.evaluate(d => d.open) && (await monday.innerText()).includes('Housecall Pro'));
  await monday.locator('summary').click();
  check('timeline day closes', !(await monday.evaluate(d => d.open)));
  await page.evaluate(() => window.scrollTo(0, 0));

  const liveText = () => page.locator('#live').textContent();
  await page.locator('#agent-btn').click();
  await page.waitForSelector('#sheet[open]');
  await page.waitForTimeout(650);
  check('sheet shows Sample data', await page.locator('#sheet .pill').textContent() === 'Sample data');
  const threadText = await page.locator('#sheet-body').innerText();
  check('thread agrees on count and cash', threadText.includes('14 things done') && threadText.includes('$15,200 collected'));
  check('thread agrees on invoices', threadText.includes('That’s 6 for the week'));
  check('thread dates agree with the week', (await page.locator('.day-head').allTextContents()).join('|') === 'Monday, Oct 26|Wednesday, Oct 28|Friday, Oct 30|This morning', (await page.locator('.day-head').allTextContents()).join('|'));
  check('“Drafted with AI” is shown exactly once', await page.evaluate(() => (document.body.innerText.match(/Drafted with AI\. Checked by Dana\./g) || []).length) === 1 && await page.evaluate(() => !document.getElementById('sheet').textContent.includes('Drafted with AI')));

  await page.locator('#sheet [data-card="rebate"] [data-approve]').click();
  await page.waitForSelector('.confirm');
  await page.waitForTimeout(200);
  check('approve lands on confirmation', /approved\/rebate/.test(page.url()));
  check('sheet closes on approve', !(await page.evaluate(() => document.getElementById('sheet').open)));
  check('approval is announced', /Approved: Heat pump rebate form/.test(await liveText()), await liveText());
  check('focus moved to confirmation heading', await page.evaluate(() => document.activeElement.tagName) === 'H1');
  await page.click('[data-undo]');
  await page.waitForSelector('#sheet[open]');
  await page.waitForTimeout(650);
  check('undo returns to thread with item open', await page.locator('#sheet [data-card="rebate"] [data-approve]').count() === 1);
  check('undo is announced', /Undone/.test(await liveText()), await liveText());
  check('focus back on Approve after undo', await page.evaluate(() => document.activeElement.dataset.approve) === 'rebate');

  await page.locator('#sheet [data-card="rebate"] [data-approve]').click();
  await page.waitForSelector('.confirm');
  await page.click('text=Back to your week');
  await page.waitForSelector('#headline');
  check('dashboard reflects approval', (await page.locator('#subline').textContent()) === '1 needs you. The rest is handled.', await page.locator('#subline').textContent());
  check('dot still orange with 1 left', !(await page.locator('#agent-dot').evaluate(d => d.classList.contains('calm'))));
  await page.locator('#needs [data-approve="reminder"]').click();
  await page.waitForSelector('.confirm');
  await page.click('text=Back to your week');
  await page.waitForSelector('#headline');
  check('all-clear state', (await page.locator('#subline').textContent()) === 'All caught up.');
  await page.waitForSelector('.agent-note[data-kind="caught"]');
  await page.waitForTimeout(700);
  check('bubble turns positive', (await page.locator('.agent-text').textContent()) === 'All caught up. Keep it that way.');
  const dot = await page.locator('#agent-dot').evaluate(d => getComputedStyle(d).backgroundColor);
  check('status dot turns green', dot === 'rgb(30, 122, 75)', dot);
  check('agent name reflects caught up', /All caught up/.test(await page.locator('#agent-btn').getAttribute('aria-label')));

  await page.locator('#needs a:has-text("See what’s next")').nth(1).click();
  await page.waitForSelector('.confirm');
  await page.waitForTimeout(21000);
  check('undo window closes', await page.locator('[data-undo]').count() === 0 && /locked in/.test(await page.locator('#undo').textContent()));
  check('close is announced', /Undo time is over/.test(await liveText()), await liveText());

  await page.click('#reset');
  await page.waitForSelector('#headline');
  check('reset restores 2 items', (await page.locator('#subline').textContent()) === '2 need you. The rest is handled.');

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('#needs [data-call="rebate"]').click();
  await page.waitForTimeout(100);
  check('Ask Dana to call shows a note', (await page.locator('#needs [data-card="rebate"] .call-note').textContent()) === 'Dana will call you today.');
  check('call request is announced', /Dana will call you/.test(await liveText()));
  check('call request keeps focus on Approve', await page.evaluate(() => document.activeElement.dataset.approve) === 'rebate');
  await ctx.close();

  // Back and Forward restore state and scroll, links don't break
  const nctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const n = await nctx.newPage();
  await n.goto(BASE, { waitUntil: 'load' });
  await n.evaluate(() => window.scrollTo(0, 700));
  await n.waitForTimeout(100);
  await n.locator('#agent-btn').evaluate(b => b.click());
  await n.waitForSelector('#sheet[open]');
  await n.goBack();
  await n.waitForTimeout(500);
  check('Back closes the sheet and keeps scroll', !(await n.evaluate(() => document.getElementById('sheet').open)) && Math.abs(await n.evaluate(() => window.scrollY) - 700) < 5, String(await n.evaluate(() => window.scrollY)));
  await n.evaluate(() => window.scrollTo(0, 400));
  await n.waitForTimeout(100);
  await n.locator('#needs [data-approve="rebate"]').evaluate(b => b.click());
  await n.waitForSelector('.confirm');
  await n.goBack();
  await n.waitForSelector('#headline');
  await n.waitForTimeout(100);
  check('Back from confirmation restores scroll', Math.abs(await n.evaluate(() => window.scrollY) - 400) < 5, String(await n.evaluate(() => window.scrollY)));
  const deep = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await deep.goto(BASE + '#/update', { waitUntil: 'load' });
  check('#/update deep link opens the sheet', await deep.evaluate(() => document.getElementById('sheet').open));
  await deep.waitForTimeout(2500);
  check('no bubble over a deep-linked sheet', await deep.locator('.agent-note').count() === 0);
  await deep.goto(BASE + '#/approved/rebate');
  await deep.waitForTimeout(300);
  check('stale confirmation link lands on thread', deep.url().endsWith('#/update') && await deep.evaluate(() => document.getElementById('sheet').open));
  await nctx.close();

  // The bubble: appears once, hides five ways
  const bubbleCtx = async (w = 390, h = 844) => { const c = await browser.newContext({ viewport: { width: w, height: h } }); const p = await c.newPage(); await p.goto(BASE, { waitUntil: 'load' }); return p; };
  {
    const b = await bubbleCtx();
    await b.waitForTimeout(1200);
    check('bubble waits about 2s', await b.locator('.agent-note').count() === 0);
    await b.waitForSelector('.agent-note', { timeout: 2500 });
    const shownAt = Date.now();
    await b.waitForTimeout(700);
    const r = await b.evaluate(() => ({
      focus: document.activeElement === document.body,
      polite: document.getElementById('agent-live').getAttribute('aria-live'),
      text: document.querySelector('.agent-text').textContent,
      clearOfHero: (() => { const n = document.querySelector('.agent-note').getBoundingClientRect(); return ['#headline', '#subline', '#eyebrow'].every(s => { const e = document.querySelector(s).getBoundingClientRect(); return e.bottom <= n.top || e.top >= n.bottom; }); })(),
    }));
    check('bubble text is exact', r.text === '2 things need your okay. Everything else is handled.', r.text);
    check('bubble does not steal focus', r.focus);
    check('bubble is a polite live region', r.polite === 'polite');
    check('bubble clears the hero', r.clearOfHero);
    await b.waitForFunction(() => !document.querySelector('.agent-note'), null, { timeout: 9000 });
    const life = Date.now() - shownAt;
    check('bubble hides by itself after about 8s', life > 7000 && life < 9000, `${life}ms`);
    check('avatar stays after it hides', await b.locator('#agent-btn').isVisible());
    await b.waitForTimeout(3000);
    check('bubble appears once', await b.locator('.agent-note').count() === 0);
    await b.context().close();
  }
  {
    const b = await bubbleCtx();
    await b.waitForSelector('.agent-note');
    await b.waitForTimeout(700);
    await b.locator('#bubble-later').click();
    await b.waitForTimeout(350);
    check('Later hides the bubble', await b.locator('.agent-note').count() === 0);
    await b.waitForTimeout(2600);
    check('bubble stays gone after Later', await b.locator('.agent-note').count() === 0);
    await b.reload({ waitUntil: 'load' });
    await b.waitForTimeout(2800);
    check('bubble stays gone after reload', await b.locator('.agent-note').count() === 0);
    await b.context().close();
  }
  {
    const b = await bubbleCtx();
    await b.waitForSelector('.agent-note');
    await b.waitForTimeout(700);
    await b.evaluate(() => window.scrollTo(0, 200));
    await b.waitForTimeout(300);
    check('bubble survives a small scroll', await b.locator('.agent-note').count() === 1);
    await b.evaluate(() => window.scrollTo(0, 300));
    await b.waitForTimeout(350);
    check('bubble hides past 260px of scroll', await b.locator('.agent-note').count() === 0);
    await b.context().close();
  }
  {
    const b = await bubbleCtx();
    await b.waitForSelector('.agent-note');
    await b.waitForTimeout(700);
    await b.keyboard.press('Escape');
    await b.waitForTimeout(350);
    check('Escape hides the bubble', await b.locator('.agent-note').count() === 0);
    await b.context().close();
  }
  {
    const b = await bubbleCtx();
    await b.waitForSelector('.agent-note');
    await b.waitForTimeout(700);
    await b.locator('#bubble-review').click();
    await b.waitForSelector('#sheet[open]');
    await b.waitForTimeout(650);
    await b.keyboard.press('Escape');
    await b.waitForFunction(() => !document.getElementById('sheet').open);
    await b.waitForTimeout(2600);
    check('bubble does not return after Review', await b.locator('.agent-note').count() === 0);
    await b.context().close();
  }
  {
    const b = await bubbleCtx(667, 375);
    await b.waitForSelector('.agent-note');
    await b.waitForTimeout(700);
    const g = await b.evaluate(() => { const hit = (a, c) => a.left < c.right && a.right > c.left && a.top < c.bottom && a.bottom > c.top; const n = document.querySelector('.agent-note').getBoundingClientRect(); return { avatar: hit(n, document.getElementById('agent-btn').getBoundingClientRect()), fits: n.top >= 0 && n.bottom <= innerHeight }; });
    check('landscape: bubble clears the avatar and fits', !g.avatar && g.fits, JSON.stringify(g));
    await b.context().close();
  }

  // The sheet: keyboard, trap, Escape, focus return
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const sctx = await browser.newContext({ viewport: { width: w, height: h } });
    const s = await sctx.newPage();
    await s.goto(BASE, { waitUntil: 'load' });
    await s.waitForTimeout(300);
    await s.focus('#agent-btn');
    await s.keyboard.press('Enter');
    await s.waitForSelector('#sheet[open]');
    await s.waitForTimeout(700);
    check(`${w}: focus starts inside the sheet`, await s.evaluate(() => document.getElementById('sheet').contains(document.activeElement)));
    let escaped = false;
    for (let i = 0; i < 20; i++) {
      await s.keyboard.press('Tab');
      if (!(await s.evaluate(() => document.activeElement === document.body || document.getElementById('sheet').contains(document.activeElement)))) escaped = true;
    }
    check(`${w}: focus is trapped`, !escaped);
    await s.keyboard.press('Escape');
    await s.waitForFunction(() => !document.getElementById('sheet').open);
    await s.waitForTimeout(100);
    check(`${w}: Escape closes the sheet`, !s.url().includes('#/update'), s.url());
    check(`${w}: focus returns to the avatar`, await s.evaluate(() => document.activeElement.id) === 'agent-btn');
    const name = await s.locator('#agent-btn').getAttribute('aria-label');
    check(`${w}: avatar has a name`, /Dana, your office manager/.test(name), name);
    await sctx.close();
  }

  // No layout shift, even with slow fonts
  for (const [label, delay] of [['fast fonts', 0], ['slow fonts', 1500]]) {
    const lctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const l = await lctx.newPage();
    if (delay) await l.route('**/fonts/**', async r => { await new Promise(f => setTimeout(f, delay)); await r.continue(); });
    await l.addInitScript(() => { window.__cls = 0; new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
    await l.goto(BASE, { waitUntil: 'load' });
    await l.waitForTimeout(3600);
    const cls = await l.evaluate(() => window.__cls);
    check(`no layout shift with ${label}`, cls < 0.05, cls.toFixed(4));
    await lctx.close();
  }

  // Keyboard only
  const kctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const k = await kctx.newPage();
  await k.goto(BASE, { waitUntil: 'load' });
  await k.keyboard.press('Tab');
  check('first Tab is the skip link', await k.evaluate(() => document.activeElement.id) === 'skip');
  await k.keyboard.press('Enter');
  check('skip link moves focus to main', await k.evaluate(() => document.activeElement.id) === 'main');
  const walk = async (limit = 40) => {
    const out = [];
    for (let i = 0; i < limit; i++) {
      await k.keyboard.press('Tab');
      await k.waitForTimeout(40);
      const info = await k.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el), r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { name: (el.getAttribute('aria-label') || el.innerText || el.id || '').trim().slice(0, 44), ring: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2, covered: !(top && (el === top || el.contains(top) || top.contains(el))) };
      });
      if (!info) break;
      out.push(info);
    }
    return out;
  };
  const dashStops = await walk();
  check('dashboard: every stop has a focus ring', dashStops.every(s => s.ring), dashStops.filter(s => !s.ring).map(s => s.name).join(', '));
  check('dashboard: focus never covered', dashStops.every(s => !s.covered), dashStops.filter(s => s.covered).map(s => s.name).join(', '));
  check('dashboard: reaches key controls', ['Approve heat pump rebate form', 'Approve overdue payment reminder', 'See the numbers as a table', 'Original site (opens in a new tab)'].every(n => dashStops.some(s => s.name === n || s.name.startsWith(n.slice(0, 13)))), `${dashStops.length} stops`);

  await k.focus('#agent-btn');
  await k.keyboard.press('Enter');
  await k.waitForSelector('#sheet[open]');
  await k.waitForTimeout(650);
  const threadStops = await walk(12);
  check('thread: every stop has a focus ring', threadStops.every(s => s.ring), threadStops.filter(s => !s.ring).map(s => s.name).join(', '));
  await k.focus('#sheet [data-card="reminder"] [data-approve]');
  await k.keyboard.press('Enter');
  await k.waitForSelector('.confirm');
  check('Approve works from the keyboard', /approved\/reminder/.test(k.url()));
  await k.focus('[data-undo]');
  await k.keyboard.press('Enter');
  await k.waitForSelector('#sheet[open]');
  check('Undo works from the keyboard', k.url().endsWith('#/update'));
  await kctx.close();

  // Reduced motion
  const rctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const r = await rctx.newPage();
  await r.goto(BASE, { waitUntil: 'load' });
  const instant = await r.evaluate(() => ({
    count: document.getElementById('count').textContent,
    anims: document.getAnimations().length,
    cover: getComputedStyle(document.querySelector('.draw-cover')).transform,
    needs: getComputedStyle(document.getElementById('needs')).opacity,
  }));
  check('reduced motion: nothing animates on load', instant.anims === 0, String(instant.anims));
  check('reduced motion: no count-up', instant.count === '14', instant.count);
  check('reduced motion: no line draw, no entrance', /matrix\(0/.test(instant.cover) && instant.needs === '1', instant.cover);
  await r.waitForSelector('.agent-note');
  check('reduced motion: bubble has no bounce', await r.evaluate(() => document.getAnimations().length) === 0);
  await r.locator('#bubble-review').click();
  await r.waitForSelector('#sheet[open]');
  check('reduced motion: sheet has no slide', await r.evaluate(() => document.getAnimations({ subtree: true }).length) === 0);
  await r.keyboard.press('Escape');
  await r.waitForFunction(() => !document.getElementById('sheet').open);
  await r.locator('#needs [data-approve="rebate"]').click();
  await r.waitForSelector('.confirm');
  check('reduced motion: confirmation is still', await r.evaluate(() => document.getAnimations().length) === 0);
  await rctx.close();

  // Motion on: the first paint really animates, with no screen-reader leak
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const m = await mctx.newPage();
  await m.goto(BASE, { waitUntil: 'commit' });
  await m.waitForSelector('#count');
  const moving = await m.evaluate(() => ({ anims: document.getAnimations().length, props: document.getAnimations().flatMap(a => a.effect.getKeyframes().flatMap(k => Object.keys(k))).filter(p => !['offset', 'computedOffset', 'easing', 'composite', 'transform', 'opacity'].includes(p)), label: document.getElementById('headline').getAttribute('aria-label') }));
  check('motion on: entrance and draw run', moving.anims > 3, String(moving.anims));
  check('motion on: only transform and opacity animate', !moving.props.length, moving.props.join(','));
  check('motion on: label is stable during count-up', moving.label.includes('handled 14 things'));
  await mctx.close();

  // No card shows a date that could already be in the past
  const dctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const d = await dctx.newPage();
  await d.goto(BASE, { waitUntil: 'load' });
  // The install date is a past fact the owner confirms, so it is the one marked exception.
  const cardText = sel => d.evaluate(sel => [...document.querySelectorAll(sel)].map(c => { const x = c.cloneNode(true); x.querySelectorAll('[data-past-fact]').forEach(f => f.remove()); return x.textContent; }).join(' \n '), sel);
  const dashCards = await cardText('#needs .need');
  check('dashboard cards: no past date', !PAST.test(dashCards), (dashCards.match(PAST) || [''])[0]);
  check('Greer card says tomorrow at 9 AM', dashCards.includes('Goes out tomorrow at 9 AM'));
  await d.waitForSelector('.agent-note');
  check('bubble: no past date', !PAST.test(await d.locator('.agent-note').textContent()));
  await d.locator('#bubble-review').click();
  await d.waitForSelector('#sheet[open]');
  const sheetCards = await cardText('#sheet .need');
  check('thread cards: no past date', !PAST.test(sheetCards), (sheetCards.match(PAST) || [''])[0]);
  for (const id of ['rebate', 'reminder']) {
    await d.evaluate(id => document.querySelector(`#sheet [data-card="${id}"] [data-approve]`).click(), id);
    await d.waitForSelector('.confirm');
    const confirm = await d.evaluate(() => document.getElementById('confirm-card').textContent.replace('Oct 22, 2026', ''));
    check(`confirmation ${id}: no past date`, !PAST.test(confirm), (confirm.match(PAST) || [''])[0]);
    await d.evaluate(() => { location.hash = '#/update'; });
    await d.waitForSelector('#sheet[open]');
  }
  await dctx.close();

  // Real Safari engine, when installed
  try {
    const wk = await webkit.launch();
    for (const name of ['iPhone SE', 'iPhone 13']) {
      const { defaultBrowserType, ...profile } = devices[name];
      const wctx = await wk.newContext({ ...profile, deviceScaleFactor: 1 });
      const w = await wctx.newPage();
      const errs = [];
      w.on('pageerror', e => errs.push(e.message));
      await w.goto(BASE, { waitUntil: 'load' });
      await w.waitForSelector('.agent-note');
      await w.waitForTimeout(800);
      const a = await audit(w);
      check(`WebKit ${name}: no sideways scroll`, a.overflow <= 0 && !a.wide.length, a.wide.join(','));
      const c = await chartLabels(w);
      check(`WebKit ${name}: chart labels 12px+, no overlap`, c.sizes.every(s => s >= 12) && !c.overlap, c.shown.join(' | '));
      await w.locator('#bubble-review').tap();
      await w.waitForSelector('#sheet[open]');
      await w.waitForTimeout(700);
      const h = await w.evaluate(() => [document.getElementById('sheet').getBoundingClientRect().height, innerHeight]);
      check(`WebKit ${name}: sheet is full height`, Math.abs(h[0] - h[1]) < 2, h.join('/'));
      await w.locator('#sheet [data-card="rebate"] [data-approve]').tap();
      await w.waitForSelector('.confirm');
      check(`WebKit ${name}: reaches confirmation, no errors`, !errs.length, errs.join(' | '));
      await wctx.close();
    }
    await wk.close();
  } catch (e) {
    console.log('SKIP  WebKit run: ' + e.message.split('\n')[0]);
  }

  // Rules on the source itself
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const allowed = new Set(['#fbf8f2', '#1a1a1a', '#5e5b54', '#e8e3d6', '#ffffff', '#2238dd', '#efe6ff', '#3a2a8a', '#f1ede0', '#e8573a', '#1e7a4b']);
  const used = [...new Set(src.match(/#[0-9a-fA-F]{6}\b/g).map(c => c.toLowerCase()))];
  check('only version A colors and WorkHero blue', used.every(c => allowed.has(c)), used.filter(c => !allowed.has(c)).join(', '));
  const banned = /AI-powered|powered by AI|sparkle|✨|Just Right|Mountain West|Jarhead|State Forty|Steele|Wesco|Book a Call|hipaa|soc 2|\bsecure\b|compliant|20hrs|92%|7\.5x|pay the vendor|pay vendor|\bApple\b|\bWispr\b/i;
  const css = src.match(/<style>([\s\S]*?)<\/style>/)[1];
  const body = src.replace(/<style>[\s\S]*?<\/style>/, '');
  check('no banned claims, labels or customer names', !banned.test(body), (body.match(banned) || [''])[0]);
  check('no leftovers from the reference', !/data-v\b|var-[abcd]|class="sw|Midnight|Bento|data-go/.test(src));
  check('no Google Fonts at runtime', !/fonts\.(googleapis|gstatic)/.test(src));
  check('growth is not hard-coded', !/29\s*%/.test(src));
  check('font-display: swap on every font', (css.match(/url\(\/fonts/g) || []).length === (css.match(/font-display: swap/g) || []).length);
  const externals = [...body.matchAll(/<a [^>]*href="(https?:[^"]+)"[^>]*>/g)];
  check('one external link, opening in a new tab', externals.length === 1 && /target="_blank"/.test(externals[0][0]), externals.map(e => e[1]).join(', '));
  check('no "..." in copy', !/>[^<]*\.\.\.[^<]*</.test(body.replace(/<script>[\s\S]*<\/script>/, '')));
  const badTransitions = [...css.matchAll(/transition:\s*([^;]+);/g)].map(m => m[1]).filter(t => t !== 'none !important').filter(t => t.split(',').some(p => !/^\s*(transform|opacity)\b/.test(p)));
  check('transitions touch only transform and opacity', !badTransitions.length, badTransitions.join(' | '));
  const badFrames = [...css.matchAll(/@keyframes \w+ \{([^@]*?)\}\s*\}?/g)].map(m => m[1]).filter(f => [...f.matchAll(/([a-z-]+):/g)].some(p => !['transform', 'opacity'].includes(p[1])));
  check('keyframes touch only transform and opacity', !badFrames.length, badFrames.join(' | '));
  check('no hover-only behavior', ![...css.matchAll(/@media \(hover: hover\) \{([\s\S]*?)\n\}/g)].some(m => /display|visibility/.test(m[1])));
  check('no animation library', !/<script[^>]+src=/.test(src));
  const fontBytes = fs.readdirSync(path.join(__dirname, '..', 'fonts')).reduce((t, f) => t + fs.statSync(path.join(__dirname, '..', 'fonts', f)).size, 0);
  check('fonts are subset', fontBytes < 60000, `${Math.round(fontBytes / 1024)}KB`);

  const lum = h => { const v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4)); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
  const wob = 1.05 / (lum('#2238dd') + .05);
  check('white on the blue button passes AA', wob >= 4.5, wob.toFixed(2) + ':1');

  // Nothing private goes out
  if (/^https/.test(BASE)) {
    for (const p of ['tests/checks.cjs', 'tests/screenshots/cream/390-1-dashboard.png', 'docs/phonely-audit.md', 'README.md', 'og', 'screenshots/x.png', 'workhero-4-versions.html']) {
      const res = await fetch(BASE + p, { redirect: 'follow' });
      check(`not deployed: ${p}`, res.status === 404, String(res.status));
    }
    const og = await fetch(BASE + 'og.png');
    check('og.png is live', og.ok && og.headers.get('content-type') === 'image/png');
    const font = await fetch(BASE + 'fonts/figtree-var.woff2');
    check('fonts are served from this site', font.ok);
  }

  await browser.close();
  console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
