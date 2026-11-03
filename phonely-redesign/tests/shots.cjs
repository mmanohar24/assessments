// Full-page screenshots at 1440×900 and 375×812. Run: NODE_PATH=<playwright>/node_modules node tests/shots.cjs
const path = require('path'), { chromium } = require('playwright');
const FILE = 'file://' + path.join(__dirname, '..', 'index.html');
const OUT = path.join(__dirname, 'screenshots');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  for (const [w, h, name] of [[1440, 900, 'desktop-1440'], [375, 812, 'mobile-375']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    const errs = []; p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(e.message));
    await p.goto(FILE); await p.waitForTimeout(800);
    await p.screenshot({ path: `${OUT}/${name}-full.png`, fullPage: true });
    await p.screenshot({ path: `${OUT}/${name}-top.png` });
    console.log(name, 'scrollWidth', await p.evaluate(() => document.documentElement.scrollWidth), 'height', await p.evaluate(() => document.documentElement.scrollHeight), 'errors', errs);
    await ctx.close();
  }
  await b.close();
})();
