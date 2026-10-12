"""Shared sheet measurement: one trace of the reference sheet, one comparable trace of a model.

  sheet <species>                     writes <species>/loop/sheet.json and sheet.png (committed)
  model <assembly> [--out path]       writes stations.json: the model's outlines and station
                                      tables from its renders, with a per-row difference
                                      against sheet.json
  check <assembly>                    compares station-table values with the rubric's row,
                                      rowratio and edge criteria and with the packet's measured.json

Frames. Every outline is in the frame `fit` uses: figure height 1, y=0 at the crown and
y=1 at the floor, x in figure heights from the centre column (the widest row in the top
fifth, as in loop_tools.canonical). Station tables use row_measures' own frame and run
logic on the unfilled mask, so a station value is exactly what a `row` criterion reads.
For the model the figure height is the fixed world height (loop_tools.model_span).
Station widths and offsets are fractions of figure height. A row's `left`, `right` and
`central` entries are row_measures picks ({start, end, width, centre} or null); `runs`
lists every run in the row.

sheet-landmarks.json (see landmark-brief.md) holds pixel positions on the evidence image;
they are carried into the frame as u=(x-cx)/height, v=(y-top)/height.
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
import row_measures  # noqa: E402
import loop_tools as lt  # noqa: E402

STEP = .02
TOLERANCE = .002
VIEW_IMAGE = {'front': 'identity-run-0001.png', 'left': 'identity-run-0001.png',
              'back': 'identity-run-0001.png', 'back-r03': 'back-study-0018.png'}


def species_docs(species):
    if species != 'akinza':
        raise SystemExit(f'no config for {species}; only akinza until species.json lands')
    return lt.DOCS


def moore_outline(mask):
    """Ordered outer boundary pixels of the largest component (Moore neighbour tracing)."""
    labels, count = ndimage.label(mask, structure=np.ones((3, 3)))
    sizes = ndimage.sum(mask, labels, range(1, count+1))
    big = labels == (1+int(np.argmax(sizes)))
    pad = np.pad(big, 1)
    ys, xs = np.where(pad)
    start = (ys.min(), xs[ys == ys.min()].min())
    ring = [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1)]
    pts, cur, back = [start], start, 6  # entered from the west (background)
    limit = int(pad.sum())*2
    while limit:
        limit -= 1
        for k in range(8):
            d = (back+1+k) % 8
            ny, nx = cur[0]+ring[d][0], cur[1]+ring[d][1]
            if pad[ny, nx]:
                cur, back = (ny, nx), (d+4) % 8
                break
        else:
            break
        if cur == start:
            break
        pts.append(cur)
    return np.array([(x-1, y-1) for y, x in pts], float), 1-float(sizes.max()/mask.sum())


def simplify(points, tol):
    """Douglas-Peucker on a closed polyline (split at the point farthest from the first)."""
    def dp(p):
        if len(p) < 3:
            return p
        a, b = p[0], p[-1]
        ab = b-a
        norm = np.hypot(*ab)
        rel = p-a
        d = np.abs(ab[0]*rel[:, 1]-ab[1]*rel[:, 0])/norm if norm else np.hypot(rel[:, 0], rel[:, 1])
        k = int(np.argmax(d))
        if d[k] <= tol:
            return np.array([a, b])
        return np.vstack([dp(p[:k+1])[:-1], dp(p[k:])])
    far = int(np.argmax(np.hypot(*(points-points[0]).T)))
    first, second = dp(points[:far+1]), dp(np.vstack([points[far:], points[:1]]))
    return np.vstack([first[:-1], second[:-1]])


def outline(mask, span, tol=TOLERANCE, center=None):
    filled = lt.fill_small_holes(mask)
    top, height, cx = row_measures.mask_frame(filled, span, center)
    pts, other = moore_outline(filled)
    unit = np.c_[(pts[:, 0]-cx)/height, (pts[:, 1]-top)/height]
    poly = simplify(unit, tol)
    return poly, {'top': float(top), 'height': float(height), 'cx': float(cx), 'otherComponentsFraction': round(other, 5)}, filled


def bands(filled, frame):
    top, height, cx = frame
    out = {}
    for name, (a, b) in lt.FIT_BANDS.items():
        r0, r1 = int(round(top+a*height)), int(round(top+b*height))
        ys, xs = np.where(filled[r0:r1])
        out[name] = {'range': [a, b], 'x': [round(float((xs.min()-cx)/height), 4), round(float((xs.max()-cx)/height), 4)],
                     'y': [round(float((ys.min()+r0-top)/height), 4), round(float((ys.max()+r0-top)/height), 4)]} if len(xs) else None
    return out


def pick(mask, frame, at, which):
    r = row_measures.pick_run(mask, frame, at, which)
    if r:
        r = {k: round(float(v), 5) for k, v in r.items()}
        r['centre'] = round((r['start']+r['end'])/2, 5)
    return r


def station_row(mask, frame, at):
    runs, cx, height = row_measures.runs_at(mask, frame, at)
    return {'at': round(float(at), 4),
            'left': pick(mask, frame, at, 'left'), 'right': pick(mask, frame, at, 'right'),
            'central': pick(mask, frame, at, 'central'),
            'runs': [[round(float((s-cx)/height), 5), round(float((e-cx)/height), 5)] for s, e in runs]}


def stations(mask, frame, step=STEP):
    return [station_row(mask, frame, a) for a in np.round(np.arange(0, 1+1e-9, step), 4)]


def view_record(mask, span, step, tol, center=None):
    # center: the model's fixed figure centreline (loop_tools.model_center), so a head change cannot shift body stations
    poly, info, filled = outline(mask, span, tol, center)
    frame = row_measures.mask_frame(mask, span, center)
    return {'frame': {**info, 'stationCx': float(frame[2])}, 'outline': np.round(poly, 5).tolist(),
            'bands': bands(filled, (info['top'], info['height'], info['cx'])),
            'stations': stations(mask, frame, step)}


def load_landmarks(docs):
    path = docs/'loop/sheet-landmarks.json'
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else None


def cmd_sheet(args):
    docs = species_docs(args.species)
    out = docs/'loop'
    record = {'schemaVersion': 1, 'species': args.species, 'step': args.step, 'outlineTolerance': TOLERANCE,
              'frame': 'x in figure heights from the centre column, y from the crown (0) to the floor (1)',
              'views': {}}
    marks = load_landmarks(docs)
    panels = []
    for view in lt.FIT_VIEWS:
        mask = lt.reference_figure(view)
        rec = view_record(mask, None, args.step, TOLERANCE)
        f = rec['frame']
        if marks and marks.get('views', {}).get(view):
            rec['landmarks'] = {}
            for name, p in marks['views'][view].items():
                rec['landmarks'][name] = None if p is None else [round((p[0]-f['cx'])/f['height'], 5), round((p[1]-f['top'])/f['height'], 5)]
        record['views'][view] = rec
        panels.append((view, mask, f, rec))
    (out/'sheet.json').write_text(json.dumps(record, separators=(',', ':'))+'\n')
    draw_overlay(panels, out/'sheet.png')
    print(json.dumps({'sheet': str(out/'sheet.json'), 'overlay': str(out/'sheet.png'),
                      'outlinePoints': {v: len(r['outline']) for v, _, _, r in panels}, 'landmarks': bool(marks)}))


def draw_overlay(panels, path):
    """Outline (red), station ticks every 0.1 (blue, left and right picks) and landmarks (green) over the reference."""
    tiles = []
    for view, mask, f, rec in panels:
        img = Image.open(lt.EVIDENCE/VIEW_IMAGE[view]).convert('RGB')
        top, height, cx = f['top'], f['height'], f['cx']
        rows = np.where(mask.any(axis=1))[0]
        cols = np.where(mask.any(axis=0))[0]
        box = (max(0, cols.min()-20), max(0, int(top)-20), min(img.width, cols.max()+20), min(img.height, rows.max()+20))
        d = ImageDraw.Draw(img)
        px = lambda x, y: (cx+x*height, top+y*height)
        pts = [px(*p) for p in rec['outline']]
        d.line(pts+[pts[0]], fill=(220, 30, 30), width=2)
        for s in rec['stations']:
            tenth = abs(s['at']*10-round(s['at']*10)) < 1e-6
            if not tenth:
                continue
            for key in ('left', 'right'):
                if s[key]:
                    for x in (s[key]['start'], s[key]['end']):
                        X, Y = px(x, s['at'])
                        d.line([(X-6, Y), (X+6, Y)], fill=(30, 80, 230), width=2)
            X, Y = px(0, s['at'])
            d.text((X, Y), f"{s['at']:.1f}", fill=(30, 80, 230))
        for name, p in (rec.get('landmarks') or {}).items():
            if p:
                X, Y = px(*p)
                d.ellipse([X-4, Y-4, X+4, Y+4], outline=(0, 160, 40), width=2)
                d.text((X+6, Y-5), name, fill=(0, 120, 30))
        tile = img.crop(box)
        d2 = ImageDraw.Draw(tile)
        d2.text((4, 4), view, fill=(0, 0, 0))
        k = 640/tile.height
        tiles.append(tile.resize((int(tile.width*k), 640)))
    h = max(t.height for t in tiles)
    sheet = Image.new('RGB', (sum(t.width for t in tiles), h), 'white')
    x = 0
    for t in tiles:
        sheet.paste(t, (x, 0))
        x += t.width
    sheet.quantize(96).save(path, optimize=True)


def diff_tables(model, sheet):
    out = []
    for m, s in zip(model, sheet):
        row = {'at': m['at']}
        for key in ('left', 'right', 'central'):
            a, b = m[key], s[key]
            row[key] = None if not (a and b) else {'width': round(a['width']-b['width'], 5),
                                                    'widthRatio': round(a['width']/b['width'], 4) if b['width'] else None,
                                                    'centre': round(a['centre']-b['centre'], 5)}
        out.append(row)
    return out


def model_render(assembly):
    source = Path(assembly)
    render = source if source.is_absolute() else lt.work(assembly)
    return render/'render' if (render/'render/geometry.json').exists() else render


def cmd_model(args):
    docs = species_docs(args.species)
    sheet = json.loads((docs/'loop/sheet.json').read_text())
    render = model_render(args.assembly)
    record = {'schemaVersion': 1, 'source': str(render), 'step': sheet['step'], 'outlineTolerance': TOLERANCE, 'views': {}}
    for view in lt.FIT_VIEWS:
        path = render/f"{view.split('-r03')[0]}.png"
        if not path.exists() or view not in sheet['views']:
            continue
        rec = view_record(row_measures.load_mask(path), lt.model_span(render, path.stem), sheet['step'], TOLERANCE, lt.model_center(render, path.stem))
        rec['differenceFromSheet'] = diff_tables(rec['stations'], sheet['views'][view]['stations'])
        record['views'][view] = rec
    out = Path(args.out) if args.out else (render.parent if render.name == 'render' else render)/'stations.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(record, separators=(',', ':'))+'\n')
    print(json.dumps({'stations': str(out), 'views': list(record['views'])}))


# ---- agreement with the rubric's row criteria, read through the station tables.

def table_width(table, spec, step):
    """Width from a station table the way row_measures.width reads a mask; heights off the
    table's grid return None (the caller then says the table is too coarse)."""
    at = spec['at']
    heights = np.round(np.arange(at[0], at[1]+1e-9, .005), 3) if isinstance(at, list) else [at]
    vals = []
    for h in heights:
        row = table.get(round(float(h), 4))
        if row is None:
            return None
        r = row[spec.get('pick', 'central')]
        if r:
            vals.append(r['width'])
    if not vals:
        return 'none'
    return min(vals) if spec.get('reduce', 'min') == 'min' else max(vals)


