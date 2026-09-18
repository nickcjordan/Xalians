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
      await dialog.getByRole('button', { name: /Continue to result|Review scout report|Check scout status|Respond to encounter|See encounter result|Choose response/ }).click();
      continue;
    }
    await page.screenshot({ path: `${output}/${step}-view.png`, fullPage: true });
    const map = page.locator('.lr-shell [data-expedition-map]');
    if (await map.count()) {
      const mapScene = await map.getAttribute('data-map-scene');
      if (viewport.width < 720) assert.equal(await map.locator('[data-map-route-caption]').count(), 2, 'Phone schematic names both approaches outside the scaled drawing');
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
      const energy = await map.locator('[data-reserve-creature]').evaluateAll(nodes => nodes.map(node => Number(node.querySelector('b').textContent)));
      if (energy.some(value => value < 2)) assert(await page.locator('[data-scout-unavailable]').isVisible(), 'Scouting explains absent low-energy candidates');
      if (energy.every(value => value < 2)) {
        assert.equal(await page.getByRole('button', {name:/Select a scout/}).count(), 0, 'No impossible scout-selection action');
        assert(await page.getByRole('button', {name:/Stay together/}).isEnabled());
        assert(await page.getByRole('button', {name:/Stay together/}).evaluate(node => node.classList.contains('g-btn--primary')));
      }
      if (process.env.LR_NO_SCOUT === '1' || !await page.locator('[data-scout-options] > button').count()) { await click(page.getByRole('button', { name: /Stay together/ })); continue; }
      await click(page.locator('[data-scout-options] > button').first());
      await click(page.getByRole('button', { name: /^Send / })); continue;
    }
    if (await page.locator('.lr-field-encounter:not(.is-resolved)').count()) {
      const prescribedResponse = process.env.LR_ENCOUNTER_PICK !== undefined && !responses[crossed];
      await click(prescribedResponse ? page.locator('.lr-encounter-options > button').nth(Number(process.env.LR_ENCOUNTER_PICK)) : page.locator('.lr-encounter-options > .is-recommended'));
      responses[crossed] = (responses[crossed] || 0) + 1;
      await click(page.locator('.lr-encounter-commit-bar button')); continue;
    }
    if (await page.locator('.lr-field-encounter.is-resolved').count()) { await click(page.locator('.lr-field-encounter .g-btn--primary')); continue; }
    if (await page.locator('.lr-simple-report').count()) { await click(page.locator('.lr-simple-report .g-btn--primary')); continue; }
    if (await page.locator('.lr-route-board').count()) {
      assert(!(await map.locator('[data-expedition-reserves]').innerText()).includes("Can't scout"), 'Crossing choices do not show a scouting restriction');
      const orientation = page.locator('.lr-route-orientation');
      assert(await orientation.isVisible(), 'Scene context stays visible while choosing');
      const storyBox = await orientation.boundingBox();
      const boardBox = await page.locator('.lr-route-board').boundingBox();
      assert(storyBox.y + storyBox.height <= boardBox.y, 'Story precedes comparison');
      assert.equal(await page.locator('.lr-route-setting').count(), 2, 'Both routes explain their physical approach');
      if (process.env.LR_REVIEW_MAPS === '1') {
        const locations = await map.locator('[data-map-creature]').evaluateAll(nodes => nodes.map(node => node.style.transform));
        const reserves = await map.locator('[data-expedition-reserves]').innerText();
        const shared = ['archive-vestibule','nemesis-index','generator-spine'].includes(await map.getAttribute('data-map-scene'));
        for (const choice of await page.locator('.lr-board-pick').all()) {
          const route = await choice.locator('..').getAttribute('data-route-preview');
          await choice.focus();
          await page.waitForFunction(id => document.querySelector('.lr-shell [data-expedition-map]')?.dataset.previewRoute === id, route);
          assert.deepEqual(await map.locator('[data-map-creature]').evaluateAll(nodes => nodes.map(node => node.style.transform)), locations, 'Changing the intervention does not move the crew');
          assert.equal(await map.locator('[data-expedition-reserves]').innerText(), reserves);
          assert.equal(await map.locator('[data-map-shared-passage]').count(), shared ? 1 : 0);
          assert.equal(await map.locator('[data-map-target]').count(), shared ? 1 : 0);
          if (shared) assert.equal(await map.locator('[data-map-target]').getAttribute('data-map-target'), route);
          await map.evaluate(node => window.scrollBy({top:node.getBoundingClientRect().top - 64,behavior:'instant'}));
          await map.screenshot({path:`${output}/approach-${route}.png`});
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Map review has no horizontal overflow');
        }
      }
      const recommended = page.locator('.lr-board-head .is-recommended .lr-board-pick');
      const confirmed = page.locator('.lr-board-pick').filter({ hasText: 'Costs confirmed' });
      const prescribed = process.env.LR_ROUTES?.split(',')[crossed];
      const leastRisk = page.locator('.lr-board-head [data-lowest-risk="true"] .lr-board-pick');
      await click(prescribed !== undefined ? page.locator('.lr-board-pick').nth(Number(prescribed)) : process.env.LR_ROUTE_POLICY === 'recommended-risk' ? await recommended.count() ? recommended.first() : leastRisk.first() : process.env.LR_CONSERVE === '1' && await leastRisk.count() ? leastRisk.first() : await recommended.count() ? recommended.first() : await confirmed.count() ? confirmed.first() : page.locator('.lr-board-pick').first());
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
        const action = await page.getByRole('button', { name: /Cross now/ }).boundingBox();
        assert(action.y >= 0 && action.y + action.height <= viewport.height, 'Later-scene phone commit must remain visible');
      }
      await click(page.getByRole('button', { name: /Cross now/ })); continue;
    }
    if (await page.locator('.lr-simple-result').count()) {
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
        await workshop.locator(':scope > summary').click();
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
  for (const expected of process.env.LR_EXPECT_MAP_EFFECTS?.split(',') || []) assert(observedEffects.has(expected), `Mission reached earned map effect: ${expected}`);
  await writeFile(`${output}/run.json`, JSON.stringify(events,null,2));
  console.log(JSON.stringify({ crossed, clicks: events.filter(e=>e.type==='choice').length, animations: events.filter(e=>e.type==='animation').map(e=>e.elapsed), ending: events.find(e=>e.type==='ending')?.text || 'Requested scene milestone reached' }, null,2));
  await context.close();
} finally { await browser.close(); }
