/*
	The glance set: what the deploy table shows at rest, with nothing hovered or lifted.

	WHY THIS EXISTS. Pass 52 (Nick, 2026-09-23): "it's easy for me to quickly glance at the
	screen and understand what I'm looking at. Right now, I have to click each of my
	creatures to see the things that would be factors in my decision making." A blind reader
	answers questions about each capture from the picture alone, and the answers are scored
	against the engine's state dumped beside it (glance-<name>.json). Nothing is hovered, so
	the score measures what the table says without being asked.

	The game is played by a fixed policy (the first creature on the bench to world n mod 3,
	two sends a round, then pass) against the seeded rival, so the same seed reaches the same
	positions on any build and a before and an after can be compared on one answer key.

	Run: node apps/web/scripts/reclamation-glance.mjs
	REC_QA_BASE overrides the server, REC_QA_SEED the seed, REC_QA_OUTPUT the folder,
	REC_QA_SIZES the viewports ("1440x900,390x844").
*/
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const output = process.env.REC_QA_OUTPUT || 'C:/Users/njord/AppData/Local/Temp/reclamation-glance';
const base = process.env.REC_QA_BASE || 'http://127.0.0.1:4180';
const seed = process.env.REC_QA_SEED || '7';
const sizes = (process.env.REC_QA_SIZES || '1440x900,390x844').split(',').map((s) => s.split('x').map(Number));
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const SENDS_PER_ROUND = 2;

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const manifest = [];
let failures = 0;

for (const [width, height] of sizes) {
	const mobile = width < 700;
	const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
	const page = await context.newPage();
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.addInitScript(() => { window.__reclamationBeatMs = 60; window.__reclamationStepMs = 30; });
	await page.goto(`${base}/reclamation?seed=${seed}&view=simple`, { waitUntil: 'networkidle' });
	const discard = page.locator('[data-discard-match]');
	if (await discard.count() && await discard.first().isVisible()) await discard.first().click();
	await page.locator('[data-enter]').first().click();
	const auto = page.locator('[data-draft-auto]');
	if (await auto.count()) {
		await auto.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
		if (await auto.first().isVisible()) await auto.first().click();
		const confirm = page.locator('[data-draft-confirm]');
		if (await confirm.count() && await confirm.first().isEnabled()) await confirm.first().click();
	}
	await page.locator('[data-slot]').first().waitFor({ state: 'visible', timeout: 20000 });

	const debug = () => page.evaluate(() => {
		const d = window.__reclamationDebug || {};
		const plain = {};
		for (const [k, v] of Object.entries(d)) {
			if (typeof v !== 'function') plain[k] = v;
		}
		if (typeof d.glance === 'function') plain.glance = d.glance();
		return plain;
	});
	const capture = async (name) => {
		await page.mouse.move(1, 1);
		await page.waitForTimeout(900);
		const file = `${width}-${name}.png`;
		await page.screenshot({ path: `${output}/${file}` });
		const state = await debug();
		await writeFile(`${output}/${width}-${name}.json`, JSON.stringify(state, null, 2));
		manifest.push({ width, name, file });
		// REC_QA_HOVER=1 adds what pointing shows: a creature, then a world
		if (process.env.REC_QA_HOVER) {
			const cards = page.locator('[data-arm]:not([disabled])');
			if (await cards.count() > 3) {
				await cards.nth(3).hover();
				await page.waitForTimeout(700);
				await page.screenshot({ path: `${output}/${width}-${name}-hover-card.png` });
			}
			await page.locator('[data-site-id]').nth(1).hover({ position: { x: 40, y: 60 } });
			await page.waitForTimeout(500);
			await page.screenshot({ path: `${output}/${width}-${name}-hover-world.png` });
			await page.mouse.move(1, 1);
			await page.waitForTimeout(300);
		}
		// REC_QA_LEGEND=1 adds the key to the marks, as the ? key opens it
		if (process.env.REC_QA_LEGEND) {
			await page.locator('[data-open-help]').first().click();
			await page.locator('[data-legend]').first().waitFor({ state: 'visible', timeout: 5000 });
			await page.waitForTimeout(300);
			await page.screenshot({ path: `${output}/${width}-${name}-legend.png` });
			await page.keyboard.press('Escape');
			await page.waitForTimeout(200);
		}
	};
	const myTurn = () => page.evaluate(() => {
		const d = window.__reclamationDebug || {};
		return d.phase === 'deploy' && d.turn === d.you && !d.playing;
	});

	// where to stop and look: round -> the send count of mine this round at which to capture
	const wanted = { 0: [0], 1: [1], 2: [0] };
	const captured = new Set();
	let sentThisRound = 0;
	let round = -1;
	let total = 0;
	for (let guard = 0; guard < 400; guard++) {
		const d = await debug();
		if (d.phase === 'matchEnd' || Object.keys(wanted).every((r) => wanted[r].every((n) => captured.has(`${r}-${n}`)))) break;
		const skip = page.locator('[data-skip]');
		if (await skip.count() && await skip.first().isVisible()) { await skip.first().click().catch(() => {}); continue; }
		const next = page.locator('[data-next-frame]');
		if (await next.count() && await next.first().isVisible()) { await next.first().click().catch(() => {}); await page.waitForTimeout(300); continue; }
		if (d.frameIndex !== round) { round = d.frameIndex; sentThisRound = 0; }
		if (!(await myTurn())) { await page.waitForTimeout(150); continue; }
		const key = `${round}-${sentThisRound}`;
		if ((wanted[round] || []).includes(sentThisRound) && !captured.has(key)) {
			captured.add(key);
			await capture(`r${round + 1}-s${sentThisRound}`);
		}
		const arms = page.locator('[data-arm]:not([disabled])');
		if (sentThisRound < SENDS_PER_ROUND && await arms.count()) {
			await arms.first().click();
			await page.waitForTimeout(120);
			await page.locator('[data-site-id]').nth(total % 3).click({ force: true });
			sentThisRound++;
			total++;
			await page.waitForTimeout(250);
			continue;
		}
		const pass = page.locator('[data-pass]:not([disabled])');
		if (await pass.count()) { await pass.first().click(); await page.waitForTimeout(250); continue; }
		await page.waitForTimeout(150);
	}
	const missing = Object.keys(wanted).flatMap((r) => wanted[r].map((n) => `${r}-${n}`)).filter((k) => !captured.has(k));
	if (missing.length) failures++;
	console.log(`${width}x${height}: ${manifest.filter((m) => m.width === width).length} captures${missing.length ? `, MISSING ${missing.join(' ')}` : ''}, ${errors.length} page errors`);
	if (errors.length) { failures++; console.error(`  page errors: ${errors.join(' | ')}`); }
	await context.close();
}

await writeFile(`${output}/manifest.json`, JSON.stringify({ seed, base, captures: manifest }, null, 2));
await browser.close();
console.log(`${manifest.length} captures in ${output}`);
process.exit(failures ? 1 : 0);
