"""Generated targets for one region: every measurement a spec writer would otherwise take by hand.

  python art/species-construction/loop/spec_targets.py <species> <region> [--baseline <assembly>]

Writes docs/design/species-construction/<species>/loop/specs/<region>-targets.{md,json,png}.

What it measures (all read-only; it imports loop_tools, sheet_measure and row_measures and edits nothing):
- the region's zone (species.json) and the views that define it (the views its rubric criteria read,
  plus the views of its regionImages packet images);
- sheet station rows inside the zone (left, right, central: width and centre, from sheet.json) against
  the baseline model's rows at the same heights (sheet_measure's own view_record on the baseline render),
  with the difference, all in figure-height units (x from the centreline, y down from the crown);
- the trunk loop widths and depths of the model from mesh sections (render/torso.json) where the zone
  reaches them, because silhouette rows merge the arms and tails into the trunk;
- landmarks inside or bordering the zone: sheet (sheet.json) against the model, measured as silhouette
  extremes of the rest render (ear tops and outers, nose tip, toe tips, heels) or as posed rig joints
  (shoulder, elbow, wrist, hip, knee, ankle; indicative, the sheet marks surface points);
- every measured rubric criterion of the region: value, bound, result from the baseline packet's
  measured.json, plus the model and sheet readings and the model value that sits on the bound;
- an annotated image: sheet outline (red) and model outline (blue) over each other inside the zone, a tick
  at every station row, criterion rows in magenta, landmarks (sheet green circle, model blue cross).

Conventions in the output: u is the horizontal figure coordinate (front and back views: x from the
centreline, positive to the viewer's right; left view: depth, negative is the figure's front), v is
y down from the crown (0) to the floor (1). Differences are model minus sheet.
"""
import argparse
import json
import math
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

# the species key decides which config loop_tools loads (its own argv convention)
_early = next((a for a in sys.argv[1:] if not a.startswith('-')), 'akinza')
if '--species' not in sys.argv:
    sys.argv += ['--species', _early]
import loop_tools as lt  # noqa: E402
import row_measures  # noqa: E402
import sheet_measure as sm  # noqa: E402

MAX_ROWS = 16
IMAGE_VIEWS = {'m02': ['front', 'left', 'back'], 'm03': ['front', 'left', 'back'], 'm04': ['front', 'left', 'back'],
               'm05': ['front'], 'm06': ['front', 'left'], 'm07': ['front', 'left'], 'm08': ['front', 'back'],
               'm09': ['front', 'back'], 'm10': ['back']}
VIEW_ORDER = ['front', 'left', 'back']
PICK_LABEL = {'left': 'L', 'right': 'R', 'central': 'C'}
# silhouette landmarks measured on the rest render: name -> (view rule). rules are resolved in model_landmarks().
EXTREME = ('ear_fan_l_top', 'ear_fan_r_top', 'ear_fan_top', 'ear_fan_l_outer', 'ear_fan_r_outer', 'ear_fan_front',
           'ear_fan_rear', 'nose_tip', 'toe_tip_l', 'toe_tip_r', 'heel_l', 'heel_r')
JOINTS = {'shoulder': 'shoulder', 'elbow': 'elbow', 'wrist': 'wrist', 'hip': 'hip', 'knee': 'knee', 'ankle': 'ankle'}


def f(v, n=3, sign=False):
    """Compact number: .082, -.106, +.004 (no leading zero)."""
    if v is None:
        return '-'
    if isinstance(v, str):
        return v
    s = f'{v:+.{n}f}' if sign else f'{v:.{n}f}'
    return s.replace('0.', '.', 1) if s.lstrip('+-').startswith('0.') else s


def load_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


# ---------------------------------------------------------------- inputs

def region_views(region, criteria, species):
    views = {c['view'] for c in criteria if c.get('view') and c['view'] in VIEW_ORDER}
    why = {v: 'criteria' for v in views}
    for img in species['regionImages'].get(region, []):
        for v in IMAGE_VIEWS.get(img, []):
            if v not in views:
                views.add(v)
                why[v] = f'image {img}'
    if not views:
        views = set(VIEW_ORDER)
        why = {v: 'whole figure' for v in views}
    return [v for v in VIEW_ORDER if v in views], why


