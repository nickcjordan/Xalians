"""Akinza tail base v1 (numpy only): the three tails' joins with the root rebuilt as concave fillets, the lowest tail moved
off the +x buttock and the hanging tail angled out from the back of the +x thigh.

World units, +y toward the back, z up. Every edit is a function of position, never of a vertex index.

Anatomy review 2026-10-13, finding 6. Measured cause (assembled-3199): beyond the root each tail is the exact round-cone
sweep of tails v7 (skin radius equals the sweep radius to 1e-4), but where the tails leave the body the field is tails v7's
cubic smooth union of the tails among themselves (tailUnionK .035, which swells beyond both tubes: the round mounds on top
of the root) inside a round fillet with the body; and pelvis v1/v2's tail guard froze the skin under the lowest tail, so the
+x buttock never formed round it (the channel and its creases).

Composition (spec keys in brackets):
  T_i(old)      the tails v7 sweeps [tailsSpec], read from that spec, exactly as built
  M             the move of one tail [move]: per centreline sample, an offset o(s) (ramped in along s) and a rotation by
                theta(s) (ramped in along s) about an axis through a pivot sample; the same rigid map is applied to the skin
                vertices of that tail beyond [move.warp.s] (warp_vertices), so the tail's free shaft moves with it exactly
  T_i(new)      the sweeps with the moved tail's samples mapped by M
  hole          cells within [hole.d] of any old or new tail inside the [hole.box] (where the tails meet the body)
  B             the skin's field with the hole filled by a harmonic (Laplace) fill from the surrounding field: the body under
                the tails as if the tails were not there (the buttock surface continued under the lowest tail, the rump under
                the root), then a masked blur over the hole's edge band [holeBlur] so the fill meets the old skin with no ring
  tailCut       inside a mask under the root the tails are cut off below a height (the lowest tail's root tube starts
                lower than the crotch's underside; tails v7's keepY band hid it), so they cannot reach out under the crotch
  T             the hard minimum of the new tails (inside the body their overlap is hidden; outside they part at once)
  F1            smin_round(B, T, k(x)) with k = [joinK] inside the join sphere [join]: a circular fillet, concave by
                construction (no swelling past either surface), so every tail flares into the root instead of standing on it
                as a bead
  protect       ellipsoids where the field returns to the skin's own (the crotch's arch, pelvis v2)
  keepY         in front of y [keepY][0] the field is the skin's own (tails v7's band), so the root tubes, which run on
                inside the body, do not reach out under the crotch
  F             S + w (F1 - S), w the part box [partBox]
"""
import json
from pathlib import Path

import numpy as np

import neck_v1_field as nf
import tails_v6_field as tf
from tails_v4_field import sweep


def rot(axis, deg):
    a = np.asarray(axis, float)
    a = a/np.linalg.norm(a)
    t = np.radians(deg)
    K = np.array([[0, -a[2], a[1]], [a[2], 0, -a[0]], [-a[1], a[0], 0]])
    return np.eye(3)+np.sin(t)*K+(1-np.cos(t))*K@K


def ramp(s, r):
    return nf.smootherstep((s-r[0])/max(r[1]-r[0], 1e-9))


class Move:
    """The rigid map of one tail per arc length s: x -> pivot + R(theta(s)) (x - pivot) + o(s)."""

    def __init__(self, smp, s, mv):
        self.smp, self.s, self.mv = smp, s, mv
        self.pivot = np.array([np.interp(mv['rotate']['pivotS'], s, smp[:, k]) for k in range(3)]) if mv.get('rotate') else np.zeros(3)

    def apply(self, P, sv):
        mv = self.mv
        out = P.copy()
        ro = mv.get('rotate')
        if ro:
            th = ro['deg']*ramp(sv, ro['s'])
            for q in np.unique(np.round(th, 3)):
                m = np.abs(np.round(th, 3)-q) < 1e-9
                R = rot(ro['axis'], q)
                out[m] = self.pivot+(P[m]-self.pivot)@R.T
        of = mv.get('offset')
        if of:
            out = out+np.outer(ramp(sv, of['s']), np.asarray(of['vec'], float))
        ro2 = mv.get('rootOffset')
        if ro2:
            # move.rootOffset {vec, s}: the start of the tail's centreline, inside the body, moved by vec, fading out along s
            # (the lowest tail's root tube started lower than the crotch's underside and showed through it)
            out = out+np.outer(1-ramp(sv, ro2['s']), np.asarray(ro2['vec'], float))
        return out


