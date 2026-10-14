"""Hands v3 (numpy only; hands v2 with the mover landing vertices on the surface itself inside the part box, for the refined
paw of P-pawrefine1): four distinct rounded toes with readable separations, a claw out of the tip of each toe sheathed by
a small nail-bed fold of skin, one palm pad and four toe pads blended in as smooth domes; the crease band on the back of the
hand smoothed. Replaces hands v1 (coordinator review 2026-10-13: claws came out of the gaps beside the digits with their cut
tops showing, the claws bunched from the front, the digits read as small lumps, the palm pad had a lip edge).

World units, +y toward the back, z up. The arms hang with the paw pointing down: the palm faces the body (-x on the +x side),
the back of the hand faces out (+x), the toes stand in a row along y with their tips at the bottom (z about -.20). Every
edit is a function of position on the skin's signed distance S (positive outside), never of a vertex index; the step runs one
grid per paw and mirrors every mass to the -x paw.

  F0 = S + wb (blur(S) - S)             [blurs] old lumps, palm ridges and the crease band averaged out first
  F0 = F0 + erode                       [erode] the paw end pulled in, so the toes below define it
  F1 = smin3(F0, toes, k)               [toes] one tapered capsule per toe, fuller at the tip than at the knuckle (a toe
                                        bean), narrower across the row than front to back (ySquash), splayed a little so
                                        the four fan out; smin of each toe with its neighbours leaves a shallow valley
  F1 = F1 + grooves                     [grooves] optional Gaussian grooves along the separations
  F2 = smin3(F1, pads, kPad)            [pads] flattened ellipsoids (a local frame per pad: its normal in the xz plane)
                                        set so they stand `h` proud of the surface, joined with a smooth minimum: a dome
                                        that rolls into the skin with no edge
  F3 = smin3(F2, sheath, kSheath)       sheath: each claw's own signed distance (sampled by the post step after the claw
                                        is placed), thickened by `thick` and cut off past `collar` along the claw from its
                                        base: the skin wraps the claw's root in a short fold, so no cut line shows
  F  = S + w (F3 - S)                   w is the part box (the paw below the wrist)
"""
import numpy as np

from neck_v1_field import smin3, grid_coords, gaussian_blur3, smootherstep
import pelvis_v1_field as pf


def ell(X, Y, Z, c, s):
    return np.sqrt(((X-c[0])/s[0])**2+((Y-c[1])/s[1])**2+((Z-c[2])/s[2])**2)


def pad_field(X, Y, Z, m, side):
    """Ellipsoid in a local frame: normal n (outward, in the xz plane, angle `ang` degrees from +x), across the row y,
    and t along the surface in xz. `c` is the surface point; the ellipsoid center sits (sn - h) inside it."""
    a = np.radians(m['ang'])
    n = np.array([np.cos(a)*side, 0.0, np.sin(a)])
    t = np.array([-np.sin(a)*side, 0.0, np.cos(a)])
    sn, sy, st = m['s']
    c = np.array(m['c'], float)*np.array([side, 1, 1])-n*(sn-m['h'])
    dx, dy, dz = X-c[0], Y-c[1], Z-c[2]
    un = dx*n[0]+dz*n[2]
    ut = dx*t[0]+dz*t[2]
    e = np.sqrt((un/sn)**2+(dy/sy)**2+(ut/st)**2)
    return (e-1)*min(sn, sy, st)


