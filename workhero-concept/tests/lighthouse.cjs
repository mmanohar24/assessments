// Lighthouse accessibility and performance at mobile and desktop settings.
// Run: NODE_PATH=<dir with lighthouse, chrome-launcher> node tests/lighthouse.cjs [baseUrl]
const BASE = process.argv[2] || 'http://localhost:4173/';
const TARGET = 95;

(async () => {
  const { default: lighthouse, desktopConfig } = await import(require.resolve('lighthouse/core/index.cjs')).catch(() => import('lighthouse'));
  const chromeLauncher = await import('chrome-launcher');
  let failed = 0;
  for (const [name, config] of [['mobile', undefined], ['desktop', desktopConfig]]) {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new'] });
    const res = await lighthouse(BASE, { port: chrome.port, onlyCategories: ['accessibility', 'performance', 'best-practices'], output: 'json', logLevel: 'error' }, config);
    await chrome.kill();
    const c = res.lhr.categories;
    const a = res.lhr.audits;
    const scores = Object.fromEntries(Object.values(c).map(x => [x.id, Math.round(x.score * 100)]));
    const ok = scores.accessibility >= TARGET && scores.performance >= TARGET;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${JSON.stringify(scores)}  LCP ${a['largest-contentful-paint'].displayValue}, CLS ${a['cumulative-layout-shift'].displayValue}, TBT ${a['total-blocking-time'].displayValue}`);
    if (!ok) for (const r of Object.values(res.lhr.audits).filter(x => x.score !== null && x.score < 0.9 && x.scoreDisplayMode !== 'informative').slice(0, 10)) console.log('      ', r.id, r.displayValue || '');
  }
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
