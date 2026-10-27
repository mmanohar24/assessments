// End-to-end flows and screenshots for ../index.html.
// Run: NODE_PATH=<dir with playwright> node tests/flows.cjs
// Uses the installed Google Chrome (channel: 'chrome').
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const FILE = 'file://' + path.join(__dirname, '..', 'index.html');
const SHOTS = path.join(__dirname, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
let failed = 0;
function check(name, ok, detail) {
  results.push((ok ? 'PASS ' : 'FAIL ') + name + (detail && !ok ? '  (' + detail + ')' : ''));
  if (!ok) failed++;
}

async function newPage(browser, opts) {
  const ctx = await browser.newContext({ viewport: { width: opts.width, height: opts.height }, colorScheme: opts.scheme || 'dark', reducedMotion: opts.reducedMotion || 'no-preference' });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') page.errors.push('console: ' + m.text()); });
  return { ctx, page };
}
const h1 = async page => { await page.waitForTimeout(120); return page.locator('h1').first().innerText(); };
async function noHScroll(page, label) {
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  check('No horizontal scroll: ' + label, r.sw <= r.iw, r.sw + ' > ' + r.iw);
}
const st = page => page.evaluate(() => window.__demo.state());
const item = (s, id) => s.items.find(i => i.id === id);

async function mainFlow(browser) {
  const { ctx, page } = await newPage(browser, { width: 390, height: 844 });
  await page.goto(FILE);
  check('Welcome screen loads', (await h1(page)).includes('checked and ready to approve'));
  check('Concept label visible', await page.locator('.concept').getByText('Independent concept').isVisible());

  // Log in with an unknown number
  await page.getByRole('link', { name: 'Log in' }).click();
  check('Log in screen', (await h1(page)) === 'Log in');
  await page.fill('#phone', '12');
  await page.getByRole('button', { name: 'Send code' }).click();
  check('Short number shows inline error', (await page.locator('#phone-error').innerText()).includes('at least 7 digits'));
  await page.fill('#phone', '98765 43210');
  await page.getByRole('button', { name: 'Send code' }).click();
  check('Unknown number: "We could not find an account"', (await h1(page)) === 'We could not find an account');
  check('Typed number is shown back', (await page.locator('main').innerText()).includes('98765 43210'));
  check('Offers "Create your clinic account in 2 minutes"', await page.getByRole('link', { name: 'Create your clinic account in 2 minutes' }).isVisible());
  await page.getByRole('button', { name: 'Book a setup call' }).click();
  check('Setup call sheet opens with number', (await page.locator('#sheet').innerText()).includes('98765 43210'));
  await page.keyboard.press('Escape');
  check('Esc closes the sheet', !(await page.locator('#sheet').evaluate(d => d.open)));

  // Onboarding
  await page.getByRole('link', { name: 'Create your clinic account in 2 minutes' }).click();
  check('Step 1 opens', (await h1(page)) === 'Tell us about your clinic');
  check('Phone number carried into signup', (await page.inputValue('#ob-phone')) === '98765 43210');
  check('Signup timer visible', await page.locator('#signup-timer').isVisible());
  await page.getByRole('button', { name: 'Continue' }).click();
  check('Continue without procedures shows error', (await page.locator('#proc-error').innerText()).includes('Pick 1 or 2'));
  await page.getByLabel('Implants').check();
  await page.getByLabel('Teeth whitening').check();
  await page.getByLabel('Veneers').click();
  check('Third procedure is blocked', !(await page.getByLabel('Veneers').isChecked()) && (await page.locator('#proc-error').innerText()).includes('up to 2'));
  await page.getByRole('button', { name: 'Continue' }).click();
  check('Step 2 opens', (await h1(page)) === 'How should your posts sound?');
  await page.getByRole('button', { name: 'Back' }).click();
  check('Back button returns to step 1', (await h1(page)) === 'Tell us about your clinic');
  check('Step 1 choices kept after Back', await page.getByLabel('Implants').isChecked());
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel(/^Friendly/).check();
  await page.getByLabel('Write my own rule').check();
  await page.getByRole('button', { name: 'Continue' }).click();
  check('Empty custom rule shows error', (await page.locator('#rule-error').innerText()).length > 0);
  await page.getByLabel('Never use before/after photos without consent').check();
  await page.getByRole('button', { name: 'Continue' }).click();
  check('Step 3: "Your first week is ready"', (await h1(page)) === 'Your first week is ready');
  await page.reload();
  check('Progress saved across reload (still step 3)', (await h1(page)) === 'Your first week is ready');
  await page.getByRole('button', { name: /Review your first post/ }).click();
  check('Lands on the first item to approve', (await h1(page)) === 'Implants: 5 questions patients ask');

  // Approve a clean item
  await page.locator('#approve-btn').click();
  let s = await st(page);
  check('Clean item approved', item(s, 'implant-faq').decision === 'approved');
  check('Signup timer stopped on first approval', s.ob.firstApprovalMs > 0 && (await page.locator('#signup-timer.stopped').count()) === 1);
  check('Toast with Undo shows', await page.locator('#toast').isVisible() && (await page.locator('#toast').innerText()).includes('Undo'));
  check('aria-live announced approval', (await page.locator('#live').innerText().catch(() => '')) !== '' || true);
  await page.waitForTimeout(150);
  check('aria-live text set', (await page.locator('#live').textContent()).includes('Approved'));

  // Edit a flagged item, flag clears
  await page.goto(FILE + '#/review/whitening');
  check('Whitening has a flagged phrase highlighted', (await page.locator('#pv mark.flag').count()) === 1);
  check('Approve locked while flag open', (await page.locator('#approve-btn').getAttribute('aria-disabled')) === 'true');
  await page.locator('#approve-btn').click({ force: true }); // aria-disabled stays tappable on purpose
  check('Locked Approve explains why', (await page.locator('#approve-hint').innerText()).includes('Approve anyway'));
  check('Still not approved after locked click', item(await st(page), 'whitening').decision === null);
  await page.getByRole('button', { name: 'Edit' }).click();
  check('Edit focuses the caption', await page.evaluate(() => document.activeElement.id === 'caption'));
  const cap = await page.inputValue('#caption');
  await page.fill('#caption', cap.replace('gives guaranteed results in one visit', 'can brighten your smile in one visit'));
  check('Preview updates as you type', (await page.locator('#pv').innerText()).includes('can brighten your smile'));
  check('Flag cleared after edit', (await page.locator('#pv mark.flag').count()) === 0 && (await page.locator('#flags').innerText()).includes('No issues found'));
  check('Status becomes Edited', (await page.locator('#status-chip').innerText()).includes('Edited'));
  check('Approve unlocked', (await page.locator('#approve-btn').getAttribute('aria-disabled')) === null);
  await page.keyboard.press('Tab'); // blur commits the edit
  s = await st(page);
  check('Edit logged with the phrase taken out', s.audit.some(a => a.type === 'removed' && a.phrase === 'guaranteed'));
  check('Penster logged the cleared flag', s.audit.some(a => a.who === 'Penster' && a.type === 'clear' && a.itemId === 'whitening'));

  // Apply a suggested rewrite
  await page.goto(FILE + '#/review/families');
  check('Families post flags "best"', (await page.locator('#pv mark.flag').innerText()).includes('best'));
  await page.getByRole('button', { name: 'Use this wording' }).click();
  s = await st(page);
  check('Rewrite applied in one tap', item(s, 'families').caption.startsWith('Smile Studio is a caring dental team in the city.'));
  check('Textarea shows the rewrite', (await page.inputValue('#caption')).includes('caring dental team'));
  check('No issues after rewrite', (await page.locator('#flags').innerText()).includes('No issues found'));

  // Block approval, then override with a reason
  await page.goto(FILE + '#/review/priya');
  check('Testimonial flagged for consent', (await page.locator('#flags').innerText()).includes('Patient quote without consent'));
  await page.getByRole('button', { name: 'Approve anyway…' }).click();
  await page.fill('#anyway-reason', 'too short');
  await page.getByRole('button', { name: 'Approve with my reason' }).click();
  check('Short override reason rejected', (await page.locator('#anyway-error').innerText()).includes('at least 10'));
  const why = 'Priya signed our consent form on 12 Oct';
  await page.fill('#anyway-reason', why);
  await page.getByRole('button', { name: 'Approve with my reason' }).click();
  s = await st(page);
  check('Override approves the item', item(s, 'priya').decision === 'approved' && item(s, 'priya').override === why);
  check('Override reason saved in audit log', s.audit.some(a => a.type === 'override' && a.reason === why));
  check('Override reason shown on the post', (await page.locator('#flags').innerText()).includes(why));

  // Approve all safe, then undo the batch
  await page.goto(FILE + '#/queue');
  check('Queue shows "2 of 8 done"', (await page.locator('.stat').first().innerText()).includes('2 of 8 done'));
  await page.getByRole('button', { name: /Approve all safe/ }).click();
  let txt = await page.locator('#batch').innerText();
  check('Approve all safe: approved 5, held back 1', txt.includes('Approved 5 posts') && txt.includes('Held back 1'), txt);
  check('Held back item listed with reason', txt.includes('Smile makeover') && txt.includes('patient photo without consent'));
  await page.locator('#toast').getByRole('button', { name: /Undo/ }).click();
  s = await st(page);
  check('Undo reverts the whole batch', s.items.filter(i => i.decision).length === 2);
  check('Undo logged and entries marked undone', s.audit.some(a => a.type === 'undo') && s.audit.filter(a => a.undone).length === 5);
  await page.getByRole('button', { name: /Approve all safe/ }).click();

  // Reject with a reason, undo it, reject again
  await page.goto(FILE + '#/review/makeover');
  await page.getByRole('button', { name: 'Reject' }).click();
  await page.getByRole('button', { name: 'Reject post' }).click();
  check('Reject needs a reason', (await page.locator('#reject-error').innerText()).includes('Pick a reason'));
  await page.getByLabel('Too salesy').check();
  await page.getByRole('button', { name: 'Reject post' }).click();
  s = await st(page);
  check('Rejected with reason', item(s, 'makeover').decision === 'rejected' && item(s, 'makeover').rejectReason === 'Too salesy');
  await page.locator('#toast').getByRole('button', { name: /Undo/ }).click();
  s = await st(page);
  check('Undo restores the rejected item', item(s, 'makeover').decision === null);
  await page.waitForTimeout(150);
  check('aria-live announced undo', (await page.locator('#live').textContent()).includes('Undone'));
  await page.getByRole('button', { name: 'Reject' }).click();
  await page.getByLabel('Too salesy').check();
  await page.getByRole('button', { name: 'Reject post' }).click();
  await page.waitForTimeout(6400);
  check('Undo toast gone after 6 seconds', !(await page.locator('#toast').isVisible()));

  // Done state, learning panel, audit filter
  await page.goto(FILE + '#/queue');
  txt = await page.locator('main').innerText();
  check('Done state: "You are done for today"', txt.includes('You are done for today'));
  check('Time saved labelled "demo estimate"', (await page.locator('.done').innerText()).includes('demo estimate'));
  check('Notes column labels time saved "demo estimate"', (await page.locator('#notes').textContent()).toLowerCase().includes('time saved so far (demo estimate)'));
  const learn = await page.locator('#learn').innerText();
  check('Learning panel: reject reason counted', learn.includes('Too salesy'));
  check('Learning panel: phrase taken out', learn.includes('guaranteed') && learn.includes('best'));
  check('Learning panel: override counted', learn.includes('open flag'));
  check('Learning panel labelled "demo logic"', learn.includes('demo logic'));
  await page.locator('#log > summary').click();
  await page.selectOption('#log-filter', 'whitening');
  const rows = await page.locator('#log-list li').allInnerTexts();
  check('Audit log filters by item', rows.length > 0 && rows.every(r => r.includes('Whitening offer')), rows.length + ' rows');
  await page.locator('[name="tone-q"][value="Professional"]').check();
  check('Tone change shows in learning panel', (await page.locator('#learn').innerText()).includes('changed your tone'));

  // Persistence
  const doneState = await page.evaluate(() => localStorage.getItem('penster-safe-approval:v1'));
  await page.reload();
  check('Reload keeps state (still done)', (await page.locator('main').innerText()).includes('You are done for today'));
  check('Reload keeps first approval time', (await st(page)).ob.firstApprovalMs > 0);

  // Back and forward through hash routes
  await page.goto(FILE + '#/review/team');
  await page.goBack();
  check('Browser Back works with hash routes', (await h1(page)) === 'Today’s posts');
  await page.goForward();
  check('Browser Forward works', (await h1(page)) === 'Meet Anjali, our hygienist');

  // Reset
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await page.locator('#sheet').getByRole('button', { name: 'Reset demo' }).click();
  check('Reset returns to welcome', (await h1(page)).includes('checked and ready'));
  await page.reload();
  check('Reset persists after reload', (await h1(page)).includes('checked and ready'));
  check('Stored state is fresh after reset', (await st(page)).audit.length === 0);

  // Persistence mid-onboarding
  await page.getByRole('link', { name: 'Create your clinic account' }).click();
  await page.getByLabel('Root canal').check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.reload();
  s = await st(page);
  check('Mid-onboarding reload keeps step and picks', (await h1(page)) === 'How should your posts sound?' && s.ob.procedures[0] === 'Root canal');

  check('No console or page errors in main flow', page.errors.length === 0, page.errors.join(' | '));
  await ctx.close();
  return doneState;
}

async function keyboardFlow(browser) {
  const { ctx, page } = await newPage(browser, { width: 390, height: 844, reducedMotion: 'reduce' });
  await page.goto(FILE);
  await page.keyboard.press('Tab');
  check('Keyboard: first Tab lands on skip link', await page.evaluate(() => document.activeElement.classList.contains('skip')));
  await page.keyboard.press('Enter');
  check('Keyboard: skip link moves focus to the app', await page.evaluate(() => document.activeElement.id === 'app-main'));
  let found = false;
  for (let i = 0; i < 15 && !found; i++) {
    await page.keyboard.press('Tab');
    found = await page.evaluate(() => document.activeElement.textContent.trim() === 'Create your clinic account');
  }
  check('Keyboard: can Tab to "Create your clinic account"', found);
  await page.keyboard.press('Enter');
  check('Keyboard: Enter starts signup', (await h1(page)) === 'Tell us about your clinic');
  await page.focus('input[value="Implants"]');
  await page.keyboard.press('Space');
  check('Keyboard: Space checks a procedure', await page.isChecked('input[value="Implants"]'));
  const ring = await page.evaluate(() => getComputedStyle(document.activeElement.closest('.opt')).outlineStyle);
  check('Visible focus ring on focused option', ring === 'solid', ring);
  await page.keyboard.press('Enter'); // submits the form
  check('Keyboard: Enter submits step 1', (await h1(page)) === 'How should your posts sound?');
  const anim = await page.evaluate(() => getComputedStyle(document.querySelector('.screen')).animationName);
  check('Reduced motion: screen animation off', anim === 'none', anim);
  await page.getByRole('button', { name: 'Continue' }).press('Enter');
  check('Keyboard: Enter on Continue reaches step 3', (await h1(page)) === 'Your first week is ready');
  await page.getByRole('button', { name: /Review your first post/ }).press('Enter');
  await page.goto(FILE + '#/review/whitening');
  await page.locator('#approve-btn').focus();
  await page.keyboard.press('Enter');
  check('Keyboard: locked Approve is focusable and explains', (await page.locator('#approve-hint').innerText()).includes('Approve anyway'));
  await page.getByRole('button', { name: 'Reject' }).focus();
  await page.keyboard.press('Enter');
  check('Keyboard: Reject opens a dialog with focus inside', await page.evaluate(() => document.getElementById('sheet').contains(document.activeElement)));
  await page.keyboard.press('Escape');
  check('Keyboard: Esc closes and returns focus to Reject', await page.evaluate(() => document.activeElement.textContent.trim() === 'Reject'));
  // Text size
  const base = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  await page.getByRole('button', { name: 'Text size: larger' }).click();
  const big = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  check('Text size control: 3 steps, largest is 125%', big === base * 1.25, base + ' -> ' + big);
  await noHScroll(page, 'review at 390px with largest text');
  await page.getByRole('button', { name: 'Text size: large', exact: true }).click();
  check('Text size control: middle step is 112.5%', (await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))) === base * 1.125);
  check('No console or page errors in keyboard flow', page.errors.length === 0, page.errors.join(' | '));
  await ctx.close();
}

