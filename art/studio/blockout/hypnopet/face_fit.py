"""Face fit of a Hypnopet head to the model sheet's bare front view: numbers first, before any option is built.

    python art/studio/blockout/hypnopet/face_fit.py <spec.json> [<spec.json> ...] [--json <out>]

Why this exists (experiment X27, fit before options): the first face round (A, B, C) was judged by eye from
renders and every option missed the sheet's eye placement. The miss is measurable without a render. In the
sheet's front view the eyes are large, forward-facing and set close, and the face is widest at the nose row,
below the eyes; in all three options the face narrowed under the eyes, so the eyes sat on its sides.

Everything is measured in the front orthographic view (world x across, z up; the creature faces -y) and given
in units of W, the silhouette width of the head at the eye centers' height. Model: the head silhouette is the
run through x = 0 of the head part plus the eyeballs (ears, horn and body left out); the eye opening is where
the eyeball is the first surface met from the front. Sheet: targets/flesh-front.png, the silhouette run through
the midline (the ears are separated from the face by background at these rows) and the dark eye openings.

The numbers are the check; the overlay on the review page is for Nick.
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1]))
import parts  # noqa: E402

# Sheet, flesh-front.png (1145 x 1374), measured by silhouette runs and dark-region extents (see the module
# docstring). Pixel sources: eye openings x 428-533 and 621-725, y 398-509 (centers 480 and 673, row 453);
# head run at row 453: 412-739 (W = 327 px); skull top row 290; rows below the eyes: 523 (412-743), 560
# (432-718), 600 (487-663); nose pad center row 525; mouth bottom row 645.
SHEET = {
    'eye_width': 0.32,           # one eye opening across
    'eye_height': 0.34,          # one eye opening tall
    'eye_offset': 0.295,         # eye center from the midline
    'eye_gap': 0.27,             # between the two openings
    'skull_above_eye': 0.50,     # skull top (horn excluded) above the eye centers
    'width_at_0.21': 1.02,       # head width 0.21 W below the eye centers (the nose row)
    'width_at_0.33': 0.87,       # 0.33 W below (the mouth corners)
    'width_at_0.45': 0.54,       # 0.45 W below (the chin)
    # side view, flesh-side.png, scaled to the front's W by the figure heights (W = 327 * 898 / 996 = 295 px):
    # eye opening x 250-377, y 360-495 (center row 427); profile front x 222 at row 427, 243 at row 353, 231 at
    # row 589; nose tip x 162 at row 495. Forward is image left; "ahead" is distance ahead of the eye's front edge.
    'side_eye_width': 0.43,      # the eye opening across in profile (wider than from the front: it faces partly out)
    'side_eye_height': 0.46,
    'brow_ahead': 0.02,          # profile 0.25 W above the eye center
    'cheek_ahead': 0.095,        # profile at the eye center's height: the eye sits in the face, not out of it
    'nose_ahead': 0.30,          # nose tip
    'nose_below_eye': 0.23,
    'chin_ahead': 0.065,         # profile 0.55 W below the eye center
}
TOLERANCE = {'eye_width': 0.03, 'eye_height': 0.03, 'eye_offset': 0.03, 'eye_gap': 0.04, 'skull_above_eye': 0.05,
             'width_at_0.21': 0.06, 'width_at_0.33': 0.08, 'width_at_0.45': 0.08,
             'side_eye_width': 0.05, 'side_eye_height': 0.05, 'brow_ahead': 0.04, 'cheek_ahead': 0.04,
             'nose_ahead': 0.05, 'nose_below_eye': 0.04, 'chin_ahead': 0.06}
LABEL = {
    'eye_width': 'eye opening width', 'eye_height': 'eye opening height', 'eye_offset': 'eye center from midline',
    'eye_gap': 'gap between the eyes', 'skull_above_eye': 'skull top above the eyes',
    'width_at_0.21': 'face width at the nose row', 'width_at_0.33': 'face width at the mouth corners',
    'width_at_0.45': 'face width at the chin',
    'side_eye_width': 'side: eye opening width', 'side_eye_height': 'side: eye opening height',
    'brow_ahead': 'side: brow ahead of the eye front', 'cheek_ahead': 'side: face ahead of the eye front',
    'nose_ahead': 'side: nose tip ahead of the eye front', 'nose_below_eye': 'side: nose tip below the eye center',
    'chin_ahead': 'side: chin ahead of the eye front',
}
STEP = 0.001

# Whole outlines, not just spot numbers: a face can pass every spot measure and still read wrong between them
# (round 2 of the second face pass grew a beak and duck lips that no spot measure saw). Rows are at k W above
# (+) or below (-) the eye centers. Front: the head's half width (rows where the ears are clear of the face).
# Side: how far the skin profile sits ahead of the eye's front edge.
from measure import TARGETS  # noqa: E402
FRONT_KS = [round(0.15-0.05*i, 2) for i in range(18)]       # +0.15 .. -0.70
SIDE_KS = [round(0.40-0.05*i, 2) for i in range(23)]        # +0.40 .. -0.70
SHEET_FRONT = {'image': 'flesh-front.png', 'eye_row': 453, 'W_px': 327, 'mid_x': 575}
SHEET_SIDE = {'image': 'flesh-side.png', 'eye_row': 427, 'W_px': 327*898/996, 'eye_front_x': 250}


def sheet_curves():
    import silhouette as sil_mod
    out = {'front': {}, 'side': {}}
    f = SHEET_FRONT
    m = sil_mod.mask(TARGETS/f['image'])
    for k in FRONT_KS:
        r = int(round(f['eye_row']-k*f['W_px']))
        run = next((a, b) for a, b in sil_mod.runs(m[r]) if a <= f['mid_x'] <= b)
        out['front'][k] = (run[1]-run[0])/2/f['W_px']
    sd = SHEET_SIDE
    m = sil_mod.mask(TARGETS/sd['image'])
    for k in SIDE_KS:
        r = int(round(sd['eye_row']-k*sd['W_px']))
        out['side'][k] = (sd['eye_front_x']-sil_mod.runs(m[r])[0][0])/sd['W_px']
    return out


def front_hits(fn, xs, zs, y0=-0.31, y1=-0.06, dy=0.002):
    """For each (x, z) on the grid: the y of the first surface of field fn met from the front (+inf where none)."""
    ys = np.arange(y0, y1, dy)
    out = np.full((len(zs), len(xs)), np.inf)
    X, Y = np.meshgrid(xs, ys, indexing='ij')
    for i, z in enumerate(zs):
        pts = np.stack([X.ravel(), Y.ravel(), np.full(X.size, z)], 1)
        f = fn(pts).reshape(X.shape) < 0
        hit = f.any(1)
        out[i, hit] = ys[np.argmax(f[hit], 1)]
    return out


def measure(spec):
    """The face measures of a spec. The face is mirror symmetric, so only x >= 0 is sampled."""
    insts = parts.instances(spec)
    head = [i for i in insts if i.key == 'head']
    balls = [i for i in insts if i.key == 'eyes']
    if not balls:
        raise SystemExit('no eyes part in the spec')
    xs = np.arange(0, 0.14+STEP/2, STEP)
    zs = np.arange(0.30, 0.57, STEP)
    skin = front_hits(lambda p: parts.union_at(head, p), xs, zs)
    ball = front_hits(lambda p: np.min([b.sdf(p) for b in balls], 0), xs, zs)
    eye = np.isfinite(ball) & (ball < skin)
    sil = np.isfinite(skin) | np.isfinite(ball)
    ez, ex = np.nonzero(eye)
    if not len(ez):
        raise SystemExit('no eye visible from the front')
    eye_z = zs[ez].mean()
    eye_x = xs[ex].mean()
    w_eye = xs[ex].max()-xs[ex].min()+STEP
    h_eye = zs[ez].max()-zs[ez].min()+STEP
    inner = xs[ex].min()

    def width(z):
        i = int(round((z-zs[0])/STEP))
        if not 0 <= i < len(zs):
            return 0.0
        row = sil[i]
        if not row[0]:
            return 0.0
        r = 0
        while r < len(xs)-1 and row[r+1]:
            r += 1
        return 2*(xs[r]+STEP/2)

    W = width(eye_z)
    col = np.isfinite(skin[:, 0])
    top = zs[np.nonzero(col)[0].max()]
    m = {'W_m': round(float(W), 4), 'eye_z_m': round(float(eye_z), 4),
         'eye_width': w_eye/W, 'eye_height': h_eye/W, 'eye_offset': eye_x/W, 'eye_gap': 2*inner/W,
         'skull_above_eye': (top-eye_z)/W}
    for k in (0.21, 0.33, 0.45):
        m[f'width_at_{k}'] = width(eye_z-k*W)/W
    m['front_curve'] = {k: round(width(eye_z+k*W)/2/W, 4) for k in FRONT_KS}
    m.update(side(head, balls, W, eye_z, zs))
    return {k: (round(float(v), 3) if k in SHEET else v) for k, v in m.items()}


def side(head, balls, W, eye_z, zs):
    """Profile measures: looking from +x toward the midline, the first surface met; forward is -y."""
    ys = np.arange(-0.31, -0.06, STEP)
    hits = {}
    for name, fn in (('skin', lambda p: parts.union_at(head, p)), ('ball', lambda p: np.min([b.sdf(p) for b in balls], 0))):
        xs = np.arange(0.14, -STEP/2, -0.002)
        out = np.full((len(zs), len(ys)), -np.inf)
        Y, X = np.meshgrid(ys, xs, indexing='ij')
        for i, z in enumerate(zs):
            pts = np.stack([X.ravel(), Y.ravel(), np.full(X.size, z)], 1)
            f = fn(pts).reshape(Y.shape) < 0
            hit = f.any(1)
            out[i, hit] = xs[np.argmax(f[hit], 1)]
        hits[name] = out
    eye = np.isfinite(hits['ball']) & (hits['ball'] > hits['skin'])
    sil = np.isfinite(hits['skin'])           # the profile is the skin's (the sheet's profile is skin at every row)
    ez, ey = np.nonzero(eye)
    front = ys[ey].min()
    zc = (zs[ez].max()+zs[ez].min())/2

    def ahead(z):
        i = int(round((z-zs[0])/STEP))
        if not 0 <= i < len(zs):
            return -1.0
        row = sil[i]
        return (front-ys[np.argmax(row)])/W if row.any() else -1.0

    rows = np.nonzero(sil.any(1))[0]
    lo = rows[(zs[rows] < zc) & (zs[rows] > zc-0.5*W)]
    tip = lo[np.argmin([ys[np.argmax(sil[r])] for r in lo])]
    curve = {k: round(float(ahead(zc+k*W)), 4) for k in SIDE_KS}
    return {'side_curve': curve, 'side_eye_width': (ys[ey].max()-front+STEP)/W, 'side_eye_height': (zs[ez].max()-zs[ez].min()+STEP)/W,
            'brow_ahead': ahead(zc+0.25*W), 'cheek_ahead': ahead(zc), 'nose_ahead': (front-ys[np.argmax(sil[tip])])/W,
            'nose_below_eye': (zc-zs[tip])/W, 'chin_ahead': ahead(zc-0.55*W)}


def report(name, m):
    print(f'\n{name}: W = {m["W_m"]} m at eye height z = {m["eye_z_m"]} m')
    print(f'  {"measure":34s} {"sheet":>6s} {"model":>6s} {"off":>6s}')
    misses = 0
    for k, target in SHEET.items():
        off = m[k]-target
        bad = abs(off) > TOLERANCE[k]
        misses += bad
        print(f'  {LABEL[k]:34s} {target:6.2f} {m[k]:6.2f} {off:+6.2f}{"   MISS" if bad else ""}')
    print(f'  {misses} of {len(SHEET)} outside tolerance')
    sc = SHEET_CURVES or sheet_curves()
    for view in ('front', 'side'):
        mc = m[f'{view}_curve']
        offs = [mc[k]-sc[view][k] for k in sc[view]]
        worst = max(sc[view], key=lambda k: abs(mc[k]-sc[view][k]))
        print(f'  {view} outline: RMS off {np.sqrt(np.mean(np.square(offs))):.3f} W, worst {mc[worst]-sc[view][worst]:+.3f} W '
              f'at {worst:+.2f} W from the eyes')
    return misses


SHEET_CURVES = None


def score(m, sc):
    """One number for the search: spot measures over their tolerance plus both outlines' RMS (in W)."""
    spot = sum(min((m[k]-t)/TOLERANCE[k], 3.0)**2 for k, t in SHEET.items() if not k.startswith('side_eye'))
    curves = sum(np.mean([(m[f'{v}_curve'][k]-sc[v][k])**2 for k in sc[v]]) for v in ('front', 'side'))
    return spot/len(SHEET)+curves/0.03**2


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('specs', nargs='+', type=Path)
    ap.add_argument('--json', type=Path)
    args = ap.parse_args()
    global SHEET_CURVES
    SHEET_CURVES = sheet_curves()
    out = {'sheet': SHEET, 'tolerance': TOLERANCE, 'sheetCurves': SHEET_CURVES, 'models': {}}
    for p in args.specs:
        m = measure(json.loads(p.read_text(encoding='utf-8')))
        m['misses'] = report(p.name, m)
        m['score'] = round(float(score(m, SHEET_CURVES)), 3)
        print(f'  search score {m["score"]} (0 is a perfect fit)')
        out['models'][p.name] = m
    if args.json:
        args.json.write_text(json.dumps(out, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
