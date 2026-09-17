import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const output = process.env.LR_QA_OUTPUT || 'C:/Users/njord/AppData/Local/Temp/long-return-communication';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const cases = [
  { name: 'vibration', scout: 'Graviclaw', scene: 1, story: /pattern of vibrations through the structure/, delivery: 'Vibrations received' },
  { name: 'telepathy', scout: 'Hypnopet', swap: 'hypnopet-019', scene: 1, story: /images and feelings, without a spoken word/, delivery: 'Shared images received' },
  { name: 'display', scout: 'Chromocat', scene: 2, story: /visible gestures and changes of posture/, delivery: 'Visual signals received' },
  { name: 'unreported', scout: 'Ectoghoul', swap: 'ectoghoul-117', scene: 2, story: /Something ahead/, delivery: 'Waiting for the scout' }
];
try {
  for (const scenario of cases) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${process.env.LR_BASE_URL || 'http://127.0.0.1:4173'}/long-return`);
    if (scenario.swap) {
      await page.locator(`[data-creature-id="${scenario.swap}"]`).click();
      await page.locator('[data-creature-id="hippochamp-041"]').click();
    }
    await page.getByRole('button', { name: /Seal crew/i }).click();
    if (scenario.scene === 2) {
      await page.getByRole('button', { name: /Stay together/ }).click();
      await page.locator('.lr-board-pick').first().click();
      await page.getByRole('button', { name: /Cross now/ }).click();
      await page.getByRole('button', { name: 'Continue to result', exact: true }).click();
      await page.getByRole('button', { name: 'Continue mission', exact: true }).click();
      await page.getByRole('button', { name: /^Enter / }).click();
    }
    await page.locator('.lr-simple-scouts > button').filter({ hasText: scenario.scout }).click();
    await page.getByRole('button', { name: `Send ${scenario.scout}`, exact: false }).click();
    const record = page.locator('[data-field-record]');
    await record.getByRole('button', { name: /Review scout report|Check scout status|Respond to encounter/ }).waitFor();
    const story = await record.locator('.lr-sequence-story').innerText();
    assert.match(story, scenario.story);
    assert.equal(await record.locator('[data-map-creature][data-location="survey"]').count(), 1);
    assert.equal(await record.locator('[data-map-creature][data-location="entry"]').count(), 2);
    if (scenario.name === 'unreported') {
      assert.doesNotMatch(story, /uncovers no hidden dangers|Live servo cycle|every forty seconds/);
      assert.doesNotMatch(await record.locator('[data-expedition-map]').innerText(), /Report ↙/);
    } else {
      assert.match(await record.locator('[data-expedition-map]').innerText(), /Report ↙/);
    }
    await page.screenshot({ path: `${output}/${scenario.name}-record.png` });
    await record.getByRole('button', { name: /Review scout report|Check scout status|Respond to encounter/ }).click();
    if (await page.locator('.lr-field-encounter:not(.is-resolved)').count()) {
      await page.locator('.lr-encounter-options > button').filter({ hasText: 'Break contact' }).click();
      await page.locator('.lr-encounter-commit-bar button').click();
      await page.getByRole('button', { name: 'See encounter result', exact: true }).click();
      await page.getByRole('button', { name: 'Review scout report', exact: true }).click();
    }
    const report = page.locator('.lr-simple-report');
    assert.match(await report.innerText(), new RegExp(scenario.delivery));
    if (scenario.name === 'unreported') {
      assert.doesNotMatch(await report.innerText(), /Live servo cycle|every forty seconds/);
      await page.getByRole('button', { name: /Wait for Ectoghoul to return/ }).click();
      await page.getByRole('button', { name: 'Review scout report', exact: true }).click();
      assert.match(await report.innerText(), /Back with the crew/);
      assert.match(await report.innerText(), /Live servo cycle/);
    }
    await page.screenshot({ path: `${output}/${scenario.name}-report.png`, fullPage: true });
    assert.deepEqual(errors, []);
    console.log(`${scenario.name}: story, map positions, delivery and hidden-information boundaries passed`);
    await context.close();
  }
} finally { await browser.close(); }
