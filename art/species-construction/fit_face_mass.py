"""Fit the authored face mass of smooth_face_field.py (system Python with numpy and scipy, not Blender).

  python art/species-construction/fit_face_mass.py <face-radial.npz> <out mass.json>

<face-radial.npz> is written by smooth_face_field.py beside its output (the input skin's radial height r0 about the face
centre, the face region, the eye mask and the nose and mouth footprint). The mass is a smooth union of ellipsoids in head
-local units: cranium, cheeks (mirrored), muzzle, chin, throat, each with a centre, radii and blend radius k (lower bounds
on radii and k keep every part soft). It is least-squares fitted (soft L1, so lumps count as outliers) to the face surface
points away from the eye globes, with the eye ring (1.5 to 6 degrees outside the globes) weighted 3 and the nose and mouth
footprint 4, so the mass meets the parts that stay fixed. Paste the result into the step spec as "mass".

The face-smooth-v1 mass was fitted on the head-3022 face during development, with a slightly different face region (surface
points in front of y 0, inside |x| .36 and clear of the ear roots, z -.42 to .34); refitting from an H37 face-radial.npz
gives a close fit, not the same numbers.
"""
import json
import sys

import numpy as np
from scipy.optimize import least_squares

LAYOUT = [('cranium', False), ('cheek', True), ('muzzle', False), ('chin', False), ('throat', False)]
START = {'cranium': [0, .1, .11, .41, .43, .30, .05], 'cheek': [.2, -.1, -.02, .14, .17, .18, .08],
         'muzzle': [0, -.29, -.17, .06, .06, .05, .05], 'chin': [0, -.15, -.27, .08, .07, .04, .1], 'throat': [0, .0, -.47, .07, .05, .23, .1]}
RMIN = {'cranium': .1, 'cheek': .08, 'muzzle': .045, 'chin': .04, 'throat': .04}
KMIN = {'cranium': .06, 'cheek': .07, 'muzzle': .06, 'chin': .07, 'throat': .08}


def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def ellipsoid(p, cen, rad):
    return (np.linalg.norm((p-np.asarray(cen))/np.asarray(rad), axis=-1)-1)*min(rad)


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
                      'r': list(np.abs(v[3:6])+RMIN[name]), 'k': abs(v[6])+KMIN[name], 'mirror': mirror})
    return {'parts': parts}


def ring_distance(eye, step, limit):
    """Degrees from the eye mask (octagonal cell distance), capped."""
    d = np.where(eye, 0., limit)
    cur = eye.copy()
    for k in range(1, int(limit/step)+1):
        nxt = cur.copy()
        nb = [(1, 0), (-1, 0), (0, 1), (0, -1)] + ([(1, 1), (1, -1), (-1, 1), (-1, -1)] if k % 2 == 0 else [])
        for i, j in nb:
            nxt |= np.roll(np.roll(cur, i, 0), j, 1)
        d[nxt & ~cur] = k*step
        cur = nxt
    return d


def main():
    src, out = sys.argv[1], sys.argv[2]
    z = np.load(src)
    th, ph, c = z['th'], z['ph'], z['c']
    T, F = np.meshgrid(th, ph, indexing='ij')
    dirs = np.stack([np.cos(T)*np.sin(F), -np.cos(T)*np.cos(F), np.sin(T)], -1)
    p0 = c+dirs*z['r0'][..., None]
    step = float(np.degrees(th[1]-th[0]))
    deye = ring_distance(z['eye'], step, 8.)
    region = z['region']
    core = region & (deye > 2)
    ring = region & (deye > 1.5) & (deye < 6)
    sets = [(p0[core][::5], 1.), (p0[ring][::2], 3.), (p0[z['feat']][::2], 4.)]
    Q = np.concatenate([a for a, _ in sets])
    W = np.concatenate([np.full(len(a), w) for a, w in sets])
    x0 = []
    for name, _ in LAYOUT:
        v = list(START[name])
        v[3:6] = [max(a-RMIN[name], .005) for a in v[3:6]]
        x0 += v
    res = least_squares(lambda x: field(unpack(x), Q)*W, np.array(x0, float), loss='soft_l1', f_scale=.004, max_nfev=400)
    spec = unpack(res.x)
    r = np.abs(field(spec, Q))
    for part in spec['parts']:
        part['c'] = [round(float(v), 4) for v in part['c']]
        part['r'] = [round(float(v), 4) for v in part['r']]
        part['k'] = round(float(part['k']), 4)
    json.dump(spec, open(out, 'w'), indent=1)
    print('points', len(Q), 'residual p50/p90/p99', np.percentile(r, [50, 90, 99]).round(4).tolist())


if __name__ == '__main__':
    main()