def table_edge(table, spec):
    row = table.get(round(float(spec['at']), 4))
    if row is None:
        return None
    r = row[spec.get('pick', 'left')]
    return 'none' if not r else r['start' if spec.get('side', 'start') == 'start' else 'end']


def criterion_from_table(c, table):
    """(value, grid_ok) using only station-table entries."""
    if c['source'] == 'row':
        v = table_width(table, c, None)
        return v
    if c['source'] == 'rowratio':
        n, d = table_width(table, c['num'], None), table_width(table, c['den'], None)
        if n is None or d is None:
            return None
        return n/d if isinstance(n, float) and isinstance(d, float) else 'none'
    a, b = table_edge(table, c['a']), table_edge(table, c['b'])
    if a is None or b is None:
        return None
    return a-b if not isinstance(a, str) and not isinstance(b, str) else 'none'


def cmd_check(args):
    docs = species_docs(args.species)
    rubric = json.loads(lt.RUBRIC.read_text(encoding='utf-8'))
    packet = Path(args.packet) if args.packet else lt.WORK/'loop/packets'/args.assembly
    measured = json.loads((packet/'measured.json').read_text())
    render = model_render(args.assembly)
    fine = args.step
    sheet_tables, model_tables = {}, {}
    for view in lt.FIT_VIEWS[:3]:
        mask_ref = lt.reference_figure(view)
        mask_model = row_measures.load_mask(render/f'{view}.png')
        fr, fm = row_measures.mask_frame(mask_ref), row_measures.mask_frame(mask_model, lt.model_span(render, view), lt.model_center(render, view))
        sheet_tables[view] = {s['at']: s for s in stations(mask_ref, fr, fine)}
        model_tables[view] = {s['at']: s for s in stations(mask_model, fm, fine)}
    rows, ok = [], True
    for region, criteria in rubric['regions'].items():
        for c in criteria:
            if c.get('source') not in ('row', 'rowratio', 'edge'):
                continue
            ref = criterion_from_table(c, sheet_tables[c['view']])
            mod = criterion_from_table(c, model_tables[c['view']])
            rec = measured[c['id']]
            rows.append({'id': c['id'], 'view': c['view'], 'tableSheet': ref, 'measuredSheet': rec.get('sheet'),
                         'tableModel': mod, 'measuredModel': rec.get('model')})
    for r in rows:
        for t, m in (('tableSheet', 'measuredSheet'), ('tableModel', 'measuredModel')):
            a, b = r[t], r[m]
            r[t+'Ok'] = a is not None and b is not None and not isinstance(a, str) and abs(a-b) <= 1e-3
            ok &= bool(r[t+'Ok'])
    print(json.dumps({'step': fine, 'allAgree': ok, 'rows': rows}, indent=1))


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('sheet')
    s.add_argument('species')
    s.add_argument('--step', type=float, default=STEP)
    s.set_defaults(fn=cmd_sheet)
    m = sub.add_parser('model')
    m.add_argument('assembly')
    m.add_argument('--species', default='akinza')
    m.add_argument('--out')
    m.set_defaults(fn=cmd_model)
    c = sub.add_parser('check')
    c.add_argument('assembly')
    c.add_argument('--species', default='akinza')
    c.add_argument('--packet')
    c.add_argument('--step', type=float, default=.005, help='station step used for the check; criteria read heights on a 0.005 grid')
    c.set_defaults(fn=cmd_check)
    a = p.parse_args()
    a.fn(a)


if __name__ == '__main__':
    main()
