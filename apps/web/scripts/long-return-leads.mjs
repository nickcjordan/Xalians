import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const output='C:/Users/njord/AppData/Local/Temp/long-return-leads';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try {
 for (const width of [390,768,1280]) {
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/long-return');
  await page.getByRole('button',{name:/Seal Crew/}).click();
  await page.getByRole('button',{name:/Stay together/}).click();
  assert.equal(await page.locator('.lr-lead-options').count(),0);
  const before=await page.locator('.lr-wizard-resources').innerText();
  await page.screenshot({path:`${output}/${width}-route.png`,fullPage:true});
  await page.getByRole('button',{name:'Choose crew for: Ride the intake current',exact:true}).click();
  assert.equal(await page.locator('.lr-route-board').count(),0);
  assert.equal(await page.locator('.lr-lead-options button').count(),3);
  assert.match(await page.locator('.lr-lead-options button[aria-pressed=true]').innerText(),/Hippochamp/);
  assert.match(await page.locator('.lr-lead-options').innerText(),/Swimming: a weak fit/);
  await page.locator('.lr-lead-options button').filter({hasText:'Graviclaw'}).click();
  await page.locator('.lr-method-alternatives > summary').click();
  await page.locator('.lr-method-alternatives button').filter({hasText:'Spends this ability'}).first().click();
  assert.match(await page.locator('.lr-lead-options button[aria-pressed=true]').innerText(),/Ability unavailable after crossing/);
  assert.doesNotMatch(await page.locator('.lr-lead-options button[aria-pressed=true]').innerText(),/Swimming: a workable fit/);
  const alternative=page.locator('.lr-lead-options button').filter({hasText:'Chromocat'});
  await alternative.click();
  await page.getByRole('button',{name:'← Change route',exact:true}).click();
  await page.getByRole('button',{name:'Choose crew for: Ride the intake current',exact:true}).click();
  assert.match(await page.locator('.lr-lead-options button[aria-pressed=true]').innerText(),/Chromocat/);
  assert.equal(await page.locator('.lr-wizard-resources').innerText(),before);
  await page.screenshot({path:`${output}/${width}-lead.png`,fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
  await page.locator('.lr-lead-options button').filter({hasText:'Hippochamp'}).click();
  await page.getByRole('button',{name:/Cross now/}).click();
  await page.getByRole('button',{name:/Continue to result/}).click();
  assert(await page.locator('.lr-arrival-story').isVisible());
  assert.deepEqual(errors,[]);
  console.log(`${width}: route → lead, suggested swimmer, back preservation, no cost until crossing, result passed`);
  await context.close();
 }
} finally {await browser.close();}
