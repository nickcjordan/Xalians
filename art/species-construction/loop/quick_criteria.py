"""Measured rubric criteria on a plan variant's quick render, before any variant is assembled, and the progress term
that ranks variants by them.

Round 21's torso plan showed why the ranking needs this: its seven planned ideas each moved three R06 criteria
toward their bounds, but the quick terms (silhouette overlap, stations) barely see a torso change, so the ranking was
decided by the tool score and a seam charge, and the top three were small sweep settings, the first of them a near copy
of the baseline. The criteria the order is about are the measure of progress; this module computes the ones a quick
render can carry:

  fit, row, rowratio, edge   from the quick folder's fit.json and view images (the same code as the packet)
  measure (earSpan)          from the quick view image, as the packet's measurements.json
  measure (waist, hips)      from torso_sections.py on the body sink, as the packet does on the assembly
  trunk                      from mesh sections of the body sink (the assembly leaves the trunk where the body has it;
                             checked on body-2355 against assembled-2366: every row within 5e-5 of figure height)

Criteria from 'posed' and 'measure' need the assembled packet and are left to the candidate stage.

    python art/species-construction/loop/quick_criteria.py <quick dir> <body dir> R06 [R05 ...]   (prints the values)
"""
import json
import sys
from pathlib import Path

QUICK_SOURCES = ('fit', 'row', 'rowratio', 'edge', 'trunk', 'measure')
BODY_MEASURE_KEYS = ('waist', 'hips')   # read from body mesh sections; neck and shoulders need the join, so the packet
FLIP_WEIGHT = 1.0      # points per criterion that starts passing (minus per one that stops)
DIST_WEIGHT = 10.0     # points per 1.0 of relative distance to the bound closed (10 percent closer is one point)
STILL = .002           # a criterion moving less than this relative amount counts as unchanged


def criteria(lt, regions):
    rubric = json.loads(Path(lt.RUBRIC).read_text(encoding='utf-8'))
    return [(region, c) for region in regions for c in rubric['regions'].get(region, [])
            if c['kind'] == 'measured' and c['source'] in QUICK_SOURCES]


def section_dump(lt, body_dir, script, prefix):
    """Mesh sections of the body sink, made once per body. Kept in sweep_quick, not in the body folder: build outputs stay as built."""
    body_dir = Path(body_dir)
    dump = lt.WORK/'sweep_quick'/f'{prefix}-{body_dir.name}.json'
    if not dump.exists():
        lt.run_blender(['--factory-startup', '--python', str(lt.CONSTRUCTION/script), '--',
                        '--mesh', str(body_dir/'shape.glb'), '--out', str(dump)], lt.WORK/f'{body_dir.name}-{prefix}.log')
    return dump


def measure_ratio(lt, c, quick_dir, body_dir, memo):
    """The packet's measurements.json ratio for one key, model over reference, from the quick folder and body sink."""
    import numpy as np
    from PIL import Image
    view, key = c['view'], c['key']
    if key not in ('earSpan',)+BODY_MEASURE_KEYS:
        raise ValueError(f'{key} needs the assembled join; measured at the candidate stage')
    if 'ref' not in memo:
        memo['ref'] = np.array(Image.open(lt.SPECIES.docs/lt.SPECIES['referenceSheet']).convert('L')) < 200
    a, b = lt.REFERENCE_PANELS[view]
    ref = lt.named(lt.width_profile(memo['ref'][:, a:b]))
    if key == 'earSpan':
        mask = np.array(Image.open(Path(quick_dir)/f'{view}.png').getchannel('A')) > 20
        model = lt.named(lt.width_profile(mask, lt.model_span(Path(quick_dir), view), lt.model_center(Path(quick_dir), view)))
    else:
        if 'torso' not in memo:
            memo['torso'] = json.loads(section_dump(lt, body_dir, 'torso_sections.py', 'torso').read_text(encoding='utf-8'))
        col = 'width' if view == 'front' else 'depth'
        model = lt.named([{'at': r['at'], 'central': r[col] or 0, 'full': 0} for r in memo['torso']['rows']])
    return round(model[key]/ref[key], 3) if ref[key] and model[key] else None