def tails(spec, repo):
    """Old and new samples [x, y, z, r] of every tail, and the Move of the moved tail (or None)."""
    ts = json.loads((Path(repo)/spec['tailsSpec']).read_text(encoding='utf-8'))
    old, new, moves = [], [], {}
    for i, t in enumerate(ts['tails']):
        smp, s = tf.samples(t)
        old.append(smp)
        mv = spec.get('move')
        if mv and mv['tail'] == i:
            M = Move(smp, s, mv)
            moves[i] = (M, s)
            n = smp.copy()
            n[:, :3] = M.apply(smp[:, :3], s)
            new.append(n)
        else:
            new.append(smp)
    return old, new, moves


def nearest_s(P, smp, s):
    """Arc length of the nearest centreline point and the distance to the tube surface, per point."""
    best = np.full(len(P), np.inf)
    sv = np.zeros(len(P))
    for i in range(len(smp)-1):
        a, b = smp[i], smp[i+1]
        ab = b[:3]-a[:3]
        t = np.clip(((P-a[:3])@ab)/max(ab@ab, 1e-12), 0, 1)
        d = np.linalg.norm(P-(a[:3]+t[:, None]*ab), axis=1)-(a[3]+t*(b[3]-a[3]))
        m = d < best
        best[m] = d[m]
        sv[m] = s[i]+t[m]*(s[i+1]-s[i])
    return sv, best


def warp_vertices(V, old, moves, spec):
    """The moved tail's skin beyond spec move.warp.s carried by its rigid map (weight ramped in along s), so a tail shaft far
    from the body moves with it exactly; vertices nearer another tail or farther than move.warp.near from the tube stay."""
    V1 = V.copy()
    wts = np.zeros(len(V))
    for i, (M, s) in moves.items():
        wp = M.mv['warp']
        sel = np.where(np.all((V > np.min(old[i][:, :3], 0)-.08) & (V < np.max(old[i][:, :3], 0)+.08), axis=1))[0]
        sv, d = nearest_s(V[sel], old[i], s)
        ok = np.abs(d) < wp['near']
        for j, o in enumerate(old):
            if j != i:
                _, dj = nearest_s(V[sel], o, tf_s(o))
                ok &= d < dj
        wv = ramp(sv, wp['s'])*ok
        idx = sel[wv > 0]
        if not len(idx):
            continue
        tgt = M.apply(V[idx], sv[wv > 0])
        V1[idx] = V[idx]+wv[wv > 0][:, None]*(tgt-V[idx])
        wts[idx] = wv[wv > 0]
    return V1, wts


def tf_s(smp):
    return np.r_[0, np.cumsum(np.linalg.norm(np.diff(smp[:, :3], axis=0), axis=1))]


def laplace_fill(F, hole, iters, log=print):
    """Harmonic fill of F inside the boolean mask hole (Dirichlet: every other cell keeps F), by conjugate gradients on the
    6-neighbour Laplacian, matrix free. The initial guess is a blur of F."""
    H = hole.astype(np.float64)
    x = F.astype(np.float64).copy()
    x[hole] = nf.gaussian_blur3(F, 4.0)[hole]

    def A(u):
        out = 6*u
        for ax in range(3):
            sa = [slice(None)]*3
            sb = [slice(None)]*3
            sa[ax] = slice(1, None)
            sb[ax] = slice(None, -1)
            out[tuple(sa)] -= u[tuple(sb)]
            out[tuple(sb)] -= u[tuple(sa)]
        return out

    r = -A(x)*H
    p = r.copy()
    rr = r0 = float((r*r).sum())
    it = 0
    for it in range(int(iters)):
        Ap = A(p)*H
        a = rr/max(float((p*Ap).sum()), 1e-30)
        x += a*p
        r -= a*Ap
        rn = float((r*r).sum())
        if rn < 1e-16*r0:
            rr = rn
            break
        p = r+(rn/rr)*p
        rr = rn
    log(f'laplace fill: {int(hole.sum())} cells, {it+1} iterations, relative residual {np.sqrt(rr/max(r0, 1e-30)):.2e}')
    return x.astype(np.float32)


