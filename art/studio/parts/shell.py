"""shell: a thin curved plate (ear, wing membrane, fin).

Flat or single-bend: the outline lives in a fixed local frame. With a `spine` (three or more points) the plate
is laid along a curved center line instead: see the "curved plate" functions at the end of this file.
"""
import numpy as np
from .common import smoothstep, unit, box_corners
from .sweep import _catmull_rom

DEFAULTS = {'center': [0, 0, 0], 'normal': [0, 1, 0], 'up': [0, 0, 1],
            'outline': [[-0.1, -0.1], [0.1, -0.1], [0.1, 0.1], [-0.1, 0.1]],
            'smooth': 2, 'thickness': 0.02, 'rimThickness': 0.008, 'rimWidth': 0.04,
            'bend': 0.0, 'bendAxis': 'u', 'samples': 24}


def _chaikin(poly, passes):
    for _ in range(int(passes)):                          # Chaikin corner cutting on the closed polygon
        nxt = np.roll(poly, -1, axis=0)
        new = np.empty((len(poly)*2, 2))
        new[0::2] = 0.75*poly+0.25*nxt
        new[1::2] = 0.25*poly+0.75*nxt
        poly = new
    return poly


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
    poly = _chaikin(poly, p['smooth'])
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
    if params.get('spine') is not None:
        return _curved_sdf(params, pts)
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
    if params.get('spine') is not None:
        return _curved_bounds(params)
    c, u, v, n, poly, hc, hr, rim, bend, axis = _p(params)
    lo, hi = poly.min(axis=0), poly.max(axis=0)
    k = 0 if axis == 'u' else 1
    ext = max(abs(lo[k]), abs(hi[k]))
    wb = 0.5*abs(bend)*ext*ext
    w_lo, w_hi = (-hc, wb+hc) if bend >= 0 else (-wb-hc, hc)
    corners = box_corners([lo[0], lo[1], w_lo], [hi[0], hi[1], w_hi])
    world = c+corners[:, :1]*u+corners[:, 1:2]*v+corners[:, 2:3]*n
    return world.min(axis=0), world.max(axis=0)


# ---- curved plate: a shell laid along a spine ------------------------------------------------------------------

def _curved(params):
    """Everything the curved plate needs, computed once per call: the dense center line (with straight
    extensions past both ends), its arclength, and a twist-free frame (T along, n normal, u across) at every
    sample. Local v is arclength from the first spine point; local u is the lateral offset along `u`."""
    p = {**DEFAULTS, **params}
    sp = np.asarray(p['spine'], float)
    if sp.ndim != 2 or sp.shape[1] != 3 or len(sp) < 3:
        raise ValueError('shell spine needs three or more [x, y, z] points')
    poly = np.asarray(p['outline'], float)
    if poly.ndim != 2 or poly.shape[1] != 2 or len(poly) < 3:
        raise ValueError('shell outline needs at least three [u, v] points')
    poly = _chaikin(poly, p['smooth'])
    hc = float(p['thickness'])/2.0
    hr = float(p['rimThickness'])/2.0
    if hr <= 0 or hc < hr:
        raise ValueError('shell needs 0 < rimThickness <= thickness')
    S, _ = _catmull_rom(sp, max(int(p['samples']), 2))
    seg = np.linalg.norm(np.diff(S, axis=0), axis=1)
    arc = np.concatenate([[0.0], np.cumsum(seg)])
    total = float(arc[-1])
    ext = max(0.0, -float(poly[:, 1].min()), float(poly[:, 1].max())-total)+0.05
    T0 = (S[1]-S[0])/max(np.linalg.norm(S[1]-S[0]), 1e-12)
    T1 = (S[-1]-S[-2])/max(np.linalg.norm(S[-1]-S[-2]), 1e-12)
    S = np.vstack([S[0]-T0*ext, S, S[-1]+T1*ext])
    arc = np.concatenate([[-ext], arc, [total+ext]])
    T = np.gradient(S, axis=0)
    T /= np.maximum(np.linalg.norm(T, axis=1, keepdims=True), 1e-12)
    hint = np.asarray(p['normal'], float)
    n0 = hint-(hint@T[0])*T[0]
    if np.linalg.norm(n0) < 1e-6:
        raise ValueError('shell normal is parallel to the start of the spine')
    N = np.empty_like(T)
    N[0] = n0/np.linalg.norm(n0)
    for i in range(1, len(T)):                            # carried along the curve without twist
        w = N[i-1]-(N[i-1]@T[i])*T[i]
        N[i] = w/max(np.linalg.norm(w), 1e-12)
    U = np.cross(T, N)                                    # across; for T = +v and N = +w this is the flat plate's u
    return S, arc, T, N, U, poly, hc, hr, max(float(p['rimWidth']), 1e-6)


def _curved_sdf(params, pts):
    S, arc, T, N, U, poly, hc, hr, rim = _curved(params)
    n = len(S)-1
    best = np.full(len(pts), np.inf)
    idx = np.zeros(len(pts), int)
    tt = np.zeros(len(pts))
    for i in range(n):
        a = S[i]
        ab = S[i+1]-a
        w = pts-a
        t = np.clip((w@ab)/max(float(ab@ab), 1e-18), 0.0, 1.0)
        qv = w-t[:, None]*ab
        d2 = np.einsum('ij,ij->i', qv, qv)
        better = d2 < best
        best = np.where(better, d2, best)
        idx = np.where(better, i, idx)
        tt = np.where(better, t, tt)
    c = S[idx]+(S[idx+1]-S[idx])*tt[:, None]
    lv = arc[idx]+(arc[idx+1]-arc[idx])*tt
    f = lambda A: A[idx]+(A[idx+1]-A[idx])*tt[:, None]
    nn, uu = f(N), f(U)
    nn /= np.maximum(np.linalg.norm(nn, axis=1, keepdims=True), 1e-12)
    uu = uu-np.einsum('ij,ij->i', uu, nn)[:, None]*nn
    uu /= np.maximum(np.linalg.norm(uu, axis=1, keepdims=True), 1e-12)
    q = pts-c
    lu = np.einsum('ij,ij->i', q, uu)
    lw = np.einsum('ij,ij->i', q, nn)
    d2 = polygon_distance(poly, np.stack([lu, lv], axis=1))
    x = np.clip(np.maximum(-d2, 0.0)/rim, 0, 1)
    h = hr+(hc-hr)*smoothstep(x)
    hslope = (hc-hr)*6.0*x*(1-x)/rim
    d_in = (np.abs(lw)-h)/np.sqrt(1.0+hslope*hslope)
    d_out = np.hypot(np.maximum(d2, 0.0), np.abs(lw))-hr
    return np.where(d2 > 0, d_out, d_in)


def _curved_bounds(params):
    S, arc, T, N, U, poly, hc, hr, rim = _curved(params)
    keep = (arc >= poly[:, 1].min()-0.05) & (arc <= poly[:, 1].max()+0.05)
    keep[[0, -1]] = True
    S, U = S[keep], U[keep]
    um = float(np.abs(poly[:, 0]).max())
    ends = np.vstack([S+um*U, S-um*U])
    return ends.min(axis=0)-(hc+0.002), ends.max(axis=0)+(hc+0.002)
