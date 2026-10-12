"""Shoulders v1 field composition (numpy only; used by shoulders_v1_post.py and its development harness).

World units. S is the old skin's signed distance on a grid. The part (upper back, trapezius slope, shoulder caps, top of the
upper arm) is a smooth mask w built from mirrored ellipsoids and boxes. Inside it the field is rebuilt as

  F0 = smin3(S, D, kDome)          optional authored shoulder domes D (mirrored ellipsoids), joined with a C2 smooth minimum,
                                   so the cap reads as one rounded shoulder instead of a flat-topped block
  F1 = blur stages of F0           Gaussian smoothing under their own masks: takes out the upper-back bands, the notches and
                                   nubs at the arm root and the hard upper edge of the old deltoid cap
  F  = S + w (F1 - S)              outside the part the field is S exactly, so nothing outside moves
"""
import numpy as np

from neck_v1_field import smootherstep, smin3, gaussian_blur3, grid_coords, Trilinear, move_vertices  # noqa: F401


def ellipsoid_e(X, Y, Z, c, s, mirror=True):
    x = np.abs(X) if mirror else X
    return np.sqrt(((x-c[0])/s[0])**2+((Y-c[1])/s[1])**2+((Z-c[2])/s[2])**2)


def ellipsoid_sdf(X, Y, Z, c, s, mirror=True):
    """Approximate signed distance of an ellipsoid (scaled by the smallest semi-axis, exact on a sphere)."""
    e = ellipsoid_e(X, Y, Z, c, s, mirror)
    return (e-1)*min(s)


def region_weight(X, Y, Z, items):
    """Smooth union (max) of mask items: {'ellipsoid': c, 's': semi-axes, 'fade': [e1, e2], 'mirror': bool} is 1 for e <= e1
    and 0 at e2; {'box': [[x0, x1], [y0, y1], [z0, z1]], 'fade': f, 'absX': bool} is 1 inside the box shrunk by f, 0 outside it."""
    w = np.zeros_like(X)
    for it in items:
        if 'ellipsoid' in it:
            e = ellipsoid_e(X, Y, Z, it['ellipsoid'], it['s'], it.get('mirror', True))
            e1, e2 = it['fade']
            wi = smootherstep((e2-e)/(e2-e1))
        else:
            (x0, x1), (y0, y1), (z0, z1) = it['box']
            f = it['fade']
            xx = np.abs(X) if it.get('absX', True) else X
            wi = np.ones_like(X)
            for v, a, b, fa in ((xx, x0, x1, f), (Y, y0, y1, f), (Z, z0, z1, f)):
                fa = fa if not isinstance(fa, (list, tuple)) else fa
                wi = wi*smootherstep((v-a)/fa)*smootherstep((b-v)/fa)
        w = np.maximum(w, wi)
    return w


def compose(S, lo, step, spec):
    X, Y, Z = grid_coords(lo, step, S.shape)
    F0 = S
    for d in spec.get('domes', []):
        D = ellipsoid_sdf(X, Y, Z, d['c'], d['s'])
        F0 = smin3(F0, D, d['k'])
    F1 = F0
    for st in spec.get('blur', []):
        Fb = gaussian_blur3(F1, st['sigma']/step)
        wb = st.get('weight', 1.0)*region_weight(X, Y, Z, st['mask'])
        F1 = F1+wb*(Fb-F1)
    w = region_weight(X, Y, Z, spec['partMask'])
    for ex in spec.get('exclude', []):
        w = w*(1-region_weight(X, Y, Z, [ex]))
    F = S+w*(F1-S)
    return F, w, {}
