"""sweep: a smooth tube through control points, each with a radius."""
import numpy as np
from .common import pchip, unit

DEFAULTS = {'points': [], 'up': [0, 0, 1], 'samples': 14}


def _controls(params):
    pts = params.get('points') or []
    if len(pts) < 2:
        raise ValueError('sweep needs at least two points')
    P, R, Q = [], [], []
    for c in pts:
        if isinstance(c, dict):
            P.append(c['p']); R.append(c['r']); Q.append(c.get('ratio', 1.0))
        else:
            P.append(c[:3]); R.append(c[3]); Q.append(c[4] if len(c) > 4 else 1.0)
    P, R, Q = np.asarray(P, float), np.asarray(R, float), np.asarray(Q, float)
    if (R <= 0).any() or (Q <= 0).any():
        raise ValueError('sweep radii and ratios must be positive')
    return P, R, Q


def _catmull_rom(P, samples):
    """Centripetal Catmull-Rom spine through P. Returns (points, control-index parameter)."""
    n = len(P)
    ext = np.vstack([2*P[0]-P[1], P, 2*P[-1]-P[-2]])
    out, par = [], []
    for i in range(n-1):
        p0, p1, p2, p3 = ext[i], ext[i+1], ext[i+2], ext[i+3]
        t0 = 0.0
        t1 = t0+max(np.linalg.norm(p1-p0), 1e-9)**0.5
        t2 = t1+max(np.linalg.norm(p2-p1), 1e-9)**0.5
        t3 = t2+max(np.linalg.norm(p3-p2), 1e-9)**0.5
        t = np.linspace(t1, t2, samples+1)[:, None]
        a1 = (t1-t)/(t1-t0)*p0+(t-t0)/(t1-t0)*p1
        a2 = (t2-t)/(t2-t1)*p1+(t-t1)/(t2-t1)*p2
        a3 = (t3-t)/(t3-t2)*p2+(t-t2)/(t3-t2)*p3
        b1 = (t2-t)/(t2-t0)*a1+(t-t0)/(t2-t0)*a2
        b2 = (t3-t)/(t3-t1)*a2+(t-t1)/(t3-t1)*a3
        c = (t2-t)/(t2-t1)*b1+(t-t1)/(t2-t1)*b2
        s = 0 if i == 0 else 1                  # do not repeat the shared sample
        out.append(c[s:])
        par.append(i+np.linspace(0, 1, samples+1)[s:])
    return np.vstack(out), np.concatenate(par)


def spine(params):
    """The dense spine: points (M,3), radius (M,), ratio (M,), frame vectors e1 (M,3) and e2 (M,3)."""
    P, R, Q = _controls(params)
    samples = int(params.get('samples', DEFAULTS['samples']))
    S, par = _catmull_rom(P, samples)
    idx = np.arange(len(P), dtype=float)
    r = pchip(idx, R, par)
    q = pchip(idx, Q, par)
    T = np.gradient(S, axis=0)
    T /= np.maximum(np.linalg.norm(T, axis=1, keepdims=True), 1e-12)
    up = unit(params.get('up', DEFAULTS['up']))
    e2 = np.cross(T, up)
    bad = np.linalg.norm(e2, axis=1) < 1e-6
    if bad.any():
        e2[bad] = np.cross(T[bad], np.array([0.0, 1.0, 0.0]))
    e2 /= np.maximum(np.linalg.norm(e2, axis=1, keepdims=True), 1e-12)
    e1 = np.cross(e2, T)
    return S, r, q, e1, e2


def _hermite(values, idx, t):
    """Cubic Hermite interpolation between samples, with finite-difference slopes: the radius stays C1 in the
    spine parameter, so sample spacing does not leave a rib at every sample (piecewise linear radius does)."""
    m = np.gradient(values)
    t2, t3 = t*t, t*t*t
    return ((2*t3-3*t2+1)*values[idx]+(t3-2*t2+t)*m[idx]+(-2*t3+3*t2)*values[idx+1]+(t3-t2)*m[idx+1])


def _round_cone(pts, a, b, r1, r2):
    """Exact signed distance to the hull of two spheres (center a radius r1, center b radius r2)."""
    ba = b-a
    l2 = float(ba@ba)
    rr = r1-r2
    a2 = l2-rr*rr
    if a2 <= 1e-12:                                  # one sphere swallows the other
        return np.minimum(np.linalg.norm(pts-a, axis=1)-r1, np.linalg.norm(pts-b, axis=1)-r2)
    il2 = 1.0/l2
    pa = pts-a
    y = pa@ba
    z = y-l2
    x2 = np.einsum('ij,ij->i', pa*l2-ba[None, :]*y[:, None], pa*l2-ba[None, :]*y[:, None])
    y2, z2 = y*y*l2, z*z*l2
    k = np.sign(rr)*rr*rr*x2
    cap_b = np.sign(z)*a2*z2 > k
    cap_a = np.sign(y)*a2*y2 < k
    side = (np.sqrt(np.maximum(x2*a2*il2, 0.0))+y*rr)*il2-r1
    return np.where(cap_b, np.sqrt(x2+z2)*il2-r2, np.where(cap_a, np.sqrt(x2+y2)*il2-r1, side))


def sdf(params, pts):
    """A chain of exact round cones (hulls of consecutive spheres) along the spine. The envelope of the spheres
    is a canal surface, smooth at every sample; a minimum over plain tapered cylinders is not (it leaves a
    crease where the cones meet). A cross-section ratio other than 1 uses a nearest-spine-point ellipse
    approximation instead."""
    S, r, q, e1, e2 = spine(params)
    n = len(S)-1
    if not np.any(np.abs(q-1.0) > 1e-6):
        best = np.full(len(pts), np.inf)
        for i in range(n):
            best = np.minimum(best, _round_cone(pts, S[i], S[i+1], r[i], r[i+1]))
        return best
    return _elliptic_sdf(S, r, q, e1, e2, pts)


def _elliptic_sdf(S, r, q, e1, e2, pts):
    """Nearest spine point, then an ellipse with radii (r, r * ratio) in the frame there."""
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
    dist = np.sqrt(best)
    rad = _hermite(r, idx, tt)
    rat = _hermite(q, idx, tt)
    f1 = e1[idx]+(e1[idx+1]-e1[idx])*tt[:, None]
    f2 = e2[idx]+(e2[idx+1]-e2[idx])*tt[:, None]
    c = S[idx]+(S[idx+1]-S[idx])*tt[:, None]
    qv = pts-c
    r2 = rad                                  # radius along e2, the width
    r1 = rad*rat                              # radius along e1, toward `up`
    x1 = np.einsum('ij,ij->i', qv, f1)/r1
    x2 = np.einsum('ij,ij->i', qv, f2)/r2
    f = np.sqrt(x1*x1+x2*x2)
    g = np.sqrt((x1/r1)**2+(x2/r2)**2)/np.maximum(f, 1e-9)
    d = np.where(f > 1e-6, (f-1.0)/np.maximum(g, 1e-9), -np.minimum(r1, r2))
    cap = ((idx == 0) & (tt <= 0.0)) | ((idx == n-1) & (tt >= 1.0))
    return np.where(cap, dist-rad, d)


def bounds(params):
    S, r, q, _, _ = spine(params)
    rr = r*np.maximum(q, 1.0)
    return (S-rr[:, None]).min(axis=0), (S+rr[:, None]).max(axis=0)
