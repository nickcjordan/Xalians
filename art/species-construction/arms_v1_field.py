"""Arms v1: the arm from below the shoulder ball to the palm root rebuilt as one tube (numpy only).

World units. For each arm (mirrored), the arm's vertices are found by a simple split from the trunk (x beyond a line that runs
down the gap between arm and body, y in front of the back, z below the armpit), and its bone axis is the smoothed polyline of
horizontal slice centroids of the old arm. Every arm vertex gets an arc length s along the axis, a radius r and an angle a
around it. On an (s, a) grid the mean radius is taken per cell and smoothed along s (Gaussian, sigma sAlong) and a little
around the axis, which removes the rings and steps at the elbow and wrist while keeping each section's own shape. The smoothed
radius is then rescaled to an authored taper T(s) (natural spline through the spec's rows of z and mean radius): the ratio
T / R0 where R0 is the smoothed old mean radius at s. A weight w(s) fades the edit in below the shoulder ball and out across the
palm root, so the paw (digits, claws, palm) does not move. Each vertex moves along its own radial direction:

  r_new = r + w(s) * (smoothed(s, a) * T(s) / R0(s) - r)      (smoothed: bilinear in s and angle)

The result is relaxed a little along the surface where it moved, and nothing outside the arms moves.
"""
import numpy as np

from neck_v1_field import natural_spline, smootherstep


def arm_mask(V, side, spec):
    x = V[:, 0]*side
    z = V[:, 2]
    m = spec['mask']
    xb = m['xGap'][0]+np.clip(m['xGap'][1]-z, 0, None)*m['xGap'][2]
    return (x > xb) & (V[:, 1] < m['yMax']) & (z < m['zTop']) & (z > m['zBottom'])


def arm_axis(P, spec):
    zs = np.arange(spec['axis']['zTop'], spec['axis']['zBottom'], -spec['axis']['step'])
    C = []
    for z in zs:
        b = P[np.abs(P[:, 2]-z) < spec['axis']['step']/2]
        C.append(b.mean(0) if len(b) else np.array([np.nan]*3))
    C = np.array(C)
    ok = ~np.isnan(C[:, 0])
    C = C[ok]
    for _ in range(int(spec['axis']['smooth'])):
        C[1:-1] = (C[:-2]+2*C[1:-1]+C[2:])/4
    s = np.r_[0, np.cumsum(np.linalg.norm(np.diff(C, axis=0), axis=1))]
    # densify with a natural cubic spline per coordinate, so nearest-point projection has no corners (corners in a coarse
    # polyline make plateaus in s, which print as rings)
    fine = np.arange(0, s[-1], float(spec['axis'].get('fine', .001)))
    Cf = np.stack([natural_spline(s, C[:, k])(fine) for k in range(3)], 1)
    sf = np.r_[0, np.cumsum(np.linalg.norm(np.diff(Cf, axis=0), axis=1))]
    return Cf, sf


def project(P, C, s):
    best = np.full(len(P), 1e9)
    sp = np.zeros(len(P))
    Q = np.zeros_like(P)
    T = np.zeros_like(P)
    for i in range(len(C)-1):
        a, b = C[i], C[i+1]
        d = b-a
        L = float(np.dot(d, d))
        t = np.clip(((P-a)@d)/L, 0, 1)
        q = a+t[:, None]*d
        dist = np.linalg.norm(P-q, axis=1)
        u = dist < best
        best[u] = dist[u]
        sp[u] = s[i]+t[u]*np.sqrt(L)
        Q[u] = q[u]
        T[u] = d/np.sqrt(L)
    return sp, Q, T, best


def gauss1(a, sigma_cells, axis, wrap=False):
    if sigma_cells <= 0:
        return a
    rad = int(np.ceil(3*sigma_cells))
    k = np.exp(-0.5*(np.arange(-rad, rad+1)/sigma_cells)**2)
    k /= k.sum()
    pad = [(0, 0)]*a.ndim
    pad[axis] = (rad, rad)
    q = np.pad(a, pad, mode='wrap' if wrap else 'edge')
    out = np.zeros_like(a)
    for j, kv in enumerate(k):
        sl = [slice(None)]*a.ndim
        sl[axis] = slice(j, j+a.shape[axis])
        out += kv*q[tuple(sl)]
    return out


