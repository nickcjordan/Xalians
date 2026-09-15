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
    const before=await page.locator('.lr-wizard-resources').innerText();
    await page.locator('.lr-method-alternatives > summary').click();
    await page.locator('.lr-method-alternatives button').filter({hasText:ability?'Spends this ability':'Keeps your abilities'}).first().click();
    assert.equal(await page.locator('.lr-wizard-resources').innerText(),before);
    await page.screenshot({path:`${output}/${ability?'ability':'movement'}-choice.png`,fullPage:true});
    await page.getByRole('button',{name:/Cross now/}).click();
    const actor=page.locator('.lr-action-creature.is-lead');
    const initial=await actor.evaluate(el=>getComputedStyle(el).transform);
    await page.waitForTimeout(450);
    const moving=await actor.evaluate(el=>getComputedStyle(el).transform);
    assert.notEqual(initial,moving,'Performer must actually move');
    await page.screenshot({path:`${output}/${ability?'ability':'movement'}-motion.png`});
    await page.getByRole('button',{name:/Continue to result/}).waitFor({timeout:30000});
    if(ability) assert.match(await page.locator('.lr-sequence-story').innerText(),/spent for the rest of the expedition/i);
    await page.getByRole('button',{name:/Continue to result/}).click();
    assert.equal(await page.locator('.lr-result-ability').count(),ability?1:0);
    assert.deepEqual(errors,[]);
    await context.close();
  }
  console.log('Reusable and one-use technique selection, actual motion and persistent ability receipt passed.');
} finally {await browser.close();}