def _lap(u):
    out = -6*u
    for ax in range(3):
        sa = [slice(None)]*3
        sb = [slice(None)]*3
        sa[ax] = slice(1, None)
        sb[ax] = slice(None, -1)
        out[tuple(sa)] += u[tuple(sb)]
        out[tuple(sb)] += u[tuple(sa)]
    return out


def _dilate1(m):
    o = m.copy()
    for ax in range(3):
        sa = [slice(None)]*3
        sb = [slice(None)]*3
        sa[ax] = slice(1, None)
        sb[ax] = slice(None, -1)
        o[tuple(sa)] |= m[tuple(sb)]
        o[tuple(sb)] |= m[tuple(sa)]
    return o


def _biharmonic_cg(x, hole, iters, tol=1e-10):
    """Minimise the sum of squared Laplacians over the hole and its one-cell rim, over the hole's cells (all other cells
    fixed): conjugate gradients on the normal equations H L M L H, matrix free. x is updated in place."""
    H = hole.astype(np.float64)
    M = _dilate1(_dilate1(hole)).astype(np.float64)
    def A(p):
        return _lap(_lap(p)*M)*H
    r = -A(x)
    # A(x) above already includes the fixed cells' contribution (x holds them); the residual of the full system is -H L M L x
    p = r.copy()
    rr = r0 = float((r*r).sum())
    it = 0
    for it in range(int(iters)):
        Ap = A(p)
        a = rr/max(float((p*Ap).sum()), 1e-30)
        x += a*p
        r -= a*Ap
        rn = float((r*r).sum())
        if rn < tol*r0:
            rr = rn
            break
        p = r+(rn/rr)*p
        rr = rn
    return x, it+1, np.sqrt(rr/max(r0, 1e-30))


def biharmonic_fill(F, hole, iters, coarse_iters, log=print):
    """Biharmonic fill of F inside hole (the fill continues the surrounding surface's curvature, where a harmonic fill
    flattens and sinks a convex rump): solved first on a grid twice as coarse, then refined."""
    x = laplace_fill(F, hole, 1500, log=log).astype(np.float64)
    if coarse_iters:
        xc = x[::2, ::2, ::2].copy()
        hc = hole[::2, ::2, ::2].copy()
        hc[[0, -1], :, :] = False
        hc[:, [0, -1], :] = False
        hc[:, :, [0, -1]] = False
        xc, n, res = _biharmonic_cg(xc, hc, coarse_iters)
        log(f'biharmonic fill, coarse: {int(hc.sum())} cells, {n} iterations, relative residual {res:.2e}')
        up = np.repeat(np.repeat(np.repeat(xc, 2, 0), 2, 1), 2, 2)[:x.shape[0], :x.shape[1], :x.shape[2]]
        up = nf.gaussian_blur3(up, 1.0)
        x[hole] = up[hole]
    x, n, res = _biharmonic_cg(x, hole, iters)
    log(f'biharmonic fill: {int(hole.sum())} cells, {n} iterations, relative residual {res:.2e}')
    return x.astype(np.float32)


def ellipsoid_w(X, Y, Z, e):
    q = np.sqrt(((X-e['c'][0])/e['s'][0])**2+((Y-e['c'][1])/e['s'][1])**2+((Z-e['c'][2])/e['s'][2])**2)
    return nf.smootherstep((e['fade'][1]-q)/(e['fade'][1]-e['fade'][0])).astype(np.float32)


