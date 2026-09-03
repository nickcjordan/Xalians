const fs=require('fs');
const t=fs.readFileSync('draft-consolidated-dark-v5.md','utf8');
const cellsSec=t.split('## 2. Restoration ledger')[0];
const parts=cellsSec.split(/^### /m).slice(1);
const map={},tags={},duals={};
for(const p of parts){
  const cell=p.match(/^([A-Z]+)/)?.[1]; if(!cell)continue;
  const body=p.slice(p.indexOf('\n'));
  for(const line of body.split('\n')){
    const l=line.trim();
    if(!l||!l.includes(' . '))continue;
    for(let raw of l.split(' . ')){
      raw=raw.trim(); if(!raw)continue;
      const tag=raw.match(/\[.*?\]/)?.[0]||'';
      const dual=raw.match(/\(dual:[^)]*\)/)?.[0]||'';
      let n=raw.replace(/\[.*?\]/g,'').replace(/\(dual:[^)]*\)/g,'').replace(/°/g,'').trim();
      if(!n)continue;
      if(tag)tags[n]=tag; if(dual)duals[n]=dual;
      (map[cell]=map[cell]||[]).push(n);
    }
  }
}
for(const c in map)map[c]=[...new Set(map[c])];

// duplicate resolutions: name -> keep cell
const keepIn={
 'Void Ram':'STRIKE','Gravity Ram':'STRIKE','Mass Ram':'STRIKE','Void Smash':'STRIKE',
 'Gravity Charge':'STRIKE','Void Charge':'STRIKE','Mass Charge':'STRIKE','Singularity Charge':'STRIKE',
 'Gravity Tackle':'STRIKE','Void Tackle':'STRIKE','Mass Tackle':'STRIKE',
 'Gravity Clout':'STRIKE','Void Clout':'STRIKE','Mass Clout':'STRIKE',
 'Gravity Bash':'SHOVE','Void Bash':'SHOVE',
 'Gravity Heave':'SHOVE','Void Heave':'SHOVE','Mass Heave':'SHOVE',
 'Gravity Snap':'LASH','Void Snap':'LASH',
 'Gravity Grip':'SNARE','Mass Grip':'SNARE','Singularity Grip':'SNARE','Void Clutch':'SNARE','Void Coil':'SNARE',
 'Gravity Wring':'CRUSH','Void Wring':'CRUSH','Mass Wring':'CRUSH','Void Squeeze':'CRUSH','Density Squeeze':'CRUSH','Void Buckle':'CRUSH',
 'Gravity Absorb':'DRAIN','Void Absorb':'DRAIN','Gravity Wither':'DRAIN','Void Wither':'DRAIN',
 'Gravity Barrage':'HURL','Void Barrage':'HURL','Mass Barrage':'HURL','Gravity Volley':'HURL','Void Volley':'HURL','Mass Volley':'HURL',
 'Gravity Repel':'WARD','Void Repel':'WARD',
 'Gravity Presence':'TERRORIZE','Void Presence':'TERRORIZE','Reckoning':'TERRORIZE',
 'Horizon Veil':'CLOUD','Void Discharge':'SPRAY','Void Talon':'RAKE'
};
for(const[n,keep]of Object.entries(keepIn))for(const c in map)if(c!==keep)map[c]=map[c].filter(x=>x!==n);

// audit cuts
const cuts=new Set(['Gravity Swat','Void Swat','Void Fright','Gravity Cow','Gravity Dread','Void Wither Grip','Void Sap Grip']);
const waterRoots=['Eddy','Maelstrom','Whirlpool'];
for(const c in map)map[c]=map[c].filter(n=>{
  if(cuts.has(n))return false;
  const first=n.split(' ')[0];
  if(waterRoots.includes(first))return false;
  if(/Roundhouse|Windmill/.test(n))return false;
  return true;
});

// tag Void Coil with coils in snare
tags['Void Coil']=tags['Void Coil']||'[coils]';

const order2=['strike','lash','crush','rake','shove','drain','ambush','beam','hurl','spray','burst','cloud','snare','ward','mend','terrorize'];
let out='',total=0;
for(const c of order2){
  const C=c.toUpperCase(); const ns=map[C]||[]; total+=ns.length;
  const line=ns.map(n=>{let s=n; if(tags[n])s+=' '+tags[n]; if(duals[n])s+=' '+duals[n]; return s;}).join(' · ');
  out+=`**${c} (${ns.length}):** ${line}\n\n`;
}
fs.writeFileSync('C:/tmp/final-dark-cells.md',out);
console.log('total:',total);
for(const c of order2)console.log(c,(map[c.toUpperCase()]||[]).length);
// verify no cross-cell dupes remain
const where={};
for(const[c,ns]of Object.entries(map))for(const n of ns)(where[n]=where[n]||[]).push(c);
const rem=Object.entries(where).filter(([n,cs])=>cs.length>1);
console.log('remaining dupes:',rem.length, rem.slice(0,10).map(([n,cs])=>n+'('+cs+')').join('; '));
