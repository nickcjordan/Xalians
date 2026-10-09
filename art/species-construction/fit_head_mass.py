"""Fit the authored head mass of analytic_head_field.py (system Python with numpy and scipy, not Blender).

  python art/species-construction/fit_head_mass.py <head dump.npz> <targets.json> <out mass.json>

<head dump.npz> is the smooth face head (H37) written by dump_head_mesh.py (every mesh of the head blend, head-local units).
<targets.json> holds the drawing's head proportions measured on the first sheet (furbase-notes.md, Head redesign):
"front" rows [z, half width] of the front silhouette, "back" rows [z, y] of the back of the head on the midline, "top"
the crown height, and optional weights. The mass is a smooth union of ellipsoids in head-local units (cranium, a mirrored
jaw pair, muzzle, chin, throat, a mirrored eye socket), each a centre, radii and blend radius k with lower bounds that keep every part soft
(the jaw at least .12 tall, so it cannot form a flat lobe below the cranium). It is
least-squares fitted (soft L1) to:
  - the H37 face surface away from the eye globes (the lid band stays H37's own) and away from the upper face beside and
    above the eyes (the old temples are the bulk being removed) except the ring around each eye (within .10 of the
    globe, inside |x| .34, which a mirrored socket part follows), with the eye ring weighted 3 and the nose and mouth 4, so
    the mass meets the parts that stay fixed;
  - the front silhouette half widths and the midline back profile of the targets, and the crown height;
  - "rear" rows [z, half width] of the skull behind the ears (the widest x over y from "rearY" back), so the back of
    the head stays round in plan instead of narrowing to a ridge.
The half width of a row is the widest x of the mass over y (bisection on 43 columns), so the fit matches the outline a
viewer sees, not one section. Paste the result into the step spec as "mass".
"""
import json
import sys

import numpy as np

LAYOUT = [('cranium', False), ('jaw', True), ('muzzle', False), ('chin', False), ('throat', False), ('socket', True)]
START = {'cranium': [0, -.0, .07, .35, .335, .345, .1], 'jaw': [.10, -.12, -.15, .17, .19, .14, .08],
         'muzzle': [0, -.27, -.17, .09, .08, .07, .06], 'chin': [0, -.20, -.25, .10, .08, .06, .08],
         'throat': [0, .0, -.45, .105, .085, .20, .1], 'socket': [.22, -.16, .04, .10, .10, .16, .06]}
RMIN = {'cranium': [.25, .25, .25], 'jaw': [.08, .08, .12], 'muzzle': [.045, .045, .045], 'chin': [.04, .04, .04], 'throat': [.06, .06, .06], 'socket': [.05, .05, .08]}
KMIN = {'cranium': .06, 'jaw': .06, 'muzzle': .05, 'chin': .06, 'throat': .08, 'socket': .05}


def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def ellipsoid(p, cen, rad):
    return (np.linalg.norm((p-np.asarray(cen, float))/np.asarray(rad, float), axis=-1)-1)*min(rad)


def field(spec, p):
    f = None
    for part in spec['parts']:
        g = ellipsoid(p, part['c'], part['r'])
        if part['mirror']:
            g = smin(g, ellipsoid(p, [-part['c'][0], part['c'][1], part['c'][2]], part['r']), part['k'])
        f = g if f is None else smin(f, g, part['k'])
    return f


def unpack(x):
    parts = []
    for n, (name, mirror) in enumerate(LAYOUT):
        v = x[7*n:7*n+7]
        parts.append({'name': name, 'c': [abs(v[0]) if mirror else 0., v[1], v[2]],
                      'r': list(np.abs(v[3:6])+np.array(RMIN[name])), 'k': abs(v[6])+KMIN[name], 'mirror': mirror})
    return {'parts': parts}


YS = np.linspace(-.42, .42, 43)


def bisect(fn, lo, hi, n=26):
    for _ in range(n):
        m = (lo+hi)/2
        ins = fn(m)
        lo, hi = np.where(ins, m, lo), np.where(ins, hi, m)
    return lo


def halfwidth(spec, z, ys=None):
    Y, Zr = np.meshgrid(YS if ys is None else ys, np.asarray(z, float), indexing='ij')
    ins0 = field(spec, np.stack([0*Y, Y, Zr], -1)) < 0
    x = bisect(lambda m: field(spec, np.stack([m, Y, Zr], -1)) < 0, np.zeros(Y.shape), np.full(Y.shape, .7))
    return np.where(ins0, x, 0).max(0)


