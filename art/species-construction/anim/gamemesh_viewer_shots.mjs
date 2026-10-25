// Headless check of the Akinza game mesh viewer (gamemesh-pass1-brief.md step 5). Numbers and screenshots only.
//
//   node art/species-construction/anim/gamemesh_viewer_shots.mjs <viewer.html> <shots dir> <deep frame> [playwright-core dir]
//
// Opens the page at 390 px (a phone: touch, device scale 3) and at 1440 px desktop. For each: waits for the glb,
// records console and page errors, the page and document widths (no horizontal scroll means scrollWidth <= the
// viewport), the smallest button, and screenshots the page with the clip paused at rest (idle frame 0) and at the
// deepest Night Stalk frame, in the baked look and (desktop) the plain material. Then plays: queues Night Stalk and
// records that it starts at an idle loop and returns to idle. Writes <shots dir>/shots.json.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [page, shots, deepFrame, pwDir = 'C:/dev/src/Xalians/node_modules/playwright-core'] = process.argv.slice(2);
const require = createRequire(import.meta.url);
const { chromium } = require(resolve(pwDir));
mkdirSync(shots, { recursive: true });
const url = pathToFileURL(resolve(page)).href;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const out = { url, deepFrame: Number(deepFrame), views: {} };
const deepT = Number(deepFrame) / 30;

async function run(name, contextOpts, extra) {
  const context = await browser.newContext(contextOpts);
  const p = await context.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const t0 = Date.now();
  await p.goto(url);
  await p.waitForFunction(() => window.__viewer?.ready === true || window.__viewer?.errors?.length > 0, null, { timeout: 120000 });
  const loadMs = Date.now() - t0;
  const m = await p.evaluate(() => {
    const targets = [...document.querySelectorAll('button')].map((el) => el.getBoundingClientRect());
    return {
      innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
      horizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
      smallestButton: targets.reduce((a, r) => ({ w: Math.min(a.w, r.width), h: Math.min(a.h, r.height) }), { w: 1e9, h: 1e9 }),
      viewerErrors: window.__viewer.errors, ready: window.__viewer.ready,
      gl: (() => { const c = document.querySelector('canvas'); const g = c && (c.getContext('webgl2') || c.getContext('webgl')); return g ? g.getParameter(g.RENDERER) : null; })(),
    };
  });
  const files = [];
  const snap = async (tag, clip, t, look) => {
    await p.evaluate(([c, tt, l]) => { window.__viewer.setLook(l); window.__viewer.sideView(); window.__viewer.seek(c, tt); }, [clip, t, look]);
    await p.waitForTimeout(400);
    await p.evaluate(([c, tt]) => window.__viewer.seek(c, tt), [clip, t]);
    const f = join(shots, `${name}-${tag}.png`);
    await p.screenshot({ path: f, fullPage: true });
    files.push(f);
  };
  await snap('rest', 'idle', 0, 'baked');
  await snap('crouch', 'sig.night-stalk', deepT, 'baked');
  if (extra) {
    await snap('rest-plain', 'idle', 0, 'plain');
    await snap('crouch-plain', 'sig.night-stalk', deepT, 'plain');
  }
  // play: idle, queue Night Stalk, watch the clip names over time
  await p.evaluate(() => { window.__viewer.setLook('baked'); window.__viewer.play(); });
  await p.click('#stalk');
  const seq = [];
  for (let i = 0; i < 40; i++) {
    seq.push(await p.evaluate(() => window.__viewer.clip));
    await p.waitForTimeout(150);
  }
  const compact = seq.filter((c, i) => i === 0 || c !== seq[i - 1]);
  out.views[name] = { ...m, loadMs, errors, files, playSequence: compact };
  await context.close();
}

await run('phone-390', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, false);
await run('desktop-1440', { viewport: { width: 1440, height: 900 } }, true);
await browser.close();
writeFileSync(join(shots, 'shots.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
