/*
	Headless gauge: what actually MOVES on screen while a Clash resolves.

	WHY THIS EXISTS. A blind rubric critic scored pace 3 of 10, the lowest score any
	critic has given anything: "this looks like paperwork, no visible motion, no sense of
	creatures doing anything to each other beyond a number shrinking." That could not be
	checked, because every capture set a critic has ever scored was taken with
	reducedMotion: 'reduce' AND with [data-skip] clicked on every loop of
	reclamation-proving.mjs. No automated check had ever watched a Clash play. The
	complaint was therefore about a thing nothing measured.

	So this watches one at full motion and samples the live document while it runs. The
	baseline it was written against, seed 7, before pass 28 touched anything:

	  frames where any figure was transformed      13 of 61   (21%)
	  largest figure TRANSFORM, whole round        10px  (the lunge's own keyframe)
	  frames marking which world was clashing      0

	Displacement here is read off the computed transform matrix, never the bounding box:
	see the note on that above the measurement loop, which is the fault that nearly let
	this gauge ship unable to fail.

	The thresholds below are floors under pass 28's fix, set well under what it measures
	so ordinary variation between seeds does not fail the check. They are a lever: raise
	them when the Clash is reworked again, and record what the change measured.

	Run: node apps/web/scripts/reclamation-clash.mjs
	against a preview server (npm run build -w apps/web, then npx vite preview).
	REC_QA_BASE overrides the server, REC_QA_SEED the seed, REC_QA_OUTPUT the shots.
*/
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { seenOn } from './lib/visible.mjs';

const output = process.env.REC_QA_OUTPUT || 'C:/Users/njord/AppData/Local/Temp/reclamation-motion';
const base = process.env.REC_QA_BASE || 'http://127.0.0.1:4176';
const seed = process.env.REC_QA_SEED || '7';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const width = Number(process.env.REC_QA_WIDTH || 1440);
const context = await browser.newContext({
	viewport: { width, height: width === 390 ? 844 : 900 },
	isMobile: width === 390,
	hasTouch: width === 390,
});
const page = await context.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));

await page.goto(`${base}/reclamation?seed=${seed}&view=simple`, { waitUntil: 'networkidle' });
const discard = page.locator('[data-discard-match]');
if (await discard.count() && await discard.first().isVisible()) await discard.first().click();
await page.locator('[data-enter]').first().click();
const auto = page.locator('[data-draft-auto]');
if (await auto.count()) {
	await auto.first().waitFor({ state: 'visible', timeout: 15000 });
	await auto.first().click();
	const confirm = page.locator('[data-draft-confirm]');
	if (await confirm.count() && await confirm.first().isEnabled()) await confirm.first().click();
}
await page.locator('[data-slot]').first().waitFor({ state: 'visible', timeout: 20000 });

// slow the clash right down so each engine step can be sampled
/*
	The step is slowed for the gauge so each engine step can be sampled several times.
	At the shipped 700ms and a 100ms sample, a narrow viewport laid out slowly enough
	that a whole Clash went by in 16 samples with no attack event observed at all, and
	the gauge reported "no damage flash" for a Clash that flashed perfectly well. The
	probe was too fast for the thing it was watching, which is a fault in the gauge and
	not in the game.
*/
await page.evaluate((ms) => { window.__reclamationStepMs = ms; }, Number(process.env.REC_QA_STEP_MS || 900));

// deploy until the round resolves: send several, then pass
/*
	Deploy alternates turns, so after one send the bench is disabled while the rival
	moves. An earlier version of this probe broke out of the loop the first time
	[data-arm] was disabled and sent exactly ONE creature, which put a fight at one
	world out of three and measured a Clash far quieter than a real one. It now waits
	for the turn to come back, and spreads its sends across the frame.
*/
let sends = 0;
for (let i = 0; i < 120 && sends < 9; i++) {
	const arm = page.locator('[data-arm]:not([disabled])');
	if (!(await arm.count())) { await page.waitForTimeout(300); continue; }
	await arm.first().click({ timeout: 4000 }).catch(() => {});
	const site = page.locator('[data-site-id]');
	const n = await site.count();
	if (!n) break;
	await site.nth(sends % n).click({ timeout: 4000, force: true }).catch(() => {});
	sends++;
	await page.waitForTimeout(250);
}
// pass repeatedly until playback begins
for (let i = 0; i < 20; i++) {
	const pass = page.locator('[data-pass]:not([disabled])');
	if (await pass.count() && await pass.first().isVisible()) {
		await pass.first().click().catch(() => {});
	}
	const playing = await page.evaluate(() => !!(window.__reclamationDebug && window.__reclamationDebug.playing));
	if (playing) break;
	await page.waitForTimeout(400);
}

