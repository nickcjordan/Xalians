import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const output = 'C:/Users/njord/AppData/Local/Temp/long-return-mobile-controls';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  for (const reducedMotion of ['reduce', 'no-preference']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 667 }, reducedMotion });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4173/long-return');
    await page.getByRole('button', { name: /Seal crew/i }).click();
    await page.getByRole('button', { name: /Stay together/ }).click();
    await page.locator('.lr-board-pick').first().click();
    await page.locator('.lr-wizard-view').evaluate(async element => {
      await Promise.all(element.getAnimations({ subtree: true }).filter(animation => animation.effect.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
    });
    const resources = await page.locator('[data-expedition-reserves]').innerText();
    assert(await page.locator('.lr-simple-plan').evaluate(el => el === document.activeElement), 'Phone lead substep receives focus');
    const back = await page.getByRole('button', { name: /Change route/ }).boundingBox();
    assert(back.y >= 56 && back.y + back.height <= 667, 'The local back action stays visible on entry');
    const cross = page.getByRole('button', { name: /Cross now/ });
    const visibleCommit = async () => {
      const bounds = await cross.boundingBox();
      assert(bounds.y >= 0 && bounds.y + bounds.height <= 667, 'Commit stays in the phone viewport');
    };
    await visibleCommit();
    await page.screenshot({ path: `${output}/${reducedMotion}-initial.png` });
    for (const species of ['Graviclaw', 'Hippochamp', 'Chromocat']) {
      await page.locator('.lr-lead-options button').filter({ has: page.getByText(species, { exact: true }) }).click();
      assert.match(await cross.innerText(), new RegExp(`${species} leads`));
      await visibleCommit();
      assert.equal(await page.locator('[data-expedition-reserves]').innerText(), resources);
    }
    await page.screenshot({ path: `${output}/${reducedMotion}-selected.png` });
    await page.getByRole('button', { name: /Change route/ }).click();
    assert.equal(await cross.count(), 0, 'No stale commit control on the route screen');
    await page.locator('.lr-board-pick').first().click();
    await cross.click();
    const skip = page.getByRole('button', { name: /Skip to outcome/ });
    if (await skip.count()) await skip.click();
    await page.getByRole('button', { name: /Continue to result/ }).click();
    assert(await page.locator('.lr-simple-result').isVisible());
    assert.deepEqual(errors, []);
    console.log(`667px phone, ${reducedMotion}: persistent commit, three lead changes, back/reselect and crossing passed`);
    await page.close();
  }
} finally { await browser.close(); }
