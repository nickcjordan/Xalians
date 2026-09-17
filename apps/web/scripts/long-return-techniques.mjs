import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const output='C:/Users/njord/AppData/Local/Temp/long-return-techniques';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try {
  for(const ability of [false,true]) {
    const context=await browser.newContext({viewport:{width:1280,height:900}});
    const page=await context.newPage(); const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4173/long-return');
    await page.getByRole('button',{name:/Seal crew/i}).click();
    await page.getByRole('button',{name:/Stay together/}).click();
    await page.locator('.lr-board-pick').first().click();
    const before=await page.locator('[data-expedition-reserves]').innerText();
    await page.locator('.lr-method-alternatives > summary').click();
    await page.locator('.lr-method-alternatives button').filter({hasText:ability?'Spends this ability':'Keeps your abilities'}).first().click();
    assert.equal(await page.locator('[data-expedition-reserves]').innerText(),before);
    await page.screenshot({path:`${output}/${ability?'ability':'movement'}-choice.png`,fullPage:true});
    await page.getByRole('button',{name:/Cross now/}).click();
    const map=page.locator('[data-field-record] [data-expedition-map]');
    await page.getByRole('button',{name:'Pause story',exact:true}).click();
    assert.equal(await map.locator('[data-map-creature][data-location="crossing"]').count(),3,'The committed crossing places the entire crew on the route');
    assert.equal(await page.locator('.lr-action-creature').count(),0,'No creature-performance animation remains');
    await page.screenshot({path:`${output}/${ability?'ability':'movement'}-crossing.png`});
    await page.getByRole('button',{name:'Resume story',exact:true}).click();
    await page.getByRole('button',{name:/Continue to result/}).waitFor({timeout:120000});
    assert.equal(await map.locator('[data-map-creature][data-location="exit"]').count(),3,'The completed account leaves all three at the destination');
    if(ability) assert.match(await page.locator('.lr-sequence-story').innerText(),/unavailable for the rest of this expedition/i);
    await page.getByRole('button',{name:/Continue to result/}).click();
    assert.equal(await page.locator('.lr-result-ability').count(),ability?1:0);
    assert.deepEqual(errors,[]);
    await context.close();
  }
  console.log('Reusable and one-use technique selection, schematic crossing/arrival and persistent ability receipt passed.');
} finally {await browser.close();}