const probe = () => page.evaluate(() => {
	const dbg = window.__reclamationDebug || {};
	const figs = [...document.querySelectorAll('.rec-figure')].map((el) => {
		const r = el.getBoundingClientRect();
		const cs = getComputedStyle(el);
		return {
			name: (el.querySelector('.rec-figure-name') || {}).textContent || '?',
			x: Math.round(r.x * 10) / 10,
			y: Math.round(r.y * 10) / 10,
			transform: cs.transform === 'none' ? 'none' : cs.transform,
			cls: [...el.classList].filter((c) => c.startsWith('rec-figure--')).join(' '),
		};
	});
	const flashes = [...document.querySelectorAll('[class*="flash"], .rec-flash, [data-flash]')]
		.map((el) => ({ cls: el.className, text: (el.textContent || '').trim() }));
	const beat = document.querySelector('.rec-callout, [data-beat]');
	const sites = [...document.querySelectorAll('[data-site-id]')].map((el) => ({
		id: el.getAttribute('data-site-id'),
		clashing: el.classList.contains('rec-site--clashing'),
		waiting: el.classList.contains('rec-site--waiting'),
		cls: [...el.classList].filter((c) => c.startsWith('rec-site--')).join(' '),
		opacity: getComputedStyle(el).opacity,
		filter: getComputedStyle(el).filter,
	}));
	return {
		playing: dbg.playing, event: dbg.currentEvent,
		figures: figs, flashes, sites,
		beat: beat ? beat.textContent.trim().slice(0, 80) : null,
	};
});

let shotN = 0;
const samples = [];
let sawPlaying = false;
for (let i = 0; i < 400; i++) {
	const s = await probe();
	/*
		PASS 31. The panels must be SEEN at every step, not merely present.

		This gauge watched the Clash from pass 28 and still missed that the ruling was
		painted over a board at opacity zero, because it counted figures and classes
		rather than asking whether anything was readable. The unseen count is recorded per
		sample and asserted below.
	*/
	const seen = await seenOn(page, '[data-site-id]');
	s.unseenPanels = seen.filter((r) => !r.seen).map((r) => `${r.id}: ${r.reasons.join(', ')}`);
	samples.push(s);
	if (s.playing) sawPlaying = true;
	// paint check: capture the frame whenever an attack is being told, so a still image
	// can be judged for whether the camera and the blow are actually visible
	// an attack if the round has one, and otherwise whatever the round does have: a
	// Clash with no blow in it still needs its camera checked by paint
	const worthShooting = s.event === 'attack' || (s.event && shotN < 2);
	if (s.playing && worthShooting && shotN < 6) {
		shotN++;
		await page.screenshot({ path: `${output}/clash-${width}-${shotN}.png` });
	}
	if (sawPlaying && !s.playing) break;
	await page.waitForTimeout(100);
}

/*
	MEASURE THE TRANSFORM, NOT THE BOUNDING BOX.

	The first version of this gauge measured each figure's bounding rect between samples
	and reported the largest change as "how far a figure moved". It passed. Then the
	animations were deliberately gutted back to the pre-pass-28 values as a test of
	whether the gauge could fail, and it reported the SAME numbers: 77.4px, 100% of
	frames. A check that cannot fail is worth nothing, and this one had been about to be
	committed as the evidence for the whole pass.

	The cause: when a creature is downed it leaves the board, and every figure beside it
	reflows into the gap. That reflow is 60 to 77px and has nothing to do with whether
	anything is animating. The gauge was measuring the board rearranging itself, which
	it did before pass 28 just as much as after.

	So displacement is read off the computed transform matrix, which is the animation and
	only the animation. Layout reflow does not appear in it.
*/
const translationOf = (transform) => {
	if (!transform || transform === 'none') return 0;
	const nums = transform.replace(/^matrix3?d?\(/, '').replace(/\)$/, '').split(',').map(Number);
	if (nums.length === 6) return Math.abs(nums[4]) + Math.abs(nums[5]);
	if (nums.length === 16) return Math.abs(nums[12]) + Math.abs(nums[13]);
	return 0;
};

