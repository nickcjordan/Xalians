const path = require('path');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.join(__dirname, '..', '..', 'apps/web')] }));
const fs = require('fs');
function findChrome() {
  const root = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  const dirs = fs.readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell') || d.startsWith('chromium-')).sort().reverse();
  for (const d of dirs) for (const sub of ['chrome-headless-shell-win64/chrome-headless-shell.exe', 'chrome-win/chrome.exe', 'chrome-win64/chrome.exe']) { const p = path.join(root, d, sub); if (fs.existsSync(p)) return p; }
  throw new Error('no chrome');
}
// usage: node snap-time.cjs <file> <name> x y w h t1 t2 ...
(async () => {
  const [file, name, x, y, w, h, ...times] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: findChrome() });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto('file:///' + file, { waitUntil: 'load' });
  await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelectorAll('svg.layer').forEach((s) => s.pauseAnimations()));
  const box = await p.evaluate(() => { const r = document.getElementById('layer-sky').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const k = box.w / 1536;
  for (const t of times) {
    await p.evaluate((tt) => document.querySelectorAll('svg.layer').forEach((s) => s.setCurrentTime(tt)), Number(t));
    await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(__dirname, '..', '..', 'untracked', 'snaps', `${name}-t${t}.png`), clip: { x: box.x + x * k, y: box.y + y * k, width: w * k, height: h * k } });
  }
  await ctx.close(); await b.close();
})();
