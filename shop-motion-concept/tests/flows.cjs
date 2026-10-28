// End-to-end flows, edge cases and reduced-motion checks for ../index.html.
// Run: NODE_PATH=<folder with playwright>/node_modules node tests/flows.cjs
// Uses the installed Google Chrome (channel: 'chrome'). Exits 1 on any failure.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

// TARGET_URL runs the suite against a deployed copy; SUITE=live runs the happy path at 390 and 1280px plus the motion checks.
const FILE = process.env.TARGET_URL || 'file://' + path.join(__dirname, '..', 'index.html');
const PREFIX = process.env.TARGET_URL ? 'live-' : '';
const SHOTS = path.join(__dirname, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
let failed = 0;
function check(name, ok, detail) {
  results.push((ok ? 'PASS ' : 'FAIL ') + name + (!ok && detail !== undefined ? '  (' + detail + ')' : ''));
  if (!ok) failed++;
}

// Records every animation the page starts, so the reduced-motion run can prove nothing moved.
function recordMotion() {
  window.__motion = [];
  const orig = Element.prototype.animate;
  Element.prototype.animate = function (kf, opts) {
    try {
      const props = new Set();
      (Array.isArray(kf) ? kf : [kf]).forEach(f => Object.keys(f).forEach(k => { if (!['offset', 'easing', 'composite'].includes(k)) props.add(k); }));
      window.__motion.push({ kind: 'waapi', props: [...props] });
    } catch (e) { /* ignore */ }
    return orig.call(this, kf, opts);
  };
  document.addEventListener('transitionstart', e => window.__motion.push({ kind: 'transition', props: [e.propertyName] }), true);
  document.addEventListener('animationstart', e => window.__motion.push({ kind: 'css', name: e.animationName }), true);
}

async function newPage(browser, width, height, extra) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width, height }, reducedMotion: 'no-preference', hasTouch: false }, extra || {}));
  await ctx.addInitScript(recordMotion);
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') page.errors.push('console: ' + m.text()); });
  await page.goto(FILE);
  await page.waitForTimeout(150);
  return { ctx, page };
}
const h1 = async page => { await page.waitForTimeout(120); return (await page.locator('main h1').first().innerText()).trim(); };
const st = page => page.evaluate(() => window.__demo.state());
const focusedId = page => page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.dataset.action || document.activeElement.tagName));
async function noHScroll(page, label) {
  const r = await page.evaluate(() => {
    const s = document.getElementById('scroller');
    return { sw: document.documentElement.scrollWidth, iw: window.innerWidth, ssw: s.scrollWidth, scw: s.clientWidth };
  });
  check('No horizontal scroll: ' + label, r.sw <= r.iw && r.ssw <= r.scw, `page ${r.sw}/${r.iw}, app ${r.ssw}/${r.scw}`);
}
async function shot(page, name) { await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(380); await page.screenshot({ path: path.join(SHOTS, PREFIX + name + '.png') }); }
async function panelBtn(page, action) {
  const b = page.locator(`[data-action="${action}"]`);
  if (!(await b.isVisible())) await page.click('.demo-toggle');
  await b.click();
}
async function goHash(page, hash) { await page.evaluate(h => { location.hash = h; }, hash); await page.waitForTimeout(200); }
async function addCurrent(page) {
  await page.click('#add');
  await page.waitForFunction(() => ['done', 'view'].includes(document.getElementById('add').dataset.state), null, { timeout: 5000 });
}
async function fillDelivery(page) {
  await page.fill('#d-name', 'Asha Rao');
  await page.fill('#d-phone', '98765 43210');
  await page.fill('#d-address', '12, 4th Cross, Indiranagar');
  await page.fill('#d-pin', '560038');
}
async function errorsClean(page, label) { check('No console errors: ' + label, page.errors.length === 0, page.errors.join(' | ')); }

