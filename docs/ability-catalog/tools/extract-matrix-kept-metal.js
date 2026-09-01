// Extract K-coded (row x column) names from a v5 composer file's synonym cross matrices.
// Usage: node extract-matrix-kept-metal.js <file.md> <outdir>
const fs = require('fs');
const path = require('path');

const file = process.argv[2];
const outdir = process.argv[3] || '.';
const text = fs.readFileSync(file, 'utf8');

// Find all "### <CELL> matrix" sections and their preceding "Columns:" line
const sectionRe = /^### (\w+) matrix\s*$/gm;
const matches = [...text.matchAll(sectionRe)];

const result = {};

for (let i = 0; i < matches.length; i++) {
  const cellName = matches[i][1].toUpperCase();
  const start = matches[i].index;
  const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
  const block = text.slice(start, end);

  // find Columns: line
  const colMatch = block.match(/Columns:\s*(.+)/);
  if (!colMatch) { console.error('NO COLUMNS for', cellName); continue; }
  let colsLine = colMatch[1].trim();
  // columns separated by ' / '
  const columns = colsLine.split(' / ').map(c => c.trim().replace(/\.$/, ''));

  // find table rows: | Word | pattern |
  const rowRe = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/gm;
  let rowMatchArr;
  const kept = [];
  let rowCount = 0;
  while ((rowMatchArr = rowRe.exec(block)) !== null) {
    const rowWord = rowMatchArr[1].trim();
    if (rowWord === 'Row (METAL word)' || rowWord === '---' || rowWord.startsWith('Row')) continue;
    const pattern = rowMatchArr[2].trim();
    if (!pattern.includes(',')) continue; // not a verdict row
    const codes = pattern.split(',').map(c => c.trim());
    rowCount++;
    for (let ci = 0; ci < codes.length && ci < columns.length; ci++) {
      if (codes[ci] === 'K') {
        kept.push(`${rowWord} ${columns[ci]}`);
      }
    }
  }
  result[cellName] = { kept, rowCount, colCount: columns.length };
}

const base = path.basename(file, '.md');
for (const [cell, data] of Object.entries(result)) {
  console.log(`${base} ${cell}: rows=${data.rowCount} cols=${data.colCount} kept=${data.kept.length}`);
}
fs.writeFileSync(path.join(outdir, base + '.matrix-kept.json'), JSON.stringify(result, null, 1));
