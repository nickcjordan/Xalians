import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const output = 'C:/Users/njord/AppData/Local/Temp/lr-recovery-review';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  for (const width of [1280, 768, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:4173/long-return');
    await page.getByRole('button', { name: /Seal crew/i }).click();
    await page.getByRole('button', { name: /Stay together/ }).click();
    await page.locator('.lr-board-pick').nth(1).click();
    await page.getByRole('button', { name: /Cross now/ }).click();
    await page.getByRole('button', { name: /Continue to result/ }).click();
    const workshop = page.locator('.lr-workshop');
    await workshop.locator(':scope > summary').click();
    const recovery = workshop.locator('.lr-workshop-options button:not([disabled])').filter({ hasText: 'Resupply' }).first();
    const before = await page.locator('.lr-wizard-resources').innerText();
    assert(!(await page.locator('.lr-arrival-grid').isVisible()), 'Repairs replace the story rather than append to it');
    await workshop.getByRole('button', { name: /Keep all .* salvage and return/ }).click();
    assert(await page.locator('.lr-arrival-grid').isVisible(), 'Keeping haul restores the result');
    assert.equal(await page.locator('.lr-wizard-resources').innerText(), before);
    await workshop.locator(':scope > summary').click();
    await recovery.click();
    assert.equal(await page.locator('.lr-wizard-resources').innerText(), before);
    await page.getByRole('button', { name: 'Cancel repair' }).click();
    assert.equal(await page.locator('.lr-field-exchange').count(), 0);
    await recovery.click();
    const preview = await page.locator('.lr-field-exchange [role="img"]').getAttribute('aria-label');
    await workshop.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/${width}-preview.png`, fullPage: true });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Preview must not overflow');
    await page.getByRole('button', { name: /Spend 2 salvage/ }).click();
    assert.equal(await page.locator('.lr-field-receipt [role="img"]').getAttribute('aria-label'), preview);
    assert(await page.locator('.lr-field-receipt h4').evaluate(el => el === document.activeElement), 'Focus follows completed repair');
    assert.equal(await page.locator('.lr-field-receipt .lr-field-pips > i').first().evaluate(el => getComputedStyle(el).animationName), 'none');
    assert.equal(await page.locator('.lr-arrival-grid').isVisible(), false, 'Repair stays the focused result');
    await page.getByRole('button', { name: '← Review crossing', exact: true }).click();
    assert(await page.locator('.lr-arrival-grid').isVisible(), 'Previous crossing stays accessible');
    await page.getByRole('button', { name: 'Back to repair result', exact: true }).click();
    assert.equal(await page.locator('.lr-arrival-grid').isVisible(), false);
    await page.screenshot({ path: `${output}/${width}-receipt.png`, fullPage: true });
    await page.reload();
    await page.getByRole('button', { name: /Resume expedition/ }).click();
    assert.equal(await page.locator('.lr-field-receipt [role="img"]').getAttribute('aria-label'), preview);
    assert.equal(await page.locator('.lr-workshop').count(), 0, 'Cannot spend twice after resuming');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`${width}: reversible recovery, matched preview/receipt, focus, reduced motion, checkpoint and overflow passed`);
  }
} finally { await browser.close(); }
