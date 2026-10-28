// Records the happy path at 390x844 into ../demo/happy-path.webm, plus ../demo/poster.png.
// Converts to MP4 only if a system ffmpeg is on PATH.
// Run: NODE_PATH=<folder with playwright>/node_modules node tests/record-demo.cjs
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { chromium } = require('playwright');

const FILE = 'file://' + path.join(__dirname, '..', 'index.html');
const OUT = path.join(__dirname, '..', 'demo');
const TMP = path.join(OUT, '.raw');
fs.mkdirSync(TMP, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, recordVideo: { dir: TMP, size: { width: 390, height: 844 } } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const wait = ms => page.waitForTimeout(ms);
  const t0 = Date.now();

  await page.goto(FILE);
  await wait(2200);
  await page.click('.seg label:has-text("Living")'); await wait(1100);
  await page.selectOption('#sort', 'price-asc'); await wait(1300);
  await page.click('.card[data-id="throw"] a'); await wait(1200);
  await page.click('.seg label:has-text("Clay")'); await wait(1300);
  await page.click('#add'); await wait(2100);
  await page.click('#add'); await wait(1100);
  await page.screenshot({ path: path.join(OUT, 'poster.png') });
  await page.click('[data-action="qty"][data-d="1"]'); await wait(1000);
  await page.click('#promo');
  await page.keyboard.type('SAVE50', { delay: 60 });
  await page.click('#promo-form button[type=submit]'); await wait(1300);
  await page.fill('#promo', '');
  await page.keyboard.type('WELCOME10', { delay: 50 });
  await page.click('#promo-form button[type=submit]'); await wait(1300);
  await page.click('#bag-foot a'); await wait(1000);
  await page.click('#d-name'); await page.keyboard.type('Asha Rao', { delay: 35 });
  await page.click('#d-phone'); await page.keyboard.type('98765 43210', { delay: 30 });
  await page.click('#d-address'); await page.keyboard.type('12, 4th Cross, Indiranagar', { delay: 20 });
  await page.click('#d-pin'); await page.keyboard.type('560038', { delay: 35 });
  await wait(400);
  await page.click('#f-delivery button[type=submit]'); await wait(900);
  await page.click('#p-upi'); await page.keyboard.type('asha@okbank', { delay: 40 });
  await wait(300);
  await page.click('#f-payment button[type=submit]'); await wait(1500);
  await page.click('#place');
  await page.waitForFunction(() => location.hash.startsWith('#/order/'));
  await wait(3600);

  const secs = (Date.now() - t0) / 1000;
  const video = page.video();
  await ctx.close();
  await browser.close();
  const webm = path.join(OUT, 'happy-path.webm');
  fs.renameSync(await video.path(), webm);
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`Recorded ${secs.toFixed(1)}s to demo/happy-path.webm`);
  if (errors.length) { console.log('Console errors:\n' + errors.join('\n')); process.exitCode = 1; }

  let ffmpeg = null;
  try { ffmpeg = execSync('command -v ffmpeg', { shell: '/bin/sh' }).toString().trim(); } catch (e) { /* not installed */ }
  if (ffmpeg) {
    execSync(`"${ffmpeg}" -y -loglevel error -i "${webm}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${path.join(OUT, 'happy-path.mp4')}"`);
    console.log('Exported demo/happy-path.mp4');
  } else {
    console.log('ffmpeg not found on PATH: skipped MP4 export (WebM only).');
  }
})();
