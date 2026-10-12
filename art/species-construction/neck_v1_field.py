"""Neck v1 field composition (numpy only; shared by neck_v1_post.py and its development harness).

World units. The grid holds the old skin's signed distance S (positive outside). The neck is composed as one field:

  E = S + delta                    the old neck eroded: delta is a smooth offset on the neck axis (1 in the neck slab, fading
                                   out above it, below it and away from the axis), so the old stub and loft vanish inside C
  C                                the authored column: superellipse sections from a table (half width, front, back, exponent)
  F0 = smin3(E, C, k)              C2 smooth minimum; k varies smoothly with height and with the angle around the axis, so the
                                   jaw underside, the jaw sides, the nape and the neck base roll into the column with soft fillets
  F1 = F0 + wb (blur(F0) - F0)     Gaussian blur under a mask, to take out old loft and yoke bands at the neck base
  F  = S + w (F1 - S)              w is the part mask (1 inside, smootherstep to 0 at the edge): outside it the field is S exactly
"""
import math

import numpy as np


def smootherstep(t):
    t = np.clip(t, 0.0, 1.0)
    return t*t*t*(t*(6*t-15)+10)


def smin3(a, b, k):
    """C2 smooth minimum (cubic): min(a, b) - k/6 h^3, h = max(k - |a - b|, 0)/k."""
    h = np.clip(k-np.abs(a-b), 0.0, None)/k
    return np.minimum(a, b)-h*h*h*k/6.0


def natural_spline(xs, ys):
    """Natural cubic spline through (xs, ys); f(x), linear beyond the ends."""
    xs = np.asarray(xs, float)
    ys = np.asarray(ys, float)
    n = len(xs)
    if n == 1:
        return lambda x: np.full(np.shape(x), ys[0])
    h = np.diff(xs)
    A = np.zeros((n, n))
    r = np.zeros(n)
    A[0, 0] = A[-1, -1] = 1
    for i in range(1, n-1):
        A[i, i-1], A[i, i], A[i, i+1] = h[i-1], 2*(h[i-1]+h[i]), h[i]
        r[i] = 3*((ys[i+1]-ys[i])/h[i]-(ys[i]-ys[i-1])/h[i-1])
    c = np.linalg.solve(A, r)
    b = (ys[1:]-ys[:-1])/h-h*(2*c[:-1]+c[1:])/3
    d = (c[1:]-c[:-1])/(3*h)
    slope_hi = b[-1]+2*c[-2]*h[-1]+3*d[-1]*h[-1]**2

    def f(x):
        x = np.asarray(x, float)
        i = np.clip(np.searchsorted(xs, x)-1, 0, n-2)
        t = x-xs[i]
        inside = ys[i]+b[i]*t+c[i]*t*t+d[i]*t*t*t
        lo = ys[0]+b[0]*(x-xs[0])
        hi = ys[-1]+slope_hi*(x-xs[-1])
        return np.where(x < xs[0], lo, np.where(x > xs[-1], hi, inside))
    return f


def band(v, edges):
    """1 between edges[1] and edges[2], smootherstep up from edges[0] and down to edges[3]."""
    a, b, c, d = edges
    return smootherstep((v-a)/max(b-a, 1e-9))*smootherstep((d-v)/max(d-c, 1e-9))


def fall(v, inner, outer):
    """1 for v <= inner, smootherstep down to 0 at outer."""
    return smootherstep((outer-v)/np.maximum(outer-inner, 1e-9))


def gaussian_blur3(a, sigma_cells):
    if sigma_cells <= 0:
        return a
    rad = int(math.ceil(3*sigma_cells))
    k = np.exp(-0.5*(np.arange(-rad, rad+1)/sigma_cells)**2)
    k /= k.sum()
    out = a
    for ax in range(3):
        pad = [(0, 0)]*3
        pad[ax] = (rad, rad)
        q = np.pad(out, pad, mode='edge')
        acc = np.zeros_like(out)
        for j, kv in enumerate(k):
            sl = [slice(None)]*3
            sl[ax] = slice(j, j+out.shape[ax])
            acc += kv*q[tuple(sl)]
        out = acc
    return out


def periodic_angle_table(deg, vals):
    d = np.asarray(deg, float)
    v = np.asarray(vals, float)

    def f(theta_deg):
        t = np.mod(theta_deg, 360.0)
        return np.interp(t, np.concatenate([d-360, d, d+360]), np.concatenate([v, v, v]))
    return f