def rebuild_arm(V, side, spec, log=print):
    """New positions for the arm vertices of one side; returns (indices, new positions, record)."""
    idx = np.where(arm_mask(V, side, spec))[0]
    P = V[idx].copy()
    C, s = arm_axis(P, spec)
    sp, Q, Tn, r = project(P, C, s)
    # angle around the axis: reference frame from the world x axis (outward) projected off the tangent
    ref = np.array([side, 0.0, 0.0])
    e1 = ref-(Tn@ref)[:, None]*Tn
    e1 /= np.linalg.norm(e1, axis=1, keepdims=True)
    e2 = np.cross(Tn, e1)
    D = P-Q
    ang = np.arctan2((D*e2).sum(1), (D*e1).sum(1))
    g = spec['grid']
    ns = int(np.ceil(s[-1]/g['ds']))+1
    na = int(g['na'])
    si = np.clip((sp/g['ds']).astype(int), 0, ns-1)
    ai = ((ang+np.pi)/(2*np.pi)*na).astype(int) % na
    sumr = np.zeros((ns, na))
    cnt = np.zeros((ns, na))
    np.add.at(sumr, (si, ai), r)
    np.add.at(cnt, (si, ai), 1)
    mean = np.where(cnt > 0, sumr/np.maximum(cnt, 1), np.nan)
    # fill empty cells along s by interpolation, per angle
    filled = mean.copy()
    for j in range(na):
        col = filled[:, j]
        okc = ~np.isnan(col)
        if okc.sum() >= 2:
            filled[:, j] = np.interp(np.arange(ns), np.where(okc)[0], col[okc])
        else:
            filled[:, j] = np.nanmean(mean)
    sm = gauss1(filled, g['sAlong']/g['ds'], 0)
    sm = gauss1(sm, g['aAround'], 1, wrap=True)
    R0 = sm.mean(1)
    # z of the axis at each s cell (to place the authored rows, which are given in world z for readability)
    scell = (np.arange(ns)+.5)*g['ds']
    zcell = np.interp(scell, s, C[:, 2])
    tp = spec['taper']
    rows = sorted(tp['rows'], key=lambda q: -q['z'])
    # spline in s: map each row's z to s along the axis (z decreases monotonically along the arm)
    srow = np.interp([-q['z'] for q in rows], -C[:, 2], s)
    T = natural_spline(srow, [q['r'] for q in rows])(scell)
    ratio = T/R0
    wfz = spec['weight']
    w = smootherstep((wfz['in'][0]-zcell)/(wfz['in'][0]-wfz['in'][1]))*smootherstep((zcell-wfz['out'][1])/(wfz['out'][0]-wfz['out'][1]))
    # per-vertex
    cs = np.clip(sp/g['ds']-.5, 0, ns-1)
    c0 = np.floor(cs).astype(int)
    c1 = np.minimum(c0+1, ns-1)
    ft = cs-c0
    ca = (ang+np.pi)/(2*np.pi)*na-.5
    a0 = np.floor(ca).astype(int)
    fa = ca-a0
    a0 %= na
    a1 = (a0+1) % na
    target = (sm*ratio[:, None])
    tv = ((1-ft)*((1-fa)*target[c0, a0]+fa*target[c0, a1])+ft*((1-fa)*target[c1, a0]+fa*target[c1, a1]))
    wv = (1-ft)*w[c0]+ft*w[c1]
    # the vertex is placed on the smoothed, retapered tube (bilinear in s and angle), so the old rings and the remesh
    # ripple inside the part are replaced by one smooth surface; w fades it back to the old radius at both ends
    dr = wv*(tv-r)
    radial = D/np.maximum(r, 1e-9)[:, None]
    newP = P+dr[:, None]*radial
    rec = {'axisPoints': C.round(4).tolist(), 'length': float(s[-1]), 'cells': [ns, na],
           'profile': [{'z': round(float(zc), 4), 'oldMean': round(float(np.nanmean(mean[i])), 5) if np.isfinite(mean[i]).any() else None,
                        'smoothedOld': round(float(R0[i]), 5), 'target': round(float(T[i]), 5), 'weight': round(float(w[i]), 4)}
                       for i, zc in enumerate(zcell)]}
    return idx, newP, rec


def relax(V0, V1, tris, moved_idx, spec, protect=None):
    """Tangential-plus-normal Taubin smoothing of the moved vertices only, weighted by how far they moved."""
    rx = spec.get('relax', {})
    it = int(rx.get('iterations', 0))
    if not it:
        return V1
    nv = len(V0)
    sel = np.zeros(nv, bool)
    sel[moved_idx] = True
    if protect is not None:
        sel &= ~protect
    e = np.concatenate([tris[:, [0, 1]], tris[:, [1, 2]], tris[:, [2, 0]]])
    e = e[sel[e[:, 0]] | sel[e[:, 1]]]
    e = np.unique(np.sort(e, 1), axis=0)
    e = np.concatenate([e, e[:, ::-1]])
    deg = np.bincount(e[:, 0], minlength=nv).astype(float)
    d = np.linalg.norm(V1-V0, axis=1)
    wgt = np.clip(d/rx.get('fullMove', .002), 0, 1)*sel
    V = V1.copy()
    for k in range(it):
        for lam in (rx.get('lambda', .5), rx.get('mu', -.53)):
            acc = np.zeros((nv, 3))
            np.add.at(acc, e[:, 0], V[e[:, 1]])
            L = acc/np.maximum(deg, 1)[:, None]-V
            V = V+lam*wgt[:, None]*L
    return V


def local_smooth(V, tris, spots, log=print):
    """Taubin smoothing in small spheres (spec 'spots': c, radius, iterations; mirrored), weight 1 at the centre fading to 0
    at the radius: used for the sliver facets at the front of each armpit apex left by the shoulder step."""
    V = V.copy()
    nv = len(V)
    for sp in spots:
        for side in (1, -1):
            c = np.array(sp['c'], float)*np.array([side, 1, 1])
            d = np.linalg.norm(V-c, axis=1)
            w = smootherstep((sp['radius']-d)/sp['radius'])
            sel = w > 0
            e = np.concatenate([tris[:, [0, 1]], tris[:, [1, 2]], tris[:, [2, 0]]])
            e = e[sel[e[:, 0]] | sel[e[:, 1]]]
            e = np.unique(np.sort(e, 1), axis=0)
            e = np.concatenate([e, e[:, ::-1]])
            deg = np.bincount(e[:, 0], minlength=nv).astype(float)
            for _ in range(int(sp['iterations'])):
                for lam in ((.5, -.53) if sp.get('taubin', True) else (float(sp.get('lambda', .5)),)):
                    acc = np.zeros((nv, 3))
                    np.add.at(acc, e[:, 0], V[e[:, 1]])
                    L = acc/np.maximum(deg, 1)[:, None]-V
                    V = V+lam*w[:, None]*L
            log(f'local smooth at {c.round(3).tolist()}: {int(sel.sum())} vertices')
    return V
