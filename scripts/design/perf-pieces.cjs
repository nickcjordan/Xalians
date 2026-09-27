// What a playing small piece costs on the home page: main thread and graphics chip busy per second while each
// piece plays, from a Chrome trace (docs/design/home-story-small-pieces.md, section 5).
// usage: node scripts/design/perf-pieces.cjs [url] [chapter numerals, comma separated]
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.join(__dirname, '..', '..', 'apps/web')] }));
const URL = process.argv[2] || 'http://localhost:3012/';
const CHAPTERS = (process.argv[3] || '02,03,05,06').split(',');
(async () => {
	const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=2000,2000'] });
	const ctx = await b.newContext(process.env.MOBILE ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
	const p = await ctx.newPage();
	await p.goto(URL, { waitUntil: 'networkidle' });
	await p.waitForTimeout(800);
	await p.locator('.archive-play').first().click();
	await p.waitForTimeout(2500);
	for (const n of CHAPTERS) {
		await p.getByRole('button', { name: new RegExp('^' + n + ' ') }).click();
		await p.waitForTimeout(2500);
		const trace = path.join(os.tmpdir(), `perf-piece-${n}.json`);
		await b.startTracing(p, { path: trace, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'toplevel', 'gpu'] });
		const t0 = await p.evaluate(() => performance.now());
		await p.waitForTimeout(4000);
		await b.stopTracing();
		const live = await p.evaluate(() => document.querySelector('.story-scene[data-state=active] [data-piece-live]')?.getAttribute('data-piece-live'));
		const ev = JSON.parse(fs.readFileSync(trace, 'utf8')).traceEvents;
		const tn = {};
		for (const e of ev) if (e.name === 'thread_name') tn[e.pid + ':' + e.tid] = e.args.name;
		const x = ev.filter((e) => e.ph === 'X' && e.dur);
		const span = (Math.max(...x.map((e) => e.ts + e.dur)) - Math.min(...x.map((e) => e.ts))) / 1e6;
		const sum = (thread) => x.filter((e) => tn[e.pid + ':' + e.tid] === thread && (e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask')).reduce((a, e) => a + e.dur, 0) / 1000 / span;
		console.log(`chapter ${n} (piece live: ${live}): main ${sum('CrRendererMain').toFixed(0)} ms/s, gpu ${sum('CrGpuMain').toFixed(0)} ms/s`);
		void t0;
	}
	await b.close();
})();
