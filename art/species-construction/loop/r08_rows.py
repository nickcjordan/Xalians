"""R08 row criteria (and a width profile) straight from a quick-preview directory or an assembly render.

  python art/species-construction/loop/r08_rows.py <dir-with-front.png-and-geometry.json> [--profile]

Prints the criterion values R08.5 to R08.8 using row_measures, the same code the packet uses, so a builder can
check leg widths after each quick preview without assembling. With --profile it prints the front and back
leg widths per height beside the sheet's.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import loop_tools as lt
import row_measures as rm

RUBRIC = json.loads(lt.RUBRIC.read_text(encoding='utf-8'))


def main():
    d = Path(sys.argv[1])
    d = d if d.is_absolute() or d.exists() else lt.WORK/d
    render = d/'render' if (d/'render').is_dir() else d
    cache = {}
    for v in ('front', 'back'):
        model = rm.load_mask(render/f'{v}.png')
        ref = lt.reference_figure(v)
        cache[v] = (model, rm.mask_frame(model, lt.model_span(render, v)), ref, rm.mask_frame(ref))
    for c in RUBRIC['regions']['R08']:
        if c['kind'] == 'measured' and c['source'] in ('row', 'rowratio'):
            m, s, ratio = rm.evaluate(c, *cache[c['view']])
            print(c['id'], 'model', m and round(m, 4), 'sheet', s and round(s, 4), 'ratio', ratio, 'max', c.get('max'),
                  'PASS' if ratio is not None and ratio <= c['max'] else 'fail')
    if '--profile' in sys.argv:
        for v, pick in (('front', 'left'), ('back', 'right')):
            model, mf, ref, rf = cache[v]
            print(v, 'y: model width / sheet width, model start,end')
            for y in [.66, .70, .74, .76, .78, .80, .82, .84, .86, .88, .90, .92, .93]:
                a, b = rm.pick_run(model, mf, y, pick), rm.pick_run(ref, rf, y, pick)
                print(f'  {y:.2f}  {a["width"]:.3f} / {b["width"]:.3f}   [{a["start"]:.3f},{a["end"]:.3f}] vs [{b["start"]:.3f},{b["end"]:.3f}]')


main()
