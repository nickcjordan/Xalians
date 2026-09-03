// Parameterized redundancy-rejection extractor. Usage: node extract-redundancy-rejections2.js <element>
// Handles pipe-table matrices AND prose-style matrix rows (some composers write rows as prose).
const fs=require('fs');
const el=process.argv[2];
if(!el){console.error('usage: node extract-redundancy-rejections2.js <element>');process.exit(1);}
const RX=/redundan|already covered|covers this|duplicative|near-duplicate/i;
const out=[];
for(const letter of ['a','b','c','d']){
  const f=`composed-${el}-v5-${letter}.md`;
  if(!fs.existsSync(f)){out.push(`!! MISSING FILE ${f}`);continue;}
  const lines=fs.readFileSync(f,'utf8').split('\n');
  let cols=null, matrix='';
  for(const ln of lines){
    const h=ln.match(/^#+\s*(.*matrix.*)/i); if(h){matrix=h[1]; cols=null; continue;}
    if(ln.startsWith('|')){
      const cells=ln.split('|').slice(1,-1).map(s=>s.trim());
      if(/^-+$/.test(cells[1]||'')) continue;
      if(!cols){ if(/word/i.test(cells[0])){cols=cells.slice(1);} continue; }
      const row=cells[0].replace(/\(.*?\)/g,'').trim();
      cells.slice(1).forEach((c,i)=>{
        if(/^[DXG]\b/.test(c) && RX.test(c)){
          out.push(`${letter} | ${matrix.split(' ')[0]} | ${row} ${cols[i]||'?'} :: ${c.slice(0,100)}`);
        }
      });
    } else if(matrix && RX.test(ln) && /\bD\b|\bX\b|\bG\b/.test(ln)){
      // prose-style matrix row: dump raw line (truncated) for merger disposition
      out.push(`${letter} | ${matrix.split(' ')[0]} | PROSE :: ${ln.trim().slice(0,220)}`);
    }
  }
}
fs.writeFileSync(`redundancy-rejections-${el}.txt`,out.join('\n')+'\n');
console.log(`wrote redundancy-rejections-${el}.txt: ${out.length} lines`);
