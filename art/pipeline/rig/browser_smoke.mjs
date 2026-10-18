import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire('C:/dev/src/Xalians/package.json');
const {chromium}=require('playwright-core');
const dir='C:/dev/art-data/pipeline/codex-stream/luceras-rig/pass2';
const poses=['rest','crouch','leap','landing','head_left_up','tail_side_up','foreleg_step','breath_in'];
const server=http.createServer((req,res)=>{
 const requested=decodeURIComponent(req.url.split('?')[0]);
 if(requested==='/favicon.ico'){res.writeHead(204);res.end();return}
 const file=path.join(dir,requested==='/'?'viewer.html':requested);
 if(path.relative(dir,file).startsWith('..')){res.writeHead(403);res.end();return}
 try{const b=fs.readFileSync(file);res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.glb')?'model/gltf-binary':'application/octet-stream');res.end(b)}catch{res.writeHead(404);res.end()}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url=`http://127.0.0.1:${server.address().port}/viewer.html`;
const errors=[],warnings=[],consoleLog=[],shots=[];let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1200,height:900},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{consoleLog.push({type:m.type(),text:m.text()});if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text())});
 page.on('requestfailed',r=>errors.push(r.url()+': '+r.failure()?.errorText));
 await page.goto(url,{waitUntil:'networkidle',timeout:60000});
 await page.waitForFunction(()=>window.rigReview?.loaded===true,{timeout:60000});
 const loaded=await page.evaluate(()=>window.rigReview);
 for(let i=0;i<poses.length;i++){
  await page.selectOption('#pose',{index:i});
  await page.waitForTimeout(250);
  const state=await page.evaluate(()=>window.reviewState());
  await page.screenshot({path:dir+'/browser_'+poses[i]+'.png'});
  shots.push({pose:poses[i],...state,screenshot:'browser_'+poses[i]+'.png'});
 }
 await page.click('#play');await page.waitForTimeout(3000);await page.click('#play');
 const playback=await page.evaluate(()=>window.reviewState());
 const interpolation=[];
 for(const frame of [61,62.5,64.5,66.5,68.5,70.5]){
  await page.evaluate(t=>window.reviewSeek(t),frame/30);await page.waitForTimeout(100);const state=await page.evaluate(()=>window.reviewState());
  await page.locator('#status').evaluate((el,f)=>el.textContent='Transition frame '+f,frame);
  const screenshot='browser_transition_'+String(frame).replace('.','_')+'.png';await page.screenshot({path:dir+'/'+screenshot});interpolation.push({frame,...state,screenshot});
 }
 const result={build_id:'B-bvrc',glb_sha256:crypto.createHash('sha256').update(fs.readFileSync(dir+'/luceras_rigged.glb')).digest('hex'),browser:await browser.version(),executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',threeRevision:loaded.threeRevision,loaded,poses:shots,playback,interpolation,errors,warnings,console:consoleLog,passed:errors.length===0&&loaded.threeRevision==='160'&&loaded.skinnedMeshes===2&&loaded.joints===40&&loaded.triangles===11478&&shots.every((s,i)=>s.finite&&s.renderCalls>0&&Math.abs(s.time-(1+i*10)/30)<1e-6)&&playback.finite&&playback.actionTime>=playback.duration-1e-5&&interpolation.every(s=>s.finite)};
 fs.writeFileSync(dir+'/browser_smoke.json',JSON.stringify(result,null,2));console.log(JSON.stringify({passed:result.passed,errors,warnings,poses:shots.length}));if(!result.passed)process.exitCode=1;
}catch(e){errors.push(String(e));fs.writeFileSync(dir+'/browser_smoke.json',JSON.stringify({passed:false,errors,console:consoleLog,poses:shots},null,2));console.error(e);process.exitCode=1}
finally{if(browser)await browser.close();server.close()}
