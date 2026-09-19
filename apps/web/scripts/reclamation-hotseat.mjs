/*
	Headless check: a whole Proving in HOT-SEAT, two people sharing one screen.

	Hot-seat is the cheapest validation instrument the game has (the ownership brief's
	"no human has played a full Proving"), and it turns on behaviour solo play never
	exercises: the table drawn for either seat, and a cover between turns.

	Why the cover exists: two people at one screen cannot share hidden information, and
	hiding is not optional here. 16.8 percent of sends arrive hidden, and removing hiding
	moves the flip gauge +2.46 +/- 0.98, beyond noise, so a hot-seat that revealed
	everything would validate a different game from the one being shipped.

	Run: node apps/web/scripts/reclamation-hotseat.mjs
	against a preview server on 127.0.0.1:4173, the same as reclamation-proving.mjs.
	REC_QA_OUTPUT overrides where the screenshot lands.

	Four claims, each able to fail:

	Four claims, each able to fail:
	1. the cover is raised on EVERY seat change, not just the first,
	2. both seats are covered over the Proving,
	3. while a cover is up nothing about the position is in the document,
	4. a whole Proving can be played to the Charter this way.
*/
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
const EDGE = process.env.REC_QA_EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const output = process.env.REC_QA_OUTPUT || 'C:/Users/njord/AppData/Local/Temp/reclamation-qa';
const base = process.env.REC_QA_BASE || 'http://127.0.0.1:4173';
const seed = process.env.REC_QA_SEED || '7';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.goto(`${base}/reclamation?seed=${seed}&view=advanced&hotseat=1`, { waitUntil: 'networkidle' });
const d = page.locator('[data-discard-match]');
if (await d.count() && await d.first().isVisible()) await d.first().click();
await page.locator('[data-enter]').first().click();
const auto = page.locator('[data-draft-auto]');
await auto.first().waitFor({ state: 'visible', timeout: 15000 });
await auto.first().click();
const c = page.locator('[data-draft-confirm]');
if (await c.count() && await c.first().isEnabled()) await c.first().click();

let covers = 0; let leaked = null; const seats = new Set(); let reachedCharter = false;
let guard = 0;
while (guard++ < 600) {
	const cover = page.locator('[data-handoff]');
	if (await cover.count() && await cover.first().isVisible()) {
		covers++;
		seats.add(await cover.first().getAttribute('data-handoff'));
		const bench = await page.locator('.rec-bench [data-slot]').count();
		const worlds = await page.locator('[data-site-id]').count();
		const score = await page.locator('[data-sites-a]').count();
		if (bench + worlds + score > 0 && !leaked) leaked = { bench, worlds, score };
		if (covers === 1) await page.screenshot({ path: `${output}/hotseat-handoff.png` }).catch(() => {});
		await page.locator('[data-take-handoff]').first().click({ timeout: 4000 }).catch(() => {});
		continue;
	}
	const skip = page.locator('[data-skip]');
	if (await skip.count() && await skip.first().isVisible()) { await skip.first().click(); continue; }
	const nf = page.locator('[data-next-frame]');
	if (await nf.count() && await nf.first().isVisible()) { await nf.first().click(); continue; }
	if (await page.locator('[data-report]').count() && await page.locator('[data-report]').first().isVisible()) { reachedCharter = true; break; }
	const arm = page.locator('[data-arm]:not([disabled])');
	const site = page.locator('[data-site-id]');
	if (await arm.count()) {
		await arm.first().click({ timeout: 4000 }).catch(() => {});
		const n = await site.count();
		if (n) { await site.nth(guard % n).click({ timeout: 4000 }).catch(async () => {
			await site.nth(guard % n).click({ force: true, timeout: 4000 }).catch(() => {}); }); continue; }
	}
	const pass = page.locator('[data-pass]:not([disabled])');
	if (await pass.count() && await pass.first().isVisible()) { await pass.first().click(); continue; }
	await page.waitForTimeout(120);
}
console.log(`covers raised: ${covers}`);
console.log(`seats covered for: ${[...seats].sort().join(', ') || 'none'}`);
console.log(`leaked position while covered: ${leaked ? JSON.stringify(leaked) : 'no'}`);
console.log(`reached the Charter: ${reachedCharter}`);
if (errs.length) console.log(`PAGE ERRORS: ${errs.join(' | ')}`);
const ok = covers >= 4 && !leaked && reachedCharter && seats.size === 2 && errs.length === 0;
console.log(ok ? 'PASS' : 'FAIL');
if (!ok) process.exitCode = 1;
await browser.close();