def compose(S, lo, step, V, spec, log=print, sheath=None):
    X, Y, Z = grid_coords(lo, step, S.shape)
    side = 1 if lo[0]+step*(S.shape[0]-1)/2 > 0 else -1
    rec = {'side': side}
    F = S
    for bl in spec.get('blurs', []):
        c = np.array(bl['c'], float)*np.array([side, 1, 1])
        wb = smootherstep((bl['fade'][1]-ell(X, Y, Z, c, bl['s']))/(bl['fade'][1]-bl['fade'][0]))
        F = F+wb*(gaussian_blur3(F, bl['sigma']/step)-F)
    for er in spec.get('erode', []):
        c = np.array(er['c'], float)*np.array([side, 1, 1])
        F = F+er['depth']*smootherstep((er['fade'][1]-ell(X, Y, Z, c, er['s']))/(er['fade'][1]-er['fade'][0]))
    log('lumps blurred, paw end eroded')
    D = None
    for m in spec.get('toes', []):
        d = pf.capsule_field(X, Y, Z, m, side)
        D = d if D is None else smin3(D, d, spec.get('toeToeK', .0015))
    if D is not None:
        F = smin3(F, D, spec['toeK'])
    for g in spec.get('grooves', []):
        pts = np.array(g['points'], float)*np.array([side, 1, 1])
        P = np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1)
        d, fr = pf.polyline_distance(P, pts)
        amp = np.interp(fr, *zip(*g['depthAlong']))
        F = F+(g['depth']*amp*np.exp(-(d/g['sigma'])**2)).reshape(X.shape)
    log('toes joined')
    for m in spec.get('pads', []):
        F = smin3(F, pad_field(X, Y, Z, m, side), m.get('k', spec.get('padK', .003)))
    log('pads joined')
    if sheath is not None:
        F = smin3(F, sheath, spec['sheath']['k'])
        rec['sheathCells'] = int((sheath < .002).sum())
        log('claw sheaths joined')
    w = pf.box_weight(X, Y, Z, spec['partBox'])
    F = S+w*(F-S)
    return F, w, rec


def pf_box(P, box):
    from neck_v1_field import smootherstep
    w = np.ones(len(P))
    for v, key in ((np.abs(P[:, 0]), 'x'), (P[:, 1], 'y'), (P[:, 2], 'z')):
        if key in box:
            a, b, c, d = box[key]
            w = w*smootherstep((v-a)/max(b-a, 1e-9))*smootherstep((d-v)/max(d-c, 1e-9))
    return w


def move_vertices_from(V0, tris, S, F, w, lo, step, spec, log=print):
    """hips_v1_field.move_vertices (copied, not imported, so the hands step owns it), with one addition: before the
    projection, the candidate vertices' starting positions are smoothed (spec 'preSmooth': umbrella passes, step, weight
    region box) so that vertices that sat on the old lumps start evenly spread and do not pile into the new valleys between
    the toes (hands v2 development v2a to v2c folded 20 to 50 faces there). Each vertex still lands on the level the old skin
    gave it (0 on the surface), so nothing outside the part box moves."""
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
    if spec.get('levelZeroInside'):
        # on a refined paw the new vertices sit on the old flat faces (chord sag); land them on the new surface itself
        # where the part box has full weight, and keep each vertex's old level only where the box fades out
        level = level*(1-wall[cand])
    start = V0[cand].copy()
    ps = spec.get('preSmooth')
    if ps:
        ee = np.concatenate([tris[:, [0, 1]], tris[:, [1, 2]], tris[:, [2, 0]]])
        ee = np.unique(np.sort(ee, 1), axis=0)
        cm = np.zeros(nv, bool)
        cm[cand] = True
        ee = ee[cm[ee[:, 0]] & cm[ee[:, 1]]]
        ee = np.concatenate([ee, ee[:, ::-1]])
        loc = -np.ones(nv, np.int64)
        loc[cand] = np.arange(len(cand))
        e0, e1 = loc[ee[:, 0]], loc[ee[:, 1]]
        deg = np.bincount(e0, minlength=len(cand)).astype(float)
        bw = pf_box(V0[cand], ps['box'])
        for _ in range(int(ps['iterations'])):
            acc = np.zeros((len(cand), 3))
            np.add.at(acc, e0, start[e1])
            start += (ps['factor']*bw)[:, None]*(acc/np.maximum(deg, 1)[:, None]-start)
        log(f'pre-smoothed {int((bw > 0).sum())} start positions x {ps["iterations"]}')
        if ps.get('alongNormal'):
            # move each pre-smoothed start along its own smoothed normal onto its level (a ray, 1D Newton), so that over a
            # concave valley the vertices arrive side by side instead of being focused by the field's gradient
            Vt = V0.copy()
            Vt[cand] = start
            fnm = np.cross(Vt[tris[:, 1]]-Vt[tris[:, 0]], Vt[tris[:, 2]]-Vt[tris[:, 0]])
            Nn = np.zeros_like(Vt)
            for i in range(3):
                np.add.at(Nn, tris[:, i], fnm)
            nrm = Nn[cand]/(np.linalg.norm(Nn[cand], axis=1, keepdims=True)+1e-20)
            tt = np.zeros(len(cand))
            for _ in range(int(ps.get('rayIterations', 40))):
                Q = start+tt[:, None]*nrm
                ev = fF(Q)-level
                dn = (grad(Q)*nrm).sum(1)
                dn = np.where(np.abs(dn) < .2, np.sign(dn+1e-12)*.2, dn)
                tt -= np.clip(ev/dn, -cap, cap)
            start = start+tt[:, None]*nrm
            log(f'moved along normals; ray residual max {np.abs(fF(start)-level).max():.2e}')
    P, err = project(start, level)
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
    fu_ = spec.get('finalUnfold')
    final_counts = []
    if fu_:
        # a last local unfold without re-projection: the vertices of any face still folded, plus `rings` rings, are averaged
        # with their neighbours until none is folded; the valley floor there fills by a hair instead of folding
        movedmask = np.linalg.norm(V1-V0, axis=1) > 0
        ft = tris[movedmask[tris].any(1)]
        e = np.concatenate([ft[:, [0, 1]], ft[:, [1, 2]], ft[:, [2, 0]]])
        e = np.unique(np.sort(e, 1), axis=0)
        e = np.concatenate([e, e[:, ::-1]])
        deg = np.bincount(e[:, 0], minlength=nv).astype(float)
        for _ in range(int(fu_['iterations'])):
            fn = np.cross(V1[ft[:, 1]]-V1[ft[:, 0]], V1[ft[:, 2]]-V1[ft[:, 0]])
            N = np.zeros_like(V1)
            for i in range(3):
                np.add.at(N, ft[:, i], fn)
            N /= np.linalg.norm(N, axis=1, keepdims=True)+1e-20
            fu = fn/(np.linalg.norm(fn, axis=1, keepdims=True)+1e-20)
            vn = N[ft].sum(1)
            vn /= np.linalg.norm(vn, axis=1, keepdims=True)+1e-20
            bad = ft[(fu*vn).sum(1) < .5]
            final_counts.append(int(len(bad)))
            if not len(bad):
                break
            sel = np.zeros(nv, bool)
            sel[bad.ravel()] = True
            for _r in range(int(fu_.get('rings', 2))):
                sel2 = sel.copy()
                sel2[e[sel[e[:, 0]], 1]] = True
                sel = sel2
            sel &= movedmask
            idx = np.where(sel)[0]
            acc = np.zeros((nv, 3))
            np.add.at(acc, e[:, 0], V1[e[:, 1]])
            V1[idx] = .5*V1[idx]+.5*acc[idx]/np.maximum(deg[idx], 1)[:, None]
        log(f'final unfold: folded faces per pass {final_counts}')
        folded_counts = folded_counts+['final']+final_counts
    disp = np.linalg.norm(V1-V0, axis=1)
    return V1, {'folded': folded_counts, 'moved': int((disp > 0).sum()), 'residualMax': float(np.abs(err).max()) if len(err) else 0.0}, wall