def evaluate(lt, quick_dir, body_dir, regions):
    """{criterion id: {'region', 'value', 'min', 'max', 'result'}} for the quick-computable criteria of `regions`."""
    import row_measures
    import trunk_edges
    quick_dir = Path(quick_dir)
    picked = criteria(lt, regions)
    if not picked:
        return {}
    fit = json.loads((quick_dir/'fit.json').read_text(encoding='utf-8'))
    model_table = sheet_table = None
    memo, out = {}, {}
    for region, c in picked:
        try:
            if c['source'] == 'measure':
                value = measure_ratio(lt, c, quick_dir, body_dir, memo)
            elif c['source'] == 'fit':
                value = fit['views'][c['view']][c['band']][c['metric']]
            elif c['source'] == 'trunk':
                if model_table is None:
                    model_table = trunk_edges.load_model(section_dump(lt, body_dir, 'trunk_edge_sections.py', 'trunk'), lt.SPECIES['frame']['centerLine']['left'], lt.FIXED_HEIGHT)
                    sheet_table = trunk_edges.sheet_table(lt.DOCS/'loop/trunk-profile-sheet.json')
                _, _, value = trunk_edges.evaluate(c, model_table, sheet_table)
            else:
                view = c['view']
                model = row_measures.load_mask(quick_dir/f'{view}.png')
                ref = lt.reference_figure(view)
                _, _, value = row_measures.evaluate(c, model, row_measures.mask_frame(model, lt.model_span(quick_dir, view), lt.model_center(quick_dir, view)),
                                                    ref, row_measures.mask_frame(ref))
        except Exception as error:  # a criterion the quick render cannot read is skipped, not fatal
            out[c['id']] = {'region': region, 'value': None, 'error': str(error)[:200]}
            continue
        ok = value is not None and c.get('min', -1e9) <= value <= c.get('max', 1e9)
        out[c['id']] = {'region': region, 'value': None if value is None else round(float(value), 5),
                        'min': c.get('min'), 'max': c.get('max'), 'result': 'pass' if ok else 'fail'}
    return out


def distance(c):
    """Relative distance outside the bound (0 inside it)."""
    v = c.get('value')
    if v is None:
        return None
    lo, hi = c.get('min'), c.get('max')
    if lo is not None and v < lo:
        return (lo-v)/max(abs(lo), 1e-6)
    if hi is not None and v > hi:
        return (v-hi)/max(abs(hi), 1e-6)
    return 0.0


def progress(base, cand):
    """(points, detail): criteria that start passing or stop, and distance to the bounds closed or opened."""
    flips, closed, moved, rows = 0, 0.0, False, []
    for cid, a in cand.items():
        b = base.get(cid)
        if not b or a.get('value') is None or b.get('value') is None:
            continue
        if abs(a['value']-b['value']) > STILL*max(abs(b['value']), 1e-6):
            moved = True
        flip = (a['result'] == 'pass')-(b['result'] == 'pass')
        gain = distance(b)-distance(a)
        flips += flip
        closed += gain
        if flip or abs(gain) > 1e-4:
            rows.append(f"{cid} {b['value']}->{a['value']} {b['result']}->{a['result']}")
    return round(FLIP_WEIGHT*flips+DIST_WEIGHT*closed, 3), {'flips': flips, 'closed': round(closed, 4), 'moved': moved, 'rows': rows}


if __name__ == '__main__':
    sys.path.insert(0, str(Path(__file__).parent))
    import loop_tools
    print(json.dumps(evaluate(loop_tools, sys.argv[1], sys.argv[2], sys.argv[3:]), indent=1))
