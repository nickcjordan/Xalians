"""Hips v1 (numpy only): the waist-to-hip width and the tail root.

World units. Two edits on the fused skin.

1. Hip width. The trunk's front-view half width w0(z) is measured from horizontal slices (the trunk run from the midline to the
   first gap, so the arms and tails do not count). An authored half width w1(z) (natural spline through the spec's rows) gives
   a lateral scale s(z) = w1 / w0, applied to trunk vertices as x' = x (1 + w (s - 1)), where w fades out behind the rump (so the
   tail stem and tails do not move here), outside the trunk box, above the waist and down the thighs; arm vertices are excluded
   with the arms step's own arm mask.
2. Tail root. On the warped skin's signed distance S, authored masses (non-mirrored ellipsoids, a broad sacral base under the
   stem and a bridge between the back and the top of the tail stack) are joined with a C2 smooth minimum, masked Gaussian blurs
   take out the lumps and grooves of the old fusion, and the part mask returns the field to S exactly at its edge.
"""
import numpy as np

from neck_v1_field import natural_spline, smootherstep, smin3, gaussian_blur3, grid_coords


def trunk_halfwidth(V, zs, ymax=.06, ymin=-.22, gap=.008):
    out = []
    for z in zs:
        b = V[np.abs(V[:, 2]-z) < .0015]
        q = b[(b[:, 0] > 0) & (b[:, 1] < ymax) & (b[:, 1] > ymin)]
        xs = np.sort(q[:, 0])
        g = np.where(np.diff(xs) > gap)[0]
        out.append(xs[g[0]] if len(g) else (xs[-1] if len(xs) else np.nan))
    return np.array(out)


def band(v, e):
    a, b, c, d = e
    return smootherstep((v-a)/max(b-a, 1e-9))*smootherstep((d-v)/max(d-c, 1e-9))


def hip_warp(V, spec, exclude):
    hw = spec['hipWidth']
    zs = np.arange(hw['zRange'][0], hw['zRange'][1]-1e-9, -hw['zStep'])
    w0raw = trunk_halfwidth(V, zs)
    # the slice measure is noisy at the 1e-3 level (remesh facets); a ratio of noisy widths prints as horizontal ripples,
    # so the measured width is smoothed along z first (Gaussian, smoothCells)
    k = float(hw.get('smoothCells', 2.5))
    rad = int(np.ceil(3*k))
    ker = np.exp(-0.5*(np.arange(-rad, rad+1)/k)**2)
    ker /= ker.sum()
    w0 = np.convolve(np.pad(w0raw, rad, mode='edge'), ker, 'valid')
    rows = sorted(hw['rows'], key=lambda r: r['z'])
    w1 = natural_spline([r['z'] for r in rows], [r['half'] for r in rows])(zs)
    s = w1/w0
    zi = np.clip((V[:, 2]-zs[-1])/(zs[0]-zs[-1]), 0, 1)
    sv = np.interp(V[:, 2], zs[::-1], s[::-1])
    w = band(V[:, 2], hw['zFade'])*smootherstep((hw['yFade'][1]-V[:, 1])/(hw['yFade'][1]-hw['yFade'][0]))
    w *= smootherstep((hw['xMax'][1]-np.abs(V[:, 0]))/(hw['xMax'][1]-hw['xMax'][0]))
    w[exclude] = 0
    V1 = V.copy()
    V1[:, 0] = V[:, 0]*(1+w*(sv-1))
    return V1, w > 0, {'z': zs.round(3).tolist(), 'before': w0raw.round(4).tolist(), 'beforeSmoothed': w0.round(4).tolist(), 'target': w1.round(4).tolist()}


def ellipsoid_e(X, Y, Z, c, s):
    return np.sqrt(((X-c[0])/s[0])**2+((Y-c[1])/s[1])**2+((Z-c[2])/s[2])**2)


def region_weight(X, Y, Z, items):
    w = np.zeros_like(X)
    for it in items:
        if 'ellipsoid' in it:
            e = ellipsoid_e(X, Y, Z, it['ellipsoid'], it['s'])
            e1, e2 = it['fade']
            wi = smootherstep((e2-e)/(e2-e1))
        else:
            (x0, x1), (y0, y1), (z0, z1) = it['box']
            f = it['fade']
            wi = np.ones_like(X)
            for v, a, b in ((X, x0, x1), (Y, y0, y1), (Z, z0, z1)):
                wi = wi*smootherstep((v-a)/f)*smootherstep((b-v)/f)
        w = np.maximum(w, wi)
    return w


