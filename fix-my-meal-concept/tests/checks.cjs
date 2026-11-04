// End-to-end checks and screenshots in the installed Google Chrome.
// Run: NODE_PATH=<dir with playwright, axe-core> node tests/checks.cjs [baseUrl]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const BASE = process.argv[2] || 'http://localhost:4174/';
const SHOTS = path.join(__dirname, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
};

// Sideways overflow anywhere, clipped text, and controls under 44px.
const audit = page => page.evaluate(() => {
  const de = document.documentElement, scroll = document.getElementById('main');
  const out = {
    pageOverflow: de.scrollWidth - de.clientWidth,
    innerOverflow: scroll.scrollWidth - scroll.clientWidth,
    small: [], clipped: [],
  };
  const phone = document.querySelector('.phone').getBoundingClientRect();
  document.querySelectorAll('button, a, input, textarea, .check').forEach(el => {
    const r = el.getBoundingClientRect();
    if (!r.width || el.id === 'skip') return;
    if (el.type === 'checkbox') return; // its label is the target
    if (r.height < 44 || (r.width < 44 && !el.closest('.check'))) out.small.push(`${el.textContent.trim().slice(0, 24) || el.getAttribute('aria-label')} ${Math.round(r.width)}x${Math.round(r.height)}`);
  });
  document.querySelectorAll('p, h1, h2, span, strong, small, b, s, th, td, li, output').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width && (r.right > phone.right + .5 || r.left < phone.left - .5) && !el.closest('.sr')) out.clipped.push(el.textContent.trim().slice(0, 30));
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).display !== 'inline' && !el.closest('.sr') && !el.classList.contains('sr')) out.clipped.push('inner: ' + el.textContent.trim().slice(0, 30));
  });
  return out;
});
const total = page => page.$eval('[data-total]', el => el.textContent);
const settle = page => page.waitForTimeout(1900);

