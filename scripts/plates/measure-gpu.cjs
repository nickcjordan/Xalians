const path = require('path');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.join(__dirname, '..', '..', 'apps/web')] }));
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=2000,2000', '--window-size=1500,960'] });
  for (const file of process.argv.slice(2)) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto('file:///' + file, { waitUntil: 'load' });
    await p.waitForTimeout(1200);
    const out = path.join(__dirname, '..', '..', 'untracked', 'trace-gpu.json');
    await b.startTracing(p, { path: out, categories: ['disabled-by-default-devtools.timeline', 'devtools.timeline', 'cc', 'gpu'] });
    await p.waitForTimeout(3000);
    await b.stopTracing();
    const ev = JSON.parse(fs.readFileSync(out, 'utf8')).traceEvents;
    const tn = {}; for (const e of ev) if (e.ph === 'M' && e.name === 'thread_name') tn[e.pid + ':' + e.tid] = e.args.name;
    let raster = 0, draws = 0, viz = 0, gpu = 0;
    for (const e of ev) {
      if (e.ph !== 'X') continue;
      if (e.name === 'RasterTask') raster += e.dur / 1000;
      if (e.name === 'ProxyImpl::ScheduledActionDraw' || e.name === 'DrawFrame') draws++;
      const t = tn[e.pid + ':' + e.tid];
      if (e.name === 'RunTask' && t === 'VizCompositorThread') viz += e.dur / 1000;
      if (t === 'CrGpuMain' && e.name === 'RunTask') gpu += e.dur / 1000;
    }
    const r = await p.evaluate(() => new Promise((res) => { const t = []; let last = performance.now(); let n = 0; function f(now) { t.push(now - last); last = now; if (++n < 150) requestAnimationFrame(f); else res(t); } requestAnimationFrame(f); }));
    const s = r.slice(20); const mean = s.reduce((a, b) => a + b, 0) / s.length;
    console.log(`${path.basename(file).padEnd(20)} raster ${(raster / 3).toFixed(0)} ms/s  draws ${(draws / 3).toFixed(0)}/s  viz ${(viz / 3).toFixed(0)} ms/s  gpu-main ${(gpu / 3).toFixed(0)} ms/s  rAF mean ${mean.toFixed(1)} ms (~${(1000 / mean).toFixed(0)} fps)`);
    await ctx.close();
  }
  await b.close();
})();
