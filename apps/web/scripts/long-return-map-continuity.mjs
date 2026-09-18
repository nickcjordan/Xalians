import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const output = process.env.LR_QA_OUTPUT || 'C:/Users/njord/AppData/Local/Temp/long-return-map-continuity';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  const cases = [{scout:'Chromocat'}, {scout:'Hippochamp'}, {scout:'Ectoghoul'}, {scout:'Hippochamp', withdraw:true}];
  for (const width of [390, 1280]) for (const {scout, withdraw} of cases) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 667 : 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const map = () => page.locator('[data-field-record] [data-expedition-map]');
    const currentMap = () => page.locator('.lr-shell [data-expedition-map]');
    const checkAllyClearance = async target => {
      const clear = await target.evaluate(element => {
        const marker = element.querySelector('[data-map-ally] path')?.getBoundingClientRect();
        return !marker || [...element.querySelectorAll('[data-map-route] text')].every(label => {
          const box = label.getBoundingClientRect();
          return marker.right <= box.left || marker.left >= box.right || marker.bottom <= box.top || marker.top >= box.bottom;
        });
      });
      assert(clear, 'Ally marker must not overlap route labels');
    };
    const chooseRoute = async index => page.locator('.lr-board-pick').nth(index).click();
    const arrive = async () => {
      await page.getByRole('button', { name: /Cross now/ }).click();
      await page.getByRole('button', { name: 'Continue to result', exact: true }).click();
    };
    const enter = async () => {
      await page.getByRole('button', { name: 'Continue mission', exact: true }).click();
      await page.getByRole('button', { name: /^Enter / }).click();
    };
    await page.goto(`${process.env.LR_BASE_URL || 'http://127.0.0.1:4173'}/long-return`);
    if (scout === 'Ectoghoul') {
      await page.locator('[data-creature-id="ectoghoul-117"]').click();
      await page.locator('[data-creature-id="graviclaw-213"]').click();
    }
    await page.getByRole('button', { name: /Seal crew/i }).click();
    await page.getByRole('button', { name: /Stay together/ }).click();
    await chooseRoute(0); await arrive(); await enter();
    await page.getByRole('button', { name: `Select ${scout} as scout`, exact: true }).click();
    await page.getByRole('button', { name: new RegExp(`^Send ${scout}`) }).click();
    await page.getByRole('button', { name: 'Respond to encounter', exact: true }).click();
    await (withdraw ? page.locator('.lr-encounter-options > button').filter({hasText:'Break contact'}) : page.locator('.lr-encounter-options > .is-recommended')).click();
    await page.locator('.lr-encounter-commit-bar button').click();
    await page.getByRole('button', { name: 'See encounter result', exact: true }).waitFor();
    if (withdraw) {
      assert.equal(await map().locator('[data-map-native]').getAttribute('data-state'), 'contact');
      await page.getByRole('button', { name: 'See encounter result', exact: true }).click();
      await page.getByRole('button', { name: 'Review scout report', exact: true }).click();
      await page.getByRole('button', { name: /Wait for Hippochamp to return/ }).click();
      await page.getByRole('button', { name: 'Review scout report', exact: true }).waitFor();
      assert.equal(await map().locator('[data-map-native]').getAttribute('data-state'), 'contact', 'Returning to report leaves the native in its territory');
      assert.equal(await map().locator('[data-map-creature][data-location="entry"]').count(), 3);
      await page.getByRole('button', { name: 'Review scout report', exact: true }).click();
      await page.getByRole('button', { name: /Choose a route/i }).click();
      await chooseRoute(0);
      await page.getByRole('button', { name: /Cross now/ }).click();
      await page.getByRole('button', { name: 'Continue to result', exact: true }).waitFor();
      assert.equal(await map().locator('[data-map-native]').getAttribute('data-state'), 'contact');
      await page.getByRole('button', { name: 'Continue to result', exact: true }).click();
      assert.equal(await currentMap().locator('[data-map-native]').getAttribute('data-state'), 'contact');
      assert.equal(await currentMap().locator('[data-map-creature][data-location="exit"]').count(), 3);
      assert.deepEqual(errors, []);
      console.log(`${width}/withdraw: native stays in its territory through physical report return and the other crossing`);
      await context.close();
      continue;
    }
    assert.equal(await map().locator('[data-map-ally]').getAttribute('data-location'), 'survey');
    await checkAllyClearance(map());
    await page.getByRole('button', { name: 'See encounter result', exact: true }).click();
    assert.equal(await currentMap().locator('[data-map-ally]').getAttribute('data-location'), 'survey');
    await page.getByRole('button', { name: 'Review scout report', exact: true }).click();
    assert.equal(await currentMap().locator('[data-map-ally]').getAttribute('data-location'), 'survey', 'Reading a report must not teleport the ally to the crew');
    if (scout !== 'Chromocat') {
      await page.getByRole('button', { name: new RegExp(`Wait for ${scout} to return`) }).click();
      await page.getByRole('button', { name: 'Review scout report', exact: true }).waitFor();
      assert.equal(await map().locator('[data-map-ally]').getAttribute('data-location'), 'entry');
      assert.equal(await map().locator('[data-map-creature][data-location="entry"]').count(), 3, 'Scout and any fetched helper physically reunite');
      await page.getByRole('button', { name: 'Review scout report', exact: true }).click();
    }
    await page.getByRole('button', { name: /Choose a route/i }).click();
    assert.equal(await currentMap().locator('[data-map-ally]').getAttribute('data-location'), scout === 'Chromocat' ? 'survey' : 'entry');
    await chooseRoute(0);
    await checkAllyClearance(currentMap());
    await page.screenshot({ path: `${output}/${width}-${scout}-plan.png`, fullPage: true });
    await arrive();
    assert.equal(await currentMap().locator('[data-map-ally]').getAttribute('data-location'), 'exit');
    assert.equal(await currentMap().locator('[data-map-creature][data-location="exit"]').count(), 3);
    if (scout === 'Chromocat') {
      await enter();
      await page.getByRole('button', { name: /Stay together/ }).click();
      await chooseRoute(0);
      assert.equal(await currentMap().locator('[data-map-native]').count(), 0, 'No undiscovered contact leaks into the map');
      await page.getByRole('button', { name: /Cross now/ }).click();
      await page.getByRole('button', { name: 'Choose response', exact: true }).click();
      await page.locator('.lr-encounter-options > button').filter({ hasText: 'Pin the arms and pass' }).click();
      await page.locator('.lr-encounter-commit-bar button').click();
      await page.getByRole('button', { name: 'See encounter result', exact: true }).waitFor();
      assert.equal(await map().locator('[data-map-native]').getAttribute('data-state'), 'bypassed');
      assert.match(await map().innerText(), /Hypnopet · Still trapped/);
      assert.match(await page.locator('[data-field-record]').innerText(), /door itself still stands shut/);
      await page.screenshot({ path: `${output}/${width}-bypassed-record.png` });
      await page.getByRole('button', { name: 'See encounter result', exact: true }).click();
      await page.getByRole('button', { name: 'Plan the crossing', exact: true }).click();
      assert.equal(await currentMap().locator('[data-map-native]').getAttribute('data-state'), 'bypassed');
      await page.screenshot({ path: `${output}/${width}-bypassed-plan.png`, fullPage: true });
      assert.equal(await currentMap().getAttribute('data-crew-position'), 'crossing');
      await page.getByRole('button', { name: /Cross now/ }).click();
      await page.getByRole('button', { name: 'Continue to result', exact: true }).waitFor();
      assert.equal(await map().locator('[data-map-native]').getAttribute('data-state'), 'bypassed', 'Passing the native must not remove it from the story');
      await page.getByRole('button', { name: 'Continue to result', exact: true }).click();
      assert.equal(await currentMap().locator('[data-map-native]').getAttribute('data-state'), 'bypassed');
      await page.screenshot({ path: `${output}/${width}-bypassed-arrival.png`, fullPage: true });
    }
    assert.deepEqual(errors, []);
    console.log(`${width}/${scout}: ally location survives report and route preparation, reunion follows physical movement`);
    await context.close();
  }
} finally { await browser.close(); }