async function axe(page, label) {
  await page.evaluate(axeSource);
  const r = await page.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] }));
  check(`axe ${label}`, r.violations.length === 0, r.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`).join(' | '));
}
async function auditScreen(page, width, label) {
  const a = await audit(page);
  check(`${width} ${label}: no sideways overflow`, a.pageOverflow <= 0 && a.innerOverflow <= 0, `page ${a.pageOverflow}, inner ${a.innerOverflow}`);
  check(`${width} ${label}: nothing clipped`, a.clipped.length === 0, a.clipped.join(', '));
  check(`${width} ${label}: targets at least 44px`, a.small.length === 0, a.small.join(', '));
  await page.screenshot({ path: path.join(SHOTS, `${width}-${label}.png`) });
  await page.screenshot({ path: path.join(SHOTS, `${width}-${label}-full.png`), fullPage: false, clip: undefined });
}

async function flow(browser, width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: width < 600 });
  const page = await ctx.newPage();
  const errors = [], external = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) external.push(r.url()); });

  await page.goto(BASE);
  await page.evaluate(() => document.fonts.ready);
  const notice = await page.$eval('.notice', el => { const r = el.getBoundingClientRect(); return { text: el.textContent, top: r.top, bottom: r.bottom }; });
  check(`${width} notice says independent, visible at top`, /Not made by or affiliated with Healthify/.test(notice.text) && notice.bottom < height / 3);
  check(`${width} first total is 760`, await total(page) === '760');
  await auditScreen(page, width, '1-result');
  if (width === 390) await axe(page, 'result');

  // Chips edit in place
  await page.click('.chip[data-k="oil"]');
  check(`${width} chip opens stepper`, await page.isVisible('#panel'));
  await page.waitForTimeout(400);
  await auditScreen(page, width, '1b-chip-open');
  if (width === 390) await axe(page, 'chip open');
  await page.click('.round[data-d="-1"]');
  await page.waitForTimeout(500);
  check(`${width} stepper moves total`, await total(page) === '730', await total(page));
  check(`${width} chip shows Yours`, /Yours/.test(await page.textContent('.chip[data-k="oil"]')));
  await page.click('.round[data-d="1"]');
  await page.waitForTimeout(500);
  check(`${width} back at guess shows Guess`, /Guess/.test(await page.textContent('.chip[data-k="oil"]')));
  await page.click('.chip[data-k="oil"]');

  // Fix box
  await page.click('a[href="#/fix"]');
  await auditScreen(page, width, '2-fix');
  await page.click('[data-act="check"]');
  check(`${width} empty fix shows inline error`, await page.isVisible('#fix-err'));
  check(`${width} empty fix focuses box`, await page.evaluate(() => document.activeElement.id === 'fix'));
  if (width === 390) await axe(page, 'fix error');

  // A slip does not go through
  await page.fill('#fix', '200 rotis');
  await page.click('[data-act="check"]');
  await page.waitForTimeout(500);
  check(`${width} slip is caught`, /looks like a slip/.test(await page.textContent('#result')) && /20,000|20,000/.test((await page.textContent('#result')).replace(/\s/g, ' ')), (await page.textContent('#result')).trim().slice(0, 90));
  await auditScreen(page, width, '2b-slip');
  if (width === 390) await axe(page, 'slip');
  await page.click('[data-act="use-slip"]');
  check(`${width} slip can become 2 rotis`, /2 rotis/.test(await page.textContent('#result')));

  // The sentence from the recording's test, in grams, does not blow up
  await page.fill('#fix', 'I had 120g rice with 200g chicken and 200g vegetables');
  await page.click('[data-act="check"]');
  await page.waitForTimeout(400);
  const grams = await page.textContent('#result');
  check(`${width} grams stay sane`, /about 1¼ katori sabzi/.test(grams) && /120g rice/.test(grams) && /200g chicken/.test(grams), grams.trim().slice(0, 160));

  // The real fix
  await page.fill('#fix', '2 rotis, not 3. Half a ladle of oil');
  await page.click('[data-act="check"]');
  await page.waitForTimeout(500);
  const understood = await page.textContent('#result');
  check(`${width} reads the fix`, /2 rotis/.test(understood) && /½ ladle oil/.test(understood) && /280/.test(understood), understood.trim().slice(0, 120));
  await auditScreen(page, width, '2c-understood');
  if (width === 390) await axe(page, 'understood');

  // Numbers move in front of you
  await page.click('[data-act="apply"]');
  await page.waitForTimeout(300);
  const start = await total(page);
  await page.waitForTimeout(800);
  const mid = await total(page);
  await settle(page);
  const end = await total(page);
  check(`${width} total moves from 760 to 480`, start === '760' && end === '480' && +mid < 760 && +mid >= 480, `${start}, ${mid}, ${end}`);
  check(`${width} two rotis drawn`, await page.$$eval('.roti:not(.gone)', r => r.length) === 2);
  check(`${width} dishes keep their names`, /dal/.test(await page.textContent('tbody')) && /sabzi/.test(await page.textContent('tbody')));
  await auditScreen(page, width, '3-updated');
  await page.evaluate(() => { const m = document.getElementById('main'); m.scrollTop = m.scrollHeight; });
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(SHOTS, `${width}-3-updated-bottom.png`) });
  if (width === 390) await axe(page, 'updated');

  // Remembered
  await page.click('[data-act="save"]');
  await page.waitForTimeout(200);
  check(`${width} next time starts at 480`, await total(page) === '480');
  check(`${width} shows your usual twice`, (await page.$$('.tag.you')).length === 2);
  await auditScreen(page, width, '4-next');
  await page.evaluate(() => { const m = document.getElementById('main'); m.scrollTop = m.scrollHeight; });
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(SHOTS, `${width}-4-next-bottom.png`) });
  if (width === 390) await axe(page, 'next');
  await page.click('[data-act="forget"][data-k="oil"]');
  await page.waitForTimeout(700);
  check(`${width} forget moves total`, await total(page) === '660', await total(page));
  await page.goBack();
  await page.waitForTimeout(200);
  check(`${width} back returns to updated`, /updated/.test(page.url()));
  await page.goForward();
  await page.waitForTimeout(200);
  await page.click('[data-act="restart"]');
  await page.waitForTimeout(200);
  check(`${width} start over resets`, await total(page) === '760');

  // Deep links with nothing fixed are not dead ends
  await page.goto(BASE + '#/next');
  await page.waitForTimeout(200);
  check(`${width} empty next time offers a way on`, await page.isVisible('a[href="#/fix"]'));
  await page.screenshot({ path: path.join(SHOTS, `${width}-4b-next-empty.png`) });
  await page.goto(BASE + '#/updated');
  await page.waitForTimeout(200);
  check(`${width} empty updated offers a way on`, await page.isVisible('a[href="#/fix"]'));

  // Long input does not break the layout
  await page.goto(BASE + '#/fix');
  await page.waitForTimeout(200);
  await page.fill('#fix', 'pppppppppppppppppppppppppppppppppppppppppppppppppppppppppppp rice ' + 'and some more words about a very long meal '.repeat(4));
  await page.click('[data-act="check"]');
  await page.waitForTimeout(400);
  const longA = await audit(page);
  check(`${width} long text keeps layout`, longA.innerOverflow <= 0 && longA.pageOverflow <= 0, JSON.stringify(longA).slice(0, 160));

  check(`${width} no console errors`, errors.length === 0, errors.join(' | '));
  check(`${width} no outside requests`, external.length === 0, external.join(', '));
  await ctx.close();
}

async function parser(browser) {
  const page = await browser.newPage();
  await page.goto(BASE);
  const cases = [
    ['2 rotis, not 3', { roti: 2 }],
    ['not 3 rotis, only 2', { roti: 2 }],
    ['two rotis', { roti: 2 }],
    ['half a ladle of oil', { oil: .5 }],
    ['no oil in the sabzi', { oil: 0 }],
    ['hardly any oil', { oil: .5 }],
    ['half katori dal', { dal: .5 }],
    ['1 and a half katori sabzi', { sabzi: 1.5 }],
    ['1½ katori dal and 4 rotis', { dal: 1.5, roti: 4 }],
    ['a ladle of dal', { dal: .5 }],
    ['one more roti', { roti: 1 }],
    ['extra roti', { roti: 4 }],
    ['less oil', { oil: 1 }],
    ['skip the dal', { dal: 0 }],
    ['300g dal', { dal: 2 }],
    ['chapati 2', { roti: 2 }],
  ];
  for (const [text, want] of cases) {
    const got = await page.evaluate(t => { const r = parseFix(t, guessValues()); return Object.fromEntries(r.changes.map(c => [c.key, c.to])); }, text);
    check(`parse "${text}"`, JSON.stringify(got, Object.keys(got).sort()) === JSON.stringify(want, Object.keys(want).sort()), JSON.stringify(got));
  }
  await page.close();
}

async function copy(browser) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  check('no em dashes in the page', !/—|&mdash;/.test(html));
  check('no three-dot ellipsis in copy', !/placeholder="[^"]*\.\.\./.test(html));
  check('no screenshots or images shipped', !fs.readdirSync(path.join(__dirname, '..')).some(f => /\.(png|jpe?g|mp4|mov)$/i.test(f)));
  check('no personal details', !/palani|\b76\.0\b|lose 11/i.test(html));
  check('nothing stored', !/localStorage|sessionStorage|indexedDB|document\.cookie/.test(html));
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  await copy(browser);
  await parser(browser);
  await flow(browser, 390, 844);
  await flow(browser, 320, 568);
  await flow(browser, 1440, 900);
  await browser.close();
  console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
  process.exit(failed ? 1 : 0);
})();