/* ---------- Happy path ---------- */
async function happyPath(browser, w, h) {
  const tag = w + 'px';
  const { ctx, page } = await newPage(browser, w, h);
  check(`[${tag}] Shop loads`, (await h1(page)) === 'Things for slower evenings');
  check(`[${tag}] Concept label visible`, await page.getByText('Concept by Manoj Venkatesun Manoharan. Not a real store. Sample products.').first().isVisible());
  check(`[${tag}] 8 products`, (await page.locator('.card').count()) === 8);
  check(`[${tag}] Prices in en-IN rupees`, (await page.locator('.card[data-id="throw"] .card-price').innerText()).trim() === '₹2,499');
  check(`[${tag}] Low-stock tag shown`, (await page.locator('.card[data-id="lamp"] .tag').innerText()).includes('Only 3 left'));
  await noHScroll(page, tag + ' shop');
  await shot(page, `${w}-01-shop`);

  await page.click('.seg label:has-text("Living")');
  await page.waitForTimeout(400);
  check(`[${tag}] Filter shows 3 living products`, (await page.locator('.card').count()) === 3);
  check(`[${tag}] Filter is in the URL`, (await page.evaluate(() => location.hash)).includes('c=living'));
  await page.selectOption('#sort', 'price-asc');
  await page.waitForTimeout(400);
  const order = await page.locator('.card').evaluateAll(els => els.map(e => e.dataset.id));
  check(`[${tag}] Sort by price works`, order.join(',') === 'cushion,throw,lamp', order.join(','));
  check(`[${tag}] Result count announced`, (await page.locator('#result-count').innerText()).includes('3 products'));
  await shot(page, `${w}-02-filtered`);

  await page.click('.card[data-id="throw"] a');
  check(`[${tag}] Product page opens`, (await h1(page)) === 'Linen Throw');
  await page.click('.seg label:has-text("Clay")');
  await page.waitForTimeout(400);
  check(`[${tag}] Colour in URL`, (await page.evaluate(() => location.hash)).includes('opt=clay'));
  check(`[${tag}] Live stock label updates`, (await page.locator('#stock').innerText()).includes('Only 2 left'));
  check(`[${tag}] Gallery follows colour`, (await page.locator('#gal-cap').innerText()).trim() === 'Clay');
  await page.click('[data-action="gal-next"]');
  check(`[${tag}] Gallery arrow moves`, (await page.locator('#gal-cap').innerText()).trim() === 'Close-up');
  await page.click('[data-action="gal-prev"]');
  await noHScroll(page, tag + ' product');
  await page.click('#add');
  await page.waitForTimeout(80);
  check(`[${tag}] Add to bag shows loading state`, (await page.locator('#add').getAttribute('aria-busy')) === 'true' && (await page.locator('#add .spinner').count()) === 1);
  await page.waitForFunction(() => document.getElementById('add').dataset.state === 'done');
  check(`[${tag}] Add to bag shows success check`, (await page.locator('#add .draw-check').count()) === 1 && (await page.locator('#add').innerText()).includes('Added'));
  await shot(page, `${w}-03-added`);
  await page.waitForFunction(() => document.getElementById('add').dataset.state === 'view');
  check(`[${tag}] Then becomes View bag`, (await page.locator('#add').innerText()).includes('View bag'));
  check(`[${tag}] Header count updates`, (await page.locator('#badge').innerText()) === '1' && (await page.locator('#bag-btn').getAttribute('aria-label')) === 'Bag, 1 item');
  check(`[${tag}] Count announced`, (await page.locator('#announcer').innerText()).includes('Your bag has 1 item'));

  await page.click('#add');
  await page.waitForTimeout(450);
  check(`[${tag}] Bag sheet opens`, await page.locator('#bag').evaluate(d => d.open));
  check(`[${tag}] Focus moves into bag`, (await focusedId(page)) === 'bag-title');
  check(`[${tag}] Bag state is in the URL`, (await page.evaluate(() => location.hash)).includes('bag=1'));
  await page.click('[data-action="qty"][data-d="1"]');
  await page.waitForTimeout(250);
  check(`[${tag}] Quantity increases`, (await page.locator('.line .qty-num').first().innerText()).trim() === '2');
  check(`[${tag}] Cannot exceed stock`, await page.locator('[data-action="qty"][data-d="1"]').isDisabled());
  check(`[${tag}] Stock limit explained`, (await page.locator('.line-note').innerText()).includes('Only 2 left'));
  check(`[${tag}] Free delivery unlocked`, (await page.locator('#ptext').innerText()).includes('unlocked'));
  await noHScroll(page, tag + ' bag');
  await shot(page, `${w}-04-bag`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  check(`[${tag}] Escape closes bag`, !(await page.locator('#bag').evaluate(d => d.open)));
  // "Add to bag" is now disabled (all stock is in the bag), so focus falls back to the bag button.
  check(`[${tag}] Focus returns to a sensible place`, (await focusedId(page)) === 'bag-btn' && await page.locator('#add').isDisabled());

  await goHash(page, '#/p/mug');
  await addCurrent(page);
  await page.click('#bag-btn');
  await page.waitForTimeout(450);
  await page.click('[data-action="remove"][data-key="mug"]');
  check(`[${tag}] Remove shows Undo toast`, (await page.locator('.toast').innerText()).includes('Removed Kiln Stoneware Mug'));
  check(`[${tag}] Item removed`, (await page.locator('.line').count()) === 1);
  await shot(page, `${w}-05-undo`);
  await page.click('.toast button:has-text("Undo")');
  check(`[${tag}] Undo restores item`, (await page.locator('.line').count()) === 2 && (await page.locator('.toast').count()) === 0);

  await page.fill('#promo', 'save50');
  await page.click('#promo-form button[type=submit]');
  await page.waitForTimeout(100);
  const perr = await page.locator('#promo-error').innerText();
  check(`[${tag}] Wrong promo shows error text`, perr.includes('isn’t a valid code'), perr);
  check(`[${tag}] Promo error has icon and aria-invalid`, (await page.locator('#promo-error svg').count()) === 1 && (await page.locator('#promo').getAttribute('aria-invalid')) === 'true');
  await shot(page, `${w}-06-promo-error`);
  await page.fill('#promo', 'WELCOME10');
  await page.click('#promo-form button[type=submit]');
  check(`[${tag}] WELCOME10 applies`, (await page.locator('.promo-ok').innerText()).includes('10% off'));
  const s1 = await st(page);
  check(`[${tag}] Bag persisted`, s1.bag.length === 2 && s1.promo === 'WELCOME10');

  await page.click('#bag-foot a');
  await page.waitForTimeout(350);
  check(`[${tag}] Checkout: delivery`, (await h1(page)).startsWith('How should we get it'));
  check(`[${tag}] Bag closes on checkout`, !(await page.locator('#bag').evaluate(d => d.open)));
  await page.click('#f-delivery button[type=submit]');
  await page.waitForTimeout(150);
  check(`[${tag}] Empty delivery form shows errors`, (await page.locator('#d-name-error').innerText()).length > 0 && (await page.locator('#d-pin-error').innerText()).includes('6 digits'));
  check(`[${tag}] Focus moves to first error`, (await focusedId(page)) === 'd-name');
  await noHScroll(page, tag + ' delivery');
  await shot(page, `${w}-07-delivery-errors`);
  await fillDelivery(page);
  await page.click('#f-delivery button[type=submit]');
  check(`[${tag}] Checkout: payment`, (await h1(page)) === 'How would you like to pay?');
  await page.fill('#p-upi', 'asha');
  await page.click('#f-payment button[type=submit]');
  check(`[${tag}] UPI format check`, (await page.locator('#p-upi-error').innerText()).includes('@'));
  await page.fill('#p-upi', 'asha@okbank');
  await page.click('#f-payment button[type=submit]');
  check(`[${tag}] Checkout: review`, (await h1(page)) === 'Review and place order');
  await noHScroll(page, tag + ' review');
  await shot(page, `${w}-08-review`);
  await page.click('#place');
  await page.waitForTimeout(100);
  check(`[${tag}] Place order shows loading`, (await page.locator('#place').getAttribute('aria-busy')) === 'true');
  await page.waitForFunction(() => location.hash.startsWith('#/order/'), null, { timeout: 5000 });
  check(`[${tag}] Order success`, (await h1(page)) === 'Order placed');
  check(`[${tag}] Status timeline`, (await page.locator('.timeline li').count()) === 4);
  check(`[${tag}] Bag emptied after order`, await page.locator('#badge').isHidden());
  await page.waitForTimeout(800);
  await noHScroll(page, tag + ' order');
  await shot(page, `${w}-09-order`);
  await errorsClean(page, tag + ' happy path');
  await ctx.close();
}

/* ---------- Edge cases ---------- */
async function edgeCases(browser, w, h) {
  const tag = w + 'px';
  const { ctx, page } = await newPage(browser, w, h);

  // Empty bag
  await page.click('#bag-btn');
  await page.waitForTimeout(400);
  check(`[${tag}] Empty bag state`, (await page.locator('#bag-body').innerText()).includes('Your bag is empty'));
  await shot(page, `${w}-10-empty-bag`);
  await page.click('[data-action="browse"]');
  await page.waitForTimeout(400);
  check(`[${tag}] Empty bag leads back to shop`, !(await page.locator('#bag').evaluate(d => d.open)) && (await h1(page)) === 'Things for slower evenings');

  // Out-of-stock variant + notify
  await goHash(page, '#/p/planter');
  check(`[${tag}] Size M is disabled`, await page.locator('.seg input[value="M"]').isDisabled());
  check(`[${tag}] Size M says sold out`, (await page.locator('.seg label:has(input[value="M"])').innerText()).includes('Sold out'));
  await page.click('[data-action="notify"]');
  check(`[${tag}] Notify me confirms`, (await page.locator('#notify-M').innerText()).includes('We’ll tell you when Size M is back'));
  await page.click('.seg label:has(input[value="L"])');
  await page.waitForTimeout(250);
  check(`[${tag}] Size change updates price`, (await page.locator('#pdp-price').innerText()).trim() === '₹1,799');
  await noHScroll(page, tag + ' planter');
  await shot(page, `${w}-11-out-of-stock`);

  // Last-in-stock product: add it, button blocks further adds
  await goHash(page, '#/p/board');
  check(`[${tag}] Only 1 left label`, (await page.locator('#stock').innerText()).includes('Only 1 left'));
  await addCurrent(page);
  await goHash(page, '#/shop');
  await goHash(page, '#/p/board');
  check(`[${tag}] All stock in bag blocks Add`, await page.locator('#add').isDisabled() && (await page.locator('#add').innerText()).includes('All 1 are in your bag'));

  // Pickup with per-store stock
  await goHash(page, '#/p/lamp');
  await addCurrent(page);
  await goHash(page, '#/checkout/delivery');
  await page.click('.choice-card:has-text("Pick up in store")');
  check(`[${tag}] Koramangala disabled (no lamp)`, await page.locator('input[name="store"][value="kor"]').isDisabled());
  check(`[${tag}] Store stock listed`, (await page.locator('.choice-card:has-text("Koramangala")').innerText()).includes('none in this store'));
  await page.click('#f-delivery button[type=submit]');
  check(`[${tag}] Store required`, (await page.locator('#store-error').innerText()).includes('Choose a store'));
  await page.click('.choice-card:has-text("HSR Layout")');
  await noHScroll(page, tag + ' pickup');
  await shot(page, `${w}-12-pickup`);
  await page.click('#f-delivery button[type=submit]');
  check(`[${tag}] Pickup continues to payment`, (await h1(page)) === 'How would you like to pay?');
  check(`[${tag}] COD becomes pay at store`, (await page.locator('.choice-card:has(input[value="cod"])').innerText()).includes('Pay at the store'));

  // Payment fails with fail@upi
  await page.fill('#p-upi', 'fail@upi');
  await page.click('#f-payment button[type=submit]');
  await page.click('#place');
  await page.waitForSelector('#pay-error', { timeout: 5000 });
  check(`[${tag}] Payment failure message`, (await page.locator('#pay-error').innerText()).includes('Payment didn’t go through'));
  check(`[${tag}] Failure says bag is kept`, (await page.locator('#pay-error').innerText()).includes('your bag is saved') && (await st(page)).bag.length === 2);
  check(`[${tag}] Focus moves to failure`, (await focusedId(page)) === 'pay-error');
  await noHScroll(page, tag + ' pay fail');
  await shot(page, `${w}-13-payment-failed`);
  await page.click('[data-action="pay-retry"]');
  await page.waitForSelector('#pay-error', { timeout: 5000 });
  check(`[${tag}] Try again with fail@upi fails again`, await page.locator('#pay-error').isVisible());
  await page.click('[data-action="pay-other"]');
  check(`[${tag}] Use another method goes to payment`, (await h1(page)) === 'How would you like to pay?');
  check(`[${tag}] Focus on payment methods`, await page.evaluate(() => document.activeElement.name === 'method'));
  await page.click('.choice-card:has(input[value="cod"])');
  await page.click('#f-payment button[type=submit]');

  // Item sells out during checkout (panel trigger while on review)
  check(`[${tag}] Back on review`, (await h1(page)) === 'Review and place order');
  await panelBtn(page, 'sim-soldout');
  await page.waitForSelector('#soldout-alert');
  check(`[${tag}] Sold-out message inline`, (await page.locator('#soldout-alert').innerText()).includes('Just sold out: Arc Table Lamp'));
  await shot(page, `${w}-14-sold-out`);
  await page.click('#place');
  check(`[${tag}] Place order blocked, focus on message`, (await focusedId(page)) === 'soldout-alert');
  const before = (await st(page)).bag.length;
  await page.click('[data-action="soldout-remove"]');
  await page.waitForTimeout(150);
  check(`[${tag}] One tap removes sold-out item`, (await st(page)).bag.length === before - 1 && (await page.locator('#soldout-alert').count()) === 0);

  // Payment fails via the demo panel, then Try again succeeds
  await panelBtn(page, 'sim-fail');
  await page.click('#place');
  await page.waitForSelector('#pay-error', { timeout: 5000 });
  check(`[${tag}] Panel-triggered failure`, (await page.locator('#pay-error').innerText()).includes('You haven’t been charged'));
  await page.click('[data-action="pay-retry"]');
  await page.waitForFunction(() => location.hash.startsWith('#/order/'), null, { timeout: 5000 });
  check(`[${tag}] Try again succeeds`, (await h1(page)) === 'Order placed');
  check(`[${tag}] Pickup timeline names store`, (await page.locator('.timeline').innerText()).includes('HSR Layout'));

  // Slow network: skeletons, then content
  await panelBtn(page, 'sim-slow');
  await goHash(page, '#/shop');
  check(`[${tag}] Slow network shows skeletons`, (await page.locator('.sk-card').count()) === 6 && (await page.locator('#grid').getAttribute('aria-busy')) === 'true');
  await shot(page, `${w}-15-skeleton`);
  await page.waitForSelector('.card', { timeout: 4000 });
  check(`[${tag}] Then content`, (await page.locator('.card').count()) === 8 && (await page.locator('.sk-card').count()) === 0);
  await goHash(page, '#/p/cushion');
  check(`[${tag}] Product skeleton`, (await page.locator('.sk-pdp').count()) === 1);
  await page.waitForSelector('#add', { timeout: 4000 });
  check(`[${tag}] Product loads after delay`, (await h1(page)) === 'Woven Cushion Cover');
  await panelBtn(page, 'sim-slow');

  // Sell-out swap path: colour alternative offered
  await goHash(page, '#/p/throw?opt=clay');
  await addCurrent(page);
  await panelBtn(page, 'sim-soldout');
  await goHash(page, '#/checkout/review');
  // Delivery is still pickup at HSR, which has Clay; payment is COD.
  await page.waitForSelector('#soldout-alert');
  check(`[${tag}] Colour swap offered`, (await page.locator('[data-action="soldout-swap"]').innerText()).includes('Switch to Sand'));
  await page.click('[data-action="soldout-swap"]');
  await page.waitForTimeout(200);
  check(`[${tag}] Swap fixes the bag`, (await st(page)).bag[0].key === 'throw:sand' && (await page.locator('#soldout-alert').count()) === 0);

  // Persistence and reset
  await page.reload();
  await page.waitForTimeout(300);
  check(`[${tag}] Bag survives reload`, (await page.locator('#badge').innerText()) === '1');
  await panelBtn(page, 'reset');
  await panelBtn(page, 'reset');
  await page.waitForTimeout(300);
  check(`[${tag}] Reset demo clears bag`, (await st(page)).bag.length === 0 && await page.locator('#badge').isHidden());
  check(`[${tag}] Reset returns to shop`, (await page.evaluate(() => location.hash)) === '#/shop');

  // Unknown route has a way out
  await goHash(page, '#/nowhere');
  check(`[${tag}] Not found has recovery link`, (await h1(page)).includes('doesn’t exist') && await page.locator('main a[href="#/shop"]').isVisible());
  await errorsClean(page, tag + ' edge cases');
  await ctx.close();
}

/* ---------- Keyboard, skip link, swipe ---------- */
async function keyboard(browser) {
  const { ctx, page } = await newPage(browser, 390, 844, { hasTouch: true });
  await page.keyboard.press('Tab');
  check('[kbd] Skip link is first stop', (await page.evaluate(() => document.activeElement.className)) === 'skip');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  check('[kbd] Skip link focuses main', (await focusedId(page)) === 'main');
  check('[kbd] Skip link keeps the route', (await page.evaluate(() => location.hash)) === '' || (await page.evaluate(() => location.hash)) === '#/shop');
  check('[kbd] Still on shop', (await h1(page)) === 'Things for slower evenings');

  // Reach a product by keyboard and add it.
  await page.focus('.card[data-id="carafe"] a');
  await page.keyboard.press('Enter');
  check('[kbd] Enter opens product', (await h1(page)) === 'Glass Carafe');
  check('[kbd] Focus on product heading', await page.evaluate(() => document.activeElement.tagName === 'H1'));
  await page.focus('#gal-vp');
  await page.keyboard.press('ArrowRight');
  check('[kbd] Arrow keys move gallery', (await page.locator('#gal-cap').innerText()).trim() === 'Close-up');
  await page.focus('#add');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.getElementById('add').dataset.state === 'view');
  await page.focus('#bag-btn');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(450);
  check('[kbd] Bag opens with focus inside', (await focusedId(page)) === 'bag-title');
  let inside = true;
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab');
    const ok = await page.evaluate(() => { const a = document.activeElement; return a === document.body || !!a.closest('#bag'); });
    if (!ok) inside = false;
  }
  check('[kbd] Focus stays in the bag sheet', inside);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  check('[kbd] Focus returns to bag button', (await focusedId(page)) === 'bag-btn');

  // Swipe the gallery with touch-like pointer events.
  await goHash(page, '#/p/can');
  const box = await page.locator('#gal-vp').boundingBox();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(box.x + box.width * (0.8 - i * 0.07), box.y + box.height / 2);
  await page.mouse.up();
  await page.waitForTimeout(400);
  check('[swipe] Swipe moves to next image', (await page.locator('#gal-cap').innerText()).trim() === 'Close-up');
  await errorsClean(page, 'keyboard');
  await ctx.close();
}

