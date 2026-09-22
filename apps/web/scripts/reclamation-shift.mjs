/*
	Reclamation: the table must not jump under the player.

	Nick, 2026-09-22, playing a Proving: "when moves are made, there are banners or
	additional things appearing on the page that cause the screen to jump and cause
	everything to shift down, forcing me to scroll. I don't want to have to scroll in this
	game. The same problem happens when I hover over a creature."

	WHAT THIS MEASURES, AND WHY IT IS NOT A SCREENSHOT DIFF. The browser already computes
	layout instability for us: a LayoutShift entry is emitted whenever a visible element
	moves between frames without a user input to explain it, and its `value` is the shift
	score (fraction of the viewport affected, weighted by distance moved). This check drives
	the table the way a player does and reads that number, so it fails on the thing Nick
	described rather than on a picture looking different.

	`hadRecentInput` is DELIBERATELY NOT TRUSTED to excuse a shift here. The browser clears
	that flag for 500ms after a real click, which is exactly the window in which "I pressed
	send and the page jumped" happens. This check measures the shifts that follow an action
	as well as the ones that happen with no input at all, because both are what the player
	feels.

	STATE AT PASS 36 (seed 7). This check does not pass yet, and it is kept strict on purpose
	so the remaining movement stays visible rather than being budgeted away:

	            start    pass 36
	  1440 hover 0.0484   0.0096
	  1440 send  0.2468   0.0577
	  390 hover  0.2980   0.0162
	  390 send   0.2880   0.1836

	Run against a preview server (npm run build -w apps/web, then
	npx vite preview --port 4173 --host 127.0.0.1 from apps/web):
	  node apps/web/scripts/reclamation-shift.mjs
	REC_QA_BASE overrides the base URL.
*/
import assert from 'node:assert';
import { chromium } from 'playwright-core';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const base = process.env.REC_QA_BASE || 'http://127.0.0.1:4173';
const SEED = 7;

/*
	The budget. Google's Core Web Vitals call a cumulative shift under 0.1 "good" for a whole
	page load; this is a game table that is not loading anything, so the bar is tighter. A
	shift of 0.02 is roughly a fiftieth of the viewport moving, which is already visible as a
	twitch. Hover in particular must be ZERO: pointing at a thing must never move it, or the
	thing you meant to click is somewhere else by the time you click.
*/
const BUDGET = { hover: 0, send: 0.02, resolve: 0.05 };

// Start the observer before anything is driven, and expose a reader that returns the
// shifts seen since the last read. Kept in the page so the entries are never serialized
// across the boundary more than once.
const INSTALL = () => {
	window.__shifts = [];
	const observer = new PerformanceObserver((list) => {
		for (const entry of list.getEntries()) {
			window.__shifts.push({
				value: entry.value,
				hadRecentInput: entry.hadRecentInput,
				sources: (entry.sources || []).map((s) => ({
					node: s.node ? (s.node.getAttribute && (s.node.getAttribute('data-shift-id') || s.node.className) || s.node.nodeName) : '(gone)',
					from: s.previousRect ? { y: Math.round(s.previousRect.y), h: Math.round(s.previousRect.height) } : null,
					to: s.currentRect ? { y: Math.round(s.currentRect.y), h: Math.round(s.currentRect.height) } : null,
				})),
			});
		}
	});
	observer.observe({ type: 'layout-shift', buffered: true });
	window.__readShifts = () => {
		const seen = window.__shifts;
		window.__shifts = [];
		return seen;
	};
};

/** total shift score since the last read, with the worst offenders named */
async function drain(page) {
	const entries = await page.evaluate(() => (window.__readShifts ? window.__readShifts() : []));
	const total = entries.reduce((n, e) => n + e.value, 0);
	const blamed = entries
		.flatMap((e) => e.sources.map((s) => ({ value: e.value, ...s })))
		.sort((a, b) => b.value - a.value)
		.slice(0, 4)
		.map((s) => `${s.node} ${s.from ? `y${s.from.y}` : '?'}->${s.to ? `y${s.to.y}` : '?'} (${s.value.toFixed(4)})`);
	return { total, blamed };
}

/*
	Page height is measured alongside the shift score, because the two failures Nick named
	are different: a shift MOVES what is on screen, and a growing document forces a SCROLL.
	An element that appears below the fold does not shift anything and still breaks the
	promise that this game does not need scrolling.
*/
const metrics = (page) => page.evaluate(() => ({
	docHeight: Math.round(document.documentElement.scrollHeight),
	viewport: window.innerHeight,
	scrollY: Math.round(window.scrollY),
}));

const failures = [];
const record = (label, what, total, budget, blamed, extra = '') => {
	const ok = total <= budget;
	const line = `${ok ? 'ok  ' : 'FAIL'} ${label} ${what}: shift ${total.toFixed(4)} (budget ${budget})${extra}`;
	console.log(line);
	if (!ok) {
		failures.push(`${label} ${what}: shift ${total.toFixed(4)} over budget ${budget}${blamed.length ? `\n       moved: ${blamed.join('\n              ')}` : ''}`);
	}
	return ok;
};

