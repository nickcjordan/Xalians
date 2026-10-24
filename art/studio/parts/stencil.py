"""stencil: a 2D outline drawn in a front, side or top plane and extruded straight through a depth range.

Use it to carve an opening traced from a sheet view (a mouth seen from the front, a nostril, a socket) so the
opening's outline matches the drawing exactly, which ellipsoids cannot (Hypnopet's D-shaped smile, 2026-10-23).

params:
    plane     "xz" (front view: outline in x and z, extruded along y), "yz" (side view, extruded along x) or
              "xy" (top view, extruded along z)
    outline   [[u, v], ...]: the closed outline in world meters in that plane (first point not repeated)
    depth     [a, b]: the extrusion range along the third axis, a < b
    round     rounding radius of the extrusion's two end faces (default 0.003): the end caps are blended with
              the outline by a smooth maximum of this radius

The distance is exact inside the outline's plane (distance to the nearest segment, negative inside, by the even-odd
rule) and combined with the depth slab by a smooth maximum, which is a bound, close near the side walls.
"""
import numpy as np

from .common import smax

AXES = {'xz': (0, 2, 1), 'yz': (1, 2, 0), 'xy': (0, 1, 2)}


def _outline(params):
    poly = np.asarray(params['outline'], float)
    if poly.ndim != 2 or poly.shape[1] != 2 or len(poly) < 3:
        raise ValueError('stencil outline needs at least three [u, v] points')
    return poly


def _plane(params):
    plane = params.get('plane', 'xz')
    if plane not in AXES:
        raise ValueError(f"stencil plane must be one of {', '.join(AXES)}")
    return AXES[plane]


def _depth(params):
    a, b = (float(t) for t in params['depth'])
    if not a < b:
        raise ValueError('stencil depth must be [a, b] with a < b')
    return a, b


def polygon_sdf(poly, uv, chunk=60000):
    """Signed distance from points uv (N, 2) to a closed polygon, negative inside (even-odd rule)."""
    if len(uv) > chunk:
        return np.concatenate([polygon_sdf(poly, uv[i:i+chunk], chunk) for i in range(0, len(uv), chunk)])
    a = poly
    b = np.roll(poly, -1, axis=0)
    e = b-a                                            # (M, 2)
    w = uv[:, None, :]-a[None, :, :]                   # (N, M, 2)
    t = np.clip((w*e[None]).sum(-1)/np.maximum((e*e).sum(-1), 1e-18)[None], 0.0, 1.0)
    proj = w-e[None]*t[..., None]
    dist = np.sqrt((proj**2).sum(-1)).min(axis=1)
    # even-odd crossing test along +u
    u, v = uv[:, 0][:, None], uv[:, 1][:, None]
    cond = (a[None, :, 1] > v) != (b[None, :, 1] > v)
    xcross = a[None, :, 0]+(v-a[None, :, 1])*(e[None, :, 0])/np.where(np.abs(e[None, :, 1]) < 1e-18, 1e-18, e[None, :, 1])
    inside = (cond & (u < xcross)).sum(axis=1) % 2 == 1
    return np.where(inside, -dist, dist)


def sdf(params, pts):
    pts = np.asarray(pts, float)
    iu, iv, iw = _plane(params)
    poly = _outline(params)
    a, b = _depth(params)
    d2 = polygon_sdf(poly, pts[:, [iu, iv]])
    w = pts[:, iw]
    dz = np.maximum(a-w, w-b)
    return smax(d2, dz, float(params.get('round', 0.003)))


def bounds(params):
    iu, iv, iw = _plane(params)
    poly = _outline(params)
    a, b = _depth(params)
    lo, hi = np.zeros(3), np.zeros(3)
    lo[iu], hi[iu] = poly[:, 0].min(), poly[:, 0].max()
    lo[iv], hi[iv] = poly[:, 1].min(), poly[:, 1].max()
    lo[iw], hi[iw] = a, b
    return lo, hi
