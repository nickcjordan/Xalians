"""B-6kf7: shared neck band measures for the Luceras neck seam (crease ring behind the jaw and ears).

Numpy only (no bpy), so the same code measures the rest sculpt, a posed evaluated mesh, and the edited sculpt.

The neck axis is a Catmull-Rom spline through the rest heads of neck_01, neck_02, head_01 and a point 70 mm forward
along head_01 (all on the midline, x = 0). Every vertex near it gets rest coordinates (s along the axis in mm,
theta around it in degrees, r its distance in mm). theta 0 is dorsal (the top line), 90 the creature's left (+X),
180 the throat, 270 the right.
"""
import numpy as np

REST_PTS = np.array([
    [0.0, -0.0428, 0.4092],    # neck_01 head
    [0.0, -0.1090, 0.4372],    # neck_02 head
    [0.0, -0.1753, 0.5372],    # head_01 head
    [0.0, -0.2420, 0.5255],    # 70 mm forward along head_01 (toward its tail)
])
CTRL_BONES = ('neck_01', 'neck_02', 'head_01', 'head_01')


def spline(P, n=600):
    """Catmull-Rom through P (end tangents mirrored). Returns points (n,3), unit tangents, arc length in mm."""
    P = np.asarray(P, float)
    Q = np.vstack([2 * P[0] - P[1], P, 2 * P[-1] - P[-2]])
    pts = []
    per = n // (len(P) - 1)
    for i in range(1, len(Q) - 2):
        p0, p1, p2, p3 = Q[i - 1], Q[i], Q[i + 1], Q[i + 2]
        for t in np.linspace(0, 1, per, endpoint=False):
            t2, t3 = t * t, t * t * t
            pts.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    pts.append(P[-1])
    C = np.array(pts)
    T = np.gradient(C, axis=0); T /= np.linalg.norm(T, axis=1)[:, None]
    s = np.r_[0, np.cumsum(np.linalg.norm(np.diff(C, axis=0), axis=1))] * 1000
    return C, T, s


def ctrl_s():
    C, T, s = spline(REST_PTS)
    return [float(s[np.argmin(np.linalg.norm(C - p, axis=1))]) for p in REST_PTS]


def param(V, C, T, s, max_r=0.11):
    """Nearest axis sample for every vertex: index, s (mm), theta (deg), r (mm), and an in-range mask."""
    idx = np.empty(len(V), int); best = np.full(len(V), np.inf)
    for k in range(0, len(C), 1):
        d = ((V - C[k]) ** 2).sum(1)
        m = d < best; best[m] = d[m]; idx[m] = k
    R = V - C[idx]
    t = T[idx]
    X = np.array([1.0, 0, 0])
    N = np.cross(t, X); N /= np.linalg.norm(N, axis=1)[:, None]     # in the midline plane, perpendicular to the axis
    N *= np.sign(N[:, 2:3] + 1e-9)                                   # dorsal side positive (+Z component)
    a = (R * N).sum(1); b = R @ X
    theta = np.degrees(np.arctan2(b, a)) % 360
    r = np.linalg.norm(R - t * (R * t).sum(1)[:, None], axis=1) * 1000
    interior = (idx > 2) & (idx < len(C) - 3) & (np.sqrt(best) < max_r)
    return idx, s[idx], theta, r, interior


def curvature(V, N, E):
    """Mean curvature per vertex (umbrella Laplacian along the normal over mean edge length squared), 1/mm, + convex."""
    n = len(V); S = np.zeros((n, 3)); Cn = np.zeros(n); L = np.zeros(n)
    el = np.linalg.norm(V[E[:, 0]] - V[E[:, 1]], axis=1)
    for a, b in ((0, 1), (1, 0)):
        np.add.at(S, E[:, a], V[E[:, b]]); np.add.at(Cn, E[:, a], 1); np.add.at(L, E[:, a], el)
    Cn = np.maximum(Cn, 1); lap = S / Cn[:, None] - V; h = L / Cn
    return -(lap * N).sum(1) / np.maximum(h * h, 1e-12) * 4 / 1000.0


def vertex_normals(V, F):
    """Area-weighted vertex normals from triangles F."""
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    N = np.zeros_like(V)
    for i in range(3): np.add.at(N, F[:, i], fn)
    return N / np.maximum(np.linalg.norm(N, axis=1), 1e-30)[:, None]


def smooth_field(x, E, it, keep=None):
    """Umbrella smoothing of a per-vertex scalar or vector field (for curvature display and baselines)."""
    n = len(x); Cn = np.zeros(n); np.add.at(Cn, E[:, 0], 1); np.add.at(Cn, E[:, 1], 1); Cn = np.maximum(Cn, 1)
    y = x.copy()
    for _ in range(it):
        S = np.zeros_like(y); np.add.at(S, E[:, 0], y[E[:, 1]]); np.add.at(S, E[:, 1], y[E[:, 0]])
        avg = S / (Cn if y.ndim == 1 else Cn[:, None])
        y = 0.5 * y + 0.5 * avg
        if keep is not None: y[keep] = x[keep]
    return y


def groove_table(sv, th, r, sel, s_lo, s_hi, ds=2.0, dth=15.0, win=24.0):
    """Radius residual per (theta bin, s bin): median r minus a local quadratic fit over +-win/2 mm excluding +-4 mm.
    A negative residual band at a consistent s across theta bins is a ring groove. Returns dict of arrays."""
    sb = np.arange(s_lo, s_hi + 1e-9, ds); tb = np.arange(0, 360, dth)
    med = np.full((len(tb), len(sb)), np.nan)
    for i, t0 in enumerate(tb):
        mt = sel & (((th - t0) % 360) < dth)
        for j, s0 in enumerate(sb):
            m = mt & (np.abs(sv - s0) <= ds / 2)
            if m.sum() >= 3: med[i, j] = np.median(r[m])
    res = np.full_like(med, np.nan)
    for i in range(len(tb)):
        for j, s0 in enumerate(sb):
            if np.isnan(med[i, j]): continue
            d = sb - s0; m = (np.abs(d) <= win / 2) & (np.abs(d) > 4.0) & ~np.isnan(med[i])
            if m.sum() < 5: continue
            c = np.polyfit(d[m], med[i, m], 2); res[i, j] = med[i, j] - c[-1]
    return dict(s=sb, theta=tb, median_r=med, residual=res)


def ring_summary(g):
    """Deepest groove per theta bin, and the s-profile of the median residual across theta bins."""
    res = g['residual']; out = []
    for i, t0 in enumerate(g['theta']):
        row = res[i]
        if np.all(np.isnan(row)): continue
        j = int(np.nanargmin(row)); out.append(dict(theta=float(t0), s_mm=float(g['s'][j]), depth_mm=float(-row[j]), r_mm=float(g['median_r'][i, j])))
    prof = np.nanmedian(res, axis=0)
    return dict(per_theta=out, median_profile=[None if np.isnan(x) else round(float(x), 3) for x in prof], s=g['s'].tolist())