# copied from neck_v3_post.py (unchanged)
def spot_relax(V1, V0, tris, F, lo, step, spec, part):
    """Tangential relax of the moved skin inside spots (spec 'spotRelax': spheres c, r, fade, iterations), each pass projected
    back onto the new field: where a fill closes an inside corner (the throat under the jaw), the vertices of both old walls
    land on one surface and bunch into a ridge, which the projection's own short relax does not spread out."""
    import neck_v1_field as nf
    out = V1.copy()
    fF = nf.Trilinear(F, lo, step)
    gx, gy, gz = np.gradient(F, step)
    fg = [nf.Trilinear(g, lo, step) for g in (gx, gy, gz)]
    e = np.concatenate([tris[:, [0, 1]], tris[:, [1, 2]], tris[:, [2, 0]]])
    for sp in spec.get('spotRelax', []):
        c = np.array(sp['c'], float)
        r = np.linalg.norm(V0-c, axis=1)
        wv = np.clip((sp['r']+sp['fade']-r)/sp['fade'], 0, 1)
        wv = wv*wv*(3-2*wv)*part
        sel = np.where(wv > 0)[0]
        if not len(sel):
            continue
        m = np.zeros(len(V0), bool)
        m[sel] = True
        ee = e[m[e[:, 0]]]
        deg = np.bincount(ee[:, 0], minlength=len(V0)).astype(float)
        ws = wv[sel][:, None]
        for _ in range(int(sp['iterations'])):
            acc = np.zeros_like(out)
            np.add.at(acc, ee[:, 0], out[ee[:, 1]])
            avg = acc[sel]/np.maximum(deg[sel], 1)[:, None]
            g = np.stack([f(out[sel]) for f in fg], 1)
            g /= np.maximum(np.linalg.norm(g, axis=1, keepdims=True), 1e-9)
            dlt = avg-out[sel]
            dlt -= (dlt*g).sum(1, keepdims=True)*g
            out[sel] += .5*ws*dlt
            for _k in range(4):
                P = out[sel]
                ev = fF(P)
                g = np.stack([f(P) for f in fg], 1)
                out[sel] = P-(ev/np.maximum((g*g).sum(1), 1e-8))[:, None]*g
    return out


