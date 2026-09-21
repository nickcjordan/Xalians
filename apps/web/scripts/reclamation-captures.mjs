/*
	The capture set a critic is scored against.

	WHY THIS EXISTS. Pass 28 established that every capture set a rubric critic had ever
	scored was taken with `reducedMotion: 'reduce'` AND with [data-skip] clicked on every
	loop of reclamation-proving.mjs. The critic scored pace 3 of 10 on still frames of an
	animation it never saw run. A score taken from those captures measures the harness.

	So this takes the pictures a player actually sees: motion left on, the Clash watched
	rather than skipped, and the moments chosen by what the game is DOING (a blow landing,
	a world being read, the Court ruling) rather than by a timer.

	Run: node apps/web/scripts/reclamation-captures.mjs
	REC_QA_BASE overrides the server, REC_QA_SEED the seed, REC_QA_OUTPUT the folder.
*/
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const output = process.env.REC_QA_OUTPUT || 'C:/Users/njord/AppData/Local/Temp/reclamation-captures';
const base = process.env.REC_QA_BASE || 'http://127.0.0.1:4183';
const seed = process.env.REC_QA_SEED || '21';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const manifest = [];

for (const width of [1440, 390]) {
	const context = await browser.newContext({
		viewport: { width, height: width === 390 ? 844 : 900 },
		// motion ON. This is the whole point of this harness.
		isMobile: width === 390,
		hasTouch: width === 390,
	});
	const page = await context.newPage();
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	const shot = async (name, note) => {
		const file = `${width}-${name}.png`;
		await page.screenshot({ path: `${output}/${file}` });
		manifest.push({ width, name, file, note });
	};

	await page.goto(`${base}/reclamation?seed=${seed}&view=simple`, { waitUntil: 'networkidle' });
	const discard = page.locator('[data-discard-match]');
	if (await discard.count() && await discard.first().isVisible()) await discard.first().click();
	await shot('01-intro', 'the first screen a new player sees');

	await page.locator('[data-enter]').first().click();
	const auto = page.locator('[data-draft-auto]');
	if (await auto.count()) {
		await auto.first().waitFor({ state: 'visible', timeout: 15000 });
		await shot('02-draft', 'keeping twelve from fifteen');
		await auto.first().click();
		const confirm = page.locator('[data-draft-confirm]');
		if (await confirm.count() && await confirm.first().isEnabled()) await confirm.first().click();
	}

	await page.locator('[data-slot]').first().waitFor({ state: 'visible', timeout: 20000 });
	// let the staggered panel entrance finish, or the shot catches worlds mid-fade
	await page.waitForTimeout(1600);
	await shot('03-opening-board', 'the opening board: three unclaimed worlds and what each asks of the squad');

	// a creature armed, so the previews and the send invitation are on screen
	const arm = page.locator('[data-arm]:not([disabled])');
	if (await arm.count()) {
		await arm.first().click().catch(() => {});
		await page.waitForTimeout(500);
		await shot('04-armed', 'a creature lifted: what sending it to each world would do');
	}

	// play the round out, WITHOUT skipping
	let sends = 0;
	for (let i = 0; i < 120 && sends < 9; i++) {
		const a = page.locator('[data-arm]:not([disabled])');
		if (!(await a.count())) { await page.waitForTimeout(300); continue; }
		await a.first().click({ timeout: 4000 }).catch(() => {});
		const site = page.locator('[data-site-id]');
		const n = await site.count();
		if (!n) break;
		await site.nth(sends % n).click({ timeout: 4000, force: true }).catch(() => {});
		sends++;
		await page.waitForTimeout(250);
	}
	await page.waitForTimeout(400);
	await shot('05-contested', 'worlds with creatures on both sides, before the Clash');

	await page.evaluate(() => { window.__reclamationStepMs = 1100; });
	for (let i = 0; i < 20; i++) {
		const pass = page.locator('[data-pass]:not([disabled])');
		if (await pass.count() && await pass.first().isVisible()) await pass.first().click().catch(() => {});
		if (await page.evaluate(() => !!(window.__reclamationDebug && window.__reclamationDebug.playing))) break;
		await page.waitForTimeout(400);
	}

	// the Clash, caught on the events rather than on a timer
	let blows = 0;
	let sawJudge = false;
	for (let i = 0; i < 260; i++) {
		const state = await page.evaluate(() => {
			const d = window.__reclamationDebug || {};
			return { playing: d.playing, event: d.currentEvent };
		});
		if (state.playing && state.event === 'attack' && blows < 3) {
			blows++;
			await shot(`06-clash-blow-${blows}`, 'a blow landing during the Clash, with the camera on the world that is fighting');
		}
		if (state.playing && state.event === 'judge' && !sawJudge) {
			sawJudge = true;
			await shot('07-ruling', 'the Court reading the frame');
		}
		if (!state.playing && (blows > 0 || sawJudge)) break;
		await page.waitForTimeout(90);
	}
	await page.waitForTimeout(700);
	await shot('08-after-ruling', 'the board once the round is settled');

	// run to the Charter
	let guard = 0;
	while (guard < 240) {
		guard++;
		const skip = page.locator('[data-skip]');
		if (await skip.count() && await skip.first().isVisible()) { await skip.first().click(); continue; }
		const next = page.locator('[data-next-frame]');
		if (await next.count() && await next.first().isVisible()) { await next.first().click(); continue; }
		const report = page.locator('[data-report]');
		if (await report.count() && await report.first().isVisible()) break;
		const a = page.locator('[data-arm]:not([disabled])');
		const site = page.locator('[data-site-id]');
		if (await a.count()) {
			await a.first().click({ timeout: 4000 }).catch(() => {});
			const n = await site.count();
			if (n) { await site.nth(guard % n).click({ timeout: 4000, force: true }).catch(() => {}); continue; }
		}
		const pass = page.locator('[data-pass]:not([disabled])');
		if (await pass.count() && await pass.first().isVisible()) { await pass.first().click(); continue; }
		await page.waitForTimeout(220);
	}
	await page.locator('[data-report]').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
	await page.waitForTimeout(600);
	await shot('09-charter', 'the Charter: what the whole Proving came to');

	console.log(`${width}: ${manifest.filter((m) => m.width === width).length} captures, ${blows} blows caught, ruling ${sawJudge ? 'caught' : 'MISSED'}, ${errors.length} page errors`);
	if (errors.length) console.error(`  page errors: ${errors.join(' | ')}`);
	await context.close();
}

await writeFile(`${output}/manifest.json`, JSON.stringify({ seed, base, captures: manifest }, null, 2));
await browser.close();
console.log(`\n${manifest.length} captures in ${output}`);