def ensure_stations(assembly, packet):
    """stations.json of the baseline render, computed once with sheet_measure's own code and cached in the packet."""
    out = packet/'stations.json'
    render = sm.model_render(assembly)
    if out.exists() and out.stat().st_mtime >= (render/'front.png').stat().st_mtime:
        return load_json(out), False
    sheet = load_json(lt.DOCS/'loop/sheet.json')
    record = {'schemaVersion': 1, 'source': str(render), 'step': sheet['step'], 'outlineTolerance': sm.TOLERANCE, 'views': {}}
    for view in lt.FIT_VIEWS:
        path = render/f"{view.split('-r03')[0]}.png"
        if not path.exists() or view not in sheet['views']:
            continue
        rec = sm.view_record(row_measures.load_mask(path), lt.model_span(render, path.stem), sheet['step'],
                             sm.TOLERANCE, lt.model_center(render, path.stem))
        rec['differenceFromSheet'] = sm.diff_tables(rec['stations'], sheet['views'][view]['stations'])
        record['views'][view] = rec
    out.write_text(json.dumps(record, separators=(',', ':'))+'\n')
    return record, True


def station_index(view_rec):
    return {round(s['at'], 4): s for s in view_rec['stations']}


# ---------------------------------------------------------------- station rows

def rows_in_zone(zone, step):
    at0, at1 = (zone['at'] if zone else (0.0, 1.0))
    grid = [round(a, 4) for a in np.arange(0, 1+1e-9, step) if at0-1e-9 <= a <= at1+1e-9]
    stride = max(1, math.ceil(len(grid)/MAX_ROWS))
    return grid[::stride], stride, (at0, at1)


def pick_cell(p):
    return None if not p else {'width': p['width'], 'centre': p['centre'], 'start': p['start'], 'end': p['end']}


def build_rows(view, sheet_v, model_v, ats):
    s_idx, m_idx = station_index(sheet_v), station_index(model_v)
    rows = []
    for at in ats:
        s, m = s_idx.get(at), m_idx.get(at)
        if not s or not m:
            continue
        row = {'at': at, 'runsSheet': len(s['runs']), 'runsModel': len(m['runs'])}
        for pick in ('left', 'right', 'central'):
            a, b = pick_cell(s[pick]), pick_cell(m[pick])
            row[pick] = {'sheet': a, 'model': b,
                         'dWidth': None if not (a and b) else round(b['width']-a['width'], 5),
                         'dCentre': None if not (a and b) else round(b['centre']-a['centre'], 5)}
        rows.append(row)
    return rows


def extremes(view_rec, at0, at1):
    """Widest and narrowest full-row span of the central-or-any run inside the band, with heights."""
    best = {}
    for s in view_rec['stations']:
        if not (at0-1e-9 <= s['at'] <= at1+1e-9) or not s['runs']:
            continue
        lo, hi = s['runs'][0][0], s['runs'][-1][1]
        w = hi-lo
        if 'max' not in best or w > best['max'][0]:
            best['max'] = (round(w, 4), s['at'])
        if 'min' not in best or w < best['min'][0]:
            best['min'] = (round(w, 4), s['at'])
    return best


def torso_rows(render, at0, at1, sheet_front, sheet_left):
    path = render/'torso.json'
    if not path.exists():
        return []
    rows = load_json(path)['rows']
    sf, sl = station_index(sheet_front), station_index(sheet_left)
    out = []
    for r in rows:
        if not (at0-1e-9 <= r['at'] <= at1+1e-9):
            continue
        c = sf.get(round(r['at'], 4), {}).get('central')
        d = sl.get(round(r['at'], 4), {}).get('left')
        out.append({'at': r['at'], 'width': r['width'], 'depth': r['depth'], 'loops': r['loopsAtHeight'],
                    'sheetFrontCentral': c and round(c['width'], 4), 'sheetLeftFront': d and round(d['width'], 4)})
    return out


# ---------------------------------------------------------------- landmarks

def model_frame(render, view):
    return lt.model_span(render, view), lt.model_center(render, view)