/* ---------- Motion: full vs reduced ---------- */
async function motionTour(page) {
  await page.click('.seg label:has-text("Kitchen")');
  await page.waitForTimeout(400);
  await page.click('.card[data-id="mug"] a');
  await page.waitForTimeout(200);
  await page.click('[data-action="gal-next"]');
  await addCurrent(page);
  await goHash(page, '#/p/throw');
  await page.click('.seg label:has-text("Clay")');
  await addCurrent(page);
  await page.waitForTimeout(1200);
  await page.click('#add');
  await page.waitForTimeout(450);
  await page.click('[data-action="qty"][data-d="1"][data-key="mug"]');
  await page.fill('#promo', 'NOPE');
  await page.click('#promo-form button[type=submit]');
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await goHash(page, '#/checkout/delivery');
  await fillDelivery(page);
  await page.click('#f-delivery button[type=submit]');
  await page.fill('#p-upi', 'asha@okbank');
  await page.click('#f-payment button[type=submit]');
  await page.click('#place');
  await page.waitForFunction(() => location.hash.startsWith('#/order/'), null, { timeout: 5000 });
  await page.waitForTimeout(900);
  return page.evaluate(() => window.__motion);
}
const MOVING = ['transform', 'translate', 'scale', 'rotate', 'top', 'left', 'right', 'bottom', 'width', 'height', 'stroke-dashoffset', 'strokeDashoffset'];
function movement(log) {
  return log.filter(m => (m.kind === 'css' ? !['fade-in', 'pulse'].includes(m.name) : m.props.some(p => MOVING.includes(p))));
}
async function motion(browser) {
  // Full motion: the detector must see movement, otherwise the reduced test proves nothing.
  let { ctx, page } = await newPage(browser, 390, 844);
  const full = await motionTour(page);
  const moved = movement(full);
  const kinds = new Set(moved.map(m => m.kind === 'css' ? 'css:' + m.name : m.kind + ':' + m.props.join('+')));
  check('[motion] Full motion runs movement animations', moved.length > 5, [...kinds].join(', '));
  check('[motion] Sheet slides in', kinds.has('css:sheet-in'));
  check('[motion] Check draws', kinds.has('css:draw'));
  check('[motion] Transitions move things (indicator, gallery, bar)', moved.some(m => m.kind === 'transition' && m.props[0] === 'transform'));
  await errorsClean(page, 'full motion');
  await ctx.close();

  // OS-level reduced motion.
  ({ ctx, page } = await newPage(browser, 390, 844, { reducedMotion: 'reduce' }));
  check('[motion] Reduced motion follows the OS', (await page.evaluate(() => document.documentElement.dataset.motion)) === 'reduce');
  const red = await motionTour(page);
  const bad = movement(red);
  check('[motion] OS reduced: no movement animations run', bad.length === 0, JSON.stringify(bad.slice(0, 5)));
  check('[motion] OS reduced: fades still confirm changes', red.some(m => m.kind === 'css' && m.name === 'fade-in'));
  await shot(page, '390-16-reduced-order');
  await errorsClean(page, 'reduced (OS)');
  await ctx.close();

  // Toggle in the demo panel, with the OS set to full motion.
  ({ ctx, page } = await newPage(browser, 390, 844));
  await panelBtn(page, 'motion-toggle');
  check('[motion] Toggle turns reduced motion on', (await page.evaluate(() => document.documentElement.dataset.motion)) === 'reduce' && (await page.locator('.switch').getAttribute('aria-checked')) === 'true');
  await page.evaluate(() => { window.__motion.length = 0; window.scrollTo(0, 0); });
  const tog = await motionTour(page);
  const bad2 = movement(tog);
  check('[motion] Toggle reduced: no movement animations run', bad2.length === 0, JSON.stringify(bad2.slice(0, 5)));
  await panelBtn(page, 'motion-system');
  check('[motion] Can return to device setting', (await page.evaluate(() => document.documentElement.dataset.motion)) === 'full');
  await errorsClean(page, 'reduced (toggle)');
  await ctx.close();
}

/* ---------- Table matches what is built ---------- */
async function motionTable(browser) {
  const { ctx, page } = await newPage(browser, 1280, 900);
  const rows = await page.locator('#motion-table tbody tr').count();
  const cap = await page.locator('#motion-table caption').innerText();
  check('[table] "Why things move" row count matches caption', cap.startsWith(rows + ' motions'), rows + ' rows, caption: ' + cap);
  check('[table] Statement about CSS and JavaScript', (await page.locator('.made-with').innerText()).includes('not made with Smart Animate, ProtoPie or Lottie'));
  await shot(page, '1280-17-panel');
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    if (process.env.SUITE === 'live') {
      for (const [w, h] of [[390, 844], [1280, 900]]) await happyPath(browser, w, h);
      await motion(browser);
    } else {
      for (const [w, h] of [[360, 780], [390, 844], [1280, 900]]) {
        await happyPath(browser, w, h);
        await edgeCases(browser, w, h);
      }
      await keyboard(browser);
      await motion(browser);
      await motionTable(browser);
    }
  } catch (e) {
    check('Script ran to completion', false, e.message.split('\n').slice(0, 6).join(' / '));
  } finally {
    await browser.close();
  }
  console.log(results.join('\n'));
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
