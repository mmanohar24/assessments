// Checks for ../index.html at 1440×900 and 375×812.
// Covers: console errors, horizontal overflow, the sample call (full, ended early, skipped), keyboard FAQ,
// tab focus rings and deep links, mobile menu, visible orb label, tap targets, reduced motion, and a
// WCAG AA contrast sweep of every visible text element.
// Run: NODE_PATH=<folder with playwright>/node_modules node tests/checks.cjs
const path = require('path');
const { chromium } = require('playwright');
const FILE = 'file://' + path.join(__dirname, '..', 'index.html');
const OUT = path.join(__dirname, 'screenshots');

let failed = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) failed++; };

function sweep() {
  function parse(s) { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
  function over(t, b) { const a = t.a + b.a * (1 - t.a); return { r: (t.r * t.a + b.r * b.a * (1 - t.a)) / a, g: (t.g * t.a + b.g * b.a * (1 - t.a)) / a, b: (t.b * t.a + b.b * b.a * (1 - t.a)) / a, a }; }
  function L(c) { return [c.r, c.g, c.b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); }
  function bgOf(el) {
    const layers = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      const b = parse(cs.backgroundColor);
      if (b && b.a > 0) { layers.push(b); if (b.a >= 1) break; }
      // Gradient-only surfaces: approximate with their lightest/darkest stop is overkill; these are all light tints.
    }
    let bg = { r: 253, g: 252, b: 251, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg);
    return bg;
  }
  function opacityOf(el) { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= +getComputedStyle(n).opacity; return o; }
  const out = [];
  document.querySelectorAll('body *').forEach(el => {
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    if (cs.visibility === 'hidden' || r.width === 0 || r.height === 0 || el.closest('.sr-only, [hidden], svg, [aria-hidden="true"]')) return;
    if (el.closest('.skip') && document.activeElement !== el) return;
    const op = opacityOf(el); if (op < 0.1) return; // not shown yet (e.g. before its scroll reveal)
    const bg = bgOf(el), fg0 = parse(cs.color); fg0.a *= op;
    const fg = over(fg0, bg), a = L(fg), b = L(bg);
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const size = parseFloat(cs.fontSize), large = size >= 24 || (+cs.fontWeight >= 700 && size >= 18.66);
    out.push({ text: el.textContent.trim().slice(0, 40), ratio: +ratio.toFixed(2), min: large ? 3 : 4.5 });
  });
  return out;
}
const contrast = async (page, label) => {
  const items = await page.evaluate(sweep);
  const bad = items.filter(i => i.ratio < i.min);
  const worst = items.reduce((m, i) => Math.min(m, i.ratio), 99);
  check(!bad.length, `contrast ${label}: ${items.length} text elements, lowest ${worst.toFixed(2)}:1`);
  bad.forEach(b => console.log(`     ${b.ratio}:1 (needs ${b.min}) "${b.text}"`));
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });

  for (const [w, h, name] of [[1440, 900, 'desktop'], [375, 812, 'mobile']]) {
    console.log(`\n== ${name} ${w}×${h}`);
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: name === 'mobile' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(e.message));
    page.on('requestfailed', r => console.log('     request failed: ' + r.url().slice(0, 80) + ' ' + (r.failure() && r.failure().errorText)));
    await page.goto(FILE + '?demo=fast');
    await page.waitForTimeout(500);

    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal scroll');
    const label = await page.locator('#orb-title').boundingBox();
    check(label && label.height > 0 && label.y < 2000, `orb label is visible without hover (y=${label && Math.round(label.y)})`);
    const orbCopy = await page.evaluate(() => [document.getElementById('orb-title').textContent, document.getElementById('orb-title').nextElementSibling.textContent]);
    check(orbCopy[0] === 'Watch a sample call' && orbCopy[1] === 'Sound on, no microphone', `orb reads "${orbCopy[0]}" with "${orbCopy[1]}" directly under it`);
    check(await page.locator('[role=button][tabindex]').count() === 0, 'orb has a single native button, no extra tab stop');

    // Skip link: first Tab stop, visible when focused, moves focus to main
    await page.keyboard.press('Tab'); await page.waitForTimeout(300);
    const skip = await page.evaluate(() => { const a = document.activeElement, r = a.getBoundingClientRect(); return { cls: a.className, top: r.top, text: a.textContent }; });
    check(skip.cls === 'skip' && skip.top >= 0, `first Tab focuses a visible "${skip.text}" link`);
    await page.keyboard.press('Enter');
    check(await page.evaluate(() => document.activeElement.id === 'main'), 'skip link moves focus to main content');

    // Page content rules
    const content = await page.evaluate(() => {
      const body = document.body.innerText;
      const faq = document.querySelector('.faq').textContent;
      const links = [...document.querySelectorAll('a[href]')];
      return {
        faqPci: /PCI|CCPA/.test(faq), faqLive: faq.includes('including SOC 2, HIPAA, and GDPR'), langs: faq.includes('100+ languages'),
        note: /three different cost/i.test(body), cost: [...body.matchAll(/\b(70%\+|72%|74%)/g)].map(m => m[1]),
        assistant: /Phonely assistant/i.test(body), dental: /dental/i.test(body),
        demoLinks: links.filter(a => a.textContent.trim() === 'Book a demo').map(a => a.getAttribute('href')),
        bookingOut: links.filter(a => /book-a-demo/.test(a.href)).length,
        orig: links.filter(a => /Original page/.test(a.textContent)).map(a => [a.href, !!a.closest('footer')]),
        alma: !!document.querySelector('#alma') && /182\s*ms/.test(document.querySelector('#alma').innerText) && /490\s*ms/.test(document.querySelector('#alma').innerText) && /GPT-4\.1/.test(document.querySelector('#alma').innerText),
        fifteen: /15,000|15K/.test(body)
      };
    });
    check(!content.faqPci && content.faqLive, 'FAQ has no PCI/CCPA and uses the live security wording');
    check(content.langs, 'FAQ restores "100+ languages"');
    const extra = await page.evaluate(() => {
      const chips = [...document.querySelectorAll('.compliance li')].map(li => li.textContent.trim());
      const ext = [...document.querySelectorAll('a[href]')].filter(a => /^https:\/\/([a-z]+\.)?phonely\.ai/.test(a.href));
      const bad = ext.filter(a => a.target !== '_blank' || !/\bnoopener\b/.test(a.rel) || !/\bnoreferrer\b/.test(a.rel)).map(a => a.href);
      return { chips, pciAnywhere: /PCI|CCPA/.test(document.body.textContent), ext: ext.length, bad };
    });
    check(extra.chips.join(',') === 'SOC 2,HIPAA,GDPR' && !extra.pciAnywhere, `hero chips match the FAQ (${extra.chips.join(' · ')}); no PCI/CCPA anywhere`);
    check(extra.ext > 0 && !extra.bad.length, `all ${extra.ext} phonely.ai links open in a new tab with noopener noreferrer${extra.bad.length ? ': ' + extra.bad.join(' ') : ''}`);
    check(!content.note, 'footer cost-figures note is gone');
    check(content.cost.every(c => c === '72%') && !content.fifteen, `only one cost figure (72%) and no 15K/15,000 claim (found: ${[...new Set(content.cost)].join(', ')})`);
    check(!content.assistant && !content.dental, 'demo uses a neutral business and greeting');
    check(content.demoLinks.length >= 6 && content.demoLinks.every(h => h === '#book') && !content.bookingOut, `all ${content.demoLinks.length} "Book a demo" links scroll to #book; none go to phonely.ai`);
    check(content.orig.length === 1 && content.orig[0][1] && /phonely\.ai\/$/.test(content.orig[0][0]), 'one "Original page" link to phonely.ai, in the footer');
    check(content.alma, 'Alma has its own section with 182 ms vs 490 ms for GPT-4.1');
    await page.click('.hero a.btn[href="#book"]');
    await page.waitForFunction(() => { const t = document.getElementById('book').getBoundingClientRect().top; return t > -50 && t < 300; }, null, { timeout: 5000 }).catch(() => {});
    const bookTop = await page.locator('#book').evaluate(e => e.getBoundingClientRect().top);
    check(bookTop > -50 && bookTop < 300, `a "Book a demo" click scrolls to the page's CTA (top ${Math.round(bookTop)}px)`);
    await page.click('#book-btn');
    check((await page.textContent('#book-note')).includes('design concept'), 'the CTA section\'s own button explains the concept instead of a dead end');
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(600);

    // Full sample call
    await page.locator('#demo').scrollIntoViewIfNeeded();
    await page.click('#orb-btn', { force: true });

    // Audio plays and the transcript follows its word timings
    await page.waitForFunction(() => { const a = document.getElementById('call-audio'); return a.src.includes('line-03') && !a.paused && a.currentTime > 0.6; }, null, { timeout: 15000 });
    const sync = await page.evaluate(() => {
      const a = document.getElementById('call-audio'), t = a.currentTime;
      const lines = JSON.parse(document.getElementById('call-timings').textContent).lines;
      const idx = lines.findIndex(l => a.src.endsWith(l.file));
      const expected = lines[idx].words.filter(w => t + 0.03 >= w.start).length;
      const shown = [...document.querySelectorAll('#log .line')][idx].querySelectorAll('.w.on').length;
      return { idx, t: +t.toFixed(2), expected, shown, total: lines[idx].words.length };
    });
    check(Math.abs(sync.shown - sync.expected) <= 1 && sync.shown < sync.total, `audio plays line ${sync.idx + 1}; words shown follow the voice (${sync.shown} shown, ${sync.expected} spoken by ${sync.t}s of ${sync.total})`);
    await page.click('#mute-btn');
    const m1 = await page.evaluate(() => [document.getElementById('mute-btn').getAttribute('aria-pressed'), document.getElementById('mute-btn').textContent.trim()]);
    await page.click('#mute-btn');
    const m2 = await page.evaluate(() => document.getElementById('mute-btn').getAttribute('aria-pressed'));
    check(m1[0] === 'true' && m1[1] === 'Unmute' && m2 === 'false', 'mute button toggles (aria-pressed, Mute/Unmute label)');
    await page.waitForSelector('.line.caller');
    await page.waitForTimeout(400);
    await page.locator('#demo').screenshot({ path: `${OUT}/${name}-call-live.png` });
    await page.waitForSelector('#summary:not([hidden])', { timeout: 20000 });
    await page.waitForTimeout(400);
    check(await page.locator('#log .line').count() === 9, 'all 9 transcript lines shown');
    check(await page.locator('#chips .chip').count() === 6, '6 "What I heard" chips shown');
    check((await page.textContent('#summary-badge')).includes('Booked'), 'summary card says booked');
    check((await page.textContent('#summary-list')).includes('Thu 10:30 am'), 'summary card lists the booked slot');
    await page.locator('#demo').screenshot({ path: `${OUT}/${name}-call-summary.png` });
    await contrast(page, 'summary card');

    // Ended early
    await page.click('#replay-btn');
    await page.waitForSelector('.line.agent');
    await page.click('#orb-btn', { force: true });
    await page.waitForSelector('#summary:not([hidden])');
    check((await page.textContent('#summary-badge')).includes('Ended before booking'), 'ending early shows "Ended before booking"');

    // Skip to summary
    await page.click('#replay-btn');
    await page.waitForSelector('#skip-btn:not([hidden])');
    await page.click('#skip-btn');
    await page.waitForSelector('#summary:not([hidden])');
    check(await page.locator('#log .line').count() === 9 && (await page.textContent('#summary-badge')).includes('Booked'), 'skip fills the transcript and shows a booked summary');

    // Off-screen finish shows a "Call ended" toast; View summary brings the demo back
    await page.goto(FILE + '?demo=fast'); await page.waitForTimeout(300);
    await page.click('#orb-btn', { force: true });
    await page.evaluate(() => document.getElementById('faq').scrollIntoView({ behavior: 'instant' }));
    await page.waitForSelector('#toast', { timeout: 20000 });
    check((await page.textContent('#toast')).includes('Call ended'), 'call finishing off-screen shows a "Call ended" toast');
    await page.screenshot({ path: `${OUT}/${name}-toast.png` });
    await contrast(page, 'toast');
    await page.click('#toast .btn');
    await page.waitForFunction(() => { const r = document.getElementById('demo').getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }, null, { timeout: 5000 }).catch(() => {});
    const back = await page.evaluate(() => { const r = document.getElementById('demo').getBoundingClientRect(); return { vis: r.bottom > 0 && r.top < innerHeight, toast: !!document.getElementById('toast'), focus: document.activeElement.id }; });
    check(back.vis && !back.toast && back.focus === 'summary-title', '"View summary" scrolls back, closes the toast and focuses the summary');
    await page.click('#orb-btn', { force: true }); await page.waitForSelector('#summary:not([hidden])', { timeout: 20000 });
    check(!(await page.locator('#toast').count()), 'no toast when the call ends on-screen');

    // Keyboard FAQ
    const faq = page.locator('.faq summary').nth(1);
    await faq.focus(); await page.keyboard.press('Enter');
    check(await page.locator('.faq details').nth(1).evaluate(d => d.open), 'FAQ opens with Enter');
    await page.keyboard.press('Space');
    check(!(await page.locator('.faq details').nth(1).evaluate(d => d.open)), 'FAQ closes with Space');

    // Tabs: focus ring, arrow keys, deep link
    await page.locator('#t-builder').focus();
    await page.keyboard.press('ArrowRight');
    const ring = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return { id: document.activeElement.id, style: cs.outlineStyle, width: cs.outlineWidth }; });
    check(ring.id === 't-history' && ring.style !== 'none' && parseFloat(ring.width) >= 2, `product tab focus ring visible after ArrowRight (${ring.style} ${ring.width})`);
    check(page.url().includes('product=call-history'), 'selected product tab is in the URL');
    check(await page.locator('#p-history').isVisible() && !(await page.locator('#p-builder').isVisible()), 'only the selected product panel shows');
    await page.locator('#ti-cc').focus(); await page.keyboard.press('End');
    const ring2 = await page.evaluate(() => [document.activeElement.id, getComputedStyle(document.activeElement).outlineStyle]);
    check(ring2[0] === 'ti-ins' && ring2[1] !== 'none', 'industry tab focus ring visible after End');
    await page.locator('#industries').screenshot({ path: `${OUT}/${name}-industries-focus.png` });

    // Tap targets: interactive elements under 44px tall (24px on desktop is the floor; 44 on mobile)
    const minH = name === 'mobile' ? 44 : 24;
    const small = await page.evaluate(min => [...document.querySelectorAll('a[href], button, summary, [role=tab]')]
      .filter(el => el.offsetParent !== null && !el.closest('[hidden]'))
      .map(el => { const r = el.getBoundingClientRect(); return { t: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30), h: Math.round(r.height), w: Math.round(r.width) }; })
      .filter(x => x.h < min || x.w < 24), minH);
    check(!small.length, `tap targets ≥${minH}px tall`);
    small.forEach(s => console.log(`     ${s.w}×${s.h} "${s.t}"`));

    // Page-wide contrast (industry tab and mid states included)
    await page.goto(FILE + '?industry=healthcare');
    await page.waitForTimeout(300);
    check(await page.locator('#ti-hc').getAttribute('aria-selected') === 'true', 'deep link ?industry=healthcare selects Healthcare');
    await page.evaluate(() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('in')));
    await page.waitForTimeout(800);
    await contrast(page, 'whole page');

    if (name === 'mobile') {
      await page.evaluate(() => scrollTo(0, 0));
      await page.click('[data-menu-open]');
      await page.waitForTimeout(300);
      const cta = await page.locator('.mnav-foot .btn-dark').evaluate(b => { const r = b.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(b).lineHeight) || 15; return { w: Math.round(r.width), h: Math.round(r.height), oneLine: b.scrollHeight <= r.height && r.height < 52 }; });
      check(cta.oneLine && cta.w > 120, `menu "Book a demo" is one line (${cta.w}×${cta.h})`);
      check(await page.evaluate(() => document.activeElement.closest('#mnav') !== null), 'focus moves into the open menu');
      check(await page.evaluate(() => getComputedStyle(document.body).overflow === 'hidden'), 'page scroll is locked while the menu is open');
      await page.click('#mnav button.row');
      await page.screenshot({ path: `${OUT}/mobile-menu-open.png` });
      await contrast(page, 'mobile menu');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      check(await page.evaluate(() => document.activeElement.matches('[data-menu-open]')), 'Escape closes the menu and returns focus');
    } else {
      await page.evaluate(() => scrollTo(0, 0));
      await page.click('.menu-btn');
      check(await page.locator('#dd-platform').isVisible(), 'Platform dropdown opens on click');
      await page.keyboard.press('Escape');
      check(!(await page.locator('#dd-platform.open').count()), 'Escape closes the dropdown');
    }
    check(!errors.length, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }

  // Reduced motion: nothing animates, the orb draws one still frame, the call still works.
  // Audio blocked (play() rejects): the call still runs as text and says so
  console.log('\n== audio blocked (1440×900)');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(() => { HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('blocked', 'NotAllowedError')); });
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(FILE + '?demo=fast');
    await page.click('#orb-btn', { force: true });
    await page.waitForSelector('#summary:not([hidden])', { timeout: 20000 });
    check(await page.locator('#log .line').count() === 9 && (await page.textContent('#summary-badge')).includes('Booked'), 'with audio blocked, the full transcript still plays and books');
    check((await page.textContent('#orb-note')).includes('transcript only'), 'with audio blocked, the demo says it is showing the transcript only');
    check(!errors.length, `no page errors with audio blocked${errors.length ? ': ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }

  console.log('\n== reduced motion (375×812)');
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(FILE + '?demo=fast');
  await page.waitForTimeout(400);
  check(await page.evaluate(() => document.documentElement.dataset.motion) === 'reduce', 'page switches to reduced motion');
  const frame = () => page.evaluate(() => document.getElementById('orb-canvas').toDataURL());
  const a = await frame(); await page.waitForTimeout(500); const b = await frame();
  check(a === b, 'orb canvas holds still');
  await page.click('#orb-btn', { force: true });
  await page.waitForSelector('.line.caller');
  const running = await page.evaluate(() => document.getAnimations().filter(x => x.playState === 'running').map(x => x.animationName || x.constructor.name));
  check(!running.length, `no running animations during the call${running.length ? ': ' + running.join(', ') : ''}`);
  check(await page.locator('.quote').first().evaluate(q => getComputedStyle(q).position) !== 'sticky', 'testimonial cards stop stacking');
  await page.waitForSelector('#summary:not([hidden])', { timeout: 20000 });
  check(true, 'sample call reaches the summary under reduced motion');
  await ctx.close();

  await browser.close();
  console.log(`\n${failed ? failed + ' check(s) failed' : 'All checks passed'}`);
  process.exit(failed ? 1 : 0);
})();