def grid_coords(lo, step, shape):
    xs = lo[0]+step*np.arange(shape[0])
    ys = lo[1]+step*np.arange(shape[1])
    zs = lo[2]+step*np.arange(shape[2])
    return np.meshgrid(xs, ys, zs, indexing='ij')


def compose(S, lo, step, spec):
    """Return F, w (part mask) and a dict of the intermediate fields used for the record."""
    X, Y, Z = grid_coords(lo, step, S.shape)
    ay = float(spec['axisY'])
    rr = np.hypot(X, Y-ay)
    # angle around the axis: 0 front (-y), 90 side (|x|), 180 back
    theta = np.degrees(np.arctan2(np.abs(X), -(Y-ay)))

    # column
    col = spec['column']
    rows = col['rows']
    zt = [r['z'] for r in rows]
    hw = natural_spline(zt, [r['half'] for r in rows])(Z)
    fr = natural_spline(zt, [r['front'] for r in rows])(Z)
    bk = natural_spline(zt, [r['back'] for r in rows])(Z)
    ex = natural_spline(zt, [r['exp'] for r in rows])(Z)
    yc = (fr+bk)/2
    bb = (bk-fr)/2
    dy = Y-yc
    r = np.hypot(X, dy)
    th = np.arctan2(dy, X)
    R = (np.power(np.abs(np.cos(th))/hw, ex)+np.power(np.abs(np.sin(th))/bb, ex))**(-1.0/ex)
    dRdz = np.gradient(R, step, axis=2)
    C = (r-R)/np.sqrt(1+dRdz*dRdz)
    C = np.maximum(C, np.maximum(col['zBottom']-Z, Z-col['zTop']))

    # erosion of the old neck
    er = spec['erode']
    delta = er['depth']*band(Z, er['z'])*fall(rr, er['r'][0], er['r'][1])
    E = S+delta

    # blend radius k(z, theta)
    bl = spec['blend']
    kz = natural_spline(bl['zRows'], bl['k'])(Z)
    kth = periodic_angle_table(bl['thetaDeg'], bl['thetaScale'])(theta)
    kth_hi = periodic_angle_table(bl['thetaDeg'], bl.get('thetaScaleHigh', [1.0]*len(bl['thetaDeg'])))(theta)
    # thetaScale applies below thetaZ (the neck base), thetaScaleHigh above it (the jaw and nape), blended across thetaZ
    tz = smootherstep((Z-bl['thetaZ'][0])/(bl['thetaZ'][1]-bl['thetaZ'][0]))
    k = kz*(kth*(1-tz)+kth_hi*tz)
    F0 = smin3(E, C, k)

    F1 = F0
    for stage in spec.get('blur', []):
        Fb = gaussian_blur3(F1, stage['sigma']/step)
        wb = stage['weight']*band(Z, stage['z'])*fall(rr, stage['r'][0], stage['r'][1])
        F1 = F1+wb*(Fb-F1)

    pm = spec['partMask']
    r1 = natural_spline(pm['zRows'], pm['rInner'])(Z)
    r2 = natural_spline(pm['zRows'], pm['rOuter'])(Z)
    w = fall(rr, r1, r2)*band(Z, pm['z'])
    F = S+w*(F1-S)
    return F, w, {'C': C, 'E': E, 'k': k}


class Trilinear:
    def __init__(self, A, lo, step):
        self.A, self.lo, self.step = A, np.asarray(lo, float), float(step)
        self.top = np.array(A.shape)-2

    def __call__(self, P):
        u = (P-self.lo)/self.step
        i0 = np.clip(np.floor(u).astype(int), 0, self.top)
        t = np.clip(u-i0, 0, 1)
        out = np.zeros(len(P))
        A = self.A
        for di in (0, 1):
            wx = t[:, 0] if di else 1-t[:, 0]
            for dj in (0, 1):
                wy = t[:, 1] if dj else 1-t[:, 1]
                for dk in (0, 1):
                    wz = t[:, 2] if dk else 1-t[:, 2]
                    out += wx*wy*wz*A[i0[:, 0]+di, i0[:, 1]+dj, i0[:, 2]+dk]
        return out


