"""Measurements for the feet and body previews, from mesh coordinates (world units and figure heights).

python measure.py <probe.npz> <out.json> name=deform.npz [name=deform.npz ...]
'base' is always the probe's own skin. Figure height is the loop's fixed 1.8605.
"""
import json
import sys

import numpy as np

FH = 1.8605
probe, out = sys.argv[1:3]
P = np.load(probe)
skins = {'current': P['v']}
for a in sys.argv[3:]:
    k, f = a.split('=', 1)
    skins[k] = np.load(f)['skin'].astype(np.float64)
v0 = P['v']


def r(x):
    return round(float(x), 4)


def foot(v, side=-1):
    s = v[(np.sign(v0[:, 0]) == side) & (np.abs(v0[:, 0]) > 0.2) & (v0[:, 2] < -0.86) & (v0[:, 1] < 0.2)]
    ank = v[(np.sign(v0[:, 0]) == side) & (np.abs(v0[:, 0]) > 0.2) & (np.abs(v0[:, 2]+0.83) < 0.004)]
    m = {}
    m['foot length (heel to toe, y)'] = np.ptp(s[:, 1])
    m['foot width (widest, x)'] = np.ptp(s[:, 0])
    ball = s[np.abs(s[:, 1]+0.06) < 0.01]
    heel = s[np.abs(s[:, 1]-0.02) < 0.01]
    m['ball width at y -.06'] = np.ptp(ball[:, 0])
    m['heel width at y .02'] = np.ptp(heel[:, 0])
    m['ankle width (x) at z -.83'] = np.ptp(ank[:, 0])
    m['ankle depth (y) at z -.83'] = np.ptp(ank[:, 1])
    acx = 0.5*(ank[:, 0].min()+ank[:, 0].max())
    m['ball centre outward of the ankle axis'] = side*(0.5*(ball[:, 0].min()+ball[:, 0].max())-acx)
    m['foot overhang outside the ankle'] = side*(s[:, 0].min() if side < 0 else s[:, 0].max()) * 1 - side*(ank[:, 0].min() if side < 0 else ank[:, 0].max())
    m['foot overhang outside the ankle'] = abs(m['foot overhang outside the ankle'])
    for name, az in (('front', 0), ('side', 270), ('three-quarter (38 deg)', 38), ('three-quarter, this foot (322 deg)', 322),
                     ('rear three-quarter (218 deg)', 218), ('back', 180)):
        a = np.radians(az); right = np.array([np.cos(a), np.sin(a)])
        m[f'seen width, {name}'] = np.ptp(s[:, :2] @ right)
    m['three-quarter seen width / side seen length'] = max(m['seen width, three-quarter (38 deg)'], m['seen width, three-quarter, this foot (322 deg)'])/m['seen width, side']
    m['width / length'] = m['foot width (widest, x)']/m['foot length (heel to toe, y)']
    m['foot width / ankle width'] = m['foot width (widest, x)']/m['ankle width (x) at z -.83']
    return {k: {'world': r(x), 'figure heights': r(x/FH)} if 'ratio' not in k and '/' not in k else r(x) for k, x in m.items()}


def interval(v, sel, zz, around=0.0, tol=0.003, gap=0.012, axis=0):
    b = v[sel & (np.abs(v0[:, 2]-zz) < tol)]
    xs = np.sort(b[:, axis])
    g = np.where(np.diff(xs) > gap)[0]
    st = np.r_[xs[0], xs[g+1]]; en = np.r_[xs[g], xs[-1]]
    for s, e in zip(st, en):
        if s-1e-6 <= around <= e+1e-6:
            return e-s
    k = np.argmin(np.minimum(np.abs(st-around), np.abs(en-around)))
    return en[k]-st[k]


def body(v):
    front = v0[:, 1] < 0.12
    m = {}
    m['shoulders (front width, widest z .26 to .34)'] = max(interval(v, front, z) for z in np.arange(0.26, 0.345, 0.01))
    m['chest (front width, z .16)'] = interval(v, front, 0.16)
    m['waist (front width, narrowest z 0 to .12)'] = min(interval(v, front, z) for z in np.arange(0.0, 0.125, 0.01))
    m['hips (front width, widest z -.30 to -.20)'] = max(interval(v, front & (np.abs(v0[:, 0]) < 0.30), z) for z in np.arange(-0.30, -0.195, 0.01))
    trunk = (np.abs(v0[:, 0]) < 0.06) & (v0[:, 1] < 0.10)
    m['chest depth (side, deepest z .10 to .30)'] = max(np.ptp(v[trunk & (np.abs(v0[:, 2]-z) < 0.003), 1]) for z in np.arange(0.10, 0.305, 0.01))
    m['waist depth (side, shallowest z -.05 to .10)'] = min(np.ptp(v[trunk & (np.abs(v0[:, 2]-z) < 0.003), 1]) for z in np.arange(-0.05, 0.105, 0.01))
    m['upper arm width (z .10)'] = interval(v, front & (v0[:, 0] > 0.22), 0.10, around=0.32)
    m['forearm width (z -.08)'] = interval(v, front & (v0[:, 0] > 0.24), -0.08, around=0.35)
    m['thigh width (z -.48)'] = interval(v, front & (v0[:, 0] < -0.05), -0.48, around=-0.21)
    m['calf width (z -.64)'] = interval(v, front & (v0[:, 0] < -0.05), -0.64, around=-0.25)
    return {k: {'world': r(x), 'figure heights': r(x/FH)} for k, x in m.items()}


res = {'figure height (world units)': FH,
       'sheet (painted, furred), figure heights': {'front shoulders': 0.2962, 'front waist': 0.1322, 'side shoulders': 0.1491,
                                                   'side waist': 0.1022},
       'assumed fur margin on a width (figure heights)': 0.025,
       'feet (the -x foot)': {}, 'body': {}}
for k, v in skins.items():
    if k.startswith('feet') or k == 'current':
        res['feet (the -x foot)'][k] = foot(v)
    if k.startswith('body') or k == 'current':
        res['body'][k] = body(v)
json.dump(res, open(out, 'w'), indent=1)
print(json.dumps(res, indent=1))
