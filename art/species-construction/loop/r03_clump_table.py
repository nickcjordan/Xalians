"""Make art/species-construction/specs/r03_clumps.json from the clump tables of specs/R03.md (section 2).

Run: python art/species-construction/loop/r03_clump_table.py
Each clump: name, side (L/R), family (P primary, S secondary, D drape, T tuft), layer, root and tip as (x, y, df) in the spec's
FIT frame (x across, positive to the viewer's right in the front view; y down from the crown; df the clump's front face depth,
positive rearward), length, dir, curl (degrees), widthRoot, widthMid, thick, taper, rootOn (rim edge and arc fraction s).
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
text = (ROOT/'docs/design/species-construction/akinza/loop/specs/R03.md').read_text(encoding='utf-8')
pt = r'\(\s*([+-]?[\d.]+),\s*([+-]?[\d.]+),\s*([+-]?[\d.]+)\)'
pat = re.compile(r'^\|\s*([LR][PSDT]\d+)\s*\|\s*(\d)\s*\|\s*'+pt+r'\s*\|\s*'+pt+r'\s*\|\s*([\d.]+)\s*\|\s*([+-]?\d+)\s*/\s*([+-]?\d+)\s*\|'
                 r'\s*([\d.]+)\s*/\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([^|]+?)\s*\|')
rows = []
for line in text.splitlines():
    m = pat.match(line)
    if not m:
        continue
    g = m.groups()
    name = g[0]
    n = [float(v) for v in g[2:8]]
    length, d, curl, wr, wm, th, taper = (float(v) for v in g[8:15])
    rows.append({'name': name, 'side': name[0], 'family': name[1], 'layer': int(g[1]), 'root': n[:3], 'tip': n[3:6], 'length': length,
                 'dir': d, 'curl': curl, 'widthRoot': wr, 'widthMid': wm, 'thick': th, 'taper': taper, 'rootOn': g[15]})
out = ROOT/'art/species-construction/specs/r03_clumps.json'
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps({'source': 'docs/design/species-construction/akinza/loop/specs/R03.md section 2', 'clumps': rows}, indent=1)+'\n')
from collections import Counter
print(len(rows), Counter((r['side'], r['family']) for r in rows))
