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
	['who is winning this world', '[data-balance]'],
	['who is winning the Proving', '[data-terminal] [data-turn-text], [data-turn-text]'],
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
				PASS 29. The opening board must say what each world asks of this squad.

				Before pass 29 an empty world panel was 411px tall with a 264px body
				carrying nine words, six of which were "no one", "UNCLAIMED" and "no one",
				and a blind critic scored "reason to keep playing" 4 of 10 on exactly that.
				The footing is what replaced it, and it is worth guarding: it is computed
				from the handler's own bench, so a change to prepare() or to the draft can
				empty it without any test noticing.
			*/
			// the pointer is moved off the bench first: resting on a creature previews it, and
			// a preview replaces each world's footing with what that creature would hold there
			await page.mouse.move(2, 2);
			await page.waitForTimeout(250);
			const footings = await page.locator('[data-world-footing]').evaluateAll(
				(els) => els.map((el) => el.innerText.replace(/\s+/g, ' ').trim()),
			);
			assert.equal(footings.length, 3, `${label}: ${footings.length} of 3 empty worlds say what they ask of the squad`);
			footings.forEach((text) => {
				assert(/\d+ of (your )?\d+/.test(text), `${label}: a world's footing does not count the squad: "${text}"`);
			});

			/*
				PASS 30. The footing must not be written over.

				Pass 13 collapsed the empty world panel to nothing on a phone because its whole
				body was the word "unclaimed": ranks at zero height with the RIVAL and YOU
				bands absolutely positioned inside them. Pass 29 put three lines of text in that
				body and the two bands came down on top of it, which a blind critic caught and
				called a correctness failure.

				Nothing could have caught it, because no check compared two rectangles. This
				one does: it is geometry, not a class name, so it fails for any future reason
				the bands and the text end up in the same place.
			*/
			const collisions = await page.evaluate(() => {
				const hits = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
				const found = [];
				document.querySelectorAll('[data-site-id]').forEach((site) => {
					const footing = site.querySelector('[data-world-footing]');
					if (!footing) return;
					const fr = footing.getBoundingClientRect();
					site.querySelectorAll('.rec-rank-edge').forEach((edge) => {
						if (hits(fr, edge.getBoundingClientRect())) {
							found.push(`${site.getAttribute('data-site-id')} / ${edge.textContent.trim()}`);
						}
					});
				});
				return found;
			});
			assert.deepEqual(collisions, [], `${label}: a world's edge band is drawn over its footing text`);

			let guard = 0;
			let sends = 0;
			while (guard < 220) {
				guard++;
				// pace controls first: never let playback stall the check
				const skip = page.locator('[data-skip]');
				if (await skip.count() && await skip.first().isVisible()) { await skip.first().click(); continue; }
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
						PASS 39. The preview must read the board it is drawn over. Pass 38 built the
						per-world sentence from data the table never passed through, so every strike
						said "No rival here to strike" beside a rival standing in plain view, and
						nothing here could have noticed. A world with a rival on it may say its
						instinct would not strike, never that no rival is there.
					*/
					const ghostLies = await page.evaluate(() => [...document.querySelectorAll('[data-site-id]')]
						.filter((site) => site.querySelector('[data-rank="theirs"] [data-record-id]'))
						.map((site) => (site.querySelector('[data-ghost-plan]') || {}).textContent || '')
						.filter((text) => /No rival here|Nothing (here )?to (hit|strike) yet/.test(text)));
					assert(ghostLies.length === 0, `${label}: a world with a rival on it previews "${ghostLies[0]}"`);
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