def compose_root(S, lo, step, spec):
    X, Y, Z = grid_coords(lo, step, S.shape)
    F0 = S
    for d in spec.get('masses', []):
        e = ellipsoid_e(X, Y, Z, d['c'], d['s'])
        D = (e-1)*min(d['s'])
        F0 = smin3(F0, D, d['k'])
    F1 = F0
    for st in spec.get('blur', []):
        Fb = gaussian_blur3(F1, st['sigma']/step)
        wb = st.get('weight', 1.0)*region_weight(X, Y, Z, st['mask'])
        F1 = F1+wb*(Fb-F1)
    w = region_weight(X, Y, Z, spec['partMask'])
    F = S+w*(F1-S)
    return F, w


def move_vertices(V0, tris, S, F, w, lo, step, spec, log=print):
    """As neck_v1_field.move_vertices, with the Newton iteration count and step cap from the spec ('project'), because the
    tail-root fill moves some vertices farther than the neck did."""
    import neck_v1_field as nf
    pr = spec.get('project', {})
    iters, cap = int(pr.get('iterations', 14)), float(pr.get('maxStep', .004))
    lo = np.asarray(lo, float)
    hi = lo+step*(np.array(S.shape)-1)
    fS, fF, fW = nf.Trilinear(S, lo, step), nf.Trilinear(F, lo, step), nf.Trilinear(w, lo, step)
    gx, gy, gz = np.gradient(F, step)
    fg = [nf.Trilinear(g, lo, step) for g in (gx, gy, gz)]

    def grad(P):
        return np.stack([f(P) for f in fg], 1)

    def project(P, level, iters=iters, maxstep=cap):
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
            V1[sel], _ = project(V1[sel], lev, iters=8)
        log(f'relaxed {len(sel)} vertices x {rx["iterations"]}')
    # untangle: where the fill of a deep crease maps both of its walls onto one surface, some faces end up folded against their
    # neighbours; their vertices (and one ring around them) are averaged with their neighbours and projected back, until none is
    ut = spec.get('untangle', {})
    folded_counts = []
    if ut.get('iterations', 0):
        movedmask = np.linalg.norm(V1-V0, axis=1) > 0
        ft = tris[movedmask[tris].any(1)]
        e = np.concatenate([ft[:, [0, 1]], ft[:, [1, 2]], ft[:, [2, 0]]])
        e = np.unique(np.sort(e, 1), axis=0)
        e = np.concatenate([e, e[:, ::-1]])
        deg = np.bincount(e[:, 0], minlength=nv).astype(float)
        fsel = np.zeros(nv, bool)
        for _ in range(int(ut['iterations'])):
            fn = np.cross(V1[ft[:, 1]]-V1[ft[:, 0]], V1[ft[:, 2]]-V1[ft[:, 0]])
            N = np.zeros_like(V1)
            for i in range(3):
                np.add.at(N, ft[:, i], fn)
            N /= np.linalg.norm(N, axis=1, keepdims=True)+1e-20
            fu = fn/(np.linalg.norm(fn, axis=1, keepdims=True)+1e-20)
            vn = N[ft].sum(1)
            vn /= np.linalg.norm(vn, axis=1, keepdims=True)+1e-20
            bad = ft[(fu*vn).sum(1) < float(ut.get('threshold', .5))]
            folded_counts.append(int(len(bad)))
            if not len(bad):
                break
            sel = np.zeros(nv, bool)
            sel[bad.ravel()] = True
            for _r in range(int(ut.get('rings', 2))):
                sel2 = sel.copy()
                sel2[e[sel[e[:, 0]], 1]] = True
                sel = sel2
            sel &= movedmask
            fsel |= sel
            idx = np.where(sel)[0]
            acc = np.zeros((nv, 3))
            np.add.at(acc, e[:, 0], V1[e[:, 1]])
            avg = acc[idx]/np.maximum(deg[idx], 1)[:, None]
            V1[idx] = .4*V1[idx]+.6*avg
            V1[idx], _ = project(V1[idx], fS(V0[idx]), iters=10)
        log(f'untangle: folded faces per pass {folded_counts}')
    disp = np.linalg.norm(V1-V0, axis=1)
    return V1, {'folded': folded_counts, 'moved': int((disp > 0).sum()), 'residualMax': float(np.abs(err).max()) if len(err) else 0.0}, wall