def taubin(V, V0, tris, spec, log=print):
    """Taubin smoothing (lambda, mu passes) of the moved paw-end vertices (spec 'postSmooth': iterations, lam, mu, box as
    pf_box): removes the fine waviness the projection leaves from uneven vertex spacing on the small toe forms, without the
    shrinking of plain umbrella smoothing. Vertices that did not move keep their place."""
    ps = spec.get('postSmooth')
    if not ps:
        return V
    moved = np.linalg.norm(V-V0, axis=1) > 0
    w = np.zeros(len(V))
    w[moved] = pf_box(V0[moved], ps['box'])
    sel = np.where(w > 0)[0]
    e = np.concatenate([tris[:, [0, 1]], tris[:, [1, 2]], tris[:, [2, 0]]])
    e = np.unique(np.sort(e, 1), axis=0)
    m = np.zeros(len(V), bool)
    m[sel] = True
    e = e[m[e[:, 0]] | m[e[:, 1]]]
    e = np.concatenate([e, e[:, ::-1]])
    e = e[m[e[:, 0]]]
    deg = np.bincount(e[:, 0], minlength=len(V)).astype(float)
    V1 = V.copy()
    ws = w[sel][:, None]
    for _ in range(int(ps['iterations'])):
        for f in (ps['lam'], ps['mu']):
            acc = np.zeros((len(V), 3))
            np.add.at(acc, e[:, 0], V1[e[:, 1]])
            V1[sel] += f*ws*(acc[sel]/np.maximum(deg[sel], 1)[:, None]-V1[sel])
    log(f'taubin smoothed {len(sel)} vertices x {ps["iterations"]}')
    return V1