def move_vertices(V0, tris, S, F, w, lo, step, spec, log=print):
    """New vertex positions: every vertex where the field changed is moved onto F's zero set (target level: S at the
    vertex, so the grid's own error cancels), then the moved ones are relaxed along the surface and projected again."""
    lo = np.asarray(lo, float)
    hi = lo+step*(np.array(S.shape)-1)
    fS, fF, fW = Trilinear(S, lo, step), Trilinear(F, lo, step), Trilinear(w, lo, step)
    gx, gy, gz = np.gradient(F, step)
    fg = [Trilinear(g, lo, step) for g in (gx, gy, gz)]

    def grad(P):
        return np.stack([f(P) for f in fg], 1)

    def project(P, level, iters=14, maxstep=.004):
        P = P.copy()
        for _ in range(iters):
            e = fF(P)-level
            g = grad(P)
            gg = np.maximum((g*g).sum(1), 1e-8)
            st = -(e/gg)[:, None]*g
            n = np.linalg.norm(st, axis=1)
            st *= np.minimum(1, maxstep/np.maximum(n, 1e-12))[:, None]
            P += st
        return P, fF(P)-level

    nv = len(V0)
    inner = np.all((V0 > lo+2*step) & (V0 < hi-2*step), axis=1)
    wall = np.zeros(nv)
    wall[inner] = fW(V0[inner])
    cand = np.where(wall > 0)[0]
    level = fS(V0[cand])
    changed = np.abs(fF(V0[cand])-level) > 1e-12
    cand, level = cand[changed], level[changed]
    P, err = project(V0[cand], level)
    V1 = V0.copy()
    V1[cand] = P
    log(f'projected {len(cand)} vertices; residual max {np.abs(err).max():.2e}')

    rx = spec.get('relax', {})
    if rx.get('iterations', 0):
        moved0 = np.linalg.norm(V1-V0, axis=1)
        sel = cand[moved0[cand] > rx.get('minMove', .0002)]
        wrel = np.clip(moved0[sel]/rx.get('fullMove', .002), 0, 1)
        selmask = np.zeros(nv, bool)
        selmask[sel] = True
        e = np.concatenate([tris[:, [0, 1]], tris[:, [1, 2]], tris[:, [2, 0]]])
        e = np.unique(np.sort(e, 1), axis=0)
        e = e[selmask[e[:, 0]] | selmask[e[:, 1]]]
        e = np.concatenate([e, e[:, ::-1]])
        deg = np.bincount(e[:, 0], minlength=nv).astype(float)
        lev = fS(V0[sel])
        for _ in range(int(rx['iterations'])):
            acc = np.zeros((nv, 3))
            np.add.at(acc, e[:, 0], V1[e[:, 1]])
            avg = acc[sel]/np.maximum(deg[sel], 1)[:, None]
            g = grad(V1[sel])
            g /= np.maximum(np.linalg.norm(g, axis=1, keepdims=True), 1e-9)
            d = avg-V1[sel]
            d -= (d*g).sum(1, keepdims=True)*g
            V1[sel] += rx.get('factor', .5)*wrel[:, None]*d
            V1[sel], _ = project(V1[sel], lev, iters=5)
        log(f'relaxed {len(sel)} vertices x {rx["iterations"]}')
    disp = np.linalg.norm(V1-V0, axis=1)
    outside = wall <= 0
    stats = {
        'skinVertices': int(nv), 'moved': int((disp > 0).sum()), 'max': float(disp.max()),
        'medianMoved': float(np.median(disp[disp > 0])) if (disp > 0).any() else 0.0,
        'outsidePartMax': float(disp[outside].max()), 'outsidePartMoved': int((disp[outside] > 0).sum()),
        'movedBounds': [V0[disp > 0].min(0).round(4).tolist(), V0[disp > 0].max(0).round(4).tolist()] if (disp > 0).any() else None,
    }
    return V1, stats, wall


def sections(VV):
    out = []
    for z in np.arange(.38, .531, .01):
        b = VV[(np.abs(VV[:, 2]-z) < .0012) & (np.abs(VV[:, 0]) < .25) & (VV[:, 1] > -.25) & (VV[:, 1] < .15)]
        mid = b[np.abs(b[:, 0]) < .004]
        if not len(mid):
            continue
        f_, k_ = float(mid[:, 1].min()), float(mid[:, 1].max())
        s = b[np.abs(b[:, 1]-(f_+k_)/2) < .005]
        out.append({'z': round(float(z), 3), 'front': round(f_, 4), 'back': round(k_, 4),
                    'half': round(float(np.abs(s[:, 0]).max()), 4) if len(s) else None})
    return out
