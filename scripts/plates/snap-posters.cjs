// Capture each living plate's poster: its composed t=0 frame at 1536 and 768
// pixels wide. The poster is what a visitor sees whenever the plate is not the
// one live plate on the page, so it must be the plate itself, not the old
// painting. The plate is rendered on its own with the site's plate CSS (read
// from globals.css), so nothing that overlaps its panel on the page gets in.
//
// usage: node scripts/plates/snap-posters.cjs [era ...]   (dev server on port 3012, which serves the textures)
// writes apps/web/public/assets/plates/<era>/poster.jpg and poster-768.jpg
const path = require('path');
const fs = require('fs');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.join(__dirname, '..', '..', 'apps/web')] }));

function findChrome() {
	const root = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
	const dirs = fs.readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell') || d.startsWith('chromium-')).sort().reverse();
	for (const d of dirs) for (const sub of ['chrome-headless-shell-win64/chrome-headless-shell.exe', 'chrome-win/chrome.exe', 'chrome-win64/chrome.exe']) { const p = path.join(root, d, sub); if (fs.existsSync(p)) return p; }
	throw new Error('no chrome');
}

const ROOT = path.join(__dirname, '..', '..');
const BASE = 'http://localhost:3012/';
const PLATES = path.join(ROOT, 'apps/web/public/assets/plates');

const css = fs.readFileSync(path.join(ROOT, 'apps/web/src/styles/globals.css'), 'utf8');
const rules = css.slice(css.indexOf('.live-plate {'), css.indexOf('/* A frame you can press'));
if (!rules.includes('.live-plate-host')) throw new Error('plate CSS not found in globals.css');

async function capture(browser, era, width) {
	const frag = fs.readFileSync(path.join(PLATES, era, 'plate.html'), 'utf8');
	const [, W, H] = frag.match(/viewBox="0 0 (\d+) (\d+)"/).map(Number);
	const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: width / W });
	const p = await ctx.newPage();
	await p.setContent(`<!doctype html><html><head><base href="${BASE}"><style>html,body{margin:0;background:#0d0d0f}.live-plate{display:block;width:${W}px;height:${H}px}${rules}</style></head><body><span class="live-plate"><div class="live-plate-host">${frag}</div></span></body></html>`, { waitUntil: 'networkidle' });
	await p.evaluate(() => document.querySelectorAll('svg.layer, svg.defs').forEach((s) => { s.pauseAnimations(); s.setCurrentTime(0); }));
	await p.waitForTimeout(800);
	const out = path.join(PLATES, era, width >= 1536 ? 'poster.jpg' : 'poster-768.jpg');
	await (await p.$('.live-plate')).screenshot({ path: out, type: 'jpeg', quality: 86 });
	await ctx.close();
	return out;
}

(async () => {
	const eras = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(PLATES);
	const browser = await chromium.launch({ executablePath: findChrome() });
	for (const era of eras) for (const width of [1536, 768]) console.log(path.relative(ROOT, await capture(browser, era, width)));
	await browser.close();
})();
