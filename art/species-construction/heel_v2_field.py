"""Heel v2 (numpy only): clean domed sole pads with a groove round each, and the heel's back-bottom corner as one fillet tangent
to the heel back and to the floor (anatomy review 2026-10-13, finding 7; heel v1 rejected for faint, wobbly pads, a lumpy bottom
edge and a kink where its corner arc met the heel back).

World units, +y toward the back, z up. Every edit is a function of position on the skin's signed distance S (positive
outside), never of a vertex index. The spec is written for the +x foot; every mass is mirrored to both sides.

  blurX      [blurX] Gaussian blurs along x only (across the foot) over the heel's back and sides, as heel v1: they merge the
             ridge the leg column left down the heel back and the grooves beside it
  lift       [lift] the sole is moved up by `depth`: F(x, y, z) = S(x, y, z - d(x, y, z)), d = depth near the floor (fading out
             between z floorZ + band[0] and floorZ + band[1]) and nothing on the heel's contact patch (an ellipse, `heel`,
             faded; or, simpler, nothing behind y heelY). A vertical shift leaves vertical walls exactly where they were, so the foot's side
             silhouette does not change; only the sole rises, and with it the grooves between the pads
  pads       [pads] each pad is one or more flattened ellipsoid lobes (smooth union, lobeK) whose bottom sits `sink` (per pad, or the default) below the
             foot's own underside at the pad center (the floor, or a toe's underside where the toe curves up), clipped flat at
             the floor so the pads keep the floor contact; joined to the lifted sole by a small smooth minimum (padK), which
             leaves a clean concave groove round every pad
  corner     [corner] the heel's back-bottom corner in the side view: a line is fitted to the measured heel back (the largest y
             inside the solid per height over z zfit, within xhalf of the heel center) and the region in front of it and above
             the floor, with the corner between them rounded to radius R, is intersected with the foot (a smooth maximum,
             smoothK, kept hard within hardBand of the floor; blended in by a box): the fillet is tangent to the heel back line and to the floor, so the back-bottom of the heel is one
             curve in profile; an across-the-foot blur below it softens where the fillet surface meets the heel's sides
  openings   [openings] morphological openings (the union of all balls of radius r inside the foot) over masked regions: the
             surface is moved inward only where it is convex with a radius under r, and the new surface is tangent to the old
             wherever it is kept, so a corner becomes one fillet with no kink. The heel's back-bottom corner uses r about .025;
             the sole's rim (the old slab's lip) a small r. The region is a smooth box (|x|, y, z bands); the opened field is
             blended in by the box weight, so its edge is a smooth hand-over, and the regions are placed where the opening
             cuts little at their edges (the heel region stops behind the metatarsal pad, which is convex and would be eaten)
  keepContact [keepContact] in the core of the heel's contact patch, within `band` of the floor and in front of yMax, the
             field from before the corner and the openings is restored, so the heel's contact stays exactly on the floor plane
  S1 = S + wbox (edits); F = pelvis_v1_field.compose(S1, ...) with the remaining keys ([partBox]), outside which F is S exactly.
"""
import numpy as np

from neck_v1_field import smootherstep, smin3, grid_coords
import pelvis_v1_field as pf


def shift_z(F, dcells):
    """F sampled at z - d (d in cells, per cell), linear along z, edge values held."""
    nz = F.shape[2]
    k = np.arange(nz)[None, None, :]-dcells
    k0 = np.clip(np.floor(k).astype(int), 0, nz-1)
    k1 = np.clip(k0+1, 0, nz-1)
    t = np.clip(k-np.floor(k), 0, 1)
    return np.take_along_axis(F, k0, 2)*(1-t)+np.take_along_axis(F, k1, 2)*t


def underside_z(S, lo, step, x, y):
    """Lowest z of the solid in the grid column nearest (x, y)."""
    i = int(round((x-lo[0])/step))
    j = int(round((y-lo[1])/step))
    col = S[i, j]
    ins = np.where(col < 0)[0]
    if not len(ins):
        return None
    k = ins[0]
    if k == 0:
        return lo[2]
    a, b = col[k-1], col[k]
    return lo[2]+step*(k-1+a/(a-b))


def ellipsoid_d(X, Y, Z, c, s):
    e = np.sqrt(((X-c[0])/s[0])**2+((Y-c[1])/s[1])**2+((Z-c[2])/s[2])**2)
    return (e-1)*min(s)


