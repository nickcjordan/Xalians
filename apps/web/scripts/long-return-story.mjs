import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const output = 'C:/Users/njord/AppData/Local/Temp/long-return-story';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  for (const [width, height] of [[390, 667], [390, 900], [768, 900], [1280, 900]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const checkStory = async name => {
      const story = page.locator('.lr-sequence-story');
      await story.waitFor();
      await story.getByRole('button', { name: 'Pause story', exact: true }).click();
      const first = await story.locator('li').first().innerText();
      const count = await story.locator('li').count();
      const reading = await story.locator('.lr-sequence-story-scroll').boundingBox();
      assert(reading.height >= 160, 'Playback must leave usable reading space on small phones');
      await page.waitForTimeout(3000);
      assert.equal(await story.locator('li').count(), count, 'Pause holds the story');
      await story.getByRole('button', { name: /Next event/ }).click();
      assert.equal(await story.locator('li').count(), count + 1);
      const skip = page.getByRole('button', { name: 'Skip to outcome', exact: true });
      if (await skip.count()) await skip.click();
      assert.equal(await story.locator('li').first().innerText(), first, 'Earlier events persist');
      await page.waitForTimeout(2500);
      assert(await story.isVisible(), 'No automatic dismissal');
      const panel = await story.boundingBox();
      assert(panel.x >= 0 && panel.x + panel.width <= width + 1 && panel.y >= 52 && panel.y + panel.height <= height);
      const finalReading = await story.locator('.lr-sequence-story-scroll').boundingBox();
      await page.screenshot({ path: `${output}/${width}-${height}-${name}.png` });
      assert(finalReading.height >= 200, `${name}: persistent account has only ${finalReading.height}px of reading space`);
      const map = page.locator('[data-field-record] [data-expedition-map]');
      assert.equal(await map.locator('[data-map-creature]').count(), 3, 'Map retains all crew identities');
      const drawing = await map.locator(':scope > svg').boundingBox();
      assert(drawing.width > 300 && drawing.height > 100, 'Schematic is a readable diagram, not an icon');
      const signal = map.locator('[data-map-signal]');
      if (await signal.count()) {
        const label = await signal.boundingBox();
        for (const effect of await map.locator('[data-map-effect]').all()) {
          const marker = await effect.boundingBox();
          assert(marker.x >= label.x + label.width || marker.x + marker.width <= label.x || marker.y >= label.y + label.height || marker.y + marker.height <= label.y, 'Report label and earned path marker must not overlap');
        }
      }
      assert.equal(await page.locator('.lr-scout-performer,.lr-action-creature,.lr-encounter-sequence-creature').count(), 0, 'No creature-performance stage remains');
      assert.equal(await story.getByRole('button', { name: 'Pause story', exact: true }).count(), 0, 'Finished stories have no dead playback controls');
      const next = page.locator('[role="dialog"] button').last();
      const button = await next.boundingBox();
      assert(button.y + button.height <= height, 'Continue stays visible');
      assert.equal(await map.locator('[data-site-overview]').first().isVisible(), width >= 720, 'Reading view omits repeated sector overview only on phones');
      await page.screenshot({ path: `${output}/${width}-${height}-${name}.png` });
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
    await page.locator('[data-scout-options] > button').first().click();
    await page.getByRole('button', { name: /^Send / }).click();
    await checkStory('scout');
    await page.locator('.lr-encounter-options > .is-recommended').click();
    await page.locator('.lr-encounter-commit-bar button').click();
    await checkStory('encounter');
    assert.deepEqual(errors, []);
    console.log(`${width}x${height}: crossing, scout, encounter persistence, pause, stepping and reading space passed`);
    await context.close();
  }
} finally { await browser.close(); }