def compose(S, lo, step, spec, repo, log=print):
    shape = S.shape
    X, Y, Z = nf.grid_coords(lo, step, shape)
    old, new, moves = tails(spec, repo)
    reach = float(spec['hole']['d'])+.02
    Told = np.full(shape, reach, np.float32)
    Tnew = np.full(shape, reach, np.float32)
    Tn = []
    for o, n in zip(old, new):
        Told = np.minimum(Told, sweep(o, lo, step, shape, reach=reach))
        t = sweep(n, lo, step, shape, reach=reach)
        Tn.append(t)
        Tnew = np.minimum(Tnew, t)
    log('tail sweeps')
    from pelvis_v1_field import box_weight
    hbox = box_weight(X, Y, Z, spec['hole']['box']) > .5
    hole = (np.minimum(Told, Tnew) < spec['hole']['d']) & hbox
    for ex in spec['hole'].get('exclude', []):
        # hole.exclude: ellipsoids where the body is kept as it is (the crotch's arch under the root, pelvis v2: a fill there
        # continues the buttocks' curvature into the arch and lowers its apex)
        hole &= ellipsoid_w(X, Y, Z, ex) < .5
    # keep a one-cell Dirichlet frame on the grid border
    hole[[0, -1], :, :] = False
    hole[:, [0, -1], :] = False
    hole[:, :, [0, -1]] = False
    # Dirichlet values: where the nearest skin is a tail (S is the distance to that tail, not to the body), the body is at
    # least `far` away, so the fill does not pull a surface into the air round a tail
    farv = float(spec['hole'].get('far', .06))
    Sb = np.where((S > 0) & (Told-S < spec['hole'].get('tailNear', .002)), np.maximum(S, farv), S).astype(np.float32)
    if spec['hole'].get('order', 1) == 2:
        B = biharmonic_fill(Sb, hole, spec['hole'].get('iterations', 800), spec['hole'].get('coarseIterations', 3000), log=log)
    else:
        B = laplace_fill(Sb, hole, spec['hole'].get('iterations', 1500), log=log)
    B[~hole] = S[~hole]
    # beyond the hole box the tails are in the air: the body there is the skin with the tails removed, which is air
    far = (np.minimum(Told, Tnew) < spec['hole']['d']) & ~hbox
    # hole.farBehind: only behind this depth (the air beyond the hole box), never in front of it (the crotch in front of the box)
    far &= Y > float(spec['hole'].get('farBehind', -1.0))
    B[far] = np.maximum(B[far], spec['hole']['d'])
    for bl in spec.get('holeBlur', []):
        Fb = nf.gaussian_blur3(B, bl['sigma']/step).astype(np.float32)
        # the band round the hole's edge (both sides), from a blur of the hole mask
        hm = nf.gaussian_blur3(hole.astype(np.float32), bl['band']/step)
        wb = np.clip(1-np.abs(2*hm-1), 0, 1)**bl.get('power', 1.0)
        for e in bl.get('only', []):
            wb = wb*ellipsoid_w(X, Y, Z, e)
        B = (B+wb*(Fb-B)).astype(np.float32)
    for bl in spec.get('bodyBlur', []):
        Fb = nf.gaussian_blur3(B, bl['sigma']/step).astype(np.float32)
        wb = np.zeros(shape, np.float32)
        for e in bl['mask']:
            wb = np.maximum(wb, ellipsoid_w(X, Y, Z, e))
        B = (B+wb*(Fb-B)).astype(np.float32)
    log('body under the tails')
    for tc in spec.get('tailCut', []):
        # spec 'tailCut': {z, k, mask}: inside the mask the tails are cut off below the height z (smooth maximum k), because
        # the lowest tail's root tube starts lower than the crotch's underside (tails v7 hid it there with its keepY band)
        wc = ellipsoid_w(X, Y, Z, tc['mask']) if 'mask' in tc else np.ones_like(X)
        # scaled (spec 'scale'), so the cut face reads as far away at once and the body fillet never sees it as a surface
        # a cut is a height (key 'z': tails kept above it) or a depth (key 'y': tails kept behind it)
        cut = (float(tc.get('scale', 1.0))*((tc['z']-Z) if 'z' in tc else (tc['y']-Y))).astype(np.float32)
        for i in range(len(Tn)):
            Tc = (-nf.smin3(-Tn[i], -cut, tc['k'])).astype(np.float32)
            Tn[i] = (Tn[i]+wc*(Tc-Tn[i])).astype(np.float32)
    T = Tn[0]
    uk = spec.get('tailUnionK', 0.0)
    for t in Tn[1:]:
        T = tf.smin_round(T, t, uk) if uk else np.minimum(T, t)
    jn = spec['join']
    dj = np.sqrt((X-jn['c'][0])**2+(Y-jn['c'][1])**2+(Z-jn['c'][2])**2)
    wj = nf.smootherstep((jn['r'][1]-dj)/(jn['r'][1]-jn['r'][0])).astype(np.float32)
    kj = float(spec['joinK'])*wj
    for kp in spec.get('joinProtect', []):
        # spec 'joinProtect': ellipsoids where the body fillet's radius falls to zero (the crotch's arch: the lowest tail's root
        # runs inside the body just above it, and a fillet there would round the arch down)
        kj = kj*(1-ellipsoid_w(X, Y, Z, kp))
    if jn.get('zFade'):
        # join.zFade [z0, z1, factor]: the fillet radius falls to factor x joinK from z0 up to z1, so the top tail's fillet
        # does not raise the back's midline profile above the root (torso v1, approved)
        z0, z1, fac = jn['zFade']
        kj = kj*(1-(1-fac)*ramp(Z, [z0, z1]))
    F1 = tf.smin_round(B, T, kj.astype(np.float32))
    for pr in spec.get('protect', []):
        # spec 'protect': ellipsoids where the field returns to the skin's own (faded), e.g. the crotch's arch under the root
        # (pelvis v2, approved), which the fill and the blurs of the body would otherwise round down
        wp = ellipsoid_w(X, Y, Z, pr)
        F1 = (F1+wp*(S-F1)).astype(np.float32)
    if spec.get('keepY'):
        # spec 'keepY' [y0, y1]: in front of y0 the field is the skin's own, blending to the composed field by y1, as tails v7
        # (its keepY band): the tails' root tubes run on inside the body there and must not reach the crotch's underside
        k0, k1 = spec['keepY']
        wky = nf.smootherstep((Y-k0)/(k1-k0)).astype(np.float32)
        F1 = (S+wky*(F1-S)).astype(np.float32)
    w = box_weight(X, Y, Z, spec['partBox']).astype(np.float32)
    F = (S+w*(F1-S)).astype(np.float32)
    rec = {'holeCells': int(hole.sum()), 'moved': {str(i): {'pivot': M.pivot.round(4).tolist()} for i, (M, _) in moves.items()},
           'newSamples': {str(i): new[i].round(4).tolist() for i in moves}}
    return F, w, rec, {'B': B, 'T': T, 'hole': hole}
