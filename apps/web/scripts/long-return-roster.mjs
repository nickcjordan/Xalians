import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const output = 'C:/Users/njord/AppData/Local/Temp/lr-roster-review';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  for (const width of [390, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4173/long-return');
    await page.locator('.lr-crew-choice--selected').first().waitFor();
    const selected = () => page.locator('.lr-crew-choice--selected').evaluateAll(els => els.map(el => el.dataset.creatureId));
    const original = await selected();
    await page.screenshot({ path: `${output}/${width}-roster.png`, fullPage: true });
    const incoming = page.locator('[data-creature-id="ectoghoul-117"]');
    await incoming.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement?.hasAttribute('data-swap-heading'));
    assert(await page.locator('.lr-launch').isDisabled());
    await page.screenshot({ path: `${output}/${width}-swap.png`, fullPage: true });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.getByRole('button', { name: 'Cancel swap' }).click();
    await page.waitForFunction(() => document.activeElement?.dataset.creatureId === 'ectoghoul-117');
    assert.deepEqual(await selected(), original);
    await incoming.click();
    await page.getByRole('button', { name: /Replace Graviclaw/ }).click();
    await page.waitForFunction(() => document.activeElement?.dataset.creatureId === 'ectoghoul-117');
    assert.deepEqual((await selected()).sort(), ['ectoghoul-117', 'chromocat-088', 'hippochamp-041'].sort());
    await page.getByRole('button', { name: /Seal Crew/ }).click();
    const names = await page.locator('.lr-wizard-resources small').allTextContents();
    assert(names.includes('Ectoghoul') && !names.includes('Graviclaw'));
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`${width}: keyboard swap, cancel, unchanged roster before commit, focus and selected-crew launch passed`);
  }
} finally { await browser.close(); }
