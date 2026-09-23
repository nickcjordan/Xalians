// Walk the home story's stage the way a reader scrolls it, and check the
// one-scene rule at every stop: which scene is shown, how many living plates
// have SVG in the DOM, and what is on screen (viewport screenshots, plus one
// taken mid-transition so the motion can be judged too).
//
// usage: node scripts/plates/snap-stage.cjs   (dev server on port 3012)
// writes untracked/snaps/stage-<viewport>-<stop>.png
const path = require('path');
const fs = require('fs');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.join(__dirname, '..', '..', 'apps/web')] }));

const root = path.join(process.env.LOCALAPPDATA, 'ms-playwright');
const d = fs.readdirSync(root).filter((x) => x.startsWith('chromium_headless_shell')).sort().reverse()[0];
const exe = path.join(root, d, 'chrome-headless-shell-win64/chrome-headless-shell.exe');
const OUT = path.join(__dirname, '..', '..', 'untracked', 'snaps');
fs.mkdirSync(OUT, { recursive: true });

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
	for (const [name, w, h, rm] of VIEWPORTS) {
		if (only.length && !only.includes(name)) continue;
		const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: rm, isMobile: w < 900 && h > w });
		const p = await ctx.newPage();
		const errs = [];
		p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
		p.on('pageerror', (e) => errs.push(String(e)));
		await p.goto('http://localhost:3012/', { waitUntil: 'networkidle' });
		const staged = await p.$('.story-stage');
		const state = () =>
			p.evaluate(() => ({
				scene: [...document.querySelectorAll('.story-scene')].findIndex((s) => s.getAttribute('data-state') === 'active'),
				svgPlates: document.querySelectorAll('.live-plate-host svg.layer').length ? [...document.querySelectorAll('.live-plate-host')].filter((h) => h.querySelector('svg.layer')).length : 0,
				ready: [...document.querySelectorAll('[data-live-plate="ready"]')].map((e) => e.getAttribute('data-plate-src').split('/')[3]),
				overflowX: document.documentElement.scrollWidth > window.innerWidth,
			}));
		if (!staged) {
			console.log(name, 'stacked (no stage)', await state(), errs.length ? errs : 'no errors');
			await p.evaluate(() => document.getElementById('story').scrollIntoView());
			await p.waitForTimeout(1500);
			await p.screenshot({ path: path.join(OUT, `stage-${name}-stacked.png`) });
			await ctx.close();
			continue;
		}
		const geo = await p.evaluate(() => {
			const s = document.querySelector('.story-stage');
			const st = s.firstElementChild;
			return { top: s.getBoundingClientRect().top + window.scrollY, step: (s.offsetHeight - st.offsetHeight) / 3 };
		});
		for (let i = 0; i < 4; i++) {
			await p.evaluate((y) => window.scrollTo(0, y), geo.top + i * geo.step + 1);
			if (i === 1) {
				await p.waitForTimeout(450);
				await p.screenshot({ path: path.join(OUT, `stage-${name}-mid01.png`) });
			}
			await p.waitForTimeout(1900);
			await p.screenshot({ path: path.join(OUT, `stage-${name}-${i}.png`) });
			console.log(name, i, JSON.stringify(await state()));
		}
		// past the stage: nothing live
		await p.evaluate((y) => window.scrollTo(0, y), geo.top + 3 * geo.step + h * 1.6);
		await p.waitForTimeout(1500);
		console.log(name, 'after', JSON.stringify(await state()));
		// back up to the top of the stage
		await p.evaluate((y) => window.scrollTo(0, y), geo.top + 1);
		await p.waitForTimeout(1900);
		console.log(name, 'back', JSON.stringify(await state()), errs.length ? errs : 'no errors');
		await ctx.close();
	}
	await b.close();
})();
