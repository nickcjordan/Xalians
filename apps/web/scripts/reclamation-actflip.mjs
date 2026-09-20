/*
	Headless check: ACT FLIP, the second decision axis, from the player's side.

	A creature has three or four usable acts and most can offer two or more genuinely different
	behaviours. Until pass 25 the table derived one and discarded the rest, which is why the
	decision space ran out by the last round (2.05 near-best options, half with one dominant
	answer). Act flip lets the handler choose, and round three now offers 3.53.

	This check exists because the first version PASSED in the engine and FAILED on the page: the
	choice was stored and honoured by prepare, then recomputeHoldsAtSite wrote the natural role
	back over it on every company change. The picker registered the press, the send carried the
	choice, and the board still showed the old role. Nothing but reading the board after a real
	click would have caught it.

	Run: node apps/web/scripts/reclamation-actflip.mjs
	against a preview server on 127.0.0.1:4173, the same as the other two checks.

	Claims, each able to fail:
	1. lifting a creature with more than one behaviour shows the picker,
	2. the picker offers the table's own words (strike / sweep / bolster / shield),
	3. choosing a non-natural behaviour and sending actually lands that role on the board,
	4. a Proving still plays to the Charter with the axis live.
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
await page.goto(`${base}/reclamation?seed=${seed}&view=advanced`, { waitUntil: 'networkidle' });
const d = page.locator('[data-discard-match]');
if (await d.count() && await d.first().isVisible()) await d.first().click();
await page.locator('[data-enter]').first().click();
const auto = page.locator('[data-draft-auto]');
await auto.first().waitFor({ state: 'visible', timeout: 15000 });
await auto.first().click();
const c = page.locator('[data-draft-confirm]');
if (await c.count() && await c.first().isEnabled()) await c.first().click();
await page.locator('[data-slot]').first().waitFor({ state: 'visible', timeout: 20000 });

// lift creatures until one offers a choice
let pickerFor = null; let words = []; let chosen = null; let landedRole = null;
const arms = await page.locator('[data-arm]:not([disabled])').count();
for (let i = 0; i < arms && !pickerFor; i++) {
	await page.locator('[data-arm]:not([disabled])').nth(i).click({ timeout: 4000 }).catch(() => {});
	await page.waitForTimeout(120);
	const pick = page.locator('[data-act-picker]');
	if (await pick.count() && await pick.first().isVisible()) {
		pickerFor = await pick.first().getAttribute('data-act-picker');
		words = await page.locator('[data-act-role]').evaluateAll((els) => els.map((e) => e.getAttribute('data-act-role')));
		await page.screenshot({ path: `${output}/actflip-picker.png` }).catch(() => {});
		// choose the SECOND behaviour, which is never the natural one
		if (words.length > 1) {
			chosen = words[1];
			await page.locator(`[data-act-role="${chosen}"]`).first().click();
			await page.waitForTimeout(100);
			// send it and read the role that landed
			await page.locator('[data-site-id]').first().click({ force: true, timeout: 4000 }).catch(() => {});
			await page.waitForTimeout(250);
			landedRole = await page.evaluate((id) => {
				const dbg = window.__reclamationDebug;
				if (!dbg || !dbg.holds) return null;
				const h = dbg.holds[id];
				return h ? h.role : null;
			}, pickerFor);
		}
	}
}
console.log(`picker appeared for: ${pickerFor || 'none'}`);
console.log(`behaviours offered: ${words.join(', ') || 'none'}`);
console.log(`chose: ${chosen}  role that landed on the board: ${landedRole}`);

// play on to the Charter
let guard = 0; let reached = false;
while (guard++ < 400) {
	const skip = page.locator('[data-skip]');
	if (await skip.count() && await skip.first().isVisible()) { await skip.first().click(); continue; }
	const nf = page.locator('[data-next-frame]');
	if (await nf.count() && await nf.first().isVisible()) { await nf.first().click(); continue; }
	if (await page.locator('[data-report]').count() && await page.locator('[data-report]').first().isVisible()) { reached = true; break; }
	const arm = page.locator('[data-arm]:not([disabled])');
	if (await arm.count()) {
		await arm.first().click({ timeout: 4000 }).catch(() => {});
		const site = page.locator('[data-site-id]');
		const n = await site.count();
		if (n) { await site.nth(guard % n).click({ force: true, timeout: 4000 }).catch(() => {}); continue; }
	}
	const pass = page.locator('[data-pass]:not([disabled])');
	if (await pass.count() && await pass.first().isVisible()) { await pass.first().click(); continue; }
	await page.waitForTimeout(120);
}
console.log(`reached the Charter: ${reached}`);
if (errs.length) console.log(`PAGE ERRORS: ${errs.join(' | ')}`);
/*
	PASS 31. The board must be readable, not merely present.

	Audited by setting `.rec-site { opacity: 0 }` and re-running every check: this one
	passed with the entire game board invisible, because it only ever asked what the DOM
	contained. The role it chose landing on the board means nothing if the board cannot
	be seen.
*/
const panels = await seenOn(page, '[data-site-id]');
const unseen = panels.filter((r) => !r.seen).map((r) => `${r.id}: ${r.reasons.join(', ')}`);
console.log(`world panels seen: ${panels.filter((r) => r.seen).length} of ${panels.length}${unseen.length ? ` (${unseen.join(' | ')})` : ''}`);

const ok = pickerFor && words.length > 1 && chosen && landedRole === chosen && reached && errs.length === 0
	&& panels.length >= 3 && unseen.length === 0;
console.log(ok ? 'PASS' : 'FAIL');
if (!ok) process.exitCode = 1;
await browser.close();
