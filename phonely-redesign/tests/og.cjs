// Renders og.html to og.png (1200×630). Run: NODE_PATH=<playwright>/node_modules node tests/og.cjs
const path = require('path'), { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.goto('file://' + path.join(__dirname, '..', 'og.html'));
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(__dirname, '..', 'og.png') });
  await b.close();
})();
