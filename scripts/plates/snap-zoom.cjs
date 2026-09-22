const path = require('path');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.join(__dirname, '..', '..', 'apps/web')] }));
const fs = require('fs');
function findChrome() {
  const root = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  const dirs = fs.readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell') || d.startsWith('chromium-')).sort().reverse();
  for (const d of dirs) for (const sub of ['chrome-headless-shell-win64/chrome-headless-shell.exe', 'chrome-win/chrome.exe', 'chrome-win64/chrome.exe']) { const p = path.join(root, d, sub); if (fs.existsSync(p)) return p; }
  throw new Error('no chrome');
}
// usage: node snap-zoom.cjs <file> <name> [x y w h in svg units]...
(async () => {
  const [file, name, ...rest] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: findChrome() });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto('file:///' + file, { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  const box = await p.evaluate(() => { const r = document.getElementById('layer-sky').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const k = box.w / 1536;
  if (rest.length === 0) {
    await p.screenshot({ path: path.join(__dirname, '..', '..', 'untracked', 'snaps', `${name}.png`), clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
  }
  for (let i = 0; i + 3 < rest.length; i += 4) {
    const [x, y, w, h] = rest.slice(i, i + 4).map(Number);
    await p.screenshot({ path: path.join(__dirname, '..', '..', 'untracked', 'snaps', `${name}-${i / 4}.png`), clip: { x: box.x + x * k, y: box.y + y * k, width: w * k, height: h * k } });
  }
  await ctx.close(); await b.close();
})();
