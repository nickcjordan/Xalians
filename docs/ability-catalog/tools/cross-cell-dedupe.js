const fs=require('fs');
const t=fs.readFileSync('draft-consolidated-dark-v5.md','utf8');
const cellsSec=t.split('## Restoration ledger')[0];
const parts=cellsSec.split(/^### /m).slice(1);
const map={};
for(const p of parts){
  const cell=p.match(/^([A-Z]+)/)?.[1];
  if(!cell)continue;
  const body=p.slice(p.indexOf('\n'));
  const names=[];
  for(const line of body.split('\n')){
    const l=line.trim();
    if(!l||l.startsWith('Note:')||l.startsWith('*('))continue;
    if(!l.includes('·'))continue;
    for(let n of l.split('·')){
      n=n.trim().replace(/\[.*?\]/g,'').trim();
      if(!n)continue;
      names.push(n);
    }
  }
  map[cell]=(map[cell]||[]).concat(names);
}
const where={};
for(const[c,ns]of Object.entries(map))for(const n of ns){
  const key=n.replace(/°$/,'').trim();
  (where[key]=where[key]||[]).push(c+(n.endsWith('°')?'(r)':'(o)'));
}
let d=0;
for(const[n,cs]of Object.entries(where))if(cs.length>1){console.log(n,'=>',cs.join(', '));d++;}
console.error('cells:',Object.keys(map).map(c=>c+':'+map[c].length).join(' '));
console.error('dupes:',d);
