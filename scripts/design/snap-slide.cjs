// Frames of the story viewer changing beats (Next, then Back), to check the archive rack's slide by paint.
// usage: node scripts/design/snap-slide.cjs [out dir] (dev server on port 3012; STORY_URL for another host)
const path = require('path');
const fs = require('fs');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.join(__dirname, '..', '..', 'apps/web')] }));
const URL = process.env.STORY_URL || 'http://localhost:3012/';
const out = process.argv[2] || path.join(__dirname, '..', '..', 'untracked', 'snaps', 'slide');
const MOMENTS = [0, 200, 420, 560, 700, 820, 1000, 1400, 2200];
(async () => {
	fs.mkdirSync(out, { recursive: true });
	const b = await chromium.launch({ channel: 'chrome' });
	const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
	const errs = [];
	p.on('pageerror', (e) => errs.push(String(e)));
	await p.goto(URL, { waitUntil: 'networkidle' });
	await p.evaluate(() => {
		const s = document.getElementById('story');
		const pin = s.firstElementChild;
		window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY + 32 - parseFloat(pin.style.top || '0') + 120);
	});
	await p.waitForTimeout(2600);
	for (const [dir, name] of [['Next', 'next'], ['Back', 'back']]) {
		const t0 = Date.now();
		await p.getByRole('button', { name: new RegExp('^' + dir) }).click({ noWaitAfter: true });
		for (const ms of MOMENTS) {
			const wait = ms - (Date.now() - t0);
			if (wait > 0) await p.waitForTimeout(wait);
			await p.screenshot({ path: path.join(out, `${name}-${String(ms).padStart(4, '0')}.png`) });
		}
		await p.waitForTimeout(1500);
	}
	console.log(out, errs.length ? 'ERRORS ' + errs.join(' | ') : 'no errors');
	await b.close();
})();
