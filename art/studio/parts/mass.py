"""mass: a superellipsoid."""
import numpy as np
from .common import euler_matrix

DEFAULTS = {'radii': [0.1, 0.1, 0.1], 'exponent': 2.0, 'rotation': [0, 0, 0], 'center': [0, 0, 0]}


def _p(params):
    p = {**DEFAULTS, **params}
    r = np.asarray(p['radii'], float)
    if r.shape != (3,) or (r <= 0).any():
        raise ValueError('mass radii must be three positive numbers')
    n = float(p['exponent'])
    if not 1.5 <= n <= 12:
        raise ValueError('mass exponent must be between 1.5 and 12')
    return r, n, euler_matrix(p['rotation']), np.asarray(p['center'], float)


def sdf(params, pts):
    r, n, rot, c = _p(params)
    u = ((pts-c)@rot)/r                       # local coordinates divided by the radii
    a = np.abs(u)
    s = np.sum(a**n, axis=1)
    f = np.maximum(s, 1e-12)**(1.0/n)
    g = (a**(n-1.0))/r*(f**(1.0-n))[:, None]  # gradient of f; its length does not depend on the rotation
    gl = np.maximum(np.linalg.norm(g, axis=1), 0.5/r.max())
    return np.maximum((f-1.0)/gl, -r.max())


def bounds(params):
    r, n, rot, c = _p(params)
    half = np.abs(rot)@r
    return c-half, c+half
