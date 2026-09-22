/*
	Reclamation: one screen, and nothing on it moves under the player.

	Nick, 2026-09-22, twice. First: "when moves are made, there are banners or additional
	things appearing on the page that cause the screen to jump ... forcing me to scroll."
	Then, after pass 36 had cut the layout-shift score and he played again: "The screen still
	immediately shifted when the first creature was put on the screen ... This is a game. You
	should have the game characteristics, such as one constant screen without any scrolling."

	WHY PASS 36'S VERSION OF THIS CHECK MISSED IT. It measured only layout shift, the
	browser's score for elements moving between frames. A page 1659px tall on a 900px screen
	scores zero shift while the player scrolls down to the bench and back up to the worlds on
	every send, and a scroll is exactly what Nick felt as the screen jumping. So this check now
	measures the three things a game screen promises, at every step of a round:

	  1. FITS. The document is no taller and no wider than the viewport, and the page is
	     never scrolled. Measured at rest, while hovering, after each send, during the Clash,
	     at the Court's ruling and on the next round.
	  2. REACHABLE. Every control the round needs (each world, each bench creature, the pass
	     button, the next-round button) lies wholly inside the viewport.
	  3. STILL. The layout-shift score while hovering is below what it prints at four places
	     and after a send is under a small budget. `hadRecentInput` is deliberately NOT trusted to excuse a shift: the
	     browser clears it for 500ms after a real click, which is exactly the window in which
	     "I pressed send and the page jumped" happens.

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
	The screens. 1920x950 and 1440x900 are desks, 1536x730 is a 1920 laptop at 125% with the
	browser's own chrome showing, 1366x650 is the smallest desk this is held to, and 390x844
	and 375x667 are a current phone and a small one.
*/
const SCREENS = [
	['1920', 1920, 950, false],
	['1440', 1440, 900, false],
	['1536', 1536, 730, false],
	['1366', 1366, 650, false],
	['390', 390, 844, true],
	['375', 375, 667, true],
];

/*
	Hover must be nothing you can see: pointing at a thing must never move it, or the thing
	you meant to click is somewhere else by the time you click. The budget is 0.0001, below
	what the score prints at four places, because one residual remains at 1366x650 and it is
	not layout: a few bulbs inside a previewed meter report a 2px move worth 0.000005 when a
	home-ground creature is pointed at. Everything larger than that fails. A send is allowed
	a twitch: the creatures already standing in the world it lands on shrink to make room,
	which is the table answering the move rather than the page moving.
*/
const BUDGET = { hover: 0.0001, send: 0.02 };

