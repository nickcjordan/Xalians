// Isolated paper-design calculator, not production battle rules or canonical records.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const out = fileURLToPath(new URL('.', import.meta.url));
const root = new URL('../../../', import.meta.url);
const matrix = JSON.parse(fs.readFileSync(new URL('packages/content/json/typeEffectivenessMatrix.json', root)));
const cap = s => s[0].toUpperCase() + s.slice(1);
const hit = (name, damage, range) => ({name, damage, range, kind:'hit'});
const snare = name => ({name, damage:0, range:'ranged', kind:'snare'});
const templates = {
  graviclaw: {hp:64,speed:40,moves:[hit('Pincer strike',8,'melee'),hit('Claw compression',10,'melee'),hit('Shell shove',6,'melee'),snare('Point of No Return')]},
  avilily: {hp:38,speed:80,moves:[hit('Beak strike',6,'melee'),hit('Talon rake',8,'melee'),hit('Saliva spray',5,'ranged'),{...snare('Blossoming Ambuscade'),range:'melee'}]},
  crystorn: {hp:56,speed:35,moves:[hit('Horn beam',8,'ranged'),hit('Fist strike',7,'melee'),hit('Light spray',6,'ranged'),hit('Coronet of the Twin Suns',16,'ranged')]},
  hippochamp: {hp:56,speed:55,moves:[hit('Water stream',8,'ranged'),hit('Hoof strike',7,'melee'),hit('Tail lash',6,'melee'),hit('Hydrostatic Lance',16,'ranged')]},
  drilltail: {hp:22,speed:70,moves:[hit('Pincer cut',7,'melee'),hit('Tail thrust',6,'melee'),hit('Claw compression',5,'melee'),hit('Wildcatter Auger',12,'melee')]},
  scalatto: {hp:30,speed:45,moves:[hit('Claw rake',7,'melee'),hit('Tail lash',6,'melee'),hit('Shell shove',5,'melee'),{name:'Duricrust Rolling Guard',damage:0,range:'self',kind:'ward'}]},
  voltish: {hp:48,speed:65,moves:[hit('Claw strike',8,'melee'),hit('Jaw crush',7,'melee'),hit('Tail lash',6,'melee'),{name:'Stormbank Discharge',damage:22,range:'melee',kind:'charge'}]},
};
for (const [key,t] of Object.entries(templates)) {
  const source=JSON.parse(fs.readFileSync(new URL(`docs/species-templates/${key}.json`,root)));
  assert.equal(t.moves[3].name, source.signatureAbility.name);
  t.element=source.element;
}
const rooms=[
 {name:'1. Shell and claw',enemies:[['drilltail','D1',22],['scalatto','S1',30]]},
 {name:'2. Restraint and projection',enemies:[['avilily','A2',20],['crystorn','C2',54]]},
 {name:'3. Stored charge',enemies:[['voltish','V3',48],['drilltail','D3',22]]},
 {name:'4. The discharge champion',enemies:[['voltish','B4',100],['crystorn','C4',30],['scalatto','S4',28]]},
];
function rng(seed){let x=seed>>>0;return ()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296;};}
function weighted(items,r){const total=items.reduce((s,x)=>s+x[1],0);let roll=r()*total;for(const [v,w]of items){roll-=w;if(roll<0)return v;}return items.at(-1)[0];}
function unit(species,id,side,hp){const t=templates[species];return {...structuredClone(t),species,id,side,max:hp??t.hp,hp:hp??t.hp,uses:[3,3,3,1],snared:0,ward:false,charge:null,slot:0};}
function damage(a,m,b){return Math.floor(m.damage*matrix[cap(a.element)][cap(b.element)]*(b.ward?0.5:1));}
function reset(u){u.uses=[3,3,3,1];u.snared=0;u.ward=false;u.charge=null;}
function alive(team){return team.filter(u=>u.hp>0);}
function options(u){return u.moves.map((m,i)=>i).filter(i=>u.uses[i]>0&&!(u.snared&&u.moves[i].range==='melee'));}
function planEnemy(u,foes,r){
  if(u.charge)return {i:3,target:u.charge,release:true};
  const legal=options(u);if(!legal.length)return {i:null};
  const i=weighted(legal.map(i=>[i,i===3?(u.species==='voltish'?5:4):2]),r);
  return {i,target:weighted(foes.map(t=>[t.id,1]),r)};
}
// A transparent scripted planner using only public state. It never reads enemy orders.
// An upper-bound learning fixture, not a strong bot or a novice model.
function planPlayer(u,foes,reserved){
  const legal=options(u);if(!legal.length)return {i:null};
  const ctrl=legal.find(i=>u.moves[i].kind==='snare');
  if(ctrl!==undefined){
    const candidates=foes.filter(t=>!reserved.has(t.id)&&!t.snared&&t.moves.every(m=>m.range==='melee'||m.range==='self'));
    const target=candidates.find(t=>t.charge&&u.speed>t.speed) ?? candidates.find(t=>u.speed>t.speed&&t.species==='drilltail');
    if(target){reserved.add(target.id);return {i:ctrl,target:target.id};}
  }
  let best=null;
  for(const i of legal){const m=u.moves[i];if(m.kind!=='hit')continue;
    for(const target of foes){
      const d=damage(u,m,target);
      const score=d+Math.min(d,target.hp)/target.hp*5+(d>=target.hp?4:0)+(target.charge?2:0);
      if(!best||score>best.score)best={i,target:target.id,score};
    }
  }
  return best??{i:null};
}
function run(seed,{mode='planned',trace=false}={}){
 const random=rng(seed), log=[], summary=[], metrics={blocked:0,retargets:0,exhausted:0,knockouts:0,chargeReleased:0};
 const emit=s=>{if(trace)log.push(s);};
 let team=['graviclaw','avilily','crystorn','hippochamp'].map((s,i)=>unit(s,['G','A','C','H'][i],'P'));
 let revival=1, victory=true;
 for(let roomIndex=0;roomIndex<rooms.length;roomIndex++){
  if(roomIndex===3){for(const u of alive(team))u.hp=Math.min(u.max,u.hp+10);emit('Before boss: authored recovery station restores 10 HP to each standing creature.');}
  team.forEach(reset);
  const enemies=rooms[roomIndex].enemies.map(([s,id,hp])=>unit(s,id,'E',hp));
  // Random non-tactical row order, frozen for the encounter.
  for(const row of [team,enemies]){for(let j=row.length-1;j>0;j--){const k=Math.floor(random()*(j+1));[row[j],row[k]]=[row[k],row[j]];}row.forEach((u,j)=>u.slot=j);}
  emit(`\n## ${rooms[roomIndex].name}\nRows: squad ${team.map(u=>u.id).join(', ')}; enemy ${enemies.map(u=>u.id).join(', ')}.\nStart: ${team.map(u=>`${u.id} ${u.hp}/${u.max}`).join('; ')}.`);
  let round=0;
  while(alive(team).length&&alive(enemies).length&&round<20){
   round++;
   const everyone=[...alive(team),...alive(enemies)];
   // Side-neutral rotating tie priority established before selecting either team's orders.
   const tie=[...everyone].sort((a,b)=>a.id.localeCompare(b.id));
   const rotated=tie.slice((round-1)%tie.length).concat(tie.slice(0,(round-1)%tie.length));
   const order=[...everyone].sort((a,b)=>b.speed-a.speed||rotated.indexOf(a)-rotated.indexOf(b));
   const plans=new Map();
   for(const e of alive(enemies)){
    const plan=planEnemy(e,alive(team),random);
    // Authored teaching openings: required concepts must actually appear.
    // Targets remain random and later actions/boss behavior remain weighted.
    if(round===1&&['A2','C2','V3'].includes(e.id))plan.i=3;
    plans.set(e.id,plan);
   }
   const reserved=new Set();
   for(const p of alive(team)){
    let pl=planPlayer(p,alive(enemies),reserved);
    if(mode==='spam'){
      const choice=options(p).find(i=>i<3&&p.moves[i].kind==='hit');
      pl=choice===undefined?{i:null}:{i:choice,target:alive(enemies)[0].id};
    }
    plans.set(p.id,pl);
   }
   emit(`\n### Round ${round}\nCommitted squad: ${alive(team).map(p=>{const q=plans.get(p.id);return `${p.id}: ${q.i===null?'wait':p.moves[q.i].name+' -> '+q.target}`;}).join('; ')}.\nFacilitator-only hidden orders: ${alive(enemies).map(p=>{const q=plans.get(p.id);return `${p.id}: ${q.i===null?'wait':(q.release?'release ': '')+p.moves[q.i].name+' -> '+q.target}`;}).join('; ')}.`);
   for(const u of order){
    if(!alive(team).length||!alive(enemies).length)break;
    if(u.hp<=0){emit(`${u.id}: knocked out before action.`);continue;}
    const pl=plans.get(u.id),snared=!!u.snared;
    // Ward protects until the beginning of the owner's next opportunity.
    u.ward=false;
    if(pl.i===null){if(!u.uses.some(v=>v>0))metrics.exhausted++;emit(`${u.id}: no usable attack; wait (prototype exhaustion fallback).`);}
    else {
      const m=u.moves[pl.i];
      if(snared&&m.range==='melee'){
        metrics.blocked++;emit(`${u.id}: ${m.name} blocked by Snare; ${pl.release?'charged release lost; original signature already spent':'no use spent'}.`);
        if(pl.release)u.charge=null;
      } else {
        const targets=u.side==='P'?enemies:team;
        let target=targets.find(t=>t.id===pl.target);
        if(m.kind!=='ward'&&(!target||target.hp<=0)){
          const start=target?.slot??-1;
          target=Array.from({length:targets.length},(_,j)=>targets[(start+1+j)%targets.length]).find(t=>t.hp>0);
          if(target){metrics.retargets++;emit(`${u.id}: retargets to ${target.id}.`);}
        }
        if(m.kind==='ward'){u.uses[pl.i]--;u.ward=true;emit(`${u.id}: ${m.name}, halves incoming damage until its next opportunity.`);}
        else if(target){
          if(!pl.release)u.uses[pl.i]--;
          if(m.kind==='snare'){target.snared=Math.max(target.snared,1);emit(`${u.id}: ${m.name} restrains ${target.id} through its next opportunity.`);}
          else if(m.kind==='charge'&&!pl.release){u.charge=target.id;emit(`${u.id}: spends signature use charging; target remains hidden until release.`);}
          else {const d=damage(u,m,target);target.hp=Math.max(0,target.hp-d);if(pl.release){u.charge=null;metrics.chargeReleased++;}emit(`${u.id}: ${m.name} -> ${target.id}, ${d} damage; ${target.hp} HP remains.`);if(target.hp===0){metrics.knockouts+=target.side==='P'?1:0;emit(`${target.id}: knocked out.`);}}
        }
      }
    }
    if(snared)u.snared=Math.max(0,u.snared-1);
    assert.ok(u.uses.every(n=>n>=0));
   }
  }
  const won=alive(enemies).length===0;
  emit(`\nResult: ${won?'won':'lost/unresolved'} in ${round} rounds. Squad: ${team.map(u=>`${u.id} ${u.hp}/${u.max}`).join('; ')}.`);
  summary.push({room:roomIndex+1,rounds:round,won,hp:Object.fromEntries(team.map(u=>[u.id,u.hp]))});
  if(!won){victory=false;break;}
  if(revival&&roomIndex<3){const down=team.find(u=>u.hp<=0);if(down){down.hp=Math.ceil(down.max/2);revival--;emit(`Emergency revival: ${down.id} returns at ${down.hp} HP; none remain.`);}}
 }
 return {seed,mode,victory,revivalRemaining:revival,summary,metrics,log};
}
// Targeted mechanic checks independent of whether a policy wins.
assert.equal(matrix.Electric.Sand,0);
assert.equal(matrix.Water.Sand,1.5);
assert.equal(matrix.Dark.Light,2);
const restrained=unit('avilily','test','P');restrained.snared=1;
assert.deepEqual(options(restrained),[2]);
for(const t of Object.values(templates))assert.equal(t.moves.length,4);
const guidePath=out+'README.md';
if(fs.existsSync(guidePath)){
  const guide=fs.readFileSync(guidePath,'utf8');
  const columns=['Dark','Plant','Light','Water','Sand','Electric'];
  for(const element of columns){
    const row=guide.split('\n').find(line=>line.startsWith(`| ${element} |`));
    assert.ok(row,`Missing matchup row: ${element}`);
    const cells=row.split('|').slice(2,-1).map(x=>Number(x.trim()));
    assert.deepEqual(cells,columns.map(defender=>matrix[element][defender]),`Incorrect guide matchup: ${element}`);
  }
}
const runs=Array.from({length:200},(_,i)=>run(i+1));
const spam=Array.from({length:200},(_,i)=>run(i+1,{mode:'spam'}));
const best=runs.find(r=>r.victory&&r.metrics.blocked&&r.metrics.retargets)??runs[0];
const worst=[...runs].sort((a,b)=>Number(a.victory)-Number(b.victory)||b.metrics.knockouts-a.metrics.knockouts||a.summary.length-b.summary.length||Object.values(a.summary.at(-1).hp).reduce((s,v)=>s+v,0)-Object.values(b.summary.at(-1).hp).reduce((s,v)=>s+v,0))[0];
const brief=list=>({runs:list.length,wins:list.filter(r=>r.victory).length,knockoutRuns:list.filter(r=>r.metrics.knockouts>0).length,exhaustionEvents:list.reduce((s,r)=>s+r.metrics.exhausted,0),unfinishedAtRoundLimit:list.filter(r=>r.summary.some(s=>!s.won&&s.rounds===20)).length});
const result={note:'Scripted paper fixture; not human playtest or final balance. Seeds 1..200; two policies, same squad. Teaching demonstration policy knows the published behavior families but never reads chosen hidden orders.',planned:brief(runs),spam:brief(spam),sample:{...best,log:undefined},adverse:{...worst,log:undefined},templates,rooms};
fs.writeFileSync(out+'results.json',JSON.stringify(result,null,2)+'\n');
for(const [name,r] of [['sample-run',best],['adverse-run',worst]])fs.writeFileSync(out+name+'.md',`# ${name}: seed ${r.seed}\n\nFacilitator answer key. Hide future enemy orders from the player.\n`+run(r.seed,{trace:true}).log.join('\n')+'\n');
console.log(JSON.stringify({planned:result.planned,spam:result.spam,sampleSeed:best.seed,adverseSeed:worst.seed},null,2));