def opening(F, lo, step, r, region, chunk=1200, log=print):
    """Signed distance of the opening of {F < 0} by a ball of radius r, at the cells where `region` > 0 and |F| < r + 2 step
    (elsewhere F is returned). Ball centers are the points of the level set F = -r, found on the grid and refined by one
    Newton step along the gradient; the opened field is min over centers of |p - c| - r, and only ever >= F where it matters
    (the result is max(F, opened))."""
    X, Y, Z = grid_coords(lo, step, F.shape)
    g = np.gradient(F, step)
    shell = np.abs(F+r) < 1.0*step
    sel = region > 0
    # centers near the region (within r + 3 step of it)
    from pelvis_v1_field import max_filter
    near = max_filter(sel.astype(float), int(np.ceil((r+3*step)/step))) > 0
    cs = np.where(shell & near)
    C = np.stack([X[cs], Y[cs], Z[cs]], 1)
    G = np.stack([g[0][cs], g[1][cs], g[2][cs]], 1)
    gg = np.maximum((G*G).sum(1, keepdims=True), 1e-9)
    C = C-((F[cs]+r)[:, None]/gg)*G
    qs = np.where(sel & (np.abs(F) < r+2*step))
    Q = np.stack([X[qs], Y[qs], Z[qs]], 1)
    out = np.full(len(Q), np.inf)
    order = np.lexsort((Q[:, 2], Q[:, 1], Q[:, 0]))
    for a in range(0, len(Q), chunk):
        idx = order[a:a+chunk]
        P = Q[idx]
        bl, bh = P.min(0)-r-3*step, P.max(0)+r+3*step
        m = np.all((C > bl) & (C < bh), axis=1)
        Cc = C[m]
        if not len(Cc):
            continue
        d2 = ((P[:, None, :]-Cc[None, :, :])**2).sum(2)
        out[idx] = np.sqrt(d2.min(1))-r
    D = F.copy()
    Fq = F[qs]
    D[qs] = np.maximum(Fq, np.where(np.isfinite(out), out, Fq))
    log(f'opening r {r}: {len(C)} centers, {len(Q)} cells, max cut {float((D-F).max()):.4f}')
    return D



def blur_x(F0, X, Y, Z, step, items, log=print):
    """Masked Gaussian blurs along x only (mirrored ellipsoid masks with a fade)."""
    for bx in items:
        sig = bx['sigma']/step
        rad = int(np.ceil(3*sig))
        k = np.exp(-0.5*(np.arange(-rad, rad+1)/sig)**2)
        k /= k.sum()
        q = np.pad(F0, [(rad, rad), (0, 0), (0, 0)], mode='edge')
        Fb = np.zeros_like(F0)
        for j, kv in enumerate(k):
            Fb += kv*q[j:j+F0.shape[0]]
        wb = np.zeros_like(F0)
        for side in (1, -1):
            c = np.array(bx['c'], float)*np.array([side, 1, 1])
            e = np.sqrt(((X-c[0])/bx['s'][0])**2+((Y-c[1])/bx['s'][1])**2+((Z-c[2])/bx['s'][2])**2)
            wb = np.maximum(wb, smootherstep((bx['fade'][1]-e)/(bx['fade'][1]-bx['fade'][0])))
        F0 = F0+wb*(Fb-F0)
        log('blurred across the foot')
    return F0


def back_line(F, lo, step, C):
    """Fit y = a + b z to the heel back: per grid z in C['zfit'], the largest y inside the solid over the columns within
    C['xhalf'] of the heel center |x| = C['xc'] (linear sub-cell refinement)."""
    nx, ny, nz = F.shape
    xs = lo[0]+step*np.arange(nx)
    zs = lo[2]+step*np.arange(nz)
    ii = np.where(np.abs(np.abs(xs)-C['xc']) <= C['xhalf'])[0]
    pts = []
    for k in np.where((zs >= C['zfit'][0]) & (zs <= C['zfit'][1]))[0]:
        best = -1.0
        for i in ii:
            col = F[i, :, k]
            ins = np.where(col < 0)[0]
            if not len(ins):
                continue
            j = ins[-1]
            if j+1 < ny:
                a, b = col[j], col[j+1]
                yv = lo[1]+step*(j+a/(a-b))
            else:
                yv = lo[1]+step*j
            best = max(best, yv)
        if best > -1:
            pts.append((zs[k], best))
    pts = np.array(pts)
    b, a = np.polyfit(pts[:, 0], pts[:, 1], 1)
    return a, b, pts


def corner_keep(Y, Z, a, b, zf, R):
    """Signed distance (positive outside) of the side-profile region in front of the back line y = a + b z and above the
    floor z = zf, with the corner between them rounded to radius R (exact for a convex corner; the same for every x)."""
    n = np.array([1.0, -b])/np.hypot(1.0, b)          # unit normal of the line in (y, z), pointing back
    db = ((Y-a)*n[0]+Z*n[1])
    dfl = zf-Z                                           # positive below the floor
    qx, qz = db+R, dfl+R
    return np.sqrt(np.maximum(qx, 0)**2+np.maximum(qz, 0)**2)+np.minimum(np.maximum(qx, qz), 0)-R

