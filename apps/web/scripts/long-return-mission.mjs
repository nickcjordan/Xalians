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
  const events = [], errors = [];
  let crossed = 0;
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
      const entrance = await map.locator('[data-map-threshold="entry"]').textContent();
      if (previousMapScene && previousMapScene !== mapScene) assert.equal(entrance, previousMapExit, 'Map arrival carries into the next room');
      previousMapScene = mapScene;
      previousMapExit = await map.locator('[data-map-threshold="exit"]').textContent();
      assert.equal(await map.locator('[data-map-landmark]').count(), 1, 'Every room has stationary terrain');
      const clipped = await map.locator('[data-map-threshold]').evaluateAll(nodes => nodes.some(node => { const box = node.getBBox(); return box.x < 0 || box.x + box.width > 600 || box.y + box.height > 200; }));
      assert(!clipped, 'Named thresholds fit the schematic');
      const ally = map.locator('[data-map-ally]');
      if (await ally.count() && mapScene !== 'turbine-hall' && (await ally.locator('title').textContent()).startsWith('Xylum:')) {
        assert.equal(await ally.getAttribute('data-location'), await map.getAttribute('data-crew-position'), 'Established ally stays with crew, not a solo scout');
      }
    }
    const click = async locator => { events.push({ type: 'choice', text: await locator.innerText() }); await locator.click(); };
    if (await page.locator('.lr-end-card').count()) { events.push({ type: 'ending', text: await page.locator('.lr-end-card').innerText() }); break; }
    if (await page.locator('.lr-transition-beat').count()) { await click(page.locator('.lr-transition-beat > button')); continue; }
    if (await page.locator('.lr-simple-scouts').count()) {
      if (process.env.LR_NO_SCOUT === '1' || !await page.locator('.lr-simple-scouts > button').count()) { await click(page.getByRole('button', { name: /Stay together/ })); continue; }
      await click(page.locator('.lr-simple-scouts > button').first());
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
      const orientation = page.locator('.lr-route-orientation');
      assert(await orientation.isVisible(), 'Scene context stays visible while choosing');
      const storyBox = await orientation.boundingBox();
      const boardBox = await page.locator('.lr-route-board').boundingBox();
      assert(storyBox.y + storyBox.height <= boardBox.y, 'Story precedes comparison');
      assert.equal(await page.locator('.lr-route-setting').count(), 2, 'Both routes explain their physical approach');
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
      if (process.env.LR_REVIEW_DEPTH === '1' && await extract.count()) {
        for (const width of [1280, 768, 390]) {
          await page.setViewportSize({ width, height: 900 });
          await page.locator('.lr-extraction-choice').scrollIntoViewIfNeeded();
          await page.screenshot({ path: `${output}/depth-${crossed}-${width}.png`, fullPage: true });
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Extraction choice overflow');
          assert(await page.locator('.lr-haul-risk').isVisible());
        }
        await page.setViewportSize(viewport);
      }
      if (process.env.LR_EXTRACT === '1' && await extract.count()) { await click(extract.first()); continue; }
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
  await writeFile(`${output}/run.json`, JSON.stringify(events,null,2));
  console.log(JSON.stringify({ crossed, clicks: events.filter(e=>e.type==='choice').length, animations: events.filter(e=>e.type==='animation').map(e=>e.elapsed), ending: events.find(e=>e.type==='ending')?.text || 'Requested scene milestone reached' }, null,2));
  await context.close();
} finally { await browser.close(); }
