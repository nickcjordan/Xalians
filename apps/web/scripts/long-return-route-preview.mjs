import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const output = process.env.LR_QA_OUTPUT || 'C:/Users/njord/AppData/Local/Temp/long-return-route-preview';
await mkdir(output, {recursive:true});
const browser = await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try {
  for (const width of [390,768,1280]) {
    const context = await browser.newContext({viewport:{width,height:width === 390 ? 667 : 900}, reducedMotion:'reduce'});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${process.env.LR_BASE_URL || 'http://127.0.0.1:4173'}/long-return`);
    await page.getByRole('button',{name:/Seal crew/i}).click();
    await page.getByRole('button',{name:/Stay together/}).click();
    const map = page.locator('.lr-shell [data-expedition-map]');
    const reserves = await map.locator('[data-expedition-reserves]').innerText();
    const positions = () => map.locator('[data-map-creature]').evaluateAll(nodes => nodes.map(node => node.style.transform));
    const originalPositions = await positions();
    const verify = async id => {
      await page.waitForFunction(route => document.querySelector('.lr-shell [data-expedition-map]')?.dataset.previewRoute === route, id, {timeout:5000});
      assert.equal(await map.getAttribute('data-preview-route'), id);
      assert.equal(await map.locator(`[data-map-direction="${id}"]`).count(),1);
      assert.equal(await map.locator('[data-expedition-reserves]').innerText(),reserves);
      assert.deepEqual(await positions(),originalPositions,'Preview changes a path, not creature positions');
      assert.equal(await page.locator('[data-field-record]').count(),0);
    };
    for (const id of ['gantry','intake']) {
      for (const row of ['.lr-board-head','.is-energy','.is-stability','.is-salvage','.lr-board-footer']) {
        await page.locator(`${row} [data-route-preview="${id}"]`).hover();
        await verify(id);
      }
    }
    await page.locator('.lr-board-pick').first().click();
    await page.getByRole('button',{name:/Change route/}).click();
    const other = page.locator('.lr-board-footer [data-route-preview="intake"]');
    await other.locator('summary').focus();
    await verify('intake');
    assert.match(await page.locator('.lr-board-pick[aria-pressed="true"]').innerText(),/hanging gantry/i);
    await other.locator('summary').press('Enter');
    await verify('intake');
    await other.locator('summary').press('Enter');
    await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
    await page.screenshot({path:`${output}/${width}-preview.png`,fullPage:true});
    const go = other.locator('.lr-board-select');
    await go.focus();
    await verify('intake');
    await go.press('Enter');
    assert.match(await page.locator('.lr-simple-plan-head').innerText(),/Ride the intake current/);
    await verify('intake');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
    assert.deepEqual(errors,[]);
    console.log(`${width}: every comparison row and keyboard control previews its route; back preserves selection without moving or spending`);
    await context.close();
  }
} finally { await browser.close(); }
