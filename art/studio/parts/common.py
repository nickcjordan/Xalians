"""Shared helpers for the part kinds (numpy only)."""
import numpy as np

BIG = 1.0e3


def euler_matrix(degrees):
    """Rotation matrix for Blender-style XYZ Euler angles in degrees (R = Rz Ry Rx)."""
    ax, ay, az = np.radians(np.asarray(degrees, dtype=float))
    cx, sx, cy, sy, cz, sz = np.cos(ax), np.sin(ax), np.cos(ay), np.sin(ay), np.cos(az), np.sin(az)
    rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return rz@ry@rx


def unit(v):
    v = np.asarray(v, dtype=float)
    n = np.linalg.norm(v)
    if n < 1e-12:
        raise ValueError('zero-length vector')
    return v/n


def box_corners(lo, hi):
    lo, hi = np.asarray(lo, float), np.asarray(hi, float)
    return np.array([[x, y, z] for x in (lo[0], hi[0]) for y in (lo[1], hi[1]) for z in (lo[2], hi[2])])


def smin(a, b, k):
    """Polynomial smooth minimum. Equals min(a, b) wherever |a - b| >= k; k <= 0 is a hard minimum."""
    if k <= 0:
        return np.minimum(a, b)
    h = np.maximum(k-np.abs(a-b), 0.0)/k
    return np.minimum(a, b)-h*h*k*0.25


def smax(a, b, k):
    """Polynomial smooth maximum (the mirror of smin): max(a, b) wherever |a - b| >= k; k <= 0 is a hard maximum.
    Carving is smax(field, -shape): material is removed with a rounded crease of radius k."""
    return -smin(-np.asarray(a), -np.asarray(b), k)


def smoothstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x*x*(3.0-2.0*x)


def _end_slope(h0, h1, d0, d1):
    e = ((2*h0+h1)*d0-h0*d1)/(h0+h1)
    if np.sign(e) != np.sign(d0):
        return 0.0
    if np.sign(d0) != np.sign(d1) and abs(e) > 3*abs(d0):
        return 3*d0
    return e


def pchip(x, y, xq):
    """Monotone cubic interpolation (Fritsch-Carlson): never overshoots, so a tapering list of radii
    stays a tapering radius profile."""
    x, y = np.asarray(x, float), np.asarray(y, float)
    n = len(x)
    xq = np.asarray(xq, float)
    if n == 1:
        return np.full_like(xq, y[0])
    h = np.diff(x)
    delta = np.diff(y)/h
    m = np.zeros(n)
    if n == 2:
        m[:] = delta[0]
    else:
        for i in range(1, n-1):
            if delta[i-1]*delta[i] > 0:
                w1, w2 = 2*h[i]+h[i-1], h[i]+2*h[i-1]
                m[i] = (w1+w2)/(w1/delta[i-1]+w2/delta[i])
        m[0] = _end_slope(h[0], h[1], delta[0], delta[1])
        m[-1] = _end_slope(h[-1], h[-2], delta[-1], delta[-2])
    idx = np.clip(np.searchsorted(x, xq, side='right')-1, 0, n-2)
    t = (xq-x[idx])/h[idx]
    t2, t3 = t*t, t*t*t
    return ((2*t3-3*t2+1)*y[idx]+(t3-2*t2+t)*h[idx]*m[idx]+(-2*t3+3*t2)*y[idx+1]+(t3-t2)*h[idx]*m[idx+1])
