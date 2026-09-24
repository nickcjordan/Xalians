/*
	Headless check: a whole Proving, in both views, at desktop and phone width.

	What it is for (docs/design/reclamation-ownership-brief.md, "Verify"): every pass must
	show a Proving played end to end with screenshots at 1440 and 390, no horizontal
	overflow and no console errors, so a change to the rules cannot silently break the
	table. Pass 5 added it because the checks the brief refers to did not exist as a script.

	Run: node apps/web/scripts/reclamation-proving.mjs
	against a preview server on 127.0.0.1:4173 (npm run build -w apps/web, then
	npx vite preview --port 4173 --host 127.0.0.1 from apps/web).

	REC_QA_OUTPUT overrides where the screenshots land. REC_QA_SEED overrides the seed.
*/
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { seenOn, assertSeen } from './lib/visible.mjs';

const output = process.env.REC_QA_OUTPUT || 'C:/Users/njord/AppData/Local/Temp/reclamation-qa';
const seed = process.env.REC_QA_SEED || '7';
const base = process.env.REC_QA_BASE || 'http://127.0.0.1:4173';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: EDGE, headless: true });

// the four questions the brief says a player must answer in under two seconds; each needs
// its instrument present on the table, so the check asserts the instruments exist
const GLANCE = [
	// pass 52: the fit strip on each card in hand; pass 54: each world's standing, and the
	// scoreboard whose lamp says whose move it is
	['who is winning this world', '[data-standing]'],
	['what each creature would do at each world', '[data-slot-state="hand"] [data-fit] [data-fit-site]'],
	['who is winning the Proving', '[data-score] [data-turn-lamp]'],
	// pass 57: each world's climate, which the flame and the snowflake on a card are about
	['what each world is like', '[data-site-id] .rec-env-scale'],
];

let failures = 0;