let maxShift = 0; let framesWithTransform = 0; let framesWithFlash = 0; let framesPlaying = 0;
const shiftsByName = {};
for (const s of samples) {
	if (!s.playing) continue;
	framesPlaying++;
	const moving = s.figures.filter((f) => translationOf(f.transform) > 1);
	if (moving.length) framesWithTransform++;
	if (s.flashes.length) framesWithFlash++;
	for (const f of s.figures) {
		const d = translationOf(f.transform);
		if (d > maxShift) maxShift = d;
		if (d > (shiftsByName[f.name] || 0)) shiftsByName[f.name] = Math.round(d * 10) / 10;
	}
}
const report = {
	seed, sends, samples: samples.length, framesPlaying,
	framesWithTransform, framesWithFlash,
	maxFigureTransformPx: Math.round(maxShift * 10) / 10,
	shiftsByName,
	events: [...new Set(samples.map((s) => s.event).filter(Boolean))],
	// pass 31: any moment of the Clash or the Ruling where a world was not readable
	unseenMoments: samples
		.map((s, i) => ({ i, event: s.event, playing: s.playing, unseen: s.unseenPanels || [] }))
		.filter((m) => m.unseen.length > 0)
		.slice(0, 12),
	flashTexts: [...new Set(samples.flatMap((s) => s.flashes.map((f) => f.text)).filter(Boolean))],
	beats: [...new Set(samples.map((s) => s.beat).filter(Boolean))],
	framesWithCamera: samples.filter((s) => s.playing && (s.sites || []).some((x) => x.clashing)).length,
	clashingSitesSeen: [...new Set(samples.flatMap((s) => (s.sites || []).filter((x) => x.clashing).map((x) => x.id)))],
	framesWithWaiting: samples.filter((s) => s.playing && (s.sites || []).some((x) => x.waiting)).length,
	siteStatesDuringClash: (samples.find((s) => s.playing && s.event === 'attack') || {}).sites || [],
	pageErrors: errs,
};
await writeFile(`${output}/motion.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();

/*
	The assertions. Each names the thing it is a floor under, so a failure says what
	broke rather than only which number moved.
*/
let failures = 0;
const check = (ok, message) => {
	if (ok) return;
	failures++;
	console.error(`FAIL ${message}`);
};

check(report.pageErrors.length === 0, `page errors during the Clash: ${report.pageErrors.join(' | ')}`);

/*
	The assertion that pass 28's bug needed and nothing had: at no point during the
	Clash or the Court's ruling may a world panel be present-but-unreadable. The bug it
	exists for showed three panels at effective opacity 0.67, 0.89 and 0.98, mid-fade,
	at the judge event.
*/
check(report.unseenMoments.length === 0,
	`a world panel was present but not visible during the Clash: ${report.unseenMoments.map((m) => `${m.event || 'ruling'} -> ${m.unseen.join('; ')}`).join(' | ')}`);
check(report.sends >= 6, `only ${report.sends} sends: the probe did not fill the frame, so it measured a quieter Clash than the game produces`);
check(report.framesPlaying >= 20, `only ${report.framesPlaying} frames of playback sampled; the Clash was not watched`);

/*
	A Clash with no attack in it is a real position, not a broken run: a round where
	every send lands unopposed produces only sweeps and the Court's ruling. The phone
	run found one, and the first version of these assertions called it a regression and
	demanded a damage flash for a round in which nothing was ever hit.

	So the assertions that are ABOUT a blow only run when a blow happened, and the check
	says plainly which kind of round it measured. The camera and the still-frame floor
	apply either way, because they are about every Clash.
*/
const hadAttack = report.events.includes('attack');

// the still-frame problem: 21% of frames had any motion at all before pass 28
const movingShare = report.framesPlaying ? report.framesWithTransform / report.framesPlaying : 0;
if (hadAttack) {
	check(movingShare >= 0.6, `only ${Math.round(movingShare * 100)}% of Clash frames have a figure in motion (was 21% before pass 28, floor is 60%)`);
} else {
	// an unopposed round still lunges and sweeps, but spends much of itself on the ruling
	check(movingShare >= 0.15, `only ${Math.round(movingShare * 100)}% of frames have a figure in motion even for an unopposed round (floor is 15%)`);
}

// the six-pixel blow: a lunge nobody could see. The pre-pass-28 lunge peaked at 10px
// of transform, so a floor of 18 cannot be met by the old animations.
check(report.maxFigureTransformPx >= 18, `the largest figure transform in the whole round is ${report.maxFigureTransformPx}px (the pre-pass-28 lunge peaked at 10px, floor is 18px)`);
check(report.events.length > 1, `the Clash told only ${report.events.join(', ') || 'nothing'}; the probe did not watch a whole round`);

// the camera: something must say which world is clashing
const cameraShare = report.framesPlaying ? report.framesWithCamera / report.framesPlaying : 0;
check(cameraShare >= 0.6, `only ${Math.round(cameraShare * 100)}% of Clash frames mark which world is clashing (was 0% before pass 28, floor is 60%)`);
check(report.framesWithWaiting >= report.framesWithCamera * 0.9, 'the clashing world is marked but the other worlds are not receding');

// a round crosses the whole frame, so the camera must visit more than one world
check(report.clashingSitesSeen.length >= 2, `the camera only ever rested on ${report.clashingSitesSeen.length} world(s); a round clashes each world in turn`);

// the blow must be punctuated by something other than the log
if (hadAttack) {
	check(report.framesWithFlash > 0, 'no damage flash appeared on any figure during the Clash');
}

// decimals: the flash is punctuation and rounds (pass 28)
const fractional = report.flashTexts.filter((t) => t.includes('.'));
check(fractional.length === 0, `the damage flash still prints decimals: ${fractional.join(', ')}`);

if (failures > 0) {
	console.error(`
${failures} check(s) failed`);
	process.exitCode = 1;
} else {
	console.log(`
ok   the Clash moves: ${Math.round(movingShare * 100)}% of frames in motion, ${report.maxFigureTransformPx}px largest blow, camera on ${Math.round(cameraShare * 100)}% of frames across ${report.clashingSitesSeen.length} worlds (${hadAttack ? 'a contested round' : 'an unopposed round, no blow landed'})`);
}
