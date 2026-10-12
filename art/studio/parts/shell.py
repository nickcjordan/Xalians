"""shell: a thin curved plate (ear, wing membrane, fin)."""
import numpy as np
from .common import smoothstep, unit, box_corners

DEFAULTS = {'center': [0, 0, 0], 'normal': [0, 1, 0], 'up': [0, 0, 1],
            'outline': [[-0.1, -0.1], [0.1, -0.1], [0.1, 0.1], [-0.1, 0.1]],
            'smooth': 2, 'thickness': 0.02, 'rimThickness': 0.008, 'rimWidth': 0.04,
            'bend': 0.0, 'bendAxis': 'u'}


def _p(params):
    p = {**DEFAULTS, **params}
    n = unit(p['normal'])
    up = np.asarray(p['up'], float)
    v = up-(up@n)*n
    if np.linalg.norm(v) < 1e-9:
        v = np.cross(n, [1.0, 0.0, 0.0])
        if np.linalg.norm(v) < 1e-9:
            v = np.cross(n, [0.0, 1.0, 0.0])
    v = unit(v)
    u = np.cross(v, n)
    poly = np.asarray(p['outline'], float)
    if poly.ndim != 2 or poly.shape[1] != 2 or len(poly) < 3:
        raise ValueError('shell outline needs at least three [u, v] points')
    for _ in range(int(p['smooth'])):                     # Chaikin corner cutting on the closed polygon
        nxt = np.roll(poly, -1, axis=0)
        new = np.empty((len(poly)*2, 2))
        new[0::2] = 0.75*poly+0.25*nxt
        new[1::2] = 0.25*poly+0.75*nxt
        poly = new
    hc = float(p['thickness'])/2.0
    hr = float(p['rimThickness'])/2.0
    if hr <= 0 or hc < hr:
        raise ValueError('shell needs 0 < rimThickness <= thickness')
    if p['bendAxis'] not in ('u', 'v'):
        raise ValueError("shell bendAxis must be 'u' or 'v'")
    return (np.asarray(p['center'], float), u, v, n, poly, hc, hr, max(float(p['rimWidth']), 1e-6),
            float(p['bend']), p['bendAxis'])


def polygon_distance(poly, uv):
    """Signed distance to a closed polygon (negative inside)."""
    best = np.full(len(uv), 1e9)
    inside = np.zeros(len(uv), bool)
    nxt = np.roll(poly, -1, axis=0)
    for a, b in zip(poly, nxt):
        ab = b-a
        w = uv-a
        t = np.clip((w@ab)/max(float(ab@ab), 1e-18), 0, 1)
        best = np.minimum(best, np.linalg.norm(w-t[:, None]*ab, axis=1))
        cross = ((a[1] > uv[:, 1]) != (b[1] > uv[:, 1])) & \
                (uv[:, 0] < (b[0]-a[0])*(uv[:, 1]-a[1])/(b[1]-a[1]+1e-30)+a[0])
        inside ^= cross
    return np.where(inside, -best, best)


def sdf(params, pts):
    c, u, v, n, poly, hc, hr, rim, bend, axis = _p(params)
    q = pts-c
    lu, lv, lw = q@u, q@v, q@n
    along = lu if axis == 'u' else lv
    lw = lw-0.5*bend*along*along                          # unbend: w is measured from the curved mid surface
    slope = np.sqrt(1.0+(bend*along)**2)
    d2 = polygon_distance(poly, np.stack([lu, lv], axis=1))
    x = np.clip(np.maximum(-d2, 0.0)/rim, 0, 1)
    h = hr+(hc-hr)*smoothstep(x)
    hslope = (hc-hr)*6.0*x*(1-x)/rim
    d_in = (np.abs(lw)/slope-h)/np.sqrt(1.0+hslope*hslope)
    d_out = np.hypot(np.maximum(d2, 0.0), np.abs(lw)/slope)-hr
    return np.where(d2 > 0, d_out, d_in)


def bounds(params):
    c, u, v, n, poly, hc, hr, rim, bend, axis = _p(params)
    lo, hi = poly.min(axis=0), poly.max(axis=0)
    k = 0 if axis == 'u' else 1
    ext = max(abs(lo[k]), abs(hi[k]))
    wb = 0.5*abs(bend)*ext*ext
    w_lo, w_hi = (-hc, wb+hc) if bend >= 0 else (-wb-hc, hc)
    corners = box_corners([lo[0], lo[1], w_lo], [hi[0], hi[1], w_hi])
    world = c+corners[:, :1]*u+corners[:, 1:2]*v+corners[:, 2:3]*n
    return world.min(axis=0), world.max(axis=0)