const browser = await chromium.launch({ executablePath: EDGE, headless: true });

for (const [label, width, height] of [['1440', 1440, 900], ['390', 390, 844]]) {
	const page = await browser.newPage({ viewport: { width, height } });
	await page.addInitScript(INSTALL);
	await page.goto(`${base}/reclamation?seed=${SEED}&view=simple`, { waitUntil: 'networkidle' });

	const discard = page.locator('[data-discard-match]');
	if (await discard.count() && await discard.first().isVisible()) {
		await discard.first().click();
	}
	await page.locator('[data-enter]').first().click();
	await page.locator('[data-arm]').first().waitFor({ state: 'visible', timeout: 20000 });
	/*
		Dismiss the first-round coaching strip before measuring, the way a player does. It is
		a one-time panel and leaving it up both covers the controls on a narrow screen and
		measures a shift (its own dismissal) that only ever happens once per match.
	*/
	const coach = page.locator('[data-coach-dismiss]');
	if (await coach.count() && await coach.first().isVisible()) {
		await coach.first().click();
		await page.waitForTimeout(400);
	}
	// let the entrance settle; its animation is a shift nobody is complaining about
	await page.waitForTimeout(1800);
	const atRest = await metrics(page);
	await drain(page);

	/*
		HOVER. Point at each of the first few creatures in turn and read the shift. This is the
		one Nick called out by name, and the budget is zero: the thing under the pointer must
		not move, and neither must anything else.
	*/
	const slots = page.locator('[data-arm]');
	const slotCount = Math.min(await slots.count(), 6);
	let hoverTotal = 0;
	let hoverBlamed = [];
	for (let i = 0; i < slotCount; i++) {
		const slot = slots.nth(i);
		if (!await slot.isVisible()) continue;
		await slot.hover({ force: true });
		await page.waitForTimeout(450);
		const { total, blamed } = await drain(page);
		hoverTotal += total;
		if (blamed.length && hoverBlamed.length < 4) hoverBlamed = hoverBlamed.concat(blamed);
	}
	// move the pointer off, which is its own chance to shift as whatever appeared goes away
	await page.mouse.move(2, 2);
	await page.waitForTimeout(450);
	const off = await drain(page);
	hoverTotal += off.total;
	record(label, 'hover', hoverTotal, BUDGET.hover, hoverBlamed.concat(off.blamed));

	const afterHover = await metrics(page);
	if (afterHover.docHeight > atRest.docHeight) {
		const grew = afterHover.docHeight - atRest.docHeight;
		console.log(`FAIL ${label} hover height: the page grew ${grew}px while hovering (${atRest.docHeight} -> ${afterHover.docHeight})`);
		failures.push(`${label} hover height: the page grew ${grew}px while hovering`);
	}

	/*
		SEND. Press a creature, then a world, which is how a move is made. The banner and
		advice that follow a send are what Nick saw jumping.
	*/
	let sendTotal = 0;
	let sendBlamed = [];
	let sends = 0;
	for (let attempt = 0; attempt < 4; attempt++) {
		const armable = page.locator('[data-arm]:not([disabled])');
		if (!await armable.count()) break;
		await armable.first().click({ timeout: 5000 }).catch(() => {});
		await page.waitForTimeout(250);
		const worlds = page.locator('[data-site-id]');
		if (!await worlds.count()) break;
		const target = worlds.nth(sends % await worlds.count());
		await target.click({ timeout: 5000 }).catch(async () => {
			await target.click({ force: true, timeout: 5000 }).catch(() => {});
		});
		await page.waitForTimeout(700);
		const { total, blamed } = await drain(page);
		sendTotal += total;
		if (blamed.length && sendBlamed.length < 4) sendBlamed = sendBlamed.concat(blamed);
		sends++;
	}
	record(label, `send (${sends})`, sendTotal, BUDGET.send, sendBlamed);

	const afterSend = await metrics(page);
	if (afterSend.docHeight > atRest.docHeight) {
		const grew = afterSend.docHeight - atRest.docHeight;
		console.log(`FAIL ${label} send height: the page grew ${grew}px after sending (${atRest.docHeight} -> ${afterSend.docHeight})`);
		failures.push(`${label} send height: the page grew ${grew}px after sending`);
	}

	/*
		RESOLVE. Passing ends the round and plays the Clash back, which is the largest thing
		the table does on its own. The budget is looser because the board genuinely changes,
		but it is still a budget: creatures leaving should not drag the whole page with them.
	*/
	const pass = page.locator('[data-pass]:not([disabled])');
	if (await pass.count()) {
		await pass.first().click();
		await page.waitForTimeout(6000);
		const { total, blamed } = await drain(page);
		record(label, 'resolve', total, BUDGET.resolve, blamed);
	}

	await page.close();
}

await browser.close();

if (failures.length) {
	console.log(`\n${failures.length} over budget:\n  ${failures.join('\n  ')}`);
	assert.fail(`the table shifts under the player in ${failures.length} place(s)`);
}
console.log('\nno layout shift over budget');
