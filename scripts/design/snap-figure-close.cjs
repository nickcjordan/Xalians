// Close frames of a home story figure for review (docs/design/home-story-figures.md): bring the viewer to
// rest, step to the figure's beats, and save the figure's place alone at twice the pixels, at set moments.
//
// usage: node scripts/design/snap-figure-close.cjs   (dev server on port 3012; STORY_URL for another host)
// writes untracked/snaps/close-<beat>-<ms>.png
const path = require('path');
const fs = require('fs');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.join(__dirname, '..', '..', 'apps/web')] }));

const root = path.join(process.env.LOCALAPPDATA, 'ms-playwright');
const d = fs.readdirSync(root).filter((x) => x.startsWith('chromium_headless_shell')).sort().reverse()[0];
const exe = path.join(root, d, 'chrome-headless-shell-win64/chrome-headless-shell.exe');
const OUT = path.join(__dirname, '..', '..', 'untracked', 'snaps');
fs.mkdirSync(OUT, { recursive: true });
const URL = process.env.STORY_URL || 'http://localhost:3012/';
const PLAN = [
	['02', (process.env.T02 || '1500,3200,5000,7600,10200').split(',').map(Number)],
	['03', (process.env.T03 || '400,1500,2300,3000,3600,6000').split(',').map(Number)],
];

(async () => {
	const b = await chromium.launch({ executablePath: exe });
	const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
	const p = await ctx.newPage();
	const errs = [];
	p.on('pageerror', (e) => errs.push(String(e)));
	await p.goto(URL, { waitUntil: 'networkidle' });
	await p.evaluate(() => {
		const s = document.getElementById('story');
		const pin = s.firstElementChild;
		window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY + 32 - parseFloat(pin.style.top || '0') + 120);
	});
	await p.waitForTimeout(2600);
	for (const [beat, times] of PLAN) {
		await p.getByRole('button', { name: /^Next/ }).click({ noWaitAfter: true });
		const t0 = Date.now();
		for (const ms of times) {
			const wait = ms - (Date.now() - t0);
			if (wait > 0) await p.waitForTimeout(wait);
			const slot = p.locator('.story-scene[data-state=active] [data-figure-slot]');
			const box = await slot.boundingBox();
			await p.screenshot({ path: path.join(OUT, `close-${beat}-${ms}.png`), clip: { x: box.x - 20, y: box.y - 20, width: box.width + 40, height: box.height + 40 } });
		}
	}
	console.log(errs.length ? errs.join(' | ') : 'no errors');
	await b.close();
})();