def silhouette_landmarks(render, sheet_lm, view):
    """Model positions of the silhouette-extreme landmarks, searched in the rest render's mask."""
    path = render/f'{view}.png'
    if not path.exists():
        return {}
    mask = row_measures.load_mask(path)
    span, cx = model_frame(render, view)
    top, bottom = span
    h = bottom-top
    to_uv = lambda x, y: [round(float((x-cx)/h), 5), round(float((y-top)/h), 5)]
    ys, xs = np.where(mask)
    out = {}
    H, W = mask.shape
    for name, p in sheet_lm.items():
        if p is None or name not in EXTREME:
            continue
        su, sv = p
        row0 = lambda v: max(0, int(top+v*h))
        sign = 1 if su >= 0 else -1
        if name.endswith('_top'):
            sel = (xs >= cx) if (view != 'left' and sign > 0) else (xs <= cx) if view != 'left' else np.ones_like(xs, bool)
            sel &= ys < top+.3*h
            if not sel.any():
                continue
            k = np.argmin(np.where(sel, ys, 10**9))
            out[name] = to_uv(xs[k], ys[k])
        elif name.endswith('_outer'):
            sel = ((xs >= cx) if sign > 0 else (xs <= cx)) & (ys < top+.26*h)
            if not sel.any():
                continue
            k = np.argmax(np.where(sel, xs*sign, -10**9))
            out[name] = to_uv(xs[k], ys[k])
        elif name in ('ear_fan_front', 'nose_tip', 'ear_fan_rear'):
            sel = (ys >= row0(sv-.05)) & (ys <= row0(sv+.05))
            if not sel.any():
                continue
            k = np.argmin(np.where(sel, xs, 10**9)) if name != 'ear_fan_rear' else np.argmax(np.where(sel, xs, -10**9))
            out[name] = to_uv(xs[k], ys[k])
        elif name.startswith('toe_tip') or name.startswith('heel'):
            sel = ys >= row0(.955)
            if view == 'left':
                sel &= xs <= cx+.3*h if name.startswith('toe') else xs >= cx
                if not sel.any():
                    continue
                k = np.argmin(np.where(sel, xs, 10**9)) if name.startswith('toe') else np.argmax(np.where(sel, xs, -10**9))
            else:
                if name.startswith('heel'):
                    # front and back views: the sole of the foot on that side, centre of the lowest rows
                    side = ((xs >= cx) if sign > 0 else (xs <= cx)) & (ys >= row0(.99))
                    if not side.any():
                        continue
                    out[name] = to_uv(float(xs[side].mean()), float(ys[side].max()))
                    continue
                sel &= (xs >= cx) if sign > 0 else (xs <= cx)
                if not sel.any():
                    continue
                k = np.argmax(np.where(sel, xs*sign, -10**9))
            out[name] = to_uv(xs[k], ys[k])
    return out


def joint_landmarks(packet, view, sheet_lm, species):
    """Posed rig joints in the frame of the sheet's views. Indicative: rig joints, not surface points."""
    path = packet/'posed/joints.json'
    if not path.exists():
        return {}
    joints = load_json(path)
    h, floor = species.fixed_height, species.floor_z
    cl = species['frame'].get('centerLinePosed', {})
    out = {}
    for name in sheet_lm:
        base, _, side = name.rpartition('_')
        if base not in JOINTS or side not in ('l', 'r') or sheet_lm[name] is None:
            continue
        j = joints.get(f'{JOINTS[base]}.{side.upper()}')
        if j is None:
            continue
        x, y, z = j
        v = 1-(z-floor)/h
        if view == 'front':
            u = (x-cl['front'])/h
        elif view == 'back':
            u = -(x-cl['back'])/h
        else:
            u = (y-cl['left'])/h
        out[name] = [round(u, 5), round(v, 5)]
    return out


