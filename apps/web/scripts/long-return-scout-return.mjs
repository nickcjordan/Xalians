import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/long-return');
  await page.getByRole('button', { name: /Seal crew/i }).click();
  await page.locator('.lr-simple-scouts > button').filter({ hasText: 'Chromocat' }).click();
  await page.getByRole('button', { name: /^Send Chromocat/ }).click();
  await page.getByRole('button', { name: 'Check scout status', exact: true }).click();
  assert.match(await page.locator('.lr-scout-trip-receipt').innerText(), /1 energy scouting/);
  await page.getByRole('button', { name: /Wait for Chromocat to return/ }).click();
  await page.getByRole('button', { name: 'Review scout report', exact: true }).click();
  assert.match(await page.locator('.lr-scout-trip-receipt').innerText(), /2 energy scouting\s+1 stability waiting/);
  await page.getByRole('button', { name: /Choose a route/i }).click();
  await page.locator('.lr-board-pick').first().click();
  await page.getByRole('button', { name: /Cross now/ }).click();
  await page.getByRole('button', { name: /Continue to result/ }).click();
  const resources = await page.locator('.lr-wizard-resources').innerText();
  await page.reload();
  await page.getByRole('button', { name: /Resume expedition/i }).click();
  assert.equal(await page.locator('.lr-wizard-resources').innerText(), resources);
  assert.deepEqual(errors, []);
  console.log('Physical scout return receipt, crossing and checkpoint resource continuity passed.');
} finally { await browser.close(); }
