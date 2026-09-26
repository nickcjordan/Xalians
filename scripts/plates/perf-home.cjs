// Scroll the home page the way a reader does, in real Chrome with the GPU (a
// headless run lies about compositing), and report how smooth each phase is:
// frame intervals from requestAnimationFrame, long tasks, and the biggest
// main-thread work in a Chrome trace, grouped by what it was.
//
// usage: node scripts/plates/perf-home.cjs [url]   (default: the dev server on 3012)
// writes untracked/perf-home.json (the trace) and prints a table per phase
const path = require('path');
const fs = require('fs');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.join(__dirname, '..', '..', 'apps/web')] }));

const URL = process.argv[2] || 'http://localhost:3012/';
const OUT = path.join(__dirname, '..', '..', 'untracked');

(async () => {
	const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=2000,2000', '--window-size=1500,1000'] });
	const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
	const p = await ctx.newPage();
	await p.goto(URL, { waitUntil: 'networkidle' });
	await p.waitForTimeout(1500);
	// Frame intervals and long tasks, marked by phase.
	await p.evaluate(() => {
		const w = window;
		w.__perf = { phase: 'idle', frames: [], long: [] };
		let last = performance.now();
		const tick = (now) => {
			w.__perf.frames.push([w.__perf.phase, now - last]);
			last = now;
			requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
		try {
			new PerformanceObserver((l) => l.getEntries().forEach((e) => w.__perf.long.push([w.__perf.phase, Math.round(e.duration)]))).observe({ type: 'longtask', buffered: false });
		} catch {}
	});
	const phase = (name) => p.evaluate((n) => (window.__perf.phase = n), name);
	const wheel = async (dy, steps, gap = 16) => {
		for (let i = 0; i < steps; i++) {
			await p.mouse.wheel(0, dy);
			await p.waitForTimeout(gap);
		}
	};
	await p.mouse.move(700, 450);
	const tracePath = path.join(OUT, 'perf-home.json');
	await b.startTracing(p, { path: tracePath, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'blink.user_timing'] });
	const marks = [];
	const mark = async (name) => {
		marks.push([name, await p.evaluate((n) => (performance.mark('phase:' + n), performance.now()), name)]);
		await phase(name);
	};
	// THROTTLE=4 slows the CPU four times, for a laptop rather than this desktop.
	if (process.env.THROTTLE) {
		const cdp = await ctx.newCDPSession(p);
		await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.THROTTLE) });
	}

	await mark('hero idle');
	await p.waitForTimeout(1500);
	// scroll down toward the story, like a wheel
	await mark('scroll to story');
	const storyTop = await p.evaluate(() => document.getElementById('story').getBoundingClientRect().top);
	await wheel(100, Math.max(1, Math.round(storyTop / 100)), 30);
	await mark('arrive and tune in');
	await wheel(60, 4, 40);
	await p.waitForTimeout(2500);
	await mark('playing 01');
	await p.waitForTimeout(3000);
	for (let i = 2; i <= 5; i++) {
		await mark(`next to 0${i}`);
		await p.getByRole('button', { name: /^Next/ }).click({ noWaitAfter: true });
		await p.waitForTimeout(1800);
		await mark(`playing 0${i}`);
		await p.waitForTimeout(2200);
	}
	await mark('scroll past story');
	await wheel(100, 30, 30);
	await mark('scroll to bottom');
	await wheel(120, 30, 30);
	await mark('scroll back up');
	await wheel(-120, 60, 30);
	await mark('end');
	await p.waitForTimeout(300);
	await b.stopTracing();
	const perf = await p.evaluate(() => window.__perf);
	await b.close();

	// ---- frames and long tasks per phase
	const phases = [...new Set(perf.frames.map((f) => f[0]))].filter((x) => x !== 'idle');
	const pct = (arr, q) => (arr.length ? arr.slice().sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor(q * arr.length))] : 0);
	console.log('phase'.padEnd(22), 'frames', 'mean ms', 'p95 ms', 'max ms', '>33ms', 'long tasks (ms)');
	for (const ph of phases) {
		const f = perf.frames.filter((x) => x[0] === ph).map((x) => x[1]);
		const lt = perf.long.filter((x) => x[0] === ph).map((x) => x[1]);
		const mean = f.reduce((a, b) => a + b, 0) / Math.max(1, f.length);
		console.log(ph.padEnd(22), String(f.length).padStart(6), mean.toFixed(1).padStart(7), pct(f, 0.95).toFixed(1).padStart(6), Math.max(0, ...f).toFixed(0).padStart(6), String(f.filter((x) => x > 33).length).padStart(5), lt.join(','));
	}

	// ---- the trace: main-thread work by kind, per phase
	const ev = JSON.parse(fs.readFileSync(tracePath, 'utf8')).traceEvents;
	const tn = {};
	for (const e of ev) if (e.ph === 'M' && e.name === 'thread_name') tn[e.pid + ':' + e.tid] = e.args.name;
	const main = ev.filter((e) => e.ph === 'X' && tn[e.pid + ':' + e.tid] === 'CrRendererMain');
	// map page performance.now() marks to trace time using the navigationStart-relative clock: approximate via the first and last marks
	const kinds = ['UpdateLayoutTree', 'Layout', 'Paint', 'PrePaint', 'Layerize', 'Commit', 'ParseHTML', 'FunctionCall', 'EventDispatch', 'TimerFire', 'FireAnimationFrame', 'v8.run', 'ScheduleStyleRecalculation', 'HitTest', 'IntersectionObserverController::computeIntersections', 'UpdateLayer', 'RasterTask'];
	const total = {};
	for (const e of main) if (kinds.includes(e.name)) total[e.name] = (total[e.name] || 0) + e.dur / 1000;
	console.log('\nmain-thread totals over the run (ms):');
	Object.entries(total).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + k.padEnd(50), v.toFixed(0)));
	const big = main.filter((e) => e.dur > 30000 && e.name !== 'RunTask' && e.name !== 'ThreadControllerImpl::RunTask').sort((a, b) => b.dur - a.dur).slice(0, 15);
	console.log('\nlongest main-thread slices:');
	for (const e of big) console.log('  ' + e.name.padEnd(40), (e.dur / 1000).toFixed(0) + 'ms', JSON.stringify(e.args?.data?.url || e.args?.data?.functionName || e.args?.data?.type || '').slice(0, 80));
	// Per phase: main-thread busy time per second, and what it was.
	const pm = ev.filter((e) => e.name && e.name.startsWith('phase:')).map((e) => [e.name.slice(6), e.ts]).sort((a, b) => a[1] - b[1]);
	const tasks = ev.filter((e) => e.ph === 'X' && tn[e.pid + ':' + e.tid] === 'CrRendererMain' && (e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask'));
	console.log('\nmain thread per phase: busy ms per second, worst task, and its biggest kinds');
	for (let i = 0; i < pm.length - 1; i++) {
		const [name, t0] = pm[i];
		const t1 = pm[i + 1][1];
		const inside = tasks.filter((e) => e.ts >= t0 && e.ts < t1);
		const busy = inside.reduce((a, e) => a + e.dur, 0) / 1000;
		const worst = inside.reduce((m, e) => Math.max(m, e.dur), 0) / 1000;
		const by = {};
		for (const e of main) if (e.ts >= t0 && e.ts < t1 && e.name !== 'RunTask' && e.name !== 'ThreadControllerImpl::RunTask') by[e.name] = (by[e.name] || 0) + e.dur / 1000;
		const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(', ');
		console.log('  ' + name.padEnd(20), (busy / ((t1 - t0) / 1e6)).toFixed(0).padStart(5) + ' ms/s', ('worst ' + worst.toFixed(0) + 'ms').padStart(12), ' ', top);
	}
	const rasters = ev.filter((e) => e.ph === 'X' && e.name === 'RasterTask');
	console.log('\nraster total (all threads):', (rasters.reduce((a, e) => a + e.dur, 0) / 1000).toFixed(0), 'ms over', rasters.length, 'tasks');
	fs.writeFileSync(path.join(OUT, 'perf-home-frames.json'), JSON.stringify({ marks, perf }));
})();
