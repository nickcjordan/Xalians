// Click through the home story's viewer the way a reader does and check its
// rules at every beat: at most one thing animates (a living plate with its SVG
// ready, or a small piece playing), nothing is live mid-change, only the shown
// beat and the one leaving hold a piece's drawing, nothing overflows sideways,
// and the console stays clean. A screenshot of every settled beat is kept.
//
// usage: node scripts/plates/snap-story.cjs [wide|laptop|phone|small|reduced|landscape ...]
//        (dev server on port 3012; set STORY_URL for another host)
// writes untracked/snaps/story-<viewport>-<beat>.png; exits 1 on a broken rule
const path = require('path');
const fs = require('fs');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.join(__dirname, '..', '..', 'apps/web')] }));

const root = path.join(process.env.LOCALAPPDATA, 'ms-playwright');
const d = fs.readdirSync(root).filter((x) => x.startsWith('chromium_headless_shell')).sort().reverse()[0];
const exe = path.join(root, d, 'chrome-headless-shell-win64/chrome-headless-shell.exe');
const OUT = path.join(__dirname, '..', '..', 'untracked', 'snaps');
fs.mkdirSync(OUT, { recursive: true });
const URL = process.env.STORY_URL || 'http://localhost:3012/';

const VIEWPORTS = [
	['wide', 1440, 900, 'no-preference'],
	['laptop', 1366, 640, 'no-preference'],
	['phone', 390, 844, 'no-preference'],
	['small', 375, 667, 'no-preference'],
	['reduced', 1440, 900, 'reduce'],
	['landscape', 844, 390, 'no-preference'],
];
const only = process.argv.slice(2);

const state = (p) =>
	p.evaluate(() => ({
		beat: document.querySelector('.story-marker[aria-current]')?.getAttribute('aria-label'),
		plates: [...document.querySelectorAll('.story-scene [data-live-plate="ready"]')].map((e) => e.getAttribute('data-plate-src').split('/')[3]),
		plateSvgHosts: [...document.querySelectorAll('.live-plate-host')].filter((e) => e.childElementCount > 0).length,
		drawings: document.querySelectorAll('.story-scene [data-piece-live]').length,
		playing: document.querySelectorAll('.story-scene [data-piece-live="true"]').length,
		overflowX: document.documentElement.scrollWidth > window.innerWidth,
	}));

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
		await p.evaluate(() => document.getElementById('story').scrollIntoView({ block: 'start' }));
		await p.waitForTimeout(1800);
		const count = await p.evaluate(() => document.querySelectorAll('.story-marker').length);
		for (let k = 0; k < count; k++) {
			if (k > 0) {
				await p.getByRole('button', { name: /^Next/ }).click();
				// mid-change: nothing may be live (under reduced motion a beat is still at once, so it may show its plate)
				await p.waitForTimeout(250);
				const mid = await state(p);
				if (rm !== 'reduce' && (mid.plates.length || mid.playing)) {
					broken++;
					console.log(name, k, 'BROKEN mid-change', JSON.stringify(mid));
				}
				await p.waitForTimeout(1700);
			}
			const s = await state(p);
			const live = s.plates.length + s.playing;
			const bad = live > 1 || s.plateSvgHosts > 1 || s.drawings > 1 || s.overflowX || (rm === 'reduce' && s.playing > 0);
			if (bad) broken++;
			await p.screenshot({ path: path.join(OUT, `story-${name}-${k + 1}.png`) });
			console.log(name, k + 1, bad ? 'BROKEN' : 'ok', JSON.stringify(s));
		}
		console.log(name, errs.length ? `console errors: ${errs.slice(0, 3).join(' | ')}` : 'no errors');
		if (errs.length) broken++;
		await ctx.close();
	}
	await b.close();
	process.exit(broken ? 1 : 0);
})();
