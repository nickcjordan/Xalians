import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const output = 'C:/Users/njord/AppData/Local/Temp/long-return-mobile-controls';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  for (const [width, height] of [[390, 667], [320, 568]]) {
  for (const reducedMotion of ['reduce', 'no-preference']) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
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
    assert(back.y >= 56 && back.y + back.height <= height, 'The local back action stays visible on entry');
    const cross = page.getByRole('button', { name: /Cross now/ });
    const visibleCommit = async () => {
      const bounds = await cross.boundingBox();
      assert(bounds.y >= 0 && bounds.y + bounds.height <= height, 'Commit stays in the phone viewport');
    };
    const lastLead = await page.locator('.lr-lead-options-list > button').last().boundingBox();
    if (width === 390) {
      const initialCommit = await cross.boundingBox();
      assert(lastLead.y + lastLead.height + 8 <= initialCommit.y, 'Every lead and its cost stays above the commitment control');
    } else assert(lastLead.y + lastLead.height <= height, 'Narrow phones show all lead choices before the action button');
    await page.screenshot({ path: `${output}/${width}-${reducedMotion}-initial.png` });
    await cross.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await visibleCommit();
    for (const species of ['Graviclaw', 'Hippochamp', 'Chromocat']) {
      await page.locator('.lr-lead-options button').filter({ has: page.getByText(species, { exact: true }) }).click();
      assert.match(await cross.innerText(), new RegExp(`${species} leads`));
      await cross.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await visibleCommit();
      assert.equal(await page.locator('[data-expedition-reserves]').innerText(), resources);
      if (species === 'Graviclaw') {
        await page.locator('.lr-plan-roles summary').click();
        assert.match(await page.locator('.lr-plan-roles').innerText(), /Energy cost is shared: Graviclaw spends 3; Hippochamp spends 1/);
        await page.locator('.lr-plan-roles summary').click();
      }
    }
    await page.screenshot({ path: `${output}/${width}-${reducedMotion}-selected.png` });
    await page.getByRole('button', { name: /Change route/ }).click();
    assert.equal(await cross.count(), 0, 'No stale commit control on the route screen');
    await page.locator('.lr-board-pick').first().click();
    await cross.click();
    const skip = page.getByRole('button', { name: /Skip to outcome/ });
    if (await skip.count()) await skip.click();
    await page.getByRole('button', { name: /Continue to result/ }).click();
    assert(await page.locator('.lr-simple-result').isVisible());
    assert.deepEqual(errors, []);
    console.log(`${width}x${height} phone, ${reducedMotion}: commit follows three lead choices, back/reselect and crossing passed`);
    await page.close();
  }
  }
} finally { await browser.close(); }
