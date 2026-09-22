const path = require('path');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.join(__dirname, '..', '..', 'apps/web')] }));
const fs = require('fs');
function findChrome() {
  const root = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  const dirs = fs.readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell') || d.startsWith('chromium-')).sort().reverse();
  for (const d of dirs) for (const sub of ['chrome-headless-shell-win64/chrome-headless-shell.exe', 'chrome-win/chrome.exe', 'chrome-win64/chrome.exe']) { const p = path.join(root, d, sub); if (fs.existsSync(p)) return p; }
  throw new Error('no chrome');
}
// usage: node snap-layer.cjs <file> <name> <visible ids comma list or all> [x y w h]
(async () => {
  const [file, name, vis, ...rest] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: findChrome() });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto('file:///' + file, { waitUntil: 'load' });
  await p.waitForTimeout(2000);
  await p.evaluate((vis) => {
    if (vis === 'all') return;
    const keep = new Set(vis.split(','));
    document.querySelectorAll('svg.layer, .surface').forEach((el) => { const id = el.id || el.className.replace('surface ', 'surface.'); if (!keep.has(id)) el.style.visibility = 'hidden'; });
    const well = document.querySelector('.well') || document.querySelector('.frame-well');
    if (well && !keep.has('well')) well.style.background = '#000';
  }, vis);
  await p.waitForTimeout(300);
  const box = await p.evaluate(() => { const r = document.getElementById('layer-sky').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const k = box.w / 1536;
  const [x, y, w, h] = rest.length >= 4 ? rest.map(Number) : [0, 0, 1536, 768];
  await p.screenshot({ path: path.join(__dirname, '..', '..', 'untracked', 'snaps', `${name}.png`), clip: { x: box.x + x * k, y: box.y + y * k, width: w * k, height: h * k } });
  await ctx.close(); await b.close();
})();
