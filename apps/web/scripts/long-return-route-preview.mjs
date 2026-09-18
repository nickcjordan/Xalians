import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const output = process.env.LR_QA_OUTPUT || 'C:/Users/njord/AppData/Local/Temp/long-return-route-preview';
await mkdir(output, {recursive:true});
const browser = await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try {
  for (const {width,height} of [{width:320,height:568},{width:390,height:667},{width:667,height:390},{width:768,height:900},{width:1280,height:900}]) {
    const context = await browser.newContext({viewport:{width,height}, reducedMotion:'reduce'});
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
    const board = page.locator('.lr-route-board');
    assert.equal(await board.evaluate(node => node.tagName), 'TABLE');
    assert.equal(await page.locator('.lr-route-orientation').count(), 1, 'One scene introduction, not a repeated objective and story');
    for (const row of ['.is-energy','.is-stability','.is-salvage']) {
      const bounds = await board.locator(`${row} > *`).evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()));
      assert.equal(bounds.length, 3);
      assert(bounds.every(rect => Math.abs(rect.y - bounds[0].y) < 1), 'Both routes share the metric axis even on a phone');
    }
    if (width === 390) {
      await page.screenshot({path:`${output}/390-route-entry.png`});
      const height = await board.evaluate(node => node.getBoundingClientRect().height);
      assert(height < 640, `Opening comparison should be one phone viewport, not a scrolling dossier: ${height}`);
      await board.evaluate(node => node.scrollIntoView({block:'start',behavior:'instant'}));
      const head = await board.locator('thead').boundingBox();
      const energy = await board.locator('.is-energy').boundingBox();
      assert(head.y + head.height <= energy.y + 1, 'Sticky headings must not hide the first cost row');
      await page.screenshot({path:`${output}/390-comparison.png`});
    }
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
    await other.locator('.lr-board-analysis').focus();
    await verify('intake');
    assert.match(await page.locator('.lr-board-pick[aria-pressed="true"]').innerText(),/hanging gantry/i);
    await other.locator('.lr-board-analysis').press('Enter');
    await verify('intake');
    const analysis = page.locator('#route-analysis-intake');
    assert(await analysis.isVisible());
    const analysisWidth = await analysis.locator('..').evaluate(node => node.getBoundingClientRect().width);
    assert(analysisWidth >= (await board.boundingBox()).width - 2, 'Requested analysis uses the whole comparison width');
    if (width === 390) {
      await analysis.scrollIntoViewIfNeeded();
      await page.screenshot({path:`${output}/390-analysis.png`});
    }
    await other.locator('.lr-board-analysis').press('Enter');
    assert.equal(await analysis.isVisible(),false);
    await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
    await page.screenshot({path:`${output}/${width}-preview.png`,fullPage:true});
    const go = other.locator('.lr-board-select');
    await go.focus();
    await verify('intake');
    await go.press('Enter');
    assert.match(await page.locator('.lr-simple-plan-head').innerText(),/Ride the intake current/);
    await verify('intake');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
    assert.equal(await page.locator('.lr-route-board').count(),0, 'Choosing a lead replaces the route board');
    assert.deepEqual(errors,[]);
    console.log(`${width}: every comparison row and keyboard control previews its route; back preserves selection without moving or spending`);
    await context.close();
  }
} finally { await browser.close(); }