def landmark_rows(sheet, render, packet, species, views, at0, at1):
    rows = []
    for view in views:
        lm = sheet['views'][view].get('landmarks') or {}
        model = {**joint_landmarks(packet, view, lm, species), **silhouette_landmarks(render, lm, view)}
        for name, p in lm.items():
            if p is None:
                continue
            if not (at0-.03 <= p[1] <= at1+.03):
                continue
            m = model.get(name)
            kind = None if m is None else ('silhouette' if name in EXTREME else 'posed rig joint')
            rows.append({'view': view, 'name': name, 'sheet': p, 'model': m, 'kind': kind,
                         'du': None if m is None else round(m[0]-p[0], 5), 'dv': None if m is None else round(m[1]-p[1], 5)})
    return rows


# ---------------------------------------------------------------- criteria

def spec_text(c):
    s = c.get('source')
    if s in ('row', 'edge'):
        at = c['at'] if s == 'row' else None
        if s == 'row':
            return f"{c['view']} y {at if not isinstance(at, list) else '-'.join(f'{a:g}' for a in at)} {c.get('pick', 'central')}" \
                   + (f" ({c.get('reduce', 'min')})" if isinstance(at, list) else '')
        return f"{c['view']} edge y {c['a']['at']:g} minus y {c['b']['at']:g}"
    if s == 'rowratio':
        rf = lambda d: f"{d['at'] if not isinstance(d['at'], list) else '-'.join(f'{a:g}' for a in d['at'])} {d.get('pick', 'central')}"
        return f"{c['view']} ratio y {rf(c['num'])} / y {rf(c['den'])}"
    if s == 'measure':
        return f"{c['view']} {c['key']} (mesh/silhouette window)"
    if s == 'fit':
        return f"{c['view']} {c['band']} {c['metric']}"
    if s == 'posed':
        return f"posed {c['band']} IoU"
    return s or ''


def criterion_rows(region, rubric, measured, measurements):
    out = []
    for c in rubric['regions'][region]:
        if c.get('kind') != 'measured':
            continue
        m = measured.get(c['id'])
        if m is None:
            continue
        src = c.get('source')
        model, sheet = m.get('model'), m.get('sheet')
        if src == 'measure' and model is None:
            pair = measurements.get(c['view'], {})
            model, sheet = pair.get('model', {}).get(c['key']), pair.get('reference', {}).get(c['key'])
        lo, hi = m.get('min'), m.get('max')
        row = {'id': c['id'], 'read': spec_text(c), 'source': src, 'value': m['value'], 'min': lo, 'max': hi,
               'result': m['result'], 'model': model, 'sheet': sheet, 'at': c.get('at'), 'view': c.get('view')}
        # the model reading that sits exactly on the bound, and how far the model is from it
        if sheet is not None and model is not None and src in ('row', 'measure', 'rowratio'):
            bounds = {'min': None if lo is None else lo*sheet, 'max': None if hi is None else hi*sheet}
        elif sheet is not None and model is not None and src == 'edge':
            bounds = {'min': None if lo is None else sheet+lo, 'max': None if hi is None else sheet+hi}
        else:
            bounds = None
        if bounds:
            row['modelBounds'] = {k: None if v is None else round(v, 4) for k, v in bounds.items()}
            move = 0.0
            if bounds['max'] is not None and model > bounds['max']:
                move = bounds['max']-model
            elif bounds['min'] is not None and model < bounds['min']:
                move = bounds['min']-model
            row['moveToBound'] = round(move, 4)
        elif lo is not None and m['value'] < lo:
            row['moveToBound'] = round(lo-m['value'], 4)
            row['moveNote'] = 'value to gain'
        elif hi is not None and m['value'] > hi:
            row['moveToBound'] = round(hi-m['value'], 4)
            row['moveNote'] = 'value to lose'
        out.append(row)
    return out


# ---------------------------------------------------------------- image

def clip_segments(poly, a0, a1):
    """Closed polyline [[x, y]...] clipped to the band a0 <= y <= a1; returns a list of segments."""
    segs = []
    n = len(poly)
    for i in range(n):
        (x0, y0), (x1, y1) = poly[i], poly[(i+1) % n]
        if (y0 < a0 and y1 < a0) or (y0 > a1 and y1 > a1):
            continue
        t0, t1 = 0.0, 1.0
        dy = y1-y0
        if abs(dy) < 1e-12:
            segs.append(((x0, y0), (x1, y1)))
            continue
        for bound in (a0, a1):
            t = (bound-y0)/dy
            if (dy > 0) == (bound == a0):
                t0 = max(t0, t)
            else:
                t1 = min(t1, t)
        if t0 <= t1:
            segs.append(((x0+t0*(x1-x0), y0+t0*dy), (x0+t1*(x1-x0), y0+t1*dy)))
    return segs


