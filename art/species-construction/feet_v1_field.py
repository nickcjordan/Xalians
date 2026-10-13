"""Akinza feet v1 field: each hind foot narrowed sideways about its own ankle (pure numpy, no Blender).

The 2026-10-12 hind-foot proposal (art/species-construction/previews/feet_body/deform_feet.py, scale .74, inward .025,
roll .22), approved by Nick on 2026-10-13 ("Let's go with your recommendations for changes"). Every move is along x (sideways),
so the side view is unchanged by construction. Everything is a function of position, never of a vertex index.

Per side (the foot is the skin with |x| above footMinX and z below the ease top):
  1. narrow: x' = cx + (x-cx)*(1-(1-scale)*w(z)), cx the ankle's centre at ankleZ, w = 1 at and below ease[0] (the foot)
     easing to 0 at ease[1] (lower shin), so the ankle and the leg above do not move;
  2. inward: the ball and toes (y below ballY, easing in over ballSpan) move toward the body by `inward`, so the ball sits under
     the ankle instead of hanging off its outer side;
  3. roll: below rollZ the foot narrows about its own midline (measured per y on this base) by up to `roll` at the sole,
     rounding the lower side edges into the sole.
The hind claws move rigidly with the toe they sit on (the field's displacement at their centroid), so they keep their shape.
"""
import numpy as np


def smooth(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def foot_select(p, side, spec, ztop):
    return (np.sign(p[:, 0]) == side) & (np.abs(p[:, 0]) > spec['footMinX']) & (p[:, 2] < ztop)


def ankle_centre(v, side, spec):
    b = v[(np.sign(v[:, 0]) == side) & (np.abs(v[:, 0]) > spec['footMinX']) & (np.abs(v[:, 2]-spec['ankleZ']) < 0.004)]
    return 0.5*(b[:, 0].min()+b[:, 0].max()), 0.5*(b[:, 1].min()+b[:, 1].max())


def make_side(v0, side, spec):
    """Returns f(points) -> moved points for one side, built from the base skin v0."""
    e0, e1 = spec['ease']
    cx, _ = ankle_centre(v0, side, spec)
    scale, inward = spec['scale'], spec['inward']

    def narrow(p):
        q = p.copy()
        sel = foot_select(p, side, spec, e1)
        w = smooth((e1-p[sel, 2])/(e1-e0))
        f = 1-(1-scale)*w
        wy = smooth((spec['ballY']-p[sel, 1])/spec['ballSpan'])
        q[sel, 0] = cx+(p[sel, 0]-cx)*f-side*inward*wy*w
        return q

    v1 = narrow(v0)
    R = spec['roll']
    ref = v1[foot_select(v1, side, spec, e1) & (np.abs(v1[:, 2]-R['z']) < 0.004)]
    ys = np.linspace(R['yRange'][0], R['yRange'][1], 25)
    mids = []
    for y in ys:
        c = ref[np.abs(ref[:, 1]-y) < 0.012]
        mids.append(0.5*(c[:, 0].min()+c[:, 0].max()) if len(c) > 3 else np.nan)
    mids = np.array(mids)
    ok = ~np.isnan(mids)
    mids = np.interp(ys, ys[ok], mids[ok])
    mids = np.convolve(np.pad(mids, 2, mode='edge'), np.ones(5)/5, 'valid')

    def roll(p):
        q = p.copy()
        sel = foot_select(p, side, spec, R['selectZ'])
        mid = np.interp(p[sel, 1], ys, mids)
        t = smooth((R['z']-p[sel, 2])/R['depth'])
        q[sel, 0] = mid+(p[sel, 0]-mid)*(1-R['amount']*t*t)
        return q

    return lambda p: roll(narrow(p)), cx


def compute(v0, spec, hind_claws=None):
    v = v0.copy()
    claws = {}
    centres = {}
    for side in (-1, 1):
        f, cx = make_side(v0, side, spec)
        centres[side] = cx
        v = f(v)
        for name, c in (hind_claws or {}).items():
            if np.sign(c[:, 0].mean()) != side:
                continue
            cen = c.mean(0, keepdims=True)
            claws[name] = c+(f(cen)-cen)
    region = np.zeros(len(v0), bool)
    for side in (-1, 1):
        region |= foot_select(v0, side, spec, spec['ease'][1])
    return v, claws, {'region': region, 'ankleCentreX': {'+x': centres[1], '-x': centres[-1]}}
