import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const output = 'C:/Users/njord/AppData/Local/Temp/long-return-story';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  for (const width of [390, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const checkStory = async name => {
      const story = page.locator('.lr-sequence-story');
      await story.waitFor();
      await story.getByRole('button', { name: 'Pause story', exact: true }).click();
      const first = await story.locator('li').first().innerText();
      const count = await story.locator('li').count();
      await page.waitForTimeout(3000);
      assert.equal(await story.locator('li').count(), count, 'Pause holds the story');
      await story.getByRole('button', { name: /Next event/ }).click();
      assert.equal(await story.locator('li').count(), count + 1);
      await page.getByRole('button', { name: 'Skip to outcome', exact: true }).click();
      assert.equal(await story.locator('li').first().innerText(), first, 'Earlier events persist');
      await page.waitForTimeout(2500);
      assert(await story.isVisible(), 'No automatic dismissal');
      const panel = await story.boundingBox();
      assert(panel.x >= 0 && panel.x + panel.width <= width + 1 && panel.y >= 52 && panel.y + panel.height <= 900);
      assert.equal(await story.getByRole('button', { name: 'Pause story', exact: true }).count(), 0, 'Finished stories have no dead playback controls');
      const next = page.locator('[role="dialog"] button').last();
      const button = await next.boundingBox();
      assert(button.y + button.height <= 900, 'Continue stays visible');
      await page.screenshot({ path: `${output}/${width}-${name}.png` });
      await next.click();
    };
    await page.goto('http://127.0.0.1:4173/long-return');
    await page.getByRole('button', { name: /Seal Crew/ }).click();
    await page.getByRole('button', { name: /Stay together/ }).click();
    await page.locator('.lr-board-pick').first().click();
    await page.getByRole('button', { name: /Cross now/ }).click();
    await checkStory('crossing');
    await page.getByRole('button', { name: 'Continue mission', exact: true }).click();
    await page.getByRole('button', { name: /^Enter / }).click();
    await page.locator('.lr-simple-scouts > button').first().click();
    await page.getByRole('button', { name: /^Send / }).click();
    await checkStory('scout');
    await page.locator('.lr-encounter-options > .is-recommended').click();
    await page.locator('.lr-encounter-commit-bar button').click();
    await checkStory('encounter');
    assert.deepEqual(errors, []);
    console.log(`${width}px: crossing, scout, encounter persistence, pause, stepping and bounds passed`);
    await context.close();
  }
} finally { await browser.close(); }
