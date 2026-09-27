// Intuitiveness audit (docs/design/powerworks-intuitiveness-audit.md): captures every scripted moment and three playback streams from the live site.
const fs = require('fs'); const path = require('path');
const APP = path.resolve(__dirname, '../../apps/web');
const { chromium } = require(require.resolve('playwright-core', { paths: [APP] }));
// Inputs: moments.json beside this script; states.json from auditStates.ts in the work folder.
const DIR = path.resolve(__dirname, '../../untracked/powerworks-audit'); const OUT = path.join(DIR, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'https://www.xalians.com';
const STATES = JSON.parse(fs.readFileSync(path.join(DIR, 'states.json'), 'utf8'));
const MOMENTS = JSON.parse(fs.readFileSync(path.join(__dirname, 'moments.json'), 'utf8'));
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
function findChrome() { const root = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright'); for (const d of fs.readdirSync(root).filter((d) => d.startsWith('chromium')).sort().reverse()) for (const sub of ['chrome-headless-shell-win64/chrome-headless-shell.exe', 'chrome-win/chrome.exe', 'chrome-win64/chrome.exe']) { const p = path.join(root, d, sub); if (fs.existsSync(p)) return p; } }
const historyOf = (h) => (h.startsWith('sector') ? STATES.sectors[h.slice(6)] : STATES.found[h]);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
(async () => {
  const browser = await chromium.launch({ executablePath: findChrome() });
  const log = [];
  for (const m of MOMENTS) {
    if (ONLY && !ONLY.includes(m.id)) continue;
    const [w, h] = (m.size || '1920x1080').split('x').map(Number); const mobile = w < 600;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(BASE + '/powerworks');
    await page.evaluate((s) => localStorage.setItem('xalians.powerworks.v1', JSON.stringify(s)), { version: STATES.version, seed: STATES.seed, history: historyOf(m.history) });
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(2600);
    const click = (loc) => loc.dispatchEvent('click');
    for (const [who, o] of Object.entries(m.plans || {})) {
      if (!(await page.getByRole('menuitem', { name: new RegExp(`^${esc(who)}: `) }).count())) { await click(page.getByRole('button', { name: `Select ${who}` })); await page.waitForTimeout(450); }
      await click(page.getByRole('menuitem', { name: new RegExp(`^${esc(who)}: ${esc(o.move)}`) })); await page.waitForTimeout(450);
      await click(page.locator(`[data-unit="${o.target}"] button.valid-target`)); await page.waitForTimeout(900);
    }
    if (m.plans && !m.select) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
    if (m.select && m.clickSelect !== false && !(await page.getByRole('menuitem', { name: new RegExp(`^${esc(m.select)}: `) }).count())) { await click(page.getByRole('button', { name: `Select ${m.select}` })); await page.waitForTimeout(700); }
    if (m.hover && !mobile) { await page.getByRole('menuitem', { name: new RegExp(`^${esc(m.select)}: ${esc(m.hover)}`) }).hover(); await page.waitForTimeout(500); }
    if (m.choose) { await click(page.getByRole('menuitem', { name: new RegExp(`^${esc(m.select)}: ${esc(m.choose)}`) })); await page.waitForTimeout(800); }
    if (m.aim) { const t = page.locator(`[data-unit="${m.aim}"] button.valid-target`); if (!mobile) await t.hover(); await page.waitForTimeout(500); }
    if (m.inspect) { await click(page.getByRole('button', { name: new RegExp(`^Inspect ${esc(m.inspect)}`) })); await page.waitForTimeout(800); }
    if (m.guide) { await click(page.getByRole('button', { name: 'Field guide' })); await page.waitForTimeout(800); }
    if (!m.playback) {
      await page.screenshot({ path: path.join(OUT, `${m.id}.png`) });
      if (m.signals) {
        const boxes = {};
        for (const sg of m.signals) {
          const loc = page.locator(sg.selector).first();
          boxes[sg.name] = (await loc.count()) ? await loc.boundingBox() : null;
        }
        fs.writeFileSync(path.join(OUT, `${m.id}-signals.json`), JSON.stringify(boxes, null, 1));
      }
      if (m.guide) fs.writeFileSync(path.join(OUT, `${m.id}.txt`), await page.locator('dialog').innerText());
      log.push({ id: m.id, errors });
      await ctx.close();
      continue;
    }
    // Playback stream: commit, then sample the stage every ~230ms with the beat's action and banner.
    await click(page.getByRole('button', { name: /Commit round/ }));
    const frames = [];
    for (let k = 0; k < 400; k++) {
      const info = await page.evaluate(() => {
        const t = document.querySelector('.pw-theater');
        const b = document.querySelector('.pw-action-banner');
        const step = [...document.querySelectorAll('.pw-readiness small')].map((x) => x.textContent).join(' ');
        return { playing: !!t && t.classList.contains('playing'), action: t ? t.dataset.action : '', banner: b ? b.innerText.replace(/\s+/g, ' ') : '', step };
      });
      if (!info.playing) break;
      const file = `${m.id}-${String(k).padStart(3, '0')}.png`;
      await page.screenshot({ path: path.join(OUT, file) });
      frames.push({ file, t: Date.now(), ...info });
    }
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT, `${m.id}-result.png`) });
    fs.writeFileSync(path.join(OUT, `${m.id}-frames.json`), JSON.stringify(frames, null, 1));
    log.push({ id: m.id, frames: frames.length, errors });
    await ctx.close();
  }
  console.log(JSON.stringify(log));
  await browser.close();
})();
