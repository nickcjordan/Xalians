"""R06 side-profile rows from a quick-preview directory or an assembly render.

  python art/species-construction/loop/r06_rows.py <dir-with-left.png-and-geometry.json>

Prints R06.6 to R06.8 (row_measures, the same code the packet uses) and, per fit row, the model's left-view
trunk run (front edge, back edge, depth) beside the sheet's and the R06 spec's target rows.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import loop_tools as lt
import row_measures as rm

RUBRIC = json.loads(lt.RUBRIC.read_text(encoding='utf-8'))
SPEC = json.loads((lt.ROOT/'art/species-construction/specs/torso-reshape-r06-v3.json').read_text())
TARGET = {r[0]: (r[3], r[4]) for r in SPEC['edges']}


def main():
    d = Path(sys.argv[1])
    d = d if d.is_absolute() or d.exists() else lt.WORK/d
    render = d/'render' if (d/'render').is_dir() else d
    model = rm.load_mask(render/'left.png')
    mf = rm.mask_frame(model, lt.model_span(render, 'left'))
    ref = lt.reference_figure('left')
    rf = rm.mask_frame(ref)
    for c in RUBRIC['regions']['R06']:
        if c['kind'] == 'measured' and c['source'] in ('row', 'rowratio', 'edge'):
            m, s, v = rm.evaluate(c, model, mf, ref, rf)
            print(c['id'], 'model', m and round(m, 4), 'sheet', s and round(s, 4), 'value', v)
    print(' y    model front/back/depth     sheet front/back/depth    target front/back')
    for y in [.24, .26, .28, .30, .32, .34, .36, .38, .40, .42, .44, .46, .48, .50, .52]:
        a, b = rm.pick_run(model, mf, y, 'left'), rm.pick_run(ref, rf, y, 'left')
        t = TARGET.get(round(y, 2), (0, 0))
        print(f'{y:.2f}  {a["start"]:+.3f} {a["end"]:+.3f} {a["width"]:.3f}      {b["start"]:+.3f} {b["end"]:+.3f} {b["width"]:.3f}      {t[0]:+.3f} {t[1]:+.3f}')


main()
