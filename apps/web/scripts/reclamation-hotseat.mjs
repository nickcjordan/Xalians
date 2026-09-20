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
	4. a whole Proving can be played to the Charter this way,
	5. the draft is two-staged, with a cover between, and the two pools share no creature.
*/
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { seenOn } from './lib/visible.mjs';
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
// the first handler's pool has to be read BEFORE the confirm: afterwards the draft has moved
// on and the list comes back empty, which would make the overlap assertion below vacuous
const poolA = await page.locator('[data-draft]').evaluateAll((els) => els.map((e) => e.getAttribute('data-draft')));
await auto.first().click();
const c = page.locator('[data-draft-confirm]');
if (await c.count() && await c.first().isEnabled()) await c.first().click();

/*
	PASS 23. In hot-seat the draft is two-staged: the first handler keeps twelve, the pool is
	covered, and the second handler keeps twelve from their OWN pool. A squad seen in advance
	is information the game does not mean either handler to have, which is the same reason the
	board is covered between turns.
*/
let draftCover = false;
let poolB = [];
const dh = page.locator('[data-draft-handoff]');
if (await dh.count() && await dh.first().isVisible()) {
	draftCover = true;
	await page.locator('[data-take-draft-handoff]').first().click();
	await page.locator('[data-draft-auto]').first().waitFor({ state: 'visible', timeout: 15000 });
	poolB = await page.locator('[data-draft]').evaluateAll((els) => els.map((e) => e.getAttribute('data-draft')));
	await page.locator('[data-draft-auto]').first().click();
	const c2 = page.locator('[data-draft-confirm]');
	if (await c2.count() && await c2.first().isEnabled()) await c2.first().click();
}
const sharedCreatures = poolA.filter((id) => poolB.includes(id)).length;

let covers = 0; let leaked = null; const seats = new Set(); let reachedCharter = false;
let panelsCheckedWhilePlaying = 0; let panelsSeenWhilePlaying = 0; let unseenPanels = [];
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
	// pass 31: read the board's visibility while the match is actually being played
	/*
		Sampled once the board has settled. The panels fade in over 460ms plus a
		per-panel stagger, so reading them on the first tick after they mount catches the
		entrance and reports 0 of 3 on a perfectly healthy build - which is the same
		"present but not yet readable" state the probe exists to catch, arriving at a
		moment when it is correct rather than a fault. What matters is that the board is
		readable while a handler is deciding, so the reading waits for that.
	*/
	if (panelsCheckedWhilePlaying === 0 && !(await page.locator('[data-handoff]').count())
		&& await page.locator('[data-site-id]').count() >= 3) {
		await page.waitForTimeout(1200);
		const seen = await seenOn(page, '[data-site-id]');
		const why = await page.evaluate(() => {
			const el = document.querySelector('[data-site-id]');
			if (!el) return null;
			const out = [];
			let n = el;
			while (n && n.nodeType === 1) {
				const cs = getComputedStyle(n);
				const o = parseFloat(cs.opacity);
				if (!Number.isNaN(o) && o < 1) {
					out.push(`${String(n.className || n.tagName).split(' ')[0]}=${cs.opacity}`);
				}
				n = n.parentElement;
			}
			return out.join(' < ');
		});
		if (seen.some((r) => !r.seen)) console.log(`  [opacity chain] ${why}`);
		panelsCheckedWhilePlaying = seen.length;
		panelsSeenWhilePlaying = seen.filter((r) => r.seen).length;
		unseenPanels = seen.filter((r) => !r.seen).map((r) => `${r.id}: ${r.reasons.join(', ')}`);
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
console.log(`draft: cover between the two ${draftCover}, pools ${poolA.length}/${poolB.length}, shared creatures ${sharedCreatures}`);
console.log(`covers raised: ${covers}`);
console.log(`seats covered for: ${[...seats].sort().join(', ') || 'none'}`);
console.log(`leaked position while covered: ${leaked ? JSON.stringify(leaked) : 'no'}`);
console.log(`reached the Charter: ${reachedCharter}`);
if (errs.length) console.log(`PAGE ERRORS: ${errs.join(' | ')}`);
/*
	PASS 31. As for the other checks: a cover that hides the position is only meaningful
	if the position was visible to begin with. This one also passed with the whole board
	at opacity 0.

	Sampled DURING PLAY, not here. The first version read the panels after the loop
	broke, which is at the Charter, where the board is legitimately on its way out; it
	reported 0 of 3 seen on a healthy build. A probe that fires at a moment the thing it
	watches is not meant to be there measures nothing and teaches me to ignore it.
*/
console.log(`world panels seen while playing: ${panelsSeenWhilePlaying} of ${panelsCheckedWhilePlaying}${unseenPanels.length ? ` (${unseenPanels.join(' | ')})` : ''}`);

const ok = covers >= 4 && !leaked && reachedCharter && seats.size === 2 && errs.length === 0
	&& panelsCheckedWhilePlaying >= 3 && unseenPanels.length === 0
	&& draftCover && poolA.length > 0 && poolB.length > 0 && sharedCreatures === 0;
console.log(ok ? 'PASS' : 'FAIL');
if (!ok) process.exitCode = 1;
await browser.close();
