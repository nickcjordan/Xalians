// Walk the home story the way a reader scrolls it, and check the one-live rule
// at every stop: at most one thing on the page animates (a living plate with
// its SVG ready, or a small piece holding the stage), nothing overflows
// sideways, and the console stays clean. Viewport screenshots are kept.
//
// usage: node scripts/plates/snap-story.cjs [wide|laptop|phone|small|reduced|landscape ...]
//        (dev server on port 3012; set STORY_URL for another host)
// writes untracked/snaps/story-<viewport>-<stop>.png; exits 1 on a broken rule
const path = require('path');
const fs = require('fs');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.join(__dirname, '..', '..', 'apps/web')] }));

const root = path.join(process.env.LOCALAPPDATA, 'ms-playwright');
const d = fs.readdirSync(root).filter((x) => x.startsWith('chromium_headless_shell')).sort().reverse()[0];
const exe = path.join(root, d, 'chrome-headless-shell-win64/chrome-headless-shell.exe');
const OUT = path.join(__dirname, '..', '..', 'untracked', 'snaps');
fs.mkdirSync(OUT, { recursive: true });
const URL = process.env.STORY_URL || 'http://localhost:3012/';
const STOPS = 12;

const VIEWPORTS = [
	['wide', 1440, 900, 'no-preference'],
	['laptop', 1366, 640, 'no-preference'],
	['phone', 390, 844, 'no-preference'],
	['small', 375, 667, 'no-preference'],
	['reduced', 1440, 900, 'reduce'],
	['landscape', 844, 390, 'no-preference'],
];
const only = process.argv.slice(2);

(async () => {
	const b = await chromium.launch({ executablePath: exe });
	let broken = 0;
	for (const [name, w, h, rm] of VIEWPORTS) {
		if (only.length && !only.includes(name)) continue;
		const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: rm, isMobile: w < 900 && h > w });
		const p = await ctx.newPage();
		const errs = [];
		p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
		p.on('pageerror', (e) => errs.push(String(e)));
		await p.goto(URL, { waitUntil: 'networkidle' });
		await p.waitForTimeout(800);
		const g = await p.evaluate(() => {
			const r = document.getElementById('story').getBoundingClientRect();
			return { top: r.top + window.scrollY, h: r.height };
		});
		for (let k = 0; k <= STOPS; k++) {
			const y = g.top - 100 + (g.h - h / 2) * (k / STOPS);
			const from = await p.evaluate(() => window.scrollY);
			// a wheel-like scroll, not a jump
			for (let i = 1; i <= 6; i++) {
				await p.evaluate((v) => window.scrollTo(0, v), from + ((y - from) * i) / 6);
				await p.waitForTimeout(30);
			}
			await p.waitForTimeout(1300);
			const s = await p.evaluate(() => ({
				plates: [...document.querySelectorAll('[data-live-plate="ready"]')].map((e) => e.getAttribute('data-plate-src').split('/')[3]),
				plateSvgHosts: [...document.querySelectorAll('.live-plate-host')].filter((e) => e.childElementCount > 0).length,
				pieces: [...document.querySelectorAll('[data-piece][data-live]')].map((e) => e.getAttribute('data-piece')),
				chapter: document.querySelector('.story-marker[aria-current]')?.getAttribute('aria-label'),
				overflowX: document.documentElement.scrollWidth > window.innerWidth,
			}));
			const live = s.plates.length + s.pieces.length;
			const bad = live > 1 || s.plateSvgHosts > 1 || s.overflowX || (rm === 'reduce' && s.pieces.length > 0);
			if (bad) broken++;
			await p.screenshot({ path: path.join(OUT, `story-${name}-${k}.png`) });
			console.log(name, k, bad ? 'BROKEN' : 'ok', JSON.stringify(s));
		}
		console.log(name, errs.length ? `console errors: ${errs.slice(0, 3).join(' | ')}` : 'no errors');
		if (errs.length) broken++;
		await ctx.close();
	}
	await b.close();
	process.exit(broken ? 1 : 0);
})();
