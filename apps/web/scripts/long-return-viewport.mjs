import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const output = process.env.LR_QA_OUTPUT || 'C:/Users/njord/AppData/Local/Temp/long-return-qa';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  for (const width of [390, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const capture = async name => {
      await page.screenshot({ path: `${output}/${width}-${name}.png`, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert(overflow <= 1, `${width}/${name}: horizontal overflow ${overflow}px`);
      const smallEssentialLabels = await page.locator('[data-expedition-reserves] small, .lr-wizard-progress span, .lr-simple-override span, .lr-end-stats > div > span, .lr-end-crew .lr-meter-label strong').evaluateAll(elements => elements.filter(el => el.checkVisibility() && parseFloat(getComputedStyle(el).fontSize) < 12).map(el => el.textContent));
      assert.deepEqual(smallEssentialLabels, [], `${width}/${name}: essential labels below 12px`);
      const clippedResourceNames = await page.locator('[data-expedition-reserves] small').evaluateAll(elements => elements.filter(el => el.checkVisibility() && el.scrollWidth > el.clientWidth + 1).map(el => el.textContent));
      const wrappedResourceNames = await page.locator('[data-reserve-creature] small').evaluateAll(elements => elements.filter(el => el.checkVisibility() && el.getBoundingClientRect().height > parseFloat(getComputedStyle(el).lineHeight) * 1.2).map(el => el.textContent));
      assert.deepEqual(wrappedResourceNames, [], 'Creature names remain intact in the map key');
      assert.deepEqual(clippedResourceNames, [], `${width}/${name}: resource names must remain readable`);
      if (process.env.LR_AUDIT_TYPE) await writeFile(`${output}/${width}-${name}-type.json`, JSON.stringify(await page.locator('.lr-shell *').evaluateAll(elements => elements.filter(el => el.checkVisibility() && [...el.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 12).map(el => ({ selector: el.className || el.tagName, text: el.textContent.trim().slice(0, 100), size: getComputedStyle(el).fontSize, color: getComputedStyle(el).color }))), null, 2));
      if (name === 'encounter') await writeFile(`${output}/${width}-encounter-layout.json`, JSON.stringify(await page.locator('.lr-field-encounter, .lr-field-encounter *').evaluateAll(elements => elements.flatMap(el => ['', '::before', '::after'].map(pseudo => { const style = getComputedStyle(el, pseudo); return { cls: el.className, pseudo, content: style.content, border: style.borderLeft, shadow: style.boxShadow, background: style.backgroundImage, width: style.width, height: style.height, position: style.position }; })).filter(el => (!el.border.startsWith('0px') || el.shadow !== 'none' || el.background !== 'none' || el.pseudo && el.content !== 'none') && el.content !== 'normal')), null, 2));
    };
    await page.goto('http://127.0.0.1:4173/long-return');
    await capture('setup');
    await page.getByRole('button', { name: /Seal Crew/ }).click();
    assert.equal(await page.locator('.lr-wizard-chrome').evaluate(el => document.activeElement === el), true, 'Phase focus must land on visible chrome');
    const scoutChoices = page.locator('[data-scout-choice]');
    await page.waitForFunction(() => [...document.querySelectorAll('[data-scout-choice] > span:first-child > div svg path')].length === 3 && [...document.querySelectorAll('[data-scout-choice] > span:first-child > div svg path')].every(path => path.getAttribute('d').length > 500));
    const choiceHeights = await scoutChoices.evaluateAll(elements => elements.map(el => el.getBoundingClientRect().height));
    assert(choiceHeights.every(height => height <= 160), 'Scout choices stay compact without hiding alternatives');
    const artWidths = await page.locator('[data-scout-choice] > span:first-child > div svg').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().width));
    assert(artWidths.every(width => width >= 48), 'Button icon sizing must not shrink creature art');
    const beforeScoutSelection = await page.locator('[data-expedition-reserves]').innerText();
    await scoutChoices.last().focus();
    await page.keyboard.press('Enter');
    assert.equal(await scoutChoices.last().getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-expedition-reserves]').innerText(), beforeScoutSelection, 'Selecting a scout spends nothing');
    assert.deepEqual(await scoutChoices.evaluateAll(elements => elements.map(el => el.getBoundingClientRect().height)), choiceHeights, 'Selection must not change choice height');
    assert.equal(await page.getByRole('button', { name: 'Game rules', exact: true }).count(), 1);
    await capture('scout');
    assert.equal(await page.locator('[data-expedition-map] [data-expedition-reserves]').count(), 1, 'Resources belong to the spatial crew key');
    assert.equal(await page.locator('.lr-wizard-chrome [data-expedition-reserves]').count(), 0, 'No duplicate header resource strip');
    const smallTools = await page.locator('.lr-wizard-tools > button').evaluateAll(elements => elements.filter(el => { const bounds=el.getBoundingClientRect(); return bounds.width < 44 || bounds.height < 44; }).map(el => el.getAttribute('aria-label')));
    assert.deepEqual(smallTools, [], 'Header actions retain touch-sized targets');
    await page.getByRole('button', { name: /Stay together/ }).click();
    await page.locator('.lr-board-pick').first().click();
    await capture('route');
    if (width === 1280) {
      const cross = await page.getByRole('button', { name: /Cross now/ }).boundingBox();
      const lastChoice = await page.locator('.lr-lead-options button').last().boundingBox();
      assert(cross.y >= 0 && cross.y + cross.height <= 900, 'Crossing action must be visible without scrolling');
      assert(lastChoice.y + lastChoice.height <= 900, 'Both route choices must be visible without scrolling');
    }
    await capture('lead-comparison');
    if (width === 390) {
      const cross = await page.getByRole('button', { name: /Cross now/ }).boundingBox();
      assert(cross.y >= 0 && cross.y + cross.height <= 900, 'Mobile crossing action must be reachable before scrolling through all leads');
    }
    await page.locator('.lr-lead-options button[aria-pressed="false"]').first().click();
    assert.equal(await page.locator('.lr-lead-options button').count(), 3, 'All lead alternatives remain visible');
    assert(await page.locator('.lr-lead-options button[aria-pressed="true"]').evaluate(el => el === document.activeElement), 'Lead choice retains keyboard focus');
    await capture('lead-choices');
    await page.getByRole('button', { name: /Advanced: customize/ }).click();
    await capture('custom-crew');
    await page.getByRole('button', { name: 'Back to crossing choices', exact: true }).click();
    if (await page.locator('.lr-board-pick').count()) await page.locator('.lr-board-pick').first().click();
    await page.getByRole('button', { name: /Cross now/ }).click();
    await page.getByRole('button', { name: /Continue to result/ }).click();
    assert(await page.locator('[data-arrival-focus]').evaluate(el=>document.activeElement===el), 'Arrival receives focus rather than repeating the scene header');
    if (width === 1280) {
      const continueAction = await page.getByRole('button', {name:'Continue mission',exact:true}).boundingBox();
      assert(continueAction.y >= 60 && continueAction.y + continueAction.height <= 900, 'Desktop arrival keeps continuation visible');
    }
    await capture('result');
    const account = page.locator('.lr-crossing-account');
    assert.equal(await account.getAttribute('open'), null, 'Arrival does not repeat the complete field record by default');
    assert.equal(await page.locator('.lr-crossing-prose > p').count(), 1, 'Arrival keeps the physical outcome visible');
    const arrivalResources = await page.locator('[data-expedition-reserves]').innerText();
    await account.locator('summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await account.locator('p').count(), 4, 'Full causal story remains available');
    assert(await account.locator('p').first().isVisible());
    await page.keyboard.press('Enter');
    assert.equal(await account.getAttribute('open'), null);
    assert.equal(await page.locator('[data-expedition-reserves]').innerText(), arrivalResources, 'Rereading never replays costs');
    const beforeAnalysis = await page.locator('[data-expedition-reserves]').innerText();
    const explanation = page.locator('.lr-result-explanation');
    await explanation.locator('summary').click();
    assert(await explanation.locator('.lr-cost-sources').first().isVisible(), 'Actual cost sources remain available');
    await capture('result-analysis');
    await explanation.locator('summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await explanation.getAttribute('open'), null);
    assert.equal(await page.locator('[data-expedition-reserves]').innerText(), beforeAnalysis, 'Inspecting the receipt does not spend resources');
    const workshop = page.locator('.lr-workshop > summary');
    if (await workshop.count()) { await workshop.click(); await capture('repairs'); await workshop.click(); }
    await page.getByRole('button', { name: 'Abort mission', exact: true }).click();
    await capture('ending');
    assert.match(await page.locator('.lr-end-stats').innerText(), /Salvage banked\s+0 · None/i);
    await page.getByRole('button', { name: 'Run Contract Again', exact: true }).click();
    await page.getByRole('button', { name: /Stay together/ }).click();
    await page.locator('.lr-board-pick').first().click();
    await page.getByRole('button', { name: /Cross now/ }).click();
    await page.getByRole('button', { name: /Continue to result/ }).click();
    await page.getByRole('button', { name: 'Continue mission', exact: true }).click();
    await page.getByRole('button', { name: /^Enter / }).click();
    await page.locator('[data-scout-options] > button').first().click();
    await page.getByRole('button', { name: /^Send / }).click();
    await page.getByRole('button', { name: 'Respond to encounter', exact: true }).click();
    await capture('encounter');
    await page.locator('.lr-encounter-options > .is-recommended').click();
    await page.locator('.lr-encounter-commit-bar button').click();
    await page.getByRole('button', { name: 'See encounter result', exact: true }).click();
    await capture('companion');
    await page.getByRole('button', { name: 'Review scout report', exact: true }).click();
    await capture('report');
    await page.getByRole('button', { name: /Choose a route/i }).click();
    await page.locator('.lr-board-pick').first().click();
    assert(await page.locator('.lr-lead-ally-saving').count(), 'Companion energy saving must remain attributable when choosing a lead');
    await capture('companion-leads');
    await page.getByRole('button', { name: /Cross now/ }).click();
    await page.getByRole('button', { name: /Continue to result/ }).click();
    await page.getByRole('button', { name: 'Abort mission', exact: true }).click();
    assert.match(await page.locator('.lr-end-copy').innerText(), /takes a path of its own/);
    assert.match(await page.locator('.lr-end-haul-loss').innerText(), /carried.*left behind/);
    await capture('companion-ending');
    if (width === 390) {
      const cards = await page.locator('.lr-end-crew .lr-crew-member').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().height));
      assert(cards.every(height => height < 160), 'Mobile end crew cards must not inherit the 200px gallery portrait height');
    }
    assert.deepEqual(errors, []);
    console.log(`${width}px: scout, route, custom crew, result, repairs, ending, encounter, companion, report checked`);
    await context.close();
  }
} finally { await browser.close(); }