def compose(S, lo, step, V, spec, log=print):
    X, Y, Z = grid_coords(lo, step, S.shape)
    F0 = S.copy()
    F0 = blur_x(F0, X, Y, Z, step, spec.get('blurX', []), log)
    rec = {}
    L = spec.get('lift')
    if L:
        zf = L['floorZ']
        wz = smootherstep((zf+L['band'][1]-Z)/(L['band'][1]-L['band'][0]))
        if 'heel' in L:
            # the heel's contact patch: an ellipse in x, y (fade e1 to e2) that is not lifted, so the heel stays on the floor
            h = L['heel']
            e = np.sqrt(((np.abs(X)-h['c'][0])/h['s'][0])**2+((Y-h['c'][1])/h['s'][1])**2)
            wy = 1-smootherstep((h['fade'][1]-e)/(h['fade'][1]-h['fade'][0]))
        else:
            wy = smootherstep((L['heelY'][1]-Y)/(L['heelY'][1]-L['heelY'][0]))
        wx = pf.box_weight(X, Y, Z, {'x': L['x']})
        d = L['depth']*wz*wy*wx
        F0 = shift_z(F0, d/step)
        log('sole lifted')
    P = spec.get('pads')
    if P:
        zf = P['floorZ']
        rec['pads'] = []
        for pad in P['pads']:
            for side in (1, -1):
                cx = side*pad['at'][0]
                cy = pad['at'][1]
                if not (lo[0] <= cx <= lo[0]+step*(S.shape[0]-1)):
                    continue
                zu = underside_z(S, lo, step, cx, cy)
                if zu is None:
                    continue
                if side > 0:
                    rec['pads'].append({'name': pad['name'], 'underside': round(float(zu), 4)})
                D = None
                for lb in pad['lobes']:
                    sz = lb['s'][2]
                    c = (side*lb['c'][0], lb['c'][1], zu-pad.get('sink', P['sink'])+sz)
                    d = ellipsoid_d(X, Y, Z, c, lb['s'])
                    D = d if D is None else smin3(D, d, P['lobeK'])
                D = np.maximum(D, zf-Z)
                F0 = smin3(F0, D, P['padK'])
        log('pads joined')
    Fpre = F0.copy()
    C = spec.get('corner')
    if C:
        a, b, pts = back_line(F0, lo, step, C)
        K = corner_keep(Y, Z, a, b, C['floorZ'], C['R'])
        w = pf.box_weight(X, Y, Z, C['box'])
        hard = np.maximum(F0, K)
        if C.get('smoothK'):
            # a smooth maximum where the fillet surface meets the heel's sides (no crease); within `hardBand` of the floor
            # the hard maximum is kept, so the sole is never lifted
            k = C['smoothK']
            soft = -smin3(-F0, -K, k)
            wz = smootherstep((Z-(C['floorZ']+C['hardBand'][0]))/(C['hardBand'][1]-C['hardBand'][0]))
            hard = hard+wz*(soft-hard)
        F0 = F0+w*(hard-F0)
        rec['cornerLine'] = {'a': round(float(a), 5), 'b': round(float(b), 5), 'points': np.round(pts, 4).tolist()}
        log(f'heel corner fillet: back line y = {a:.4f} + {b:.3f} z, R {C["R"]}, max cut {float((F0-S).max()):.4f}')
        F0 = blur_x(F0, X, Y, Z, step, C.get('blurX', []), log)
    for op in spec.get('openings', []):
        reg = pf.box_weight(X, Y, Z, op['box'])
        D = opening(F0, lo, step, op['r'], reg, log=log)
        F0 = F0+reg*(D-F0)
    K = spec.get('keepContact')
    if K:
        # the heel stays on the floor plane: in the core of the heel's contact patch, near the floor and in front of the
        # fillet's tangent point, the cuts of the corner and the openings are undone (they nibble the flat contact at the
        # grid's resolution, which would lift the heel by a fraction of a millimeter)
        e = np.sqrt(((np.abs(X)-K['c'][0])/K['s'][0])**2+((Y-K['c'][1])/K['s'][1])**2)
        wk = smootherstep((K['fade'][1]-e)/(K['fade'][1]-K['fade'][0]))
        wk = wk*smootherstep((K['yMax'][1]-Y)/(K['yMax'][1]-K['yMax'][0]))
        wk = wk*smootherstep((K['floorZ']+K['band'][1]-Z)/(K['band'][1]-K['band'][0]))
        F0 = F0+wk*(np.minimum(F0, Fpre)-F0)
        log('heel contact kept on the floor')
    wbox = pf.box_weight(X, Y, Z, spec['partBox'])
    S1 = S+wbox*(F0-S)
    rest = {k: v for k, v in spec.items() if k not in ('blurX', 'lift', 'pads', 'corner', 'openings', 'keepContact')}
    F, w, rec2 = pf.compose(S1, lo, step, V, rest, log=log)
    rec2.update(rec)
    return F, w, rec2