for (const view of ['simple', 'advanced']) {
	for (const width of [1440, 390]) {
		const label = `${view}-${width}`;
		const context = await browser.newContext({
			viewport: { width, height: width === 390 ? 844 : 900 },
			reducedMotion: 'reduce',
			isMobile: width === 390,
			hasTouch: width === 390,
		});
		const page = await context.newPage();
		const errors = [];
		const consoleErrors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		page.on('console', (message) => {
			if (message.type() === 'error') consoleErrors.push(message.text());
		});

		/*
			PASS 14. A fullPage screenshot re-renders position:sticky elements at each scroll
			band, so the site's sticky navbar appears a second time in the middle of the tall
			image. A blind reviewer read that as a detached navbar slicing a world card in
			half and called it the worst thing about the phone build; checked live, the
			navbar sits correctly at y=0 with the worlds scrolling under it. The screenshot
			was lying, not the page.

			So the fullPage capture is kept, because it is the only way to see a whole
			Proving screen at once, and a viewport capture is taken beside it. Anything
			judging the layout should read the -view file; the fullPage file is for reading
			content that runs past one screen.
		*/
		/*
			PASS 31. Every shot also asserts that the board is SEEN, not merely present.

			This check used to ask `count() > 0`, which is a question about the DOM. Pass 28
			shipped a bug where the Court's ruling was painted over a board fading in from
			opacity zero; `document.querySelectorAll('[data-site-id]').length` was 3
			throughout, so this check passed, and so did the other three and all 1541 unit
			tests. Audited afterwards by setting `.rec-site { opacity: 0 }`: all four checks
			passed with the entire game board invisible.

			So the moment a screenshot is worth taking is the moment the board is worth
			checking, and the two happen together here. `seenOn` walks the ancestor opacity
			product, the viewport, visibility/display, and hit-tests the centre point, so a
			panel that is present, laid out and unreadable fails.
		*/
		const shot = async (name, opts = {}) => {
			await page.screenshot({ path: `${output}/${label}-${name}.png`, fullPage: true });
			await page.screenshot({ path: `${output}/${label}-${name}-view.png` });
			const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
			assert(overflow <= 1, `${label}/${name}: horizontal overflow ${overflow}px`);
			if (opts.boardVisible) {
				const sites = await seenOn(page, '[data-site-id]');
				assertSeen(assert, sites, `${label}/${name}`, 'world panel', 3);
			}
		};

		try {
			await page.goto(`${base}/reclamation?seed=${seed}&view=${view}`, { waitUntil: 'networkidle' });
			/*
				PASS 18. `?view=` was not read by the page until this pass, so this check had been
				opening SIMPLE mode in both halves of its loop since pass 5 and calling one of them
				advanced: half of every pass's verification was a duplicate, and the advanced
				table's own panels (the resolution log among them) were never exercised here.
				Assert the mode took, or the check quietly goes back to testing one thing twice.
			*/
			const modeNow = await page.evaluate(() => {
				const pressed = document.querySelector('[data-mode-switch] [aria-pressed="true"]');
				return pressed ? pressed.getAttribute('data-mode') : null;
			});
			assert.equal(modeNow, view, `${label}: asked for ${view} mode, the table is in ${modeNow}`);
			// a resumed Proving from an earlier run would start this check mid-match
			const discard = page.locator('[data-discard-match]');
			if (await discard.count() && await discard.first().isVisible()) await discard.first().click();
			await shot('intro');

			// the intro must name the game and offer a way in without reading a rulebook
			const enter = page.locator('[data-enter]');
			await enter.first().waitFor({ state: 'visible', timeout: 15000 });
			await enter.first().click();

			/*
				PASS 35. The draft is skipped by default, so pressing Enter lands on the table.
				This asserts that rather than tolerating either, because "skipped by default" is
				the thing a player meets and a silent return of the draft screen is exactly the
				regression worth catching. `?draft=1` still reaches it; the hot-seat check
				covers the drafted path.
			*/
			const draftScreens = await page.locator('[data-draft-auto]').count();
			assert(
				draftScreens === 0,
				`${label}: the draft screen appeared; it is meant to be skipped unless ?draft=1`,
			);

			// Deploy: send until the round resolves, pressing a creature then a world. The
			// table is the choice surface, so the check drives it the way a player does.
			await page.locator('[data-slot]').first().waitFor({ state: 'visible', timeout: 20000 });
			await shot('deploy', { boardVisible: true });
			for (const instrument of GLANCE) {
				const [question, selector] = instrument;
				assert(await page.locator(selector).count() > 0, `${label}: nothing on the table answers "${question}"`);
			}

			/*
				PASS 13. The phone gains are guarded here so they cannot quietly regress.
				Before pass 13, at 390 wide with nothing sent, three empty world panels stood
				386px tall each and the gap between the bench and the first world was 1576px,
				nearly two screens, which the rubric critic named the worst thing about the
				phone experience. These two assertions are the floor under the fix.
			*/
			/*
				PASS 37. The panel-height floor above is replaced by the rule it was a stand-in
				for. The worlds now stand side by side on one fixed screen, so a tall panel no
				longer pushes the bench away; what must hold is that the whole table fits the
				phone's screen without scrolling. reclamation-shift.mjs checks the same at every
				step of a round and at six screen sizes.
			*/
			if (width === 390) {
				const fits = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
				assert(fits, `${label}: the table is taller than the phone's screen`);

				const tiny = await page.locator('button:visible').evaluateAll((els) => els
					.map((el) => ({
						name: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40),
						h: Math.round(el.getBoundingClientRect().height),
					}))
					.filter((b) => b.h > 0 && b.h < 32));
				assert.deepEqual(tiny, [], `${label}: tap targets under 32px tall`);
			}

			/*
				PASS 52. Every card in hand says, at rest, what it would do at each world: three
				columns in world order, each with its number. This replaces pass 29's footing
				count, and it is computed from the engine's forecastSend(), so a change to the
				engine or the draft that empties it fails here rather than silently.
			*/
			// the pointer is moved off the bench first: resting on a creature previews it
			await page.mouse.move(2, 2);
			await page.waitForTimeout(250);
			const strips = await page.evaluate(() => [...document.querySelectorAll('[data-slot-state="hand"]')].map((card) => {
				const cols = [...card.querySelectorAll('[data-fit] [data-fit-site]')];
				const numbers = cols.map((col) => (col.querySelector('.rec-fit-num') || {}).textContent || '');
				const strip = card.querySelector('[data-fit]');
				const box = card.getBoundingClientRect();
				const r = strip ? strip.getBoundingClientRect() : null;
				const inside = !!r && r.left >= box.left - 1 && r.right <= box.right + 1 && r.top >= box.top - 1 && r.bottom <= box.bottom + 1;
				return { id: card.getAttribute('data-slot'), cols: cols.length, numbers, inside };
			}));
			assert(strips.length > 0, `${label}: no creature in hand at the start of the game`);
			strips.forEach((strip) => {
				assert.equal(strip.cols, 3, `${label}: ${strip.id} shows ${strip.cols} of 3 world columns`);
				strip.numbers.forEach((n) => assert(/^\u2212?\d+$/.test(n.trim()), `${label}: ${strip.id} has a fit column without a number ("${n}")`));
				assert(strip.inside, `${label}: ${strip.id}'s fit strip runs outside its card`);
			});

			let guard = 0;
			let sends = 0;
			let captionSeen = false;
			let sawReserve = false;
			while (guard < 220) {
				guard++;
				/*
					PASS 55, KEEP ONE BACK. Eleven sends from twelve: once this side's sends are
					spent, the creature left in hand is drawn as the reserve, never as a card that
					could still be played (Nick lost his last send without a word).
				*/
				if (!sawReserve && sends > 0 && await page.locator('[data-sends-side="mine"][data-sends-left="0"]').count()) {
					const reserve = await page.locator('[data-slot-state="reserve"]').count();
					const hand = await page.locator('[data-slot-state="hand"]').count();
					if (reserve + hand > 0) {
						assert(hand === 0 && reserve > 0, `${label}: with no sends left, ${hand} creature(s) still look playable and ${reserve} read as the reserve`);
						sawReserve = true;
					}
				}
				// pace controls first: never let playback stall the check
				const skip = page.locator('[data-skip]');
				if (await skip.count() && await skip.first().isVisible()) {
					/*
						PASS 45. The Clash is told on the world it happens at. Once per configuration,
						watch the first Clash until a caption shows, and require it inside the world
						that is clashing, before skipping the rest.
					*/
					if (!captionSeen) {
						const caption = page.locator('[data-clash-caption]');
						await caption.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
						const placed = await page.evaluate(() => {
							const cap = document.querySelector('[data-clash-caption]');
							if (!cap) return 'no caption appeared during the Clash';
							const site = document.querySelector(`[data-site-id="${cap.getAttribute('data-clash-caption')}"]`);
							if (!site || !site.contains(cap)) return 'the caption is not inside its own world';
							const c = cap.getBoundingClientRect();
							const w = site.getBoundingClientRect();
							return c.left >= w.left - 1 && c.right <= w.right + 1 && c.top >= w.top - 1 && c.bottom <= w.bottom + 1
								? null : `the caption runs outside its world (${Math.round(c.left)}..${Math.round(c.right)} in ${Math.round(w.left)}..${Math.round(w.right)})`;
						});
						assert(placed === null, `${label}: ${placed}`);
						captionSeen = true;
					}
					await skip.first().click();
					continue;
				}
				const nextFrame = page.locator('[data-next-frame]');
				if (await nextFrame.count() && await nextFrame.first().isVisible()) {
					if (sends > 0) await shot(`ruling-${guard}`, { boardVisible: true });
					await nextFrame.first().click();
					continue;
				}
				const report = page.locator('[data-report]');
				if (await report.count() && await report.first().isVisible()) break;

				const arm = page.locator('[data-arm]:not([disabled])');
				const site = page.locator('[data-site-id]');
				if (await arm.count()) {
					await arm.first().click({ timeout: 5000 }).catch(() => {});
					/*
						PASS 54. A lifted creature previews itself on every world's standing: each
						world's bars and their numbers stay inside the world's seam, and the two
						numbers never sit on top of each other.
					*/
					const previewFaults = await page.evaluate(() => {
						const hits = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
						const out = [];
						const lifted = document.querySelectorAll('[data-standing].rec-standing--preview').length;
						if (lifted === 0) {
							out.push('a lifted creature previews itself on no world');
						}
						/*
							PASS 57. The lifted creature stands as a ghost piece in your half of every
							world, its number the same as its card's column there, inside its world.
						*/
						const ghosts = [...document.querySelectorAll('[data-ghost-piece]')];
						if (ghosts.length === 0) {
							out.push('a lifted creature stands as a ghost on no world');
						}
						ghosts.forEach((g) => {
							const site = g.closest('[data-site-id]');
							const w = site.getBoundingClientRect();
							const read = g.querySelector('.rec-ghost-piece-read') || g;
							const r = read.getBoundingClientRect();
							if (r.left < w.left - 1 || r.right > w.right + 1 || r.top < w.top - 1 || r.bottom > w.bottom + 1) {
								out.push(`${site.getAttribute('data-site-id')}: the ghost's number runs outside its world`);
							}
						});
						if (!document.querySelector('.rec-match[data-moment="lifted"]')) {
							out.push('a creature is lifted but the table does not say the moment is the lift');
						}
						/*
							PASS 58, ONE SIDE PER NUMBER. The lifted creature's number on each world is its
							card's, and both are your side's gain alone, never what it would take off the
							rival added in (Nick: "Why is it adding my health and the opponent's health?").
						*/
						const armedCard = document.querySelector('.rec-plinth--armed');
						const armedCols = armedCard ? [...armedCard.querySelectorAll('[data-fit-site][data-fit-gain]')] : [];
						if (armedCols.length > 0 && !armedCols.some((col) => document.querySelector(`[data-ghost-piece="${col.getAttribute('data-fit-site')}"] [data-ghost-gain]`))) {
							out.push('no ghost prints its gain beside the lifted card');
						}
						armedCols.forEach((col) => {
							const id = col.getAttribute('data-fit-site');
							const ghostNum = document.querySelector(`[data-ghost-piece="${id}"] [data-ghost-gain]`);
							if (!ghostNum) {
								return;
							}
							if (ghostNum.getAttribute('data-ghost-gain') !== col.getAttribute('data-fit-gain')) {
								out.push(`${id}: the ghost's number is not its card's`);
							}
							const card = ((col.querySelector('.rec-fit-num') || {}).textContent || '').trim();
							const ghostText = ghostNum.textContent.trim().replace(/^\+/, '');
							if (card !== ghostText) {
								out.push(`${id}: the card prints ${card} and the ghost ${ghostNum.textContent.trim()}`);
							}
							// pass 59: what it arrives with, less what the Clash takes, is the ghost's number
							const chain = document.querySelector(`[data-ghost-piece="${id}"] [data-ghost-chain]`);
							if (chain && chain.querySelector('.rec-ghost-piece-going')) {
								const going = Number((chain.querySelector('.rec-ghost-piece-going') || {}).textContent);
								const toll = Number(((chain.querySelector('.rec-ghost-piece-toll') || {}).textContent || '').replace('−', ''));
								const allies = Number(((chain.querySelector('.rec-ghost-piece-allies') || {}).textContent || '0').replace('−', '-').replace('+', ''));
								if (!(going - toll + allies === Number(ghostText.replace('−', '-')))) {
									out.push(`${id}: the ghost's chain ${going} less ${toll} plus ${allies} does not make ${ghostNum.textContent.trim()}`);
								}
							}
						});
						document.querySelectorAll('[data-standing]').forEach((st) => {
							const site = st.closest('[data-site-id]');
							const id = site.getAttribute('data-site-id');
							const w = site.getBoundingClientRect();
							const nums = [...st.querySelectorAll('[data-standing-total]')].map((n) => n.getBoundingClientRect());
							[st.getBoundingClientRect(), ...nums].forEach((r) => {
								if (r.left < w.left - 1 || r.right > w.right + 1 || r.top < w.top - 1 || r.bottom > w.bottom + 1) {
									out.push(`${id}: the standing runs outside its world`);
								}
							});
							if (nums.length === 2 && hits(nums[0], nums[1])) {
								out.push(`${id}: the two totals sit on top of each other`);
							}
						});
						return [...new Set(out)];
					});
					assert.deepEqual(previewFaults, [], `${label}: ${previewFaults[0]}`);
					const siteCount = await site.count();
					if (siteCount) {
						// spread across the frame the way a handler does, rather than stacking
						// every creature on world one, which is not a position the game produces
						const target = site.nth(sends % siteCount);
						// the dossier rail can overlay a world on narrow screens; force is the
						// check saying "a player would tap here", and the overlay is a finding
						// recorded by the caller, not a reason to stop the Proving
						await target.click({ timeout: 5000 }).catch(async () => {
							await target.click({ force: true, timeout: 5000 }).catch(() => {});
						});
						sends++;
						continue;
					}
				}
				const pass = page.locator('[data-pass]:not([disabled])');
				if (await pass.count() && await pass.first().isVisible()) { await pass.first().click(); continue; }
				await page.waitForTimeout(250);
			}

			// the Charter: a session must end by saying what happened
			const report = page.locator('[data-report]');
			await report.first().waitFor({ state: 'visible', timeout: 30000 });
			await shot('charter');
			assert(await page.locator('[data-world-row]').count() > 0, `${label}: the Charter names no world`);
			assert(await page.locator('[data-notes]').count() > 0, `${label}: the Proving notes panel is missing`);
			assert(sends > 0, `${label}: the Proving finished without a single send`);
			assert(sends < 11 || sawReserve, `${label}: every send was spent but the reserve was never shown`);

			assert.deepEqual(errors, [], `${label}: page errors`);
			assert.deepEqual(consoleErrors, [], `${label}: console errors`);
			console.log(`ok   ${label} (${sends} sends)`);
		} catch (error) {
			failures++;
			console.error(`FAIL ${label}: ${error.message}`);
			await page.screenshot({ path: `${output}/${label}-FAILURE.png`, fullPage: true }).catch(() => {});
			if (errors.length) console.error(`     page errors: ${errors.join(' | ')}`);
			if (consoleErrors.length) console.error(`     console errors: ${consoleErrors.join(' | ')}`);
		} finally {
			await context.close();
		}
	}
}

await browser.close();
console.log(`screenshots in ${output}`);
if (failures > 0) process.exitCode = 1;
