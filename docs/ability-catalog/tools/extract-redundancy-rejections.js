const fs=require('fs');
for(const f of ['composed-dark-v5-a.md','composed-dark-v5-b.md','composed-dark-v5-c.md','composed-dark-v5-d.md']){
  const lines=fs.readFileSync(f,'utf8').split('\n');
  let cols=null, matrix='';
  for(const ln of lines){
    const h=ln.match(/^#+\s*(.*matrix.*)/i); if(h){matrix=h[1]; cols=null; continue;}
    if(!ln.startsWith('|')) continue;
    const cells=ln.split('|').slice(1,-1).map(s=>s.trim());
    if(/^-+$/.test(cells[1]||'')) continue;
    if(!cols){ if(/word/i.test(cells[0])){cols=cells.slice(1);} continue; }
    const row=cells[0].replace(/\(.*?\)/g,'').trim();
    cells.slice(1).forEach((c,i)=>{
      if(/^[DXG]\b/.test(c) && /redundan|already covered|covers this|weaker than|undersell/i.test(c)){
        console.log(`${f.slice(16,17)} | ${matrix.split(' ')[0]} | ${row} ${cols[i]||'?'} :: ${c.slice(0,80)}`);
      }
    });
  }
}