const INSTALL = () => {
	window.__shifts = [];
	const observer = new PerformanceObserver((list) => {
		for (const entry of list.getEntries()) {
			window.__shifts.push({
				value: entry.value,
				sources: (entry.sources || []).map((s) => ({
					node: s.node ? (s.node.className || s.node.nodeName) : '(gone)',
					from: s.previousRect ? Math.round(s.previousRect.y) : null,
					to: s.currentRect ? Math.round(s.currentRect.y) : null,
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

async function drain(page) {
	const entries = await page.evaluate(() => (window.__readShifts ? window.__readShifts() : []));
	const total = entries.reduce((n, e) => n + e.value, 0);
	const blamed = entries
		.flatMap((e) => e.sources.map((s) => ({ value: e.value, ...s })))
		.sort((a, b) => b.value - a.value)
		.slice(0, 3)
		.map((s) => `${String(s.node).slice(0, 48)} y${s.from}->y${s.to}`);
	return { total, blamed };
}

const failures = [];
const fail = (line) => {
	console.log(`FAIL ${line}`);
	failures.push(line);
};

/** the document fits the viewport and has not been scrolled */
async function checkFits(page, label, moment) {
	const m = await page.evaluate(() => ({
		h: document.documentElement.scrollHeight,
		w: document.documentElement.scrollWidth,
		vh: window.innerHeight,
		vw: window.innerWidth,
		sy: Math.round(window.scrollY),
	}));
	if (m.h > m.vh + 1 || m.w > m.vw + 1 || m.sy !== 0) {
		fail(`${label} ${moment}: page is ${m.w}x${m.h} on a ${m.vw}x${m.vh} screen, scrolled ${m.sy}px`);
		return false;
	}
	return true;
}

/** every element matching the selector lies wholly inside the viewport */
async function checkReachable(page, label, moment, selector, what) {
	const out = await page.locator(selector).evaluateAll((els) => els
		.filter((e) => e.getClientRects().length > 0)
		.map((e) => {
			const r = e.getBoundingClientRect();
			return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
		})
		.filter((r) => r.top < -1 || r.left < -1 || r.bottom > window.innerHeight + 1 || r.right > window.innerWidth + 1));
	if (out.length) {
		fail(`${label} ${moment}: ${out.length} ${what} not wholly on screen (first at y${Math.round(out[0].top)}..${Math.round(out[0].bottom)})`);
	}
}

const browser = await chromium.launch({ executablePath: EDGE, headless: true });

for (const [label, width, height, isMobile] of SCREENS) {
	const context = await browser.newContext({ viewport: { width, height }, isMobile, hasTouch: isMobile });
	const page = await context.newPage();
	await page.addInitScript(INSTALL);
	await page.goto(`${base}/reclamation?seed=${SEED}&view=simple`, { waitUntil: 'networkidle' });

	const discard = page.locator('[data-discard-match]');
	if (await discard.count() && await discard.first().isVisible()) {
		await discard.first().click();
	}
	await page.locator('[data-enter]').first().click();
	await page.locator('[data-arm]').first().waitFor({ state: 'visible', timeout: 20000 });
	// let the entrance settle; its animation is a shift nobody is complaining about
	await page.waitForTimeout(1800);
	await drain(page);

	await checkFits(page, label, 'at rest');
	await checkReachable(page, label, 'at rest', '[data-site-id]', 'worlds');
	await checkReachable(page, label, 'at rest', '[data-arm]', 'bench creatures');
	await checkReachable(page, label, 'at rest', '[data-pass]', 'pass buttons');

	// HOVER, desks only: a phone has no pointer to rest on a creature
	if (!isMobile) {
		const slots = page.locator('[data-arm]');
		const slotCount = Math.min(await slots.count(), 6);
		let hoverTotal = 0;
		let hoverBlamed = [];
		for (let i = 0; i < slotCount; i++) {
			await slots.nth(i).hover({ force: true });
			await page.waitForTimeout(350);
			const { total, blamed } = await drain(page);
			hoverTotal += total;
			hoverBlamed = hoverBlamed.concat(blamed);
		}
		await page.mouse.move(2, 2);
		await page.waitForTimeout(350);
		const off = await drain(page);
		hoverTotal += off.total;
		console.log(`${hoverTotal <= BUDGET.hover ? 'ok  ' : 'FAIL'} ${label} hover: shift ${hoverTotal.toFixed(4)}`);
		if (hoverTotal > BUDGET.hover) {
			failures.push(`${label} hover: shift ${hoverTotal.toFixed(4)} (${hoverBlamed.concat(off.blamed).slice(0, 3).join('; ')})`);
		}
		await checkFits(page, label, 'after hovering');
	}

	/*
		SEND. Lift a creature, press a world, the way a move is made, and let the rival
		answer. The first send is the one Nick named.
	*/
	let sendTotal = 0;
	let sendBlamed = [];
	let sends = 0;
	for (let attempt = 0; attempt < 4; attempt++) {
		const armable = page.locator('[data-arm]:not([disabled])');
		await armable.first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
		if (!await armable.count()) break;
		await armable.first().click({ timeout: 5000 });
		await page.waitForTimeout(250);
		await checkFits(page, label, `with send ${sends + 1} lifted`);
		const worlds = page.locator('[data-site-id]');
		await worlds.nth(sends % await worlds.count()).click({ timeout: 5000 });
		await page.waitForTimeout(700);
		const { total, blamed } = await drain(page);
		sendTotal += total;
		sendBlamed = sendBlamed.concat(blamed);
		sends++;
		await checkFits(page, label, `after send ${sends}`);
		// the rival's answer lands while we wait for the bench to come back
		await page.waitForTimeout(2600);
		await checkFits(page, label, `after the rival answers send ${sends}`);
		await drain(page);
	}
	console.log(`${sendTotal <= BUDGET.send ? 'ok  ' : 'FAIL'} ${label} send (${sends}): shift ${sendTotal.toFixed(4)}`);
	if (sendTotal > BUDGET.send) {
		failures.push(`${label} send: shift ${sendTotal.toFixed(4)} (${sendBlamed.slice(0, 3).join('; ')})`);
	}
	await checkReachable(page, label, 'mid-round', '[data-site-id]', 'worlds');
	await checkReachable(page, label, 'mid-round', '[data-arm]', 'bench creatures');

	/*
		THE CLASH AND THE RULING. Pass, sample the screen through the playback, then check the
		Court's bar and the next round.
	*/
	const pass = page.locator('[data-pass]:not([disabled])');
	await pass.first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
	if (await pass.count()) {
		await pass.first().click();
		for (let i = 0; i < 6; i++) {
			await page.waitForTimeout(900);
			await checkFits(page, label, `during the Clash (${i + 1})`);
		}
		const next = page.locator('[data-next-frame]');
		await next.first().waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});
		if (await next.count()) {
			await checkFits(page, label, 'at the ruling');
			await checkReachable(page, label, 'at the ruling', '[data-next-frame]', 'next-round buttons');
			await next.first().click();
			await page.locator('[data-arm]').first().waitFor({ state: 'visible', timeout: 20000 });
			await page.waitForTimeout(1500);
			await checkFits(page, label, 'on round 2');
			await checkReachable(page, label, 'on round 2', '[data-arm]', 'bench creatures');
		} else {
			fail(`${label}: the round never reached the Court's ruling`);
		}
	} else {
		fail(`${label}: no pass button after the sends`);
	}

	console.log(`     ${label} done`);
	await context.close();
}

await browser.close();

if (failures.length) {
	console.log(`\n${failures.length} failure(s):\n  ${failures.join('\n  ')}`);
	assert.fail(`the table is not one still screen in ${failures.length} place(s)`);
}
console.log('\none screen, nothing moving, at every size');
