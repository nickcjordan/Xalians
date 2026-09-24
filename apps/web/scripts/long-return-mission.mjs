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
  const events = [], errors = [], observedEffects = new Set(), viewportAudit = [];
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
    if (process.env.LR_VIEWPORT_AUDIT === '1') viewportAudit.push(await page.evaluate(stepNumber => {
      const record = document.querySelector('[data-field-record]');
      const wizard = document.querySelector('.lr-wizard-view');
      const active = record || wizard;
      const content = record?.querySelector('.lr-sequence-story') || wizard?.querySelector('.lr-simple-decision, .lr-phase-panel, .lr-transition-beat, .lr-field-encounter');
      const rect = node => node ? { top: Math.round(node.getBoundingClientRect().top), bottom: Math.round(node.getBoundingClientRect().bottom), height: Math.round(node.getBoundingClientRect().height), scroll: node.scrollHeight, client: node.clientHeight } : null;
      return { step: stepNumber, phase: record ? 'field-record' : [...(wizard?.classList || [])].find(name => name.startsWith('lr-wizard-phase-')), viewport: innerHeight, document: { scroll: document.documentElement.scrollHeight, client: document.documentElement.clientHeight }, active: rect(active), content: rect(content), record: rect(record), story: rect(record?.querySelector('.lr-sequence-story')) };
    }, step));
    const dialog = page.locator('[data-field-record]');
    if (await dialog.count()) {
      if (process.env.LR_MAP_FOCUS === '1' && process.env.LR_REDUCED !== '1') {
        const spotlight = dialog.locator('.lr-field-map-panel.is-focused');
        await spotlight.waitFor({ timeout: 1500 });
        const box = await spotlight.boundingBox();
        const style = await spotlight.evaluate(node => ({position: getComputedStyle(node).position, inset: getComputedStyle(node).inset, className: node.className}));
        assert(box.width < viewport.width && box.height < viewport.height, `Map motion remains inside the persistent stage: ${JSON.stringify({ box, viewport, style })}`);
        assert(await spotlight.locator('[data-map-attention]').count(), 'The changed map station is called out');
        await page.waitForTimeout(350);
        await page.screenshot({ path: `${output}/${step}-map-focus.png` });
        if (await dialog.locator('h2').textContent() === 'Cross the hanging gantry') {
          const marker = dialog.locator('[data-map-creature]').first();
          await dialog.locator('[data-expedition-map][data-crew-position="crossing"]').waitFor({ timeout: 15000 });
          const positionX = () => marker.evaluate(node => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41);
          const firstX = await positionX();
          await page.waitForTimeout(350);
          const movingX = await positionX();
          await page.screenshot({ path: `${output}/${step}-map-moving.png` });
          await page.waitForTimeout(750);
          const arrivedX = await positionX();
          assert(movingX > firstX + 4 && arrivedX > movingX + 4, `The crew marker travels to its new station: ${JSON.stringify({ firstX, movingX, arrivedX })}`);
        }
      }
      const started = Date.now();
      if (viewport.width <= 360) {
        await page.waitForTimeout(100);
        for (let passage = 0; passage < 12; passage++) {
          const nextPassage = dialog.getByRole('button', { name: /Next passage/ });
          if (!await nextPassage.isVisible().catch(() => false)) break;
          const layout = await dialog.evaluate(node => ({ beat: node.querySelector('.lr-story-beat').getBoundingClientRect().bottom, controls: node.querySelector('.lr-sequence-story footer').getBoundingClientRect().top }));
          assert(layout.beat <= layout.controls + 2, `Story passage fits its stage: ${JSON.stringify(layout)}`);
          await nextPassage.click();
        }
      }
      await dialog.getByRole('button', { name: /Continue to result|Review scout report|Check scout status|Respond to encounter|See encounter result|Choose response/ }).waitFor({ timeout: 120000 });
      events.push({ type: 'animation', elapsed: Date.now()-started, text: await dialog.innerText() });
      await page.screenshot({ path: `${output}/${step}-animation.png` });
      const storyLayout = await dialog.evaluate(node => {
        const story = node.querySelector('.lr-sequence-story');
        const beat = node.querySelector('.lr-story-beat');
        const footer = node.querySelector('.lr-sequence-story footer');
        const map = node.querySelector('.lr-field-map-stage');
        const figure = map.querySelector('[data-expedition-map]');
        return { viewport: innerHeight, dialog: node.getBoundingClientRect(), map: map.getBoundingClientRect(), figure: figure.getBoundingClientRect(), figureChildren:[...figure.children].map(child=>({name:child.tagName,className:child.className?.baseVal||child.className,height:child.getBoundingClientRect().height,display:getComputedStyle(child).display})), story: story.getBoundingClientRect(), beat: beat.getBoundingClientRect(), footer: footer.getBoundingClientRect() };
      });
      assert(viewport.width < 768 ? storyLayout.map.bottom <= storyLayout.story.top + 2 : storyLayout.story.right <= storyLayout.map.left + 2, 'Map and story occupy separate parts of one persistent stage');
      if (viewport.width < 768) assert(storyLayout.figure.top >= storyLayout.map.top && storyLayout.figure.bottom <= storyLayout.map.bottom + 2, `The phone map is not cropped by its stage: ${JSON.stringify(storyLayout)}`);
      assert(storyLayout.beat.bottom <= storyLayout.footer.top + 2, `Current beat fits above its action controls: ${JSON.stringify(storyLayout)}`);
      assert(storyLayout.footer.bottom <= storyLayout.viewport, 'Field record action stays on screen');
      const continueAction = dialog.getByRole('button', { name: /Continue to result|Review scout report|Check scout status|Respond to encounter|See encounter result|Choose response/ });
      if (viewport.width < 768 && !events.some(event => event.type === 'record-end')) {
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
    if (await map.count() && await map.isVisible()) {
      const mapScene = await map.getAttribute('data-map-scene');
      if (viewport.width < 720) assert.equal(await map.locator('[data-map-route-caption]').count(), await map.getAttribute('data-map-local') === 'true' || await map.getAttribute('data-route-schematic') === 'true' || await map.getAttribute('data-map-stage-compact') === 'true' ? 0 : 2, 'Compact maps omit route captions repeated by the active choice');
      const mapDrawing = await map.locator(':scope > svg').boundingBox();
      assert(mapDrawing.height >= (viewport.width <= 360 ? 30 : viewport.width < 600 || viewport.height < 800 ? 52 : 70), `The room drawing must retain its own height, not inherit an icon rule: ${mapDrawing.height}`);
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
    const click = async locator => { events.push({ type: 'choice', text: await locator.innerText() }); try { await locator.click({ timeout: 5000 }); } catch (error) { if (process.env.LR_VIEWPORT_AUDIT === '1') console.error('CLICK LAYOUT', await locator.evaluate(node => { const rect = node.getBoundingClientRect(); const ancestors = []; for (let parent = node.parentElement; parent && ancestors.length < 6; parent = parent.parentElement) { const box = parent.getBoundingClientRect(); ancestors.push({ className: parent.className, top: box.top, bottom: box.bottom, overflow: getComputedStyle(parent).overflow }); } return { rect: rect.toJSON(), ancestors, atCenter: document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.className }; })); throw error; } };
    if (await page.locator('.lr-end-card').count()) {
      const trail = page.locator('[data-ending-trail]');
      assert.equal(await trail.locator('[data-ending-sector]').count(), 7, 'The ending traces the whole site');
      assert.equal(await trail.locator('[data-ending-sector][data-visited="true"]').count(), crossed, 'The ending marks only crossings the crew actually completed');
      if (process.env.LR_VIEWPORT_AUDIT === '1') {
        await page.screenshot({ path: `${output}/ending-viewport.png` });
        const endingLayout = await page.evaluate(() => { const node=document.querySelector('.lr-end-card'), card=node.getBoundingClientRect(), shell=node.parentElement, parent=shell.getBoundingClientRect(); const ancestors=[]; for(let el=shell;el&&ancestors.length<5;el=el.parentElement){const style=getComputedStyle(el);ancestors.push({name:el.className,top:el.getBoundingClientRect().top,position:style.position,filter:style.filter,transform:style.transform});} return {top:card.top,bottom:card.bottom,viewport:innerHeight,bodyOverflow:getComputedStyle(document.body).overflowY,shell:{top:parent.top,bottom:parent.bottom,padding:getComputedStyle(shell).padding,align:getComputedStyle(shell).alignItems},ancestors}; });
        assert(endingLayout.top >= 62 && endingLayout.bottom <= endingLayout.viewport && endingLayout.bodyOverflow === 'hidden', `Default mission report fits without scrolling: ${JSON.stringify(endingLayout)}`);
        const endingAction = await page.locator('.lr-end-actions button').last().boundingBox();
        assert(endingAction.y >= 62 && endingAction.y + endingAction.height <= viewport.height, 'Mission report actions remain visible');
      }
      await page.locator('.lr-end-full > summary').click();
      if (crossed) assert(await trail.locator('[data-ending-memory]').isVisible(), 'The full report remembers the last resolved crossing');
      events.push({ type: 'ending', text: await page.locator('.lr-end-card').innerText() }); break;
    }
    if (await page.locator('.lr-transition-beat').count()) { await click(page.locator('.lr-transition-beat > button')); continue; }
    if (await page.locator('[data-scout-options]').count()) {
      if (process.env.LR_VIEWPORT_AUDIT === '1' && crossed === 0 && viewport.width <= 390) await writeFile(`${output}/scout-layout.json`, JSON.stringify(await page.evaluate(() => {
        const selectors = ['.lr-wizard-chrome','[data-expedition-map]','.lr-simple-decision','[data-scout-options]','[data-scout-choice]','.lr-scout-portrait','.lr-scout-small-info','.lr-scout-commit-bar','.lr-scout-commit-bar button'];
        return Object.fromEntries(selectors.map(selector => [selector,[...document.querySelectorAll(selector)].filter(node => node.getBoundingClientRect().width).map(node => ({rect:node.getBoundingClientRect().toJSON(),scroll:node.scrollHeight,client:node.clientHeight,display:getComputedStyle(node).display,grid:getComputedStyle(node).gridTemplateColumns,height:getComputedStyle(node).height,overflow:getComputedStyle(node).overflow}))]));
      }),null,2));
      if (viewport.width >= 768 && crossed === 0) assert.equal(await page.getByRole('button', { name: /scout choices/i }).count(), 0, 'The desktop map retains its original caption rather than a phone jump control');
      if (viewport.width <= 390) {
        const firstChoice = await page.locator('[data-scout-options] > button').first().boundingBox();
        events.push({ type: 'scout-viewport', scene: crossed + 1, top: firstChoice?.y, height: viewport.height });
        if (crossed === 0) {
          assert(firstChoice.y >= 0 && firstChoice.y < viewport.height, 'The opening scout choice shares the screen with the site map');
          await page.screenshot({ path: `${output}/scout-opening-viewport.png` });
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
      if (viewport.width <= 390) { const send = await page.getByRole('button', { name: /^Send / }).boundingBox(); assert(send.y >= 0 && send.y + send.height <= viewport.height, `Scout action fits on the phone stage: scene ${crossed + 1}, ${JSON.stringify(send)}`); }
      await click(page.getByRole('button', { name: /^Send / })); continue;
    }
    if (await page.locator('.lr-field-encounter:not(.is-resolved)').count()) {
      const situation = page.locator('.lr-encounter-situation');
      assert.equal(await situation.count(), 1, 'Simple encounters put contact and communication context beside the response');
      assert(!(await situation.innerText()).includes('through display'), 'Player-facing contact context does not expose registry channel names');
      if (viewport.height <= 700) {
        const lastResponse = await page.locator('.lr-encounter-options > button').last().boundingBox();
        const commit = await page.locator('.lr-encounter-commit-bar').boundingBox();
        assert(lastResponse.y + lastResponse.height <= commit.y + 2 && commit.y + commit.height <= viewport.height, 'All encounter responses and the commit action fit the stage');
      }
      if (viewport.width <= 390) {
        const firstResponse = await page.locator('.lr-encounter-options > button').first().boundingBox();
        const lastResponse = await page.locator('.lr-encounter-options > button').last().boundingBox();
        await page.screenshot({ path: `${output}/encounter-viewport-${crossed}-${responses[crossed] || 0}.png` });
        assert(firstResponse.y >= 0 && firstResponse.y < viewport.height, 'The encounter opens with its first actual response in the phone viewport');
        assert(lastResponse.y + lastResponse.height <= viewport.height - 48, `Every encounter response appears above the commit control: ${JSON.stringify(lastResponse)}`);
        assert(await page.locator('.lr-field-encounter').evaluate(node => document.activeElement === node), 'Keyboard focus follows the phone into the encounter response');
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
        const reward = await page.locator('.lr-route-board .is-salvage').boundingBox();
        await page.screenshot({ path: `${output}/route-viewport-${crossed}.png` });
        assert(reward.y + reward.height <= viewport.height, `Both route rewards remain visible: ${JSON.stringify({reward, certainty:await page.locator('.lr-board-certainty').first().evaluate(node => ({className:node.className,display:getComputedStyle(node).display})), header:await page.locator('.lr-board-head').boundingBox()})}`);
        assert(await page.locator('.lr-route-board').evaluate(node => document.activeElement === node), 'Keyboard focus follows the phone into route comparison');
        await page.screenshot({ path: `${output}/route-viewport-${crossed}.png` });
      }
      assert(!(await parentMap.locator('[data-expedition-reserves]').innerText()).includes("Can't scout"), 'Crossing choices do not show a scouting restriction');
      const sharedObstacle = ['archive-vestibule', 'nemesis-index', 'generator-spine'].includes(await map.getAttribute('data-map-scene'));
      assert.equal(await map.locator('[data-map-connection="intervention"]').count(), sharedObstacle ? 2 : 0, 'Shared obstacles use intervention outlines, not invented corridors');
      assert.equal(await map.locator('[data-map-connection="route"]').count(), sharedObstacle ? 0 : 2, 'Physical alternatives share the actual room diagram');
      const orientation = page.locator('.lr-route-orientation');
      assert(viewport.width < 600 ? await page.locator('.lr-board-context > strong').isVisible() : viewport.width < 768 ? await parentMap.isVisible() : await orientation.isVisible(), 'Scene context stays visible while choosing');
      const storyBox = await (viewport.width < 600 ? page.locator('.lr-board-context > strong') : viewport.width < 768 ? parentMap : orientation).boundingBox();
      const boardBox = await page.locator('.lr-route-board').boundingBox();
      if (viewport.width >= 600) assert(storyBox.y + storyBox.height <= boardBox.y, 'Story precedes comparison');
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
      if (viewport.width < 768 && !await page.locator('.lr-extraction-choice').count()) assert((await arrivalTrace.boundingBox()).y < viewport.height, 'The arrival station is visible with the result headline on a phone');
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
      assert.equal(await arrivalDetail.count(), 1, 'The settled result keeps one closing thought visible after the field record');
      assert.equal(await page.locator('.lr-crossing-account').count(), 1, 'The full crossing account remains available on request');
      assert(!(await arrivalDetail.last().innerText()).startsWith(arrivalHeading), 'Arrival paragraph does not repeat its headline');
      await page.locator('.lr-simple-result').evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await page.screenshot({ path: `${output}/result-${crossed + 1}.png` });
      if (process.env.LR_VIEWPORT_AUDIT === '1' && crossed === 0) await writeFile(`${output}/result-layout.json`, JSON.stringify(await page.evaluate(() => {
        const select = selector => [...document.querySelectorAll(selector)].map(node => ({ selector, text: node.textContent.slice(0, 70), top: Math.round(node.getBoundingClientRect().top), bottom: Math.round(node.getBoundingClientRect().bottom), height: Math.round(node.getBoundingClientRect().height), display: getComputedStyle(node).display, minHeight: getComputedStyle(node).minHeight }));
        return ['.lr-simple-result', '.lr-arrival-story', '.lr-result-changes', '.lr-result-changes > div', '.lr-result-changes article', '.lr-arrival-next', '.lr-result-actions'].flatMap(select);
      }), null, 2));
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
          assert(await page.locator(width < 768 ? '.lr-depth-mini-risk' : '.lr-haul-risk').isVisible(), 'The risk is visible in the current guidance layout');
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
      if (await workshop.count() && (await workshop.locator(':scope > summary').isVisible() || await page.getByRole('button', { name: 'Repair with salvage' }).count())) {
        if (process.env.LR_REPAIR_FROM_DEPTH === '1' && crossed === 5) {
          const repairLink = page.getByRole('button', { name: 'Repair with salvage' });
          assert.equal(await repairLink.count(), 1, 'Thin stability offers a direct, noncommittal way to inspect repairs');
          const reservesBefore = await map.locator('[data-expedition-reserves]').innerText();
          await click(repairLink);
          assert(await workshop.getAttribute('open') !== null, 'The depth action opens the repair workspace');
          assert.equal(await map.locator('[data-expedition-reserves]').innerText(), reservesBefore, 'Opening repair spends nothing');
          const repairHeading = await workshop.locator('h4').boundingBox();
          assert(repairHeading.y >= 0 && repairHeading.y < viewport.height, 'Repair choices replace the depth fork in the current viewport');
          await page.screenshot({ path: `${output}/depth-repair-open.png` });
        }
        if (await workshop.getAttribute('open') === null) {
          const summary = workshop.locator(':scope > summary');
          if (await summary.isVisible()) await click(summary);
          else await click(page.getByRole('button', { name: 'Repair with salvage' }));
        }
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
        const repairReceipt = page.locator('.lr-field-receipt');
        if (await repairReceipt.count()) {
          if (process.env.LR_VIEWPORT_AUDIT === '1') {
            await page.screenshot({ path: `${output}/after-workshop-${crossed}.png` });
            const action = await repairReceipt.locator('.lr-field-repair-next').boundingBox();
            assert(action.y >= 0 && action.y + action.height <= viewport.height, `Field repair advances in the current viewport: ${JSON.stringify(action)}`);
          }
          await click(repairReceipt.locator('.lr-field-repair-next'));
          if (await page.locator('.lr-extraction-choice').count()) await click(page.locator('.lr-depth-option.is-deeper'));
          continue;
        }
      }
      if (process.env.LR_VIEWPORT_AUDIT === '1') await page.screenshot({ path: `${output}/after-workshop-${crossed}.png` });
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
  if (process.env.LR_VIEWPORT_AUDIT === '1') await writeFile(`${output}/viewport.json`, JSON.stringify(viewportAudit,null,2));
  console.log(JSON.stringify({ crossed, clicks: events.filter(e=>e.type==='choice').length, animations: events.filter(e=>e.type==='animation').map(e=>e.elapsed), ending: events.find(e=>e.type==='ending')?.text || 'Requested scene milestone reached' }, null,2));
  await context.close();
} finally { await browser.close(); }