def font(size):
    for name in ('arial.ttf', 'consola.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def draw_panel(view, sheet_v, model_v, zone, band, rows_at, crit, lms, ymargin=.02):
    at0, at1 = band
    a0, a1 = max(0, at0-ymargin), min(1, at1+ymargin)
    sheet_segs = clip_segments(sheet_v['outline'], a0, a1)
    model_segs = clip_segments(model_v['outline'], a0, a1)
    if zone:
        zx0, zx1 = zone['x']
        if view == 'left':
            zy0, zy1 = zone['y']
            xlo, xhi = zy0-.07, zy1+.07
        elif zone['symmetricX']:
            xlo, xhi = -zx1-.07, zx1+.07
        else:
            xlo, xhi = zx0-.07, zx1+.07
    else:
        pts = [p for s in sheet_segs+model_segs for p in s]
        xlo, xhi = min(p[0] for p in pts)-.03, max(p[0] for p in pts)+.03
    hband, wband = a1-a0, xhi-xlo
    S = min(820/hband, 760/wband)
    ml, mt = 70, 34
    W, H = int(wband*S)+ml+16, int(hband*S)+mt+14
    img = Image.new('RGB', (W, H), 'white')
    d = ImageDraw.Draw(img)
    fs, fm = font(13), font(11)
    px = lambda u, v: (ml+(u-xlo)*S, mt+(v-a0)*S)
    d.rectangle([ml, mt, W-16, H-14], outline=(190, 190, 190))
    # zone band edges
    for a in (at0, at1):
        X, Y = px(xlo, a)
        d.line([(ml, Y), (W-16, Y)], fill=(120, 170, 120), width=1)
    # station ticks and row labels
    allrows = [round(a, 4) for a in np.arange(0, 1+1e-9, .02) if a0 <= a <= a1]
    shown = set(rows_at)
    for a in allrows:
        X, Y = px(xlo, a)
        long = a in shown
        d.line([(ml-(9 if long else 4), Y), (ml, Y)], fill=(40, 40, 40), width=1)
        if long:
            d.text((2, Y-7), f'{a:.2f}', fill=(40, 40, 40), font=fm)
            d.line([(ml, Y), (W-16, Y)], fill=(235, 235, 235), width=1)
    # centreline
    if xlo < 0 < xhi:
        X, _ = px(0, a0)
        d.line([(X, mt), (X, H-14)], fill=(220, 220, 220), width=1)
    for (p, q) in sheet_segs:
        d.line([px(*p), px(*q)], fill=(220, 30, 30), width=2)
    for (p, q) in model_segs:
        d.line([px(*p), px(*q)], fill=(30, 80, 230), width=2)
    for c in crit:
        at = c.get('at')
        if c.get('view') != view or at is None:
            continue
        for a in (at if isinstance(at, list) else [at]):
            if a0 <= a <= a1:
                X, Y = px(xlo, a)
                d.line([(ml, Y), (W-16, Y)], fill=(200, 40, 200), width=1)
        a = at[0] if isinstance(at, list) else at
        if a0 <= a <= a1:
            X, Y = px(xlo, a)
            d.text((ml+4, Y-13), c['id'], fill=(170, 20, 170), font=fm)
    for l in lms:
        if l['view'] != view:
            continue
        if a0 <= l['sheet'][1] <= a1:
            X, Y = px(*l['sheet'])
            d.ellipse([X-5, Y-5, X+5, Y+5], outline=(0, 150, 40), width=2)
            d.text((X+7, Y-6), l['name'], fill=(0, 110, 30), font=fm)
        if l['model'] and a0 <= l['model'][1] <= a1:
            X, Y = px(*l['model'])
            d.line([(X-5, Y-5), (X+5, Y+5)], fill=(30, 80, 230), width=2)
            d.line([(X-5, Y+5), (X+5, Y-5)], fill=(30, 80, 230), width=2)
    d.text((ml, 6), f'{view}   x {xlo:+.2f} to {xhi:+.2f}   y {a0:.2f} to {a1:.2f}', fill=(0, 0, 0), font=fs)
    return img


def draw_image(path, region, species_key, views, sheet, model, zone, band, rows_at, crit, lms, assembly):
    panels = [draw_panel(v, sheet['views'][v], model['views'][v], zone, band, rows_at, crit, lms) for v in views]
    H = max(p.height for p in panels)
    head = 30
    W = sum(p.width for p in panels)+10*(len(panels)-1)
    img = Image.new('RGB', (W, H+head), 'white')
    d = ImageDraw.Draw(img)
    d.text((6, 6), f'{species_key} {region} targets vs {assembly}.  red = sheet outline, blue = model outline, '
                   'green circle = sheet landmark, blue x = model landmark, magenta = criterion row, ticks every .02', fill=(0, 0, 0), font=font(13))
    x = 0
    for p in panels:
        img.paste(p, (x, head))
        x += p.width+10
    img.quantize(128).save(path, optimize=True)


# ---------------------------------------------------------------- markdown

def md_cell(cell):
    return '-' if not cell else f"{f(cell['width'])} ({f(cell['start'], 3, True)}..{f(cell['end'], 3, True)})"


def write_md(path, ctx):
    L = []
    a = L.append
    a(f"# {ctx['region']} generated targets ({ctx['species']}, baseline {ctx['assembly']})")
    a('')
    a(f"Generated by `art/species-construction/loop/spec_targets.py` on {ctx['date']}; do not edit. Everything is in figure-height units "
      "(H = fixed world height 1.8605, floor z -.957): u = across (front and back views: from the centreline, positive to the viewer's right; "
      "left view: depth, negative is the figure's front), v = y down from the crown (0) to the floor (1). Differences are model minus sheet. "
      "Sheet cells come from `sheet.json`, model cells from the baseline render with the same code (`sheet_measure.view_record`). "
      f"Image: `{ctx['region']}-targets.png`. Full data: `{ctx['region']}-targets.json`.")
    a('')
    a('## Zone and views')
    z = ctx['zone']
    if z:
        a(f"- Zone (`species.json`): v {z['at'][0]} to {z['at'][1]}; world x {'+-' if z['symmetricX'] else ''}{z['x'][0]} to {z['x'][1]}; "
          f"world depth y {z['y'][0]} to {z['y'][1]} (front negative). World z = {ctx['floorZ']} + {ctx['H']} (1 - v); world x = {ctx['H']} u + centreline; "
          "model rows below are in the fixed frame (a head change cannot move them).")
    else:
        a('- Zone: none, the whole figure (rows are sampled every %.2f).' % ctx['step'])
    a('- Defining views: ' + ', '.join(f"{v} ({ctx['why'][v]})" for v in ctx['views']) + '.')
    a(f"- Rubric criteria of {ctx['region']}: {ctx['nMeasured']} measured, {ctx['nVisual']} visual (visual ones are not in this file).")
    a('')
    a('## Measured criteria (baseline packet)')
    if ctx['criteria']:
        a('')
        a('| id | reads | value | bound | result | model | sheet | model value on the bound | move to reach bound |')
        a('|---|---|---|---|---|---|---|---|---|')
        for c in ctx['criteria']:
            bound = ' to '.join(x for x in (None if c['min'] is None else f">= {f(c['min'], 3)}", None if c['max'] is None else f"<= {f(c['max'], 3)}") if x) or '-'
            mb = c.get('modelBounds')
            mbs = '-' if not mb else ' / '.join(f"{k} {f(v, 4)}" for k, v in mb.items() if v is not None)
            mv = c.get('moveToBound')
            mvs = '-' if mv is None else ('0' if mv == 0 else f(mv, 4, True) + (' (' + c['moveNote'] + ')' if c.get('moveNote') else ''))
            a(f"| {c['id']} | {c['read']} | {f(c['value'], 3)} | {bound} | {c['result'].upper()} | {f(c['model'], 4)} | {f(c['sheet'], 4)} | {mbs} | {mvs} |")
        a('')
        a('`value` is what the judge reads (model over sheet for row, rowratio and measure; model minus sheet for edge; the metric itself for fit and posed). '
          '"move" is the change in the model reading (figure units) that puts it on the bound; aim a little past it.')
    else:
        a('')
        a('None: this region has only visual criteria.')
    a('')
    a('## Station rows: sheet against model')
    a('')
    a('Cell = width (start..end edge, u) ; `=` repeats the L pick (one run in the row) (left pick L = leftmost run, right pick R = rightmost run, central C = the run on the centreline; in the left view L is the figure front). '
      'Silhouette rows include any arm or tail that touches the trunk, so a row where the run counts differ (last column S/M) may measure an arm, not the trunk.')
    for v in ctx['views']:
        rows = ctx['rows'][v]
        a('')
        a(f"### {v} (every {ctx['stride']*.02:.2f})")
        a('')
        a('| v | L sheet | L model | dW | R sheet | R model | dW | C sheet | C model | dW | runs S/M |')
        a('|---|---|---|---|---|---|---|---|---|---|---|')
        for r in rows:
            cells = []
            for p in ('left', 'right', 'central'):
                x = r[p]
                if p != 'left' and x == r['left']:
                    cells += ['=', '=', '=']
                    continue
                cells += [md_cell(x['sheet']), md_cell(x['model']), f(x['dWidth'], 3, True)]
            a(f"| {r['at']:.2f} | " + ' | '.join(cells) + f" | {r['runsSheet']}/{r['runsModel']} |")
        ex = ctx['extremes'][v]
        if ex:
            def e(which):
                return f"sheet {f(ex['sheet'][which][0])} at {ex['sheet'][which][1]:.2f}, model {f(ex['model'][which][0])} at {ex['model'][which][1]:.2f}"
            a('')
            a(f"Full row span in the zone, widest: {e('max')}; narrowest: {e('min')}.")
    if ctx['torso']:
        a('')
        a('## Trunk mesh sections (model, `render/torso.json`), arms and tails excluded')
        a('')
        a('Width and depth of the trunk loop at each height, against the sheet silhouette rows (which include the arms where they touch). '
          'Use these, not the silhouette rows, for the model trunk. `loops` > 1 means other skin loops (arms, tails, thighs) share the height; '
          'the R06 spec measured the trunk loop alone and found its flank half widths at .52 to .56 about .015 to .03 below half of these widths, so below .50 confirm with a section of your own.')
        a('')
        a('| v | model width | model depth | loops | sheet front C width | sheet left L (front run) |')
        a('|---|---|---|---|---|---|')
        for t in ctx['torso']:
            a(f"| {t['at']:.2f} | {f(t['width'], 4)} | {f(t['depth'], 4)} | {t['loops']} | {f(t['sheetFrontCentral'], 4)} | {f(t['sheetLeftFront'], 4)} |")
    a('')
    a('## Landmarks in or bordering the zone')
    if ctx['landmarks']:
        a('')
        a('| view | landmark | sheet u,v | model u,v | du | dv | model measured as |')
        a('|---|---|---|---|---|---|---|')
        for l in ctx['landmarks']:
            m = l['model']
            a(f"| {l['view']} | {l['name']} | {f(l['sheet'][0], 3, True)}, {f(l['sheet'][1], 3)} | "
              + ('-, - | - | - | not measurable (no model counterpart) |' if not m else
                 f"{f(m[0], 3, True)}, {f(m[1], 3)} | {f(l['du'], 3, True)} | {f(l['dv'], 3, True)} | {l['kind']} |"))
        a('')
        a('Posed rig joints are skeleton points of the hands-on-hips rig (`posed/joints.json`), indicative only: the sheet marks surface points '
          '(elbow = outer point, wrist = narrowest forearm). Silhouette landmarks are extremes of the rest render within the same height window.')
    else:
        a('')
        a('None marked in `sheet-landmarks.json` for this zone.')
    a('')
    a('## Not generated (the spec writer still owns these)')
    a('')
    a('Structure table (masses, roots, tips, lengths), cross sections, hidden-edge estimates where an arm or tail covers the sheet trunk, failure looks, '
      'and any model mesh section beyond `torso.json`.')
    path.write_text('\n'.join(L)+'\n', encoding='utf-8')
    return len(L)


# ---------------------------------------------------------------- main

def main():
    t0 = time.time()
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('species')
    p.add_argument('region')
    p.add_argument('--baseline', default='assembled-0458')
    p.add_argument('--species', dest='_s', default=None, help=argparse.SUPPRESS)
    args = p.parse_args()
    species = lt.SPECIES
    docs = lt.DOCS
    region = args.region
    rubric = load_json(lt.RUBRIC)
    if region not in rubric['regions']:
        raise SystemExit(f'{region} is not a region of the rubric: {", ".join(rubric["regions"])}')
    packet = lt.WORK/'loop/packets'/args.baseline
    render = sm.model_render(args.baseline)
    sheet = load_json(docs/'loop/sheet.json')
    model, built = ensure_stations(args.baseline, packet)
    measured = load_json(packet/'measured.json')
    measurements = load_json(packet/'measurements.json')
    criteria_all = rubric['regions'][region]
    zone = species.zone(region)
    views, why = region_views(region, criteria_all, species)
    views = [v for v in views if v in model['views'] and v in sheet['views']]
    ats, stride, band = rows_in_zone(zone, sheet['step'])
    rows = {v: build_rows(v, sheet['views'][v], model['views'][v], ats) for v in views}
    ext = {}
    for v in views:
        es, em = extremes(sheet['views'][v], *band), extremes(model['views'][v], *band)
        ext[v] = {'sheet': es, 'model': em} if es and em else None
    crit = criterion_rows(region, rubric, measured, measurements)
    lms = landmark_rows(sheet, render, packet, species, views, *band)
    torso = torso_rows(render, *band, sheet['views']['front'], sheet['views']['left']) if (zone is None or band[1] >= .26) and region in ('R05', 'R06') else []
    ctx = {'species': args.species, 'region': region, 'assembly': args.baseline, 'date': time.strftime('%Y-%m-%d'),
           'zone': zone, 'views': views, 'why': why, 'rows': rows, 'extremes': ext, 'stride': stride, 'step': stride*sheet['step'],
           'criteria': crit, 'landmarks': lms, 'torso': torso, 'floorZ': species.floor_z, 'H': species.fixed_height,
           'nMeasured': sum(1 for c in criteria_all if c['kind'] == 'measured'), 'nVisual': sum(1 for c in criteria_all if c['kind'] != 'measured')}
    out = docs/'loop/specs'
    out.mkdir(parents=True, exist_ok=True)
    stem = out/f'{region}-targets'
    n = write_md(Path(f'{stem}.md'), ctx)
    record = {'schemaVersion': 1, 'species': args.species, 'region': region, 'baseline': args.baseline, 'zone': zone, 'band': band,
              'views': views, 'stationStep': sheet['step'], 'rowStride': stride, 'criteria': crit, 'rows': rows, 'torsoSections': torso,
              'landmarks': lms, 'extremes': ext,
              'outlinesInBand': {v: {'sheet': [[list(map(lambda x: round(x, 4), p)) for p in s] for s in clip_segments(sheet['views'][v]['outline'], *band)],
                                     'model': [[list(map(lambda x: round(x, 4), p)) for p in s] for s in clip_segments(model['views'][v]['outline'], *band)]}
                                 for v in views}}
    Path(f'{stem}.json').write_text(json.dumps(record, separators=(',', ':'))+'\n', encoding='utf-8')
    draw_image(Path(f'{stem}.png'), region, args.species, views, sheet, model, zone, band, ats, crit, lms, args.baseline)
    print(json.dumps({'md': f'{stem}.md', 'lines': n, 'json': f'{stem}.json', 'png': f'{stem}.png', 'views': views,
                      'stationsBuilt': built, 'seconds': round(time.time()-t0, 1)}))


if __name__ == '__main__':
    main()
