import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const output = process.env.LR_QA_OUTPUT || 'C:/Users/njord/AppData/Local/Temp/long-return-mission';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  const viewport = { width: Number(process.env.LR_WIDTH || 1280), height: Number(process.env.LR_HEIGHT || 900) };
  const context = await browser.newContext({ viewport, reducedMotion: process.env.LR_REDUCED === '1' ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  const events = [], errors = [], observedEffects = new Set();
  let crossed = 0;
  let expectedBanked;
  let previousMapScene = '', previousMapExit = '';
  const responses = {};
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && ['image', 'stylesheet', 'script', 'font'].includes(response.request().resourceType())) errors.push(`Asset ${response.status()}: ${response.url()}`);
  });
  await page.goto(`${process.env.LR_BASE_URL || 'http://127.0.0.1:4173'}/long-return`);
  if (process.env.LR_SWAP) {
    const [incoming, outgoing] = process.env.LR_SWAP.split(':');
    await page.locator(`[data-creature-id="${incoming}"]`).click();
    await page.locator(`[data-creature-id="${outgoing}"]`).click();
  }
  await page.getByRole('button', { name: /Seal Crew/ }).click();
  for (let step = 0; step < 100; step++) {
    const dialog = page.locator('[data-field-record]');
    if (await dialog.count()) {
      const started = Date.now();
      await dialog.getByRole('button', { name: /Continue to result|Review scout report|Check scout status|Respond to encounter|See encounter result|Choose response/ }).waitFor({ timeout: 120000 });
      events.push({ type: 'animation', elapsed: Date.now()-started, text: await dialog.innerText() });
      await page.screenshot({ path: `${output}/${step}-animation.png` });
      if (viewport.width < 768) {
        const readingLayout = await dialog.evaluate(node => {
          const story = node.querySelector('.lr-sequence-story-scroll');
          const lastBeat = story.querySelector('li:last-child');
          const footer = node.querySelector('.lr-sequence-story footer');
          return { innerOverflow: getComputedStyle(story).overflowY, lastBeatBottom: lastBeat.getBoundingClientRect().bottom, footerTop: footer.getBoundingClientRect().top };
        });
        assert.equal(readingLayout.innerOverflow, 'visible', 'Phone field record uses one natural page scroll');
        assert(readingLayout.footerTop >= readingLayout.lastBeatBottom, 'Continue action follows the entire account rather than covering it');
      }
      if (viewport.width === 390 && !events.some(event => event.type === 'read-start')) {
        const readStart = dialog.getByRole('button', { name: /Read from start/ });
        if (viewport.height <= 700 && step === 1) {
          assert.equal(await dialog.evaluate(node => node.scrollTop), 0, 'Completed short-phone scout account begins with its opening beat');
          assert.equal(await readStart.count(), 0, 'No rewind control is needed when the account starts at the beginning');
          const continueReading = dialog.getByRole('button', { name: /Continue reading the action/ });
          assert.equal(await continueReading.count(), 1, 'Short-phone account signals that more story follows');
          await continueReading.click();
          assert(await dialog.evaluate(node => node.scrollTop > 0), 'Reading cue moves to the next part of the account');
        }
        if (await readStart.count()) {
          await readStart.click();
          const scroller = dialog.locator('.lr-sequence-story-scroll');
          assert.equal(await scroller.evaluate(node => node.scrollTop), 0, 'Finished account can be read from its opening beat');
          assert.equal(await scroller.evaluate(node => document.activeElement === node), true, 'Reading starts with keyboard focus in the account');
          events.push({ type: 'read-start' });
          await page.screenshot({ path: `${output}/read-from-start.png` });
        }
      }
      const continueAction = dialog.getByRole('button', { name: /Continue to result|Review scout report|Check scout status|Respond to encounter|See encounter result|Choose response/ });
      if (viewport.width < 768 && !events.some(event => event.type === 'record-end')) {
        await continueAction.evaluate(element => element.scrollIntoView({ block: 'end', behavior: 'instant' }));
        await page.screenshot({ path: `${output}/record-end.png` });
        events.push({ type: 'record-end' });
      }
      await continueAction.click();
      continue;
    }
    await page.screenshot({ path: `${output}/${step}-view.png`, fullPage: true });
    const parentMap = page.locator('.lr-shell [data-expedition-map]');
    const insetMap = page.locator('.lr-route-board [data-route-schematic]');
    const map = await insetMap.isVisible() ? insetMap : parentMap;
    if (await map.count()) {
      const mapScene = await map.getAttribute('data-map-scene');
      if (viewport.width < 720) assert.equal(await map.locator('[data-map-route-caption]').count(), await map.getAttribute('data-map-local') === 'true' || await map.getAttribute('data-route-schematic') === 'true' ? 0 : 2, 'Phone inset and encounter maps omit route captions repeated by the active choice');
      const mapDrawing = await map.locator(':scope > svg').boundingBox();
      assert(mapDrawing.height >= 70, `The room drawing must retain its own height, not inherit an icon rule: ${mapDrawing.height}`);
      const entrance = await map.locator('[data-map-threshold="entry"]').textContent();
      if (previousMapScene && previousMapScene !== mapScene) assert.equal(entrance, previousMapExit, 'Map arrival carries into the next room');
      previousMapScene = mapScene;
      previousMapExit = await map.locator('[data-map-threshold="exit"]').textContent();
      assert.equal(await map.locator('[data-map-landmark]').count(), 1, 'Every room has stationary terrain');
      const clipped = await map.locator('[data-map-threshold]').evaluateAll(nodes => nodes.some(node => { const box = node.getBBox(); return box.x < 0 || box.x + box.width > 600 || box.y + box.height > 200; }));
      assert(!clipped, 'Named thresholds fit the schematic');
      for (const effect of await map.locator('[data-map-effect]').all()) {
        const id = await effect.getAttribute('data-map-effect');
        const path = effect.locator('..');
        const expected = {
          'quiet-entry': ['catwalk', 'Quiet upper walkway', 'Machinery dormant'],
          'coolant-bypass': ['underdeck', 'Drained lower passage', 'Underdeck drained'],
          'maintenance-codes': ['decode', 'Controls with a code', 'Protocol recovered'],
          'security-pulse': ['breach', 'Tightened door seam', 'Security awake'],
        }[id];
        assert(expected, `Recognized earned map effect: ${id}`);
        assert.equal(await path.getAttribute('data-map-route'), expected[0]);
        assert.equal(await path.locator(':scope > text').textContent(), expected[1]);
        const mark = await effect.locator('[data-map-effect-symbol]').evaluate(node => { const box = node.getBoundingClientRect(); const root = node.ownerSVGElement?.getBoundingClientRect(); const ctm = node.getScreenCTM(); return {width:box.width,height:box.height,r:node.getAttribute('r'),computedR:getComputedStyle(node).r,rootWidth:root?.width,rootHeight:root?.height,scale:ctm?.a,svgBox:node.getBBox().width}; });
        assert(mark.width >= 12 && mark.height >= 12, `Earned effect remains a visible map mark: ${id} ${JSON.stringify(mark)}`);
        assert.equal(await map.getByLabel('Lasting site changes').filter({hasText:expected[2]}).count(), 0, 'Applied route effects are not repeated in the status footer');
        if (!observedEffects.has(id)) await map.screenshot({ path: `${output}/map-${id}.png` });
        observedEffects.add(id);
      }
      const ally = map.locator('[data-map-ally]');
      if (await ally.count() && mapScene !== 'turbine-hall' && (await ally.locator('title').textContent()).startsWith('Xylum:')) {
        assert.equal(await ally.getAttribute('data-location'), await map.getAttribute('data-crew-position'), 'Established ally stays with crew, not a solo scout');
      }
    }
    const click = async locator => { events.push({ type: 'choice', text: await locator.innerText() }); await locator.click(); };
    if (await page.locator('.lr-end-card').count()) {
      const trail = page.locator('[data-ending-trail]');
      assert.equal(await trail.locator('[data-ending-sector]').count(), 7, 'The ending traces the whole site');
      assert.equal(await trail.locator('[data-ending-sector][data-visited="true"]').count(), crossed, 'The ending marks only crossings the crew actually completed');
      if (crossed) assert(await trail.locator('[data-ending-memory]').isVisible(), 'The ending remembers the last resolved crossing');
      events.push({ type: 'ending', text: await page.locator('.lr-end-card').innerText() }); break;
    }
    if (await page.locator('.lr-transition-beat').count()) { await click(page.locator('.lr-transition-beat > button')); continue; }
    if (await page.locator('[data-scout-options]').count()) {
      if (viewport.width >= 768 && crossed === 0) assert.equal(await page.getByRole('button', { name: /scout choices/i }).count(), 0, 'The desktop map retains its original caption rather than a phone jump control');
      if (viewport.width <= 390) {
        const firstChoice = await page.locator('[data-scout-options] > button').first().boundingBox();
        events.push({ type: 'scout-viewport', scene: crossed + 1, top: firstChoice?.y, height: viewport.height });
        if (crossed === 0) {
          const jump = page.getByRole('button', { name: /scout choices/i });
          const cue = await jump.boundingBox();
          assert(cue.y >= 0 && cue.y < viewport.height, 'The opening site map visibly offers a way to reach the first scout choice');
          assert(cue.height >= 44, 'The opening map cue has a touch-sized target');
          await page.screenshot({ path: `${output}/scout-opening-viewport.png` });
          await jump.click();
          const arrived = await page.locator('[data-scout-options] > button').first().boundingBox();
          assert(arrived.y >= 0 && arrived.y < viewport.height, 'The map cue lands on the first choice without performing the scouting action');
          assert(await page.locator('.lr-simple-decision').evaluate(node => document.activeElement === node), 'The map cue moves keyboard focus to the scout choice');
        }
        if (crossed > 0 && firstChoice) {
          const heading = await page.locator('.lr-simple-decision h3').first().boundingBox();
          assert(heading.y >= 56 && heading.y < viewport.height, 'The later-room scout heading clears the phone navigation bar');
          assert(firstChoice.y >= 0 && firstChoice.y < viewport.height, 'After arrival, the next phone scout choice is visible without revisiting the map');
          assert(await page.locator('.lr-simple-decision').evaluate(node => document.activeElement === node), 'Keyboard focus moves from arrival to the new phone decision');
        }
        await page.screenshot({ path: `${output}/scout-viewport-${crossed}.png` });
      }
      const energy = await map.locator('[data-reserve-creature]').evaluateAll(nodes => nodes.map(node => Number(node.querySelector('b').textContent)));
      if (energy.some(value => value < 2)) assert(await page.locator('[data-scout-unavailable]').isVisible(), 'Scouting explains absent low-energy candidates');
      if (energy.every(value => value < 2)) {
        assert.equal(await page.getByRole('button', {name:/Select a scout/}).count(), 0, 'No impossible scout-selection action');
        assert(await page.getByRole('button', {name:/Stay together/}).isEnabled());
        assert(await page.getByRole('button', {name:/Stay together/}).evaluate(node => node.classList.contains('g-btn--primary')));
      }
      if (process.env.LR_NO_SCOUT === '1' || !await page.locator('[data-scout-options] > button').count()) { await click(page.getByRole('button', { name: /Stay together/ })); continue; }
      const scoutPick = Number(process.env.LR_SCOUT_PICKS?.split(',')[crossed] ?? process.env.LR_SCOUT_PICK ?? 0);
      assert(scoutPick >= 0 && scoutPick < await page.locator('[data-scout-options] > button').count(), `Scout choice ${scoutPick} is available`);
      await click(page.locator('[data-scout-options] > button').nth(scoutPick));
      await click(page.getByRole('button', { name: /^Send / })); continue;
    }
    if (await page.locator('.lr-field-encounter:not(.is-resolved)').count()) {
      const situation = page.locator('.lr-encounter-situation');
      assert.equal(await situation.count(), 1, 'Simple encounters put contact and communication context beside the response');
      assert(!(await situation.innerText()).includes('through display'), 'Player-facing contact context does not expose registry channel names');
      if (viewport.width <= 390) {
        const firstResponse = await page.locator('.lr-encounter-options > button').first().boundingBox();
        assert(firstResponse.y >= 0 && firstResponse.y < viewport.height, 'The encounter opens with its first actual response in the phone viewport');
        assert(await page.locator('.lr-field-encounter').evaluate(node => document.activeElement === node), 'Keyboard focus follows the phone into the encounter response');
        await page.screenshot({ path: `${output}/encounter-viewport-${crossed}-${responses[crossed] || 0}.png` });
      }
      const prescribedResponse = process.env.LR_ENCOUNTER_PICK !== undefined && !responses[crossed];
      await click(prescribedResponse ? page.locator('.lr-encounter-options > button').nth(Number(process.env.LR_ENCOUNTER_PICK)) : page.locator('.lr-encounter-options > .is-recommended'));
      responses[crossed] = (responses[crossed] || 0) + 1;
      await click(page.locator('.lr-encounter-commit-bar button')); continue;
    }
    if (await page.locator('.lr-field-encounter.is-resolved').count()) {
      if (viewport.width <= 390) {
        const outcome = page.locator('.lr-field-encounter.is-resolved');
        const heading = await outcome.locator('.lr-encounter-result-head').boundingBox();
        assert(heading.y >= 0 && heading.y < viewport.height, 'The resolved encounter story opens in the phone viewport');
        assert(await outcome.evaluate(node => document.activeElement === node), 'Keyboard focus follows the phone to the resolved encounter story');
        await page.screenshot({ path: `${output}/encounter-outcome-viewport-${crossed}.png` });
      }
      if (await map.locator('[data-map-ally]').count() && await map.getAttribute('data-map-scene') === 'turbine-hall') {
        assert(!(await map.locator('figcaption').innerText()).includes('Contact ahead'), 'A newly joined ally is no longer presented as an active hostile contact');
        const scoutEncounter = await map.locator('[data-map-creature][data-location="survey"]').count() > 0;
        assert.equal(await map.locator('[data-map-ally]').getAttribute('data-location'), scoutEncounter ? 'survey' : 'crossing', 'The new ally stays where the encounter took place');
      }
      await click(page.locator('.lr-field-encounter .g-btn--primary')); continue;
    }
    if (await page.locator('.lr-simple-report').count()) {
      if (viewport.width <= 390) {
        const report = page.locator('.lr-simple-report');
        const heading = await report.locator('.lr-simple-report-result').boundingBox();
        assert(heading.y >= 0 && heading.y < viewport.height, 'The scout report opens in the phone viewport');
        assert(await report.evaluate(node => document.activeElement === node), 'Keyboard focus follows the phone to the scout report');
        await page.screenshot({ path: `${output}/scout-report-viewport-${crossed}.png` });
      }
      await click(page.locator('.lr-simple-report .g-btn--primary')); continue;
    }
    if (await page.locator('.lr-route-board').count()) {
      if (viewport.width <= 390) {
        const firstRoute = await page.locator('.lr-board-pick').first().boundingBox();
        const context = page.locator('.lr-board-context');
        const contextBox = await context.boundingBox();
        events.push({ type: 'route-viewport', scene: crossed + 1, top: firstRoute?.y, height: viewport.height });
        assert(contextBox.y >= 48 && contextBox.y < firstRoute.y, `The phone route comparison keeps the room and objective above its choices: ${JSON.stringify({ context: contextBox.y, choice: firstRoute.y })}`);
        assert(firstRoute.y >= 56 && firstRoute.y < viewport.height, 'The phone opens route comparison with both route choices visible');
        assert(await insetMap.isVisible(), 'The active choice keeps the room schematic beside its costs');
        assert(!(await parentMap.isVisible()), 'The previous context map is not repeated above the phone comparison');
        assert.deepEqual(await insetMap.locator('[data-map-choice-tag]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-map-choice-tag'))), ['A', 'B']);
        assert.deepEqual(await page.locator('.lr-board-route-tag').evaluateAll(nodes => nodes.map(node => node.textContent)), ['A', 'B']);
        const firstCost = await page.locator('.lr-route-board .is-energy').boundingBox();
        assert(firstCost.y < viewport.height, 'The first cost comparison remains in the initial phone viewport with the schematic');
        assert(await page.locator('.lr-route-board').evaluate(node => document.activeElement === node), 'Keyboard focus follows the phone into route comparison');
        await page.screenshot({ path: `${output}/route-viewport-${crossed}.png` });
      }
      assert(!(await parentMap.locator('[data-expedition-reserves]').innerText()).includes("Can't scout"), 'Crossing choices do not show a scouting restriction');
      const sharedObstacle = ['archive-vestibule', 'nemesis-index', 'generator-spine'].includes(await map.getAttribute('data-map-scene'));
      assert.equal(await map.locator('[data-map-connection="intervention"]').count(), sharedObstacle ? 2 : 0, 'Shared obstacles use intervention outlines, not invented corridors');
      assert.equal(await map.locator('[data-map-connection="route"]').count(), sharedObstacle ? 0 : 2, 'Physical alternatives share the actual room diagram');
      const orientation = page.locator('.lr-route-orientation');
      assert(await orientation.isVisible(), 'Scene context stays visible while choosing');
      const storyBox = await orientation.boundingBox();
      const boardBox = await page.locator('.lr-route-board').boundingBox();
      assert(storyBox.y + storyBox.height <= boardBox.y, 'Story precedes comparison');
      assert.equal(await page.locator('.lr-route-setting').count(), 2, 'Both routes explain their physical approach');
      assert.equal(await page.locator('.lr-board-plan-lead').count(), 2, 'Every forecast identifies its assumed lead before route selection');
      assert.equal(await page.locator('.lr-board-plan-lead b').count(), 2, 'Projected leads use the same crew numbers as the map');
      if (process.env.LR_REVIEW_MAPS === '1') {
        const locations = await map.locator('[data-map-creature]').evaluateAll(nodes => nodes.map(node => node.style.transform));
        const reserves = await parentMap.locator('[data-expedition-reserves]').innerText();
        const shared = ['archive-vestibule','nemesis-index','generator-spine'].includes(await map.getAttribute('data-map-scene'));
        for (const choice of await page.locator('.lr-board-pick').all()) {
          const route = await choice.locator('..').getAttribute('data-route-preview');
          await choice.focus();
          await page.waitForFunction(id => document.querySelector('.lr-route-board [data-route-schematic]')?.dataset.previewRoute === id, route);
          assert.deepEqual(await map.locator('[data-map-creature]').evaluateAll(nodes => nodes.map(node => node.style.transform)), locations, 'Changing the intervention does not move the crew');
          assert.equal(await parentMap.locator('[data-expedition-reserves]').innerText(), reserves);
          assert.equal(await map.locator('[data-map-shared-passage]').count(), shared ? 1 : 0);
          assert.equal(await map.locator('[data-map-target]').count(), shared ? 1 : 0);
          if (shared) assert.equal(await map.locator('[data-map-target]').getAttribute('data-map-target'), route);
          await map.evaluate(node => window.scrollBy({top:node.getBoundingClientRect().top - 64,behavior:'instant'}));
          await map.screenshot({path:`${output}/approach-${route}.png`});
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Map review has no horizontal overflow');
        }
      }
      const recommended = page.locator('.lr-board-head .is-recommended .lr-board-pick');
      const confirmed = page.locator('.lr-board-pick').filter({ has: page.locator('[title="Costs are confirmed"]') });
      const prescribed = process.env.LR_ROUTES?.split(',')[crossed];
      const leastRisk = page.locator('.lr-board-head [data-lowest-risk="true"] .lr-board-pick');
      const routeChoice = prescribed !== undefined ? page.locator('.lr-board-pick').nth(Number(prescribed)) : process.env.LR_ROUTE_POLICY === 'recommended-risk' ? await recommended.count() ? recommended.first() : leastRisk.first() : process.env.LR_CONSERVE === '1' && await leastRisk.count() ? leastRisk.first() : await recommended.count() ? recommended.first() : await confirmed.count() ? confirmed.first() : page.locator('.lr-board-pick').first();
      const previewLead = (await routeChoice.locator('.lr-board-plan-lead').innerText()).replace(/^\d+\s*/, '').replace(/\s+leads$/, '');
      await click(routeChoice);
      assert((await page.locator('.lr-lead-options-list > button[aria-pressed="true"]').innerText()).includes(previewLead), 'The chosen route opens with the lead whose projected costs the player saw');
      if (process.env.LR_ALTERNATE === '1') {
        const alternate = page.locator('.lr-lead-options button[aria-pressed="false"]').first();
        if (await alternate.count()) await click(alternate);
        await page.screenshot({ path: `${output}/${step}-alternate-lead.png`, fullPage: true });
      }
    }
    if (await page.locator('.lr-simple-plan').count()) {
      if (process.env.LR_COMMANDS === '1') { const command=page.locator('.lr-simple-override input'); if(await command.count()) await command.check(); }
      await page.screenshot({ path: `${output}/${step}-plan.png` });
      events.push({ type: 'plan', text: await page.locator('.lr-simple-plan').innerText() });
      if (viewport.width <= 650) {
        const leadChoices = page.locator('.lr-lead-options-list > button');
        const lastLead = await leadChoices.last().boundingBox();
        const actionBeforeScroll = await page.getByRole('button', { name: /Cross now/ }).boundingBox();
        assert(lastLead.y + lastLead.height + 8 <= actionBeforeScroll.y, `Scene ${crossed + 1}: commitment must follow every lead choice`);
        await page.getByRole('button', { name: /Cross now/ }).evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
        const action = await page.getByRole('button', { name: /Cross now/ }).boundingBox();
        assert(action.y >= 0 && action.y + action.height <= viewport.height, 'Phone commit must be reachable after the alternatives');
      }
      await click(page.getByRole('button', { name: /Cross now/ })); continue;
    }
    if (await page.locator('.lr-simple-result').count()) {
      const arrivalHeading = await page.locator('.lr-simple-result-head h3').innerText();
      const arrivalTrace = page.locator('[data-arrival-trace]');
      assert.equal(await arrivalTrace.count(), 1, 'The settled result includes one physical arrival trace');
      const origin = (await map.locator('[data-map-threshold="entry"] tspan').allTextContents()).join(' ');
      const destination = (await map.locator('[data-map-threshold="exit"] tspan').allTextContents()).join(' ');
      const traceAccount = await arrivalTrace.getAttribute('aria-label');
      assert(traceAccount.includes(`from ${origin} to ${destination}`), 'The arrival trace uses the same thresholds as the room map');
      assert.equal(await arrivalTrace.locator('.lr-arrival-trace-party b:not(.is-ally)').count(), 3, 'All three crew members reach the destination together');
      if (viewport.width < 768) assert((await arrivalTrace.boundingBox()).y < viewport.height, 'The arrival station is visible with the result headline on a phone');
      const stabilityLeft = Number(await map.locator('[data-reserve-stability] b').innerText());
      if (stabilityLeft === 0) {
        assert.match(await page.locator('.lr-simple-result-head').innerText(), /evacuate now/i, 'Zero stability changes the arrival status before the player scrolls to the ending');
        const criticalReceipt = page.locator('.lr-result-changes article.is-critical');
        assert.equal(await criticalReceipt.count(), 1, 'The depleted stability meter is visually distinct inside the existing receipt');
        assert.match(await criticalReceipt.innerText(), /forced extraction/i, 'The critical meter names the immediate consequence');
      } else if (stabilityLeft <= 2 && await page.locator('.lr-result-changes article').filter({ hasText: 'Annex stability' }).count()) {
        assert.equal(await page.locator('.lr-result-changes article.is-low').count(), 1, 'Near-collapse stability is distinguished before depletion');
      }
      const arrivalDetail = page.locator('.lr-crossing-prose > p');
      assert(!/^(The crew is through|The crew crossed, but paid for it|A hard-won crossing)$/.test(arrivalHeading), 'Result names the selected passage instead of a generic verdict');
      assert.equal(await arrivalDetail.count(), 3, 'The settled result keeps action, consequence, and arrival visible');
      assert(!(await arrivalDetail.last().innerText()).startsWith(arrivalHeading), 'Arrival paragraph does not repeat its headline');
      await page.locator('.lr-simple-result').evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await page.screenshot({ path: `${output}/result-${crossed + 1}.png` });
      crossed++;
      if (Number(process.env.LR_LIMIT_SCENES) === crossed) { events.push({type:'milestone',text:await page.locator('.lr-simple-result').innerText()}); break; }
      const extract = page.locator('.lr-depth-option.is-extract');
      if (await extract.count()) {
        assert((await page.locator('[data-depth-distance]').innerText()).includes(`Across ${7 - crossed} optional`), 'Potential haul names all remaining crossings');
        assert((await page.locator('[data-depth-potential]').locator('..').innerText()).startsWith('Up to'), 'Remaining haul is a ceiling, not a promised payout');
        const reserves = await map.locator('[data-expedition-reserves]').innerText();
        await page.locator('[data-depth-explore] h5').click();
        assert(await extract.isVisible(), 'Reading the offer does not enter the next room');
        assert.equal(await map.locator('[data-expedition-reserves]').innerText(), reserves);
      }
      if (process.env.LR_REVIEW_DEPTH === '1' && await extract.count()) {
        for (const width of [1280, 768, 390, 320]) {
          await page.setViewportSize({ width, height: width < 500 ? 667 : 900 });
          await page.locator('.lr-extraction-choice').scrollIntoViewIfNeeded();
          await page.screenshot({ path: `${output}/depth-${crossed}-${width}.png`, fullPage: true });
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Extraction choice overflow');
          assert(await page.locator('.lr-haul-risk').isVisible());
          await page.locator('.lr-extraction-choice').screenshot({ path: `${output}/choice-${crossed}-${width}.png` });
          const disclosure = page.locator('.lr-extraction-choice summary');
          await disclosure.focus();
          await page.keyboard.press('Enter');
          assert(await page.locator('.lr-extraction-choice details').getAttribute('open') !== null, 'Keyboard opens the rule without committing');
          await page.keyboard.press('Enter');
        }
        await page.setViewportSize(viewport);
      }
      if ((process.env.LR_EXTRACT === '1' || Number(process.env.LR_EXTRACT_AT) === crossed) && await extract.count()) {
        expectedBanked = Number(await page.locator('[data-banked-offer]').innerText());
        await click(extract.first()); continue;
      }
      const workshop = page.locator('.lr-workshop');
      if (await workshop.count()) {
        if (process.env.LR_REPAIR_FROM_DEPTH === '1' && crossed === 5) {
          const repairLink = page.getByRole('button', { name: 'Repair before choosing' });
          assert.equal(await repairLink.count(), 1, 'Thin stability offers a direct, noncommittal way to inspect repairs');
          const reservesBefore = await map.locator('[data-expedition-reserves]').innerText();
          await click(repairLink);
          assert(await workshop.getAttribute('open') !== null, 'The depth action opens the repair workspace');
          assert.equal(await map.locator('[data-expedition-reserves]').innerText(), reservesBefore, 'Opening repair spends nothing');
          const repairHeading = await workshop.locator('h4').boundingBox();
          assert(repairHeading.y >= 0 && repairHeading.y < viewport.height, 'Repair choices replace the depth fork in the current viewport');
          await page.screenshot({ path: `${output}/depth-repair-open.png` });
        }
        if (await workshop.getAttribute('open') === null) await workshop.locator(':scope > summary').click();
        const brace = workshop.locator('.lr-workshop-options button:not([disabled])').filter({ hasText: 'Brace the annex' }).first();
        const choices = workshop.locator('.lr-workshop-options button:not([disabled])');
        if (await choices.count()) {
          let repair = await brace.count() && await brace.isEnabled() ? brace : choices.first();
          if (process.env.LR_CONSERVE === '1' && Number(await page.locator('[data-expedition-reserves] [data-reserve-stability] b').innerText()) > 3) {
            const crew = await page.locator('[data-expedition-reserves] [data-reserve-creature]').evaluateAll(elements => elements.map(el=>({name:el.querySelector('small').textContent,energy:Number(el.querySelector('b').textContent)})).sort((a,b)=>a.energy-b.energy));
            for (const member of crew) { const recover=choices.filter({hasText:`Resupply ${member.name}`}); if(await recover.count()) { repair=recover.first(); break; } }
          }
          await click(repair);
          await click(workshop.getByRole('button', { name: /^Spend / }));
        } else await click(workshop.getByRole('button', { name: /Keep all .* salvage and return/ }));
      }
      await click(page.locator('.lr-depth-option.is-deeper, .lr-result-actions .g-btn--primary')); continue;
    }
    throw Error('Unrecognized mission state');
  }
  assert(events.some(e=>e.type===(process.env.LR_LIMIT_SCENES?'milestone':'ending')), 'Required endpoint not reached');
  assert.deepEqual(errors, []);
  if (!process.env.LR_LIMIT_SCENES) {
    const endingParagraphs = page.locator('.lr-end-story > p');
    const hasFarewell = (events.find(event => event.type === 'ending')?.text || '').includes('pauses beside the crew one last time');
    assert.equal(await endingParagraphs.count(), hasFarewell ? 2 : 1, 'Mission outcome and companion farewell occupy separate story paragraphs');
  }
  if (expectedBanked !== undefined) assert(events.find(event => event.type === 'ending')?.text.includes(`SALVAGE BANKED\n${expectedBanked}`), 'Voluntary extraction banks exactly the offered haul');
  const endingText = events.find(event => event.type === 'ending')?.text || '';
  if (process.env.LR_EXPECT_ENDING === 'deep') assert.match(endingText, /DEEP RETRIEVAL COMPLETE/, 'A naturally played route completes the deep retrieval');
  if (process.env.LR_EXPECT_ENDING === 'forced') assert.match(endingText, /FORCED EXTRACTION/, 'A naturally played route reaches emergency extraction');
  if (process.env.LR_EXPECT_SALVAGE) assert(endingText.includes(`SALVAGE BANKED\n${process.env.LR_EXPECT_SALVAGE}`), 'The resulting banked haul matches the selected path');
  for (const expected of process.env.LR_EXPECT_MAP_EFFECTS?.split(',') || []) assert(observedEffects.has(expected), `Mission reached earned map effect: ${expected}`);
  await writeFile(`${output}/run.json`, JSON.stringify(events,null,2));
  console.log(JSON.stringify({ crossed, clicks: events.filter(e=>e.type==='choice').length, animations: events.filter(e=>e.type==='animation').map(e=>e.elapsed), ending: events.find(e=>e.type==='ending')?.text || 'Requested scene milestone reached' }, null,2));
  await context.close();
} finally { await browser.close(); }