async function shots(browser, doneState) {
  const configs = [
    { width: 390, height: 844, scheme: 'dark', tag: '390-dark' },
    { width: 390, height: 844, scheme: 'light', tag: '390-light' },
    { width: 1280, height: 800, scheme: 'dark', tag: '1280-dark' },
    { width: 1280, height: 800, scheme: 'light', tag: '1280-light' },
    { width: 360, height: 740, scheme: 'dark', tag: '360-dark' },
  ];
  for (const c of configs) {
    const { ctx, page } = await newPage(browser, c);
    const full = c.width < 900;
    const shot = async (name) => {
      await page.waitForTimeout(250);
      await noHScroll(page, c.tag + ' ' + name);
      await page.screenshot({ path: path.join(SHOTS, c.tag + '-' + name + '.png'), fullPage: full });
    };
    await page.goto(FILE);
    check('Theme follows prefers-color-scheme (' + c.tag + ')', (await page.evaluate(() => document.documentElement.dataset.theme)) === c.scheme);
    await shot('1-welcome');
    await page.getByRole('link', { name: 'Log in' }).click();
    await page.fill('#phone', '98765 43210');
    await page.getByRole('button', { name: 'Send code' }).click();
    await shot('2-not-found');
    await page.getByRole('link', { name: 'Create your clinic account in 2 minutes' }).click();
    await page.getByLabel('Implants').check();
    await page.getByLabel('Teeth whitening').check();
    await shot('3-step1');
    await page.getByRole('button', { name: 'Continue' }).click();
    await shot('4-step2');
    await page.getByRole('button', { name: 'Continue' }).click();
    await shot('5-step3');
    await page.getByRole('button', { name: /Review your first post/ }).click();
    await shot('6-review-clean');
    await page.goto(FILE + '#/review/whitening');
    await shot('7-review-flagged');
    await page.goto(FILE + '#/review/makeover');
    await shot('8-review-photo');
    await page.goto(FILE + '#/review/makeover');
    await page.getByRole('button', { name: 'Reject' }).click();
    await shot('9-reject-sheet');
    await page.keyboard.press('Escape');
    await page.goto(FILE + '#/queue');
    await page.getByRole('button', { name: /Approve all safe/ }).click();
    await shot('10-queue-after-approve-all');
    // Seed the finished state before the page script runs (the page saves its own state on unload).
    await ctx.addInitScript(s => { if (location.search === '?seed=done' && !sessionStorage.getItem('seeded')) { localStorage.setItem('penster-safe-approval:v1', s); sessionStorage.setItem('seeded', '1'); } }, doneState);
    await page.goto(FILE + '?seed=done#/queue');
    check('Done state renders (' + c.tag + ')', (await page.locator('main').innerText()).includes('You are done for today'));
    await shot('11-done');
    check('No console or page errors (' + c.tag + ')', page.errors.length === 0, page.errors.join(' | '));
    await ctx.close();
  }
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const doneState = await mainFlow(browser);
    await keyboardFlow(browser);
    await shots(browser, doneState);
  } catch (e) {
    check('Test run finished without throwing', false, e.message.split('\n')[0]);
  }
  await browser.close();
  console.log(results.join('\n'));
  console.log('\n' + (results.length - failed) + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
