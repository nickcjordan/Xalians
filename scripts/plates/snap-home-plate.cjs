const path = require('path');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.join(__dirname, '..', '..', 'apps/web')] }));
const fs = require('fs');
const root = path.join(process.env.LOCALAPPDATA, 'ms-playwright');
const d = fs.readdirSync(root).filter((x) => x.startsWith('chromium_headless_shell')).sort().reverse()[0];
const exe = path.join(root, d, 'chrome-headless-shell-win64/chrome-headless-shell.exe');
(async () => {
  const b = await chromium.launch({ executablePath: exe });
  for (const [name, w, h, rm] of [['home-wide', 1440, 900, 'no-preference'], ['home-phone', 390, 844, 'no-preference'], ['home-reduced', 1440, 900, 'reduce']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, reducedMotion: rm });
    const p = await ctx.newPage(); const errs = [];
    p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto('http://localhost:3012/', { waitUntil: 'networkidle' });
    const el = p.locator('[data-live-plate]').first();
    await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(3500);
    const st = await el.getAttribute('data-live-plate');
    const panel = el.locator('xpath=ancestor::*[contains(@class,"frame")][1]');
    await (await panel.count() ? panel : el).screenshot({ path: path.join(__dirname, '..', '..', 'untracked', 'snaps', name + '.png') });
    console.log(name, st, errs.length ? errs : 'no errors');
    await ctx.close();
  }
  await b.close();
})();
