// Frames of the home story's figure changes (docs/design/home-story-figures.md): bring the viewer to rest the
// way a reader does, then step through the beats around the figures and save frames partway through each
// change, so the collapse, the travelling light, the bloom, the run-on and the screen tuning in can be read.
//
// usage: node scripts/design/snap-figures.cjs [wide|laptop|phone|reduced ...]
//        (dev server on port 3012; set STORY_URL for another host)
// writes untracked/snaps/figures-<viewport>-<step>-<ms>.png and prints the console's errors
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
	['reduced', 1440, 900, 'reduce'],
];
const only = process.argv.slice(2);
// Each step: the key to press, and when (ms after it) to take frames.
const STEPS = (process.env.STEPS || 'next:150,450,800,1300,2600,6000|next:300,900,1600,2400,3300,4200,7000|next:250,550,900,1300,2600|back:250,700,1200,3000').split('|').map((s) => {
	const [key, times] = s.split(':');
	return { key, times: times.split(',').map(Number) };
});

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
		await p.evaluate(() => {
			const s = document.getElementById('story');
			const pin = s.firstElementChild;
			if (pin.classList.contains('sticky')) window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY + 32 - parseFloat(pin.style.top || '0') + 120);
			else s.querySelector('.story-scene[data-state=active] .frame').scrollIntoView({ block: 'center' });
		});
		await p.waitForTimeout(2600);
		for (const [si, step] of STEPS.entries()) {
			await p.getByRole('button', { name: step.key === 'next' ? /^Next/ : /^Back/ }).click({ noWaitAfter: true });
			const t0 = Date.now();
			for (const ms of step.times) {
				const wait = ms - (Date.now() - t0);
				if (wait > 0) await p.waitForTimeout(wait);
				await p.screenshot({ path: path.join(OUT, `figures-${name}-${si + 1}-${ms}.png`) });
			}
			const s = await p.evaluate(() => ({
				beat: document.querySelector('.story-marker[aria-current]')?.getAttribute('aria-label'),
				screen: document.querySelector('.story-scene[data-state=active] .archive')?.getAttribute('data-screen') ?? null,
				figureLive: document.querySelector('.figure-stage')?.getAttribute('data-figure-live') ?? null,
				overflowX: document.documentElement.scrollWidth > window.innerWidth,
			}));
			if (s.overflowX) broken++;
			console.log(name, si + 1, JSON.stringify(s));
		}
		console.log(name, errs.length ? `console errors: ${errs.slice(0, 3).join(' | ')}` : 'no errors');
		if (errs.length) broken++;
		await ctx.close();
	}
	await b.close();
	process.exit(broken ? 1 : 0);
})();
