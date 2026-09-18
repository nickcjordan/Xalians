// Isolated checkpoint fixtures exercise depletion without claiming a naturally played trajectory.
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const output = process.env.LR_QA_OUTPUT || 'C:/Users/njord/AppData/Local/Temp/long-return-readiness';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  for (const width of [320, 390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: width < 500 ? 667 : 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${process.env.LR_BASE_URL || 'http://127.0.0.1:4173'}/long-return`);
    await page.getByRole('button', { name: /Seal Crew/ }).click();
    await page.evaluate(() => {
      const key = 'xalians.long-return.checkpoint.v1';
      const envelope = JSON.parse(localStorage.getItem(key));
      const run = JSON.parse(envelope.payload);
      run.strain = Object.fromEntries(run.selectedCrew.map((id, index) => [id, index === 2 ? 6 : 5]));
      envelope.payload = JSON.stringify(run);
      let hash = 2166136261;
      for (let i = 0; i < envelope.payload.length; i++) hash = Math.imul(hash ^ envelope.payload.charCodeAt(i), 16777619);
      envelope.checksum = (hash >>> 0).toString(16);
      localStorage.setItem(key, JSON.stringify(envelope));
    });
    await page.reload();
    await page.getByRole('button', { name: /Resume expedition/ }).click();
    assert(await page.getByRole('heading', { name: 'No scout available' }).isVisible());
    assert.equal(await page.getByRole('button', { name: /Select a scout/ }).count(), 0);
    assert(await page.locator('[data-scout-unavailable]').isVisible());
    const stay = page.getByRole('button', { name: /Stay together/ });
    assert(await stay.isEnabled());
    assert(await stay.evaluate(node => node.classList.contains('g-btn--primary')));
    const reserves = page.locator('.lr-shell [data-expedition-reserves]');
    const before = (await reserves.innerText()).replace(/\s+/g, '');
    for (const member of await reserves.locator('[data-reserve-creature]').all()) {
      const name = await member.locator('small').boundingBox();
      const warning = await member.locator('[data-reserve-warning]').boundingBox();
      assert(Math.abs(name.y - warning.y) < 4, 'Condition stays beside its creature');
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No page overflow');
    await page.screenshot({ path: `${output}/${width}-no-scout.png`, fullPage: true });
    await stay.click();
    await page.locator('.lr-route-board').waitFor();
    assert.equal((await reserves.innerText()).replace(/\s+/g, ''), before, 'Staying together spends nothing');
    assert.equal(await page.locator('.lr-route-board .lr-board-ending').count(), 1, 'Only the route whose known energy cost forces extraction is marked');
    await page.screenshot({ path: `${output}/${width}-route-stakes.png` });
    await page.locator('.lr-board-pick').first().click();
    assert.equal(await page.locator('[data-lead-readiness]').count(), 2);
    assert(!((await reserves.innerText()).includes("Can't scout")), 'Role restriction does not follow player into crossing');
    await page.getByRole('button', { name: /Cross now/ }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/${width}-leads.png` });
    assert.deepEqual(errors, []);
    console.log(`${width}: depleted checkpoint, clear sole action, inline conditions and crossing context passed`);
    await context.close();
  }
} finally { await browser.close(); }
