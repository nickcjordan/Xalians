/*
	The squad reader captures: the squad panel at four game states, each with an answer key,
	for blind readers (docs/design/reclamation-squad-reader-loop.md).

	WHY THIS EXISTS. A UI pass reaches Nick only after three fresh readers who have never seen
	the game score the squad 8 of 10 or higher and get 9 in 10 factual answers right. The
	readers see only the images; the answers are scored against the engine's own numbers,
	dumped beside each image (window.__reclamationDebug.glance(), reclamationMatch.js).

	The four states (the same deterministic policy at every size, so one seed reaches the same
	positions everywhere):
	  s1  round 1, your turn, nothing sent yet
	  s2  round 1 mid-round: you have sent creatures until the rival shows creatures on at
	      least two worlds and it is your turn with a creature still to send
	  s3  s2 with your first creature in hand lifted and the world with most rival creatures
	      pointed at (captured while hovered, mouse not moved away)
	  s4  round 3 start, your turn, after two rounds of two sends and a pass each
	Sizes: 1440x900 and 1366x768 for all four, 390x844 for s1 and s3 only.

	s4 is reached by continuing the same game after s3: Escape puts the lifted creature down,
	and the policy then plays on (it never depends on the lift).

	Per capture: <state>-<W>x<H>.png (viewport, CSS scale), <state>-<W>x<H>-foot.png (2x crop of
	.rec-bench), <state>-<W>x<H>.json (glance() plus turn, phase, frameIndex, sitesWon,
	siteTotals; s3 adds lifted, pointedSiteId (read from the element under the pointer), focusSiteId (the site whose squad cells are lit) and intendedSiteId), and one row in manifest.json.

	Run: node apps/web/scripts/reclamation-squad-readers.mjs
	REC_QA_BASE overrides the server (default http://127.0.0.1:4180), REC_QA_SEED the seed
	(7), REC_QA_OUTPUT the folder (C:/Users/njord/AppData/Local/Temp/reclamation-squad-readers/<seed>),
	REC_QA_VIEW the view mode (omitted: the game's default, recorded in the manifest).
	Exits non-zero if a capture failed, a page error occurred, or a JSON lacks fits.
*/
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.REC_QA_BASE || 'http://127.0.0.1:4180';
const seed = process.env.REC_QA_SEED || '7';
const output = process.env.REC_QA_OUTPUT || `C:/Users/njord/AppData/Local/Temp/reclamation-squad-readers/${seed}`;
const viewParam = process.env.REC_QA_VIEW || '';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const SENDS_PER_ROUND = 2;
const RUNS = [
	{ size: [1440, 900], states: ['s1', 's2', 's3', 's4'] },
	{ size: [1366, 768], states: ['s1', 's2', 's3', 's4'] },
	{ size: [390, 844], states: ['s1', 's2', 's3'], capture: ['s1', 's3'] },
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const manifest = [];
let failures = 0;

for (const run of RUNS) {
	const [width, height] = run.size;
	const tag = `${width}x${height}`;
	const mobile = width < 700;
	const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
	const page = await context.newPage();
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.addInitScript(() => {
		window.__reclamationBeatMs = 30;
		window.__reclamationStepMs = 15;
		try { localStorage.setItem('reclamation.coached', 'yes'); localStorage.setItem('reclamation.legendSeen', 'yes'); } catch (e) { /* no storage */ }
	});
	try {
		await page.goto(`${base}/reclamation?seed=${seed}${viewParam ? `&view=${viewParam}` : ''}`, { waitUntil: 'networkidle' });
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
	} catch (e) {
		console.error(`${tag}: could not enter the match: ${e.message}`);
		failures++;
		await context.close();
		continue;
	}

	const debug = () => page.evaluate(() => {
		const d = window.__reclamationDebug || {};
		const plain = {};
		for (const [k, v] of Object.entries(d)) {
			if (typeof v !== 'function') plain[k] = v;
		}
		if (typeof d.glance === 'function') plain.glance = d.glance();
		return plain;
	});
	const myTurn = (d) => d.phase === 'deploy' && d.turn === d.you && !d.playing;
	const mode = async () => (await page.locator('[data-squad-advanced]').count() ? 'advanced' : 'simple');

	const capture = async (state, extra = {}, still = true) => {
		if (still) {
			await page.mouse.move(1, 1);
			await page.waitForTimeout(500);
		}
		const name = `${state}-${tag}`;
		const entry = { file: `${name}.png`, state, size: tag, mode: await mode(), pageErrors: errors.slice() };
		try {
			await page.screenshot({ path: `${output}/${name}.png`, scale: 'css' });
			const box = await page.locator('.rec-bench').first().boundingBox();
			if (!box) throw new Error('no .rec-bench');
			const x = Math.max(0, box.x);
			const y = Math.max(0, box.y);
			const clip = { x, y, width: Math.min(width - x, box.width), height: Math.min(height - y, box.height) };
			await page.screenshot({ path: `${output}/${name}-foot.png`, scale: 'device', clip });
			const d = await debug();
			// pass 77: the layout check, at every capture: each tile's blocks and hover blow inside the tile, no block over its neighbor, no tile over another, the squad never taller than its box
			const bad = await page.evaluate(() => {
				const out = [];
				const T = 1;
				const tiles = [...document.querySelectorAll('.rec-squad-row')];
				tiles.forEach((tile) => {
					const t = tile.getBoundingClientRect();
					const cells = [...tile.querySelectorAll('.rec-squad-cell')];
					cells.forEach((cell) => {
						const c = cell.getBoundingClientRect();
						if (c.left < t.left - T || c.right > t.right + T || c.top < t.top - T || c.bottom > t.bottom + T) {
							out.push(`block outside its tile (${cell.getAttribute('data-fit-site')})`);
						}
						[...cell.querySelectorAll('.rec-squad-num')].forEach((n) => {
							if (n.scrollWidth > cell.clientWidth + T) out.push(`number wider than its block (${cell.getAttribute('data-fit-site')})`);
						});
					});
					tile.querySelectorAll('.rec-squad-act, .rec-squad-hover').forEach((f) => {
						const r = f.getBoundingClientRect();
						if (r.right > t.right + T || r.left < t.left - T) out.push(`attack line outside its tile: ${Math.round(r.right)} vs ${Math.round(t.right)}`);
					});
					const act = tile.querySelector('.rec-squad-act');
					const id = tile.querySelector('.rec-squad-id');
					if (act && id && act.scrollWidth > id.clientWidth + T) out.push(`attack line wider than its column: ${act.scrollWidth} vs ${id.clientWidth}`);
					// pass 79: the zones fill the tile: each number zone's content centered in it, the three zones spanning the tile, the big number tall enough
					const left = tile.querySelector('.rec-squad-left');
					const stats = [...tile.querySelectorAll('.rec-squad-stat')];
					const top = tile.querySelector('.rec-squad-top');
					if (left && stats.length === 2 && top) {
						const tr = top.getBoundingClientRect();
						const lr = left.getBoundingClientRect();
						const sr = stats.map((z) => z.getBoundingClientRect());
						const span = (Math.max(lr.right, sr[0].right, sr[1].right) - Math.min(lr.left, sr[0].left, sr[1].left)) / t.width;
						let off = 0;
						const tag = tile.getAttribute('data-slot');
						stats.forEach((z, i) => {
							const zr = sr[i];
							const kids = [...z.querySelectorAll('b.rec-squad-big, .rec-squad-hbar, .rec-squad-hfill, .rec-squad-act, .rec-squad-act-word')];
							const l = Math.min(...kids.map((k) => k.getBoundingClientRect().left));
							const r = Math.max(...kids.map((k) => k.getBoundingClientRect().right));
							const o = Math.abs((l + r) / 2 - (zr.left + zr.right) / 2) / zr.width;
							off = Math.max(off, o);
							if (o > 0.15) out.push(`zone content off center by ${(o * 100).toFixed(0)}% (${i ? 'attack' : 'health'}, ${tag})`);
						});
						const big = tile.querySelector('b.rec-squad-big');
						const bigH = big ? big.getBoundingClientRect().height / tr.height : 0;
						if (span < 0.92) out.push(`zones span only ${(span * 100).toFixed(0)}% of the tile (${tag})`);
						if (bigH < 0.35) out.push(`big number only ${(bigH * 100).toFixed(0)}% of the top area (${tag})`);
						window.__layoutStats = window.__layoutStats || [];
						window.__layoutStats.push({ w: Math.round(t.width), h: Math.round(t.height), span: +span.toFixed(3), bigH: +bigH.toFixed(3), off: +off.toFixed(3), fs: big ? Math.round(parseFloat(getComputedStyle(big).fontSize)) : 0 });
					}
					for (let i = 0; i + 1 < cells.length; i++) {
						const a = cells[i].getBoundingClientRect();
						const b = cells[i + 1].getBoundingClientRect();
						if (a.right > b.left + T && a.left < b.right - T && a.bottom > b.top + T && a.top < b.bottom - T) {
							out.push(`blocks overlap: ${cells[i].getAttribute('data-fit-site')} and ${cells[i + 1].getAttribute('data-fit-site')}`);
						}
					}
				});
				for (let i = 0; i < tiles.length; i++) {
					for (let j = i + 1; j < tiles.length; j++) {
						const a = tiles[i].getBoundingClientRect();
						const b = tiles[j].getBoundingClientRect();
						if (a.right > b.left + 2 && a.left < b.right - 2 && a.bottom > b.top + 6 && a.top < b.bottom - 6) out.push('tiles overlap');
					}
				}
				const root = document.documentElement;
				if (root.scrollHeight > window.innerHeight + 1 || root.scrollWidth > window.innerWidth + 1) out.push(`page scrolls: ${root.scrollWidth}x${root.scrollHeight} in ${window.innerWidth}x${window.innerHeight}`);
				return out;
			});
			const stats = await page.evaluate(() => { const x = window.__layoutStats || []; window.__layoutStats = []; return x; });
			if (stats.length) {
				const mm = (k, f) => Math[f](...stats.map((x) => x[k]));
				entry.layoutStats = { tiles: stats.length, w: stats[0].w, h: stats[0].h, fs: stats[0].fs, minSpan: mm('span', 'min'), minBigH: mm('bigH', 'min'), maxOff: mm('off', 'max') };
				console.log(`${name}: layout ${JSON.stringify(entry.layoutStats)}`);
			}
			if (bad.length) {
				entry.layout = bad;
				failures++;
				console.error(`${name}: LAYOUT ${bad.length} violations: ${bad.slice(0, 4).join(' | ')}`);
			}
			const json = { ...d, ...extra };
			await writeFile(`${output}/${name}.json`, JSON.stringify(json, null, 2));
			if (!d.glance || !d.glance.fits) {
				entry.error = 'no fits in glance';
				failures++;
			}
			console.log(`${name}: frame ${d.frameIndex} ${d.phase}/${d.turn} sends left ${d.glance ? d.glance.sendsLeft : '?'} mode ${entry.mode}, ${errors.length} page errors`);
		} catch (e) {
			entry.error = e.message;
			failures++;
			console.error(`${name}: capture failed: ${e.message}`);
		}
		manifest.push(entry);
	};
	const wants = (state) => !run.capture || run.capture.includes(state);

	// one send by the policy: first enabled arm, to world n mod 3
	let n = 0;
	let sentThisRound = 0;
	let round = 0;
	const sendOne = async () => {
		const arms = page.locator('[data-arm]:not([disabled])');
		if (!(await arms.count())) return false;
		await arms.first().click();
		await page.waitForTimeout(120);
		await page.locator('[data-site-id]').nth(n % 3).click({ force: true });
		n++;
		sentThisRound++;
		await page.waitForTimeout(300);
		return true;
	};
	const rivalWorlds = (d) => Object.values((d.glance && d.glance.rivals) || {}).filter((list) => list.length > 0).length;

	// s1
	for (let g = 0; g < 100 && !myTurn(await debug()); g++) await page.waitForTimeout(150);
	if (wants('s1')) await capture('s1');

	// s2
	let s2State = null;
	for (let g = 0; g < 200; g++) {
		const d = await debug();
		if (!myTurn(d)) { await page.waitForTimeout(150); continue; }
		const arms = page.locator('[data-slot-state="hand"] [data-arm]:not([disabled])');
		if (rivalWorlds(d) >= 2 && await arms.count()) { s2State = d; break; }
		if (!(await sendOne())) break;
	}
	if (!s2State) {
		console.error(`${tag}: never reached s2`);
		failures++;
	}
	if (s2State && wants('s2')) await capture('s2');

	// s3
	if (s2State) {
		try {
			const arm = page.locator('[data-slot-state="hand"] [data-arm]:not([disabled])').first();
			const liftedId = await arm.evaluate((el) => el.closest('[data-slot]').getAttribute('data-slot'));
			await arm.click();
			await page.waitForTimeout(250);
			const d = await debug();
			const rivals = d.glance.rivals;
			const pointed = Object.keys(rivals).sort((a, b) => rivals[b].length - rivals[a].length)[0];
			const target = page.locator(`[data-site-id="${pointed}"]`).first();
			await target.hover();
			await page.waitForTimeout(600);
			// what is really under the pointer, and which world's squad cells light (pass 76: the answer key named the intent, not this)
			const hovered = await target.boundingBox();
			const under = await page.evaluate(({ x, y }) => {
				const el = document.elementFromPoint(x, y);
				const site = el && el.closest('[data-site-id]');
				const focus = document.querySelector('.rec-squad-cell--focus');
				return { pointed: site ? site.getAttribute('data-site-id') : null, focus: focus ? focus.getAttribute('data-fit-site') : null };
			}, { x: hovered.x + hovered.width / 2, y: hovered.y + hovered.height / 2 });
			const squadEntry = d.glance.squad.find((s) => s.id === liftedId);
			await capture('s3', { lifted: { id: liftedId, name: squadEntry ? squadEntry.name : null }, pointedSiteId: under.pointed, focusSiteId: under.focus, intendedSiteId: pointed }, false);
			if (under.pointed !== under.focus || under.pointed !== pointed) console.error(`${tag}: s3 pointer mismatch: intended ${pointed}, under pointer ${under.pointed}, focused ${under.focus}`);
			await page.mouse.move(1, 1);
			await page.keyboard.press('Escape');
			await page.waitForTimeout(300);
		} catch (e) {
			console.error(`${tag}: s3 failed: ${e.message}`);
			failures++;
		}
	}

	// s4: play on to round 3
	if (run.states.includes('s4')) {
		let done = false;
		for (let g = 0; g < 800 && !done; g++) {
			const d = await debug();
			if (d.phase === 'matchEnd') break;
			const skip = page.locator('[data-skip]');
			if (await skip.count() && await skip.first().isVisible()) { await skip.first().click().catch(() => {}); continue; }
			const next = page.locator('[data-next-frame]');
			if (await next.count() && await next.first().isVisible() && !d.playing) { await next.first().click().catch(() => {}); await page.waitForTimeout(400); continue; }
			if (d.playing || d.phase !== 'deploy') { await page.waitForTimeout(150); continue; }
			if (d.frameIndex !== round) { round = d.frameIndex; sentThisRound = 0; }
			if (!myTurn(d)) { await page.waitForTimeout(150); continue; }
			if (d.frameIndex === 2) {
				await page.waitForTimeout(400);
				await capture('s4');
				done = true;
				break;
			}
			if (sentThisRound < SENDS_PER_ROUND && await sendOne()) continue;
			const pass = page.locator('[data-pass]:not([disabled])');
			if (await pass.count()) { await pass.first().click(); await page.waitForTimeout(300); continue; }
			await page.waitForTimeout(150);
		}
		if (!done) {
			console.error(`${tag}: never reached s4`, JSON.stringify(await debug().then((d) => ({ phase: d.phase, frameIndex: d.frameIndex, turn: d.turn, playing: d.playing, sitesWon: d.sitesWon }))));
			failures++;
		}
	}
	if (errors.length) {
		failures++;
		console.error(`${tag}: page errors: ${errors.join(' | ')}`);
	}
	await context.close();
}

await writeFile(`${output}/manifest.json`, JSON.stringify({ seed, base, view: viewParam || '(default)', captures: manifest }, null, 2));
await browser.close();
console.log(`${manifest.length} captures in ${output}${failures ? `, ${failures} FAILURES` : ''}`);
process.exit(failures ? 1 : 0);
