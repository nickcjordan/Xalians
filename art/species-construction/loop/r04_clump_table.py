"""Make art/species-construction/specs/r04_clumps.json from the clump tables of specs/R04.md (section 2).

Run: python art/species-construction/loop/r04_clump_table.py
Each clump: name, side (L/R/C), row (K,I,M,T,E,C), layer, path (4 control points (x_back, y, df) in fit units),
length, widthRoot, widthMid, thick, dirRoot, dirTip. Coordinates are the spec's back-view fit units.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
text = (ROOT/'docs/design/species-construction/akinza/loop/specs/R04.md').read_text(encoding='utf-8')
rows = []
pt = r'\(\s*([+-]?[\d.]+),\s*([+-]?[\d.]+),\s*([+-]?[\d.]+)\)'
pat = re.compile(r'^\|\s*([A-Z]+\d+)\s*\|\s*(\d)\s*\|\s*'+r'\s*\|\s*'.join([pt]*4)+
                 r'\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*/\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([+-]?\d+)\s*/\s*([+-]?\d+)\s*\|')
for line in text.splitlines():
    m = pat.match(line)
    if not m:
        continue
    g = m.groups()
    name = g[0]
    nums = [float(v) for v in g[2:14]]
    path = [nums[i:i+3] for i in range(0, 12, 3)]
    length, wr, wm, th, d0, d1 = (float(v) for v in g[14:20])
    row = re.match(r'[LR]?([A-Z]+)', name).group(1)
    side = name[0] if name[0] in 'LR' and row != name[:len(row)] else 'C'
    if name[0] == 'C':
        side, row = 'C', 'C'
    rows.append({'name': name, 'side': side, 'row': row, 'layer': int(g[1]), 'path': path, 'length': length,
                 'widthRoot': wr, 'widthMid': wm, 'thick': th, 'dirRoot': d0, 'dirTip': d1})
out = ROOT/'art/species-construction/specs/r04_clumps.json'
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps({'source': 'docs/design/species-construction/akinza/loop/specs/R04.md section 2', 'clumps': rows}, indent=1)+'\n')
from collections import Counter
print(len(rows), Counter((r['side'], r['row']) for r in rows))
