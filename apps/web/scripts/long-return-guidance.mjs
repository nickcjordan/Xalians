import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  for (const mode of ['Guided', 'Standard', 'Expert']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4173/long-return');
    await page.locator('.lr-setup-settings > summary').click();
    await page.locator('.lr-setup-settings').getByRole('button', { name: new RegExp(`^${mode}`) }).click();
    await page.getByRole('button', { name: /Seal Crew/ }).click();
    await page.getByRole('button', { name: 'Proceed Blind', exact: true }).click();
    await page.getByRole('button', { name: /Accept Unknowns & Compare Routes/ }).click();
    await page.locator('.lr-route').filter({ hasText: 'Ride the intake current' }).click();
    await page.locator('.lr-crew-member').filter({ hasText: 'Hippochamp' }).click();
    await page.getByRole('button', { name: 'Assign Graviclaw as support', exact: true }).click();
    await page.locator('.lr-method-select').filter({ hasText: 'Swim the intake' }).click();
    await page.getByRole('button', { name: /Cross now/ }).click();
    await page.getByRole('button', { name: /Continue to result/ }).click();
    assert(await page.locator('.lr-result-panel .lr-result-grid').isVisible());
    const workshop = page.locator('.lr-workshop');
    await workshop.locator(':scope > summary').click();
    await workshop.getByRole('button', { name: /Resupply Hippochamp/ }).click();
    await workshop.getByRole('button', { name: /Spend 2 salvage/ }).click();
    assert(await page.locator('.lr-field-receipt').isVisible());
    assert(await page.locator('.lr-field-receipt [role="img"]').count());
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`${mode}: manual route/lead/support/method, detailed result and field recovery passed`);
  }
} finally { await browser.close(); }
