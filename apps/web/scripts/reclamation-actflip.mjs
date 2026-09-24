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

	PASS 55 (Nick, 2026-09-23): the act choice is OFF ("I'm inclined to remove this concept of
	giving two options because it just complicates the game unnecessarily"). This check now
	holds the other side of the same seam: with the lever off, no lifted creature offers a
	picker, and each one lands on the board with the role its card shows. The pass 25 bug above
	(the board writing a different role than the one chosen) is exactly what the second claim
	would catch.

	Run: node apps/web/scripts/reclamation-actflip.mjs
	against a preview server on 127.0.0.1:4173, the same as the other two checks.

	Claims, each able to fail:
	1. no lifted creature shows an act picker,
	2. the role that lands on the board is the one the card shows,
	3. a Proving still plays to the Charter, with the worlds visible.
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
await page.goto(`${base}/reclamation?seed=${seed}&view=advanced&draft=1`, { waitUntil: 'networkidle' });
const d = page.locator('[data-discard-match]');
if (await d.count() && await d.first().isVisible()) await d.first().click();
await page.locator('[data-enter]').first().click();
const auto = page.locator('[data-draft-auto]');
await auto.first().waitFor({ state: 'visible', timeout: 15000 });
await auto.first().click();
const c = page.locator('[data-draft-confirm]');
if (await c.count() && await c.first().isEnabled()) await c.first().click();
await page.locator('[data-slot]').first().waitFor({ state: 'visible', timeout: 20000 });

// lift every creature in hand: none may offer a choice
let pickers = 0; let sentName = null; let cardRole = null; let landedRole = null;
const arms = await page.locator('[data-arm]:not([disabled])').count();
for (let i = 0; i < arms; i++) {
	await page.locator('[data-arm]:not([disabled])').nth(i).click({ timeout: 4000 }).catch(() => {});
	await page.waitForTimeout(100);
	const pick = page.locator('[data-act-picker]');
	if (await pick.count() && await pick.first().isVisible()) pickers++;
	// set it down again
	await page.locator('[data-arm]:not([disabled])').nth(i).click({ timeout: 4000 }).catch(() => {});
	await page.waitForTimeout(60);
}
// send the first creature and read the role that landed against the one its card shows
const first = page.locator('[data-slot-state="hand"]').first();
sentName = await first.getAttribute('data-slot');
cardRole = await first.locator('.rec-plinth-role').first().getAttribute('data-role').catch(() => null);
await first.locator('[data-arm]').first().click({ timeout: 4000 }).catch(() => {});
await page.waitForTimeout(100);
await page.locator('[data-site-id]').first().click({ force: true, timeout: 4000 }).catch(() => {});
await page.waitForTimeout(300);
landedRole = await page.evaluate((id) => {
	const dbg = window.__reclamationDebug;
	if (!dbg || !dbg.holds) return null;
	const h = dbg.holds[id];
	return h ? h.role : null;
}, sentName);
/*
	PASS 37. The board is read here, with the role just landed on it, rather than at the
	Charter. The table is one screen now and the Charter's report covers it when the
	Proving ends, so reading the board at the end would measure the report.
*/
const panels = await seenOn(page, '[data-site-id]');
console.log(`creatures offering an act picker: ${pickers} of ${arms}`);
console.log(`sent ${sentName}: card shows ${cardRole}, board shows ${landedRole}`);

// play on to the Charter
/*
	SCHEMA 5 MADE A ROUND LONGER, so the loop budget needed headroom. The v5 roster throws
	more attacks per Clash (measured: 172 sampled playback frames against 112 under schema
	4), and at 400 iterations this check intermittently ran out before reaching the
	Charter and reported `reached the Charter: false` on a healthy build. A check that
	fails on good code teaches you to ignore it, so the budget is raised rather than the
	failure tolerated.
*/
let guard = 0; let reached = false;
while (guard++ < 900) {
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
const unseen = panels.filter((r) => !r.seen).map((r) => `${r.id}: ${r.reasons.join(', ')}`);
console.log(`world panels seen: ${panels.filter((r) => r.seen).length} of ${panels.length}${unseen.length ? ` (${unseen.join(' | ')})` : ''}`);

const ok = pickers === 0 && arms > 0 && cardRole && landedRole === cardRole && reached && errs.length === 0
	&& panels.length >= 3 && unseen.length === 0;
console.log(ok ? 'PASS' : 'FAIL');
if (!ok) process.exitCode = 1;
await browser.close();