def back(spec, z):
    z = np.asarray(z, float)
    return bisect(lambda m: field(spec, np.stack([0*z, m, z], -1)) < 0, np.zeros(z.shape), np.full(z.shape, .6))


def front(spec, z):
    z = np.asarray(z, float)
    c0 = np.where(z < -.2, -.05, 0.)
    return c0-bisect(lambda m: field(spec, np.stack([0*z, c0-m, z], -1)) < 0, np.zeros(z.shape), np.full(z.shape, .6))


def top(spec):
    ys = np.linspace(-.2, .3, 26)
    return bisect(lambda m: field(spec, np.stack([0*ys, ys, m], -1)) < 0, np.zeros(ys.shape), np.full(ys.shape, .7)).max()


def face_points(dump):
    from scipy.spatial import cKDTree
    d = np.load(dump)
    objs = {}
    for k in d.files:
        n, kind = k.split('__')
        objs.setdefault(n, {})[kind] = d[k]
    s = max(objs.values(), key=lambda o: len(o['v']))['v'].astype(np.float64)
    eye = np.concatenate([o['v'] for n, o in objs.items() if n.startswith('eye_globe')])
    feat = np.concatenate([o['v'] for n, o in objs.items() if n.startswith('nose') or n.startswith('closed_mouth')])
    de, _ = cKDTree(eye).query(s)
    df, _ = cKDTree(feat).query(s)
    ax = np.abs(s[:, 0])
    pts = ((s[:, 1] < -.08) & (s[:, 2] > -.31) & (s[:, 2] < .30) & (de > .025)
           & (((ax < .30) & ((s[:, 2] < -.02) | (ax < .16))) | ((de < .10) & (ax < .34))))
    w = np.where(df < .06, 4., np.where(de < .10, 3., 1.))
    sel = np.nonzero(pts)[0][::7]
    return s[sel], w[sel]


def main():
    from scipy.optimize import least_squares
    dump, targets, out = sys.argv[1:4]
    T = json.loads(open(targets).read())
    Q, Wq = face_points(dump)
    zf = np.array([r[0] for r in T['front']])
    wf = np.array([r[1] for r in T['front']])
    zb = np.array([r[0] for r in T['back']])
    yb = np.array([r[1] for r in T['back']])

    zr = np.array([r[0] for r in T.get('rear', [])])
    wr = np.array([r[1] for r in T.get('rear', [])])
    YR = np.linspace(T.get('rearY', .12), .42, 16)

    def resid(x):
        sp = unpack(x)
        return np.concatenate([field(sp, Q)*Wq*T.get('wFace', 1.), (halfwidth(sp, zf)-wf)*T.get('wFront', 8.),
                               (back(sp, zb)-yb)*T.get('wBack', 6.), [(top(sp)-T['top'])*T.get('wTop', 8.)],
                               (halfwidth(sp, zr, YR)-wr)*T.get('wRear', 8.) if len(zr) else []])
    x0 = np.concatenate([np.array(START[n], float)-np.array([0, 0, 0, *np.minimum(RMIN[n], np.array(START[n][3:6])-.005), KMIN[n]]) for n, _ in LAYOUT])
    res = least_squares(resid, x0, loss='soft_l1', f_scale=.004, max_nfev=int(T.get('nfev', 300)), diff_step=1e-3)
    sp = unpack(res.x)
    for part in sp['parts']:
        part['c'] = [round(float(v), 4) for v in part['c']]
        part['r'] = [round(float(v), 4) for v in part['r']]
        part['k'] = round(float(part['k']), 4)
    json.dump(sp, open(out, 'w'), indent=1)
    d = np.abs(field(sp, Q))
    print('face points', len(Q), 'residual p50/p90/p99', np.percentile(d, [50, 90, 99]).round(4).tolist())
    print('front [z, target, mass]', [[float(z), float(w), round(float(h), 3)] for z, w, h in zip(zf, wf, halfwidth(sp, zf))])
    print('back [z, target, mass]', [[float(z), float(y), round(float(h), 3)] for z, y, h in zip(zb, yb, back(sp, zb))])
    print('top', round(float(top(sp)), 3))
    if len(zr):
        print('rear [z, target, mass]', [[float(z), float(w), round(float(h), 3)] for z, w, h in zip(zr, wr, halfwidth(sp, zr, YR))])


if __name__ == '__main__':
    main()
