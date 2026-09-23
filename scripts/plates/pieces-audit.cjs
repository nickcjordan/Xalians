const path=require('path');const {chromium}=require(require.resolve('playwright-core',{paths:[path.join(__dirname,'..','..','apps/web')]}));const fs=require('fs');
const root=path.join(process.env.LOCALAPPDATA,'ms-playwright');const d=fs.readdirSync(root).filter(x=>x.startsWith('chromium_headless_shell')).sort().reverse()[0];
const OUT=path.join(__dirname,'..','..','untracked','snaps','pieces');fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await chromium.launch({executablePath:path.join(root,d,'chrome-headless-shell-win64/chrome-headless-shell.exe')});
const ctx=await b.newContext({viewport:{width:1600,height:2100},deviceScaleFactor:1.5});const p=await ctx.newPage();
await p.goto('file:///'+process.argv[2]);await p.waitForTimeout(1500);
await p.evaluate(()=>document.querySelectorAll('svg.layer, svg.defs').forEach(s=>s.pauseAnimations()));
const list=await p.evaluate(()=>{const out=[];let i=0;
 const desc=(el)=>{const t=el.tagName;const h=el.getAttribute('href');const tr=el.getAttribute('transform');return '('+t+(h?' '+h:'')+(tr?' '+tr.slice(0,40):'')+')';};
 document.querySelectorAll('svg.layer').forEach(svg=>{
  const walk=(node,depth,tagAll)=>{let label=null;
   for(const c of node.childNodes){
    if(c.nodeType===8){label=c.textContent.trim().replace(/\s+/g,' ').slice(0,80);continue;}
    if(c.nodeType!==1)continue;const t=c.tagName;if(/^(animate|animateTransform|animateMotion|title|desc|defs)$/.test(t))continue;
    const big=label&&label.startsWith('=====');
    if(label||depth===0||tagAll){c.setAttribute('data-piece',String(i));out.push({i,layer:svg.id.replace('layer-',''),label:label||desc(c)});i++;}
    const nextAll=big||(tagAll&&t==='g'&&depth<2);
    label=null;if(t==='g'&&depth<3)walk(c,depth+1,nextAll);
   }};walk(svg,0,false);});return out;});
const box0=await p.evaluate(()=>{const r=document.getElementById('layer-sky').getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});
const shots=[];
for(const it of list){
 const bb=await p.evaluate((i)=>{const el=document.querySelector('[data-piece="'+i+'"]');const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};},it.i);
 const clamp=(x,y,w,h)=>{const x0=Math.max(box0.x,x),y0=Math.max(box0.y,y),x1=Math.min(box0.x+box0.w,x+w),y1=Math.min(box0.y+box0.h,y+h);return{x:x0,y:y0,width:Math.max(8,x1-x0),height:Math.max(8,y1-y0)};};
 if(bb.w<0.5||bb.h<0.5){it.empty=true;continue;}
 const pad=Math.max(12,Math.min(bb.w,bb.h)*.15);
 const alone=clamp(bb.x-pad,bb.y-pad,bb.w+2*pad,bb.h+2*pad);
 const cp=Math.max(60,Math.max(bb.w,bb.h)*.6);const cont=clamp(bb.x-cp,bb.y-cp,bb.w+2*cp,bb.h+2*cp);
 await p.evaluate((i)=>{document.querySelectorAll('svg.layer').forEach(s=>s.style.visibility='hidden');document.querySelectorAll('.surface').forEach(s=>s.style.display='none');
  const w=document.querySelector('.well');w.dataset.bg=w.style.background;w.style.background='#6f6e6a';document.querySelectorAll('.well img').forEach(x=>x.style.visibility='hidden');
  document.querySelector('[data-piece="'+i+'"]').style.visibility='visible';},it.i);
 const a=await p.screenshot({clip:alone});
 await p.evaluate((i)=>{document.querySelectorAll('svg.layer').forEach(s=>s.style.visibility='');document.querySelectorAll('.surface').forEach(s=>s.style.display='');
  const w=document.querySelector('.well');w.style.background=w.dataset.bg;document.querySelectorAll('.well img').forEach(x=>x.style.visibility='');
  const el=document.querySelector('[data-piece="'+i+'"]');el.style.visibility='';const r=el.getBoundingClientRect();
  const o=document.createElement('div');o.id='ol';Object.assign(o.style,{position:'fixed',left:r.x-3+'px',top:r.y-3+'px',width:r.width+6+'px',height:r.height+6+'px',border:'2px dashed #ff2d55',zIndex:99,pointerEvents:'none'});document.body.appendChild(o);},it.i);
 const c=await p.screenshot({clip:cont});await p.evaluate(()=>document.getElementById('ol').remove());
 shots.push({...it,a:a.toString('base64'),c:c.toString('base64')});
}
// contact sheets: 6 pieces per sheet, each row alone | in context
const sp=await ctx.newPage();await sp.setContent('<canvas id=c></canvas>');
for(let s=0;s<shots.length;s+=6){const grp=shots.slice(s,s+6);
 const png=await sp.evaluate(async(grp)=>{const W=1400,RH=300,cv=document.getElementById('c');cv.width=W;cv.height=RH*grp.length;const g=cv.getContext('2d');g.fillStyle='#1b1a18';g.fillRect(0,0,W,cv.height);
  for(let k=0;k<grp.length;k++){const it=grp[k];const y=k*RH;g.fillStyle='#fff';g.font='15px monospace';g.fillText('#'+it.i+' ['+it.layer+'] '+it.label,8,y+18);
   for(const [key,x0] of [['a',8],['c',706]]){const im=new Image();im.src='data:image/png;base64,'+it[key];await im.decode();const sc=Math.min(686/im.width,(RH-34)/im.height,4);g.drawImage(im,x0,y+26,im.width*sc,im.height*sc);}
   g.strokeStyle='#444';g.beginPath();g.moveTo(0,y+RH-1);g.lineTo(W,y+RH-1);g.stroke();}
  return cv.toDataURL('image/png').split(',')[1];},grp);
 fs.writeFileSync(path.join(OUT,'sheet-'+String(s/6).padStart(2,'0')+'.png'),Buffer.from(png,'base64'));}
fs.writeFileSync(path.join(OUT,'pieces.json'),JSON.stringify(list.map(({i,layer,label,empty})=>({i,layer,label,empty})),null,1));
console.log('pieces',list.length,'rendered',shots.length,'sheets',Math.ceil(shots.length/6),'empty',list.filter(x=>x.empty).map(x=>x.i).join(','));
await b.close();})();
