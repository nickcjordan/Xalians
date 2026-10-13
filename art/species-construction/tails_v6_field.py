"""Akinza tails v6 field composition (numpy only; shared by tails_v6_post.py and its development harness).

Tails v6 is tails v5 (below) with two cleanup options, both off unless the spec names them:
  rootBlend 'round'  the root joins the body with a circular-arc fillet of radius rootK (no swelling beyond the fillet)
                     instead of the cubic smooth minimum, so the root flows into the rump without a raised band
  cleft              {mask, shift, blur}: inside the mask ellipsoid (the cleft under the root) the keepY band and the mirror's
                     y window are lowered by shift, so the inner buttock walls below the old band (flat walls of the
                     original skin) are rebuilt from the mirrored, blurred body rather than handed back to the old skin
  join, joinK        the tails meet the body with a round fillet (radius joinK) inside the join sphere
  finalBlur          masked blurs of the composed field after the keepY band (the cleft's flat walls and their creases)

Tails v5's description follows.

Akinza tails v5 field composition.

Tails v4 (tails_v4_field.py) started its three tails at one apex inside the rump and smooth-unioned them with the body, so
each tail met the back on its own. Nick, 2026-10-13: one piece out of the body, splitting into three, and the tails modelled
as the shaved anatomy (slender, round, tapering), not the fur. Here:

  R              round-cone sweep of the shared tail root (spec 'stem': control points from inside the rump, out past the
                 back to the fork, and a radius profile); the only part of the tails that meets the body
  T_i            round-cone sweep distance of tail i (spec 'tails': control points starting at the fork, radius profile)
  B              the input skin S with the old B-14 tails carved out, plus the authored masses (the sacrum), as tails v4,
                 then the body blurs (spec 'blur', as tails v4's masks); spec 'carveMid' carves deeper inside a mask at
                 the midline, where the old tails' shared stem had left a flat wall now no longer covered by tail roots;
                 spec 'grooves' takes round-cone sweeps out of it (the top of the cleft under the root)
  Bm             spec 'mirror': the rump's -x half mirrored onto its +x half (x 0 to fade[0], fading out by fade[1]; y above
                 y[0], fading in by y[1]; z between z[0] and z[1], faded by zFade), because the old tails ran down the +x
                 buttock and their carve left a flat wall there that the -x side (never under a tail) does not have
  Bs             smin(Bm, R, rootK), then the root blurs (spec 'rootBlur'), applied to the body and root only, so no
                 blur can ever bridge a tail to the body or to another tail, and the tails stay exact round sweeps
  T_new          the tails' union: a C2 smooth minimum whose radius k is spec 'tailUnionK' inside the fork sphere (spec
                 'fork': centre c, radius r[0]) and falls to 0 by r[1]; beyond the fork it is the hard minimum
  F1             smin_var(Bs, T_new, forkK inside the fork sphere, 0 beyond): the tails blend into the root at the fork and
                 nowhere else (the design keeps every tail clear of the body past the fork)
  keepY          below that y band the field is S (the stitch stays off the crotch), as tails v2 to v4; with spec
                 'keepYMirror' it is S mirrored as the rump (so the cleft under the root is symmetric too)

Everything is in world units on the level-set grid of the spec.
"""
import json
from pathlib import Path

import numpy as np

import neck_v1_field as nf
from tails_v4_field import catmull, grid, sweep, smin_var, ellipsoid


def samples(t):
    """Centreline samples [x, y, z, r] and arc length s of a tail or the root (spec points and radius profile)."""
    P = np.array(t['points'], float)
    smp = catmull(np.c_[P, np.zeros(len(P))], 16)[:, :3]
    if t.get('smooth'):
        # spec 'smooth' [iterations, fixed]: Laplacian smoothing of the sampled centreline (the first 'fixed' samples and the
        # tip stay), so the joins between the fork's lead-out and the path have no tight bends
        it, fx = t['smooth']
        for _ in range(int(it)):
            smp[fx:-1] = .5*smp[fx:-1]+.25*(smp[fx-1:-2]+smp[fx+1:])
    s = np.r_[0, np.cumsum(np.linalg.norm(np.diff(smp, axis=0), axis=1))]
    u = s/s[-1]
    pr = t['radius']
    if 'power' in pr:
        # a smooth taper with no slope breaks (a piecewise-linear table shades as rings on a slender round tail):
        # r = root (1 - (1 - tip) u^power), from the root radius at u 0 to root*tip at u 1
        r = pr['root']*(1-(1-pr['tip'])*u**pr['power'])
        if pr.get('flare'):
            # 'flare': the taper is fastest at the root, r = root (tip + (1 - tip)(1 - u)^power), so a tail root widens
            # steadily into the body instead of the smooth minimum swelling a straight tube where it meets the body
            r = pr['root']*(pr['tip']+(1-pr['tip'])*(1-u)**pr['power'])
    else:
        r = pr['root']*np.interp(u, pr['u'], pr['scale'])
    return np.c_[smp, r], s


def body(S, spec, X, Y, Z, lo, step, shape, repo):
    """B: the input skin with the old tails carved out, plus the authored masses (tails v4's body, unchanged)."""
    old_controls = json.loads((Path(repo)/spec['oldControls']).read_text())['tailControls']
    T_old = np.full(shape, .06, np.float32)
    for c in old_controls:
        cc = np.array(c, float)
        T_old = np.minimum(T_old, sweep(catmull(np.c_[cc[:, :3], np.maximum(cc[:, 3], cc[:, 4])]), lo, step, shape))
    def carved(cv):
        wy = nf.smootherstep((Y-cv['y'][0])/(cv['y'][1]-cv['y'][0]))
        carve = (wy*(cv['margin']-T_old)+(1-wy)*(-1.0)).astype(np.float32)
        return (-nf.smin3(-S, -carve, cv['k'])).astype(np.float32) if cv.get('k') else np.maximum(S, carve)
    B = carved(spec['carve'])
    if spec.get('carveMid'):
        # a deeper carve near the midline only (mask ellipsoid), where the old tails' shared stem left a flat wall
        cms = spec['carveMid'] if isinstance(spec['carveMid'], list) else [spec['carveMid']]
        for cm in cms:  # in order; a later one (deeper, lower down) overrides an earlier one inside its mask
            e = cm['mask']
            q = np.sqrt(((X-e['c'][0])/e['s'][0])**2+((Y-e['c'][1])/e['s'][1])**2+((Z-e['c'][2])/e['s'][2])**2)
            wm = nf.smootherstep((e['fade'][1]-q)/(e['fade'][1]-e['fade'][0])).astype(np.float32)
            del q
            B = (B+wm*(carved(cm)-B)).astype(np.float32)
    del T_old
    for m in spec.get('masses', []):
        B = nf.smin3(B, ellipsoid(X, Y, Z, m), m['k']).astype(np.float32)
    for g in spec.get('grooves', []):
        # spec 'grooves': round-cone sweeps (points [x, y, z, r]) taken out of the body with a smooth maximum k, e.g. the top
        # of the cleft below the tail root, deepening downward into the cleft between the buttocks
        G = sweep(catmull(np.array(g['points'], float), 12), lo, step, shape)
        B = (-nf.smin3(-B, G, g['k'])).astype(np.float32)
    return B


def ellipsoid_weight(X, Y, Z, e):
    q = np.sqrt(((X-e['c'][0])/e['s'][0])**2+((Y-e['c'][1])/e['s'][1])**2+((Z-e['c'][2])/e['s'][2])**2)
    return nf.smootherstep((e['fade'][1]-q)/(e['fade'][1]-e['fade'][0])).astype(np.float32)


def smin_round(a, b, k):
    """Union with a circular fillet of radius k: exact min wherever either field is beyond k."""
    u = np.maximum(k-a, 0.0)
    v = np.maximum(k-b, 0.0)
    return (np.maximum(k, np.minimum(a, b))-np.sqrt(u*u+v*v)).astype(np.float32)


def mirror(B, m, X, Y, Z, lo, step, yshift=0.0):
    """B with its -x half mirrored onto +x inside the rump zone (see the module docstring); yshift lowers the y window."""
    i0 = int(round((0-lo[0])/step))
    n = B.shape[0]-i0
    Bmir = B.copy()
    k = min(n, i0+1)
    Bmir[i0:i0+k] = B[i0::-1][:k]
    wx = (1-nf.smootherstep((X-m['fade'][0])/(m['fade'][1]-m['fade'][0])))*(X >= 0)
    wy = nf.smootherstep((Y-m['y'][0]-yshift)/(m['y'][1]-m['y'][0]))
    zf = m['zFade']
    wz = nf.smootherstep((Z-m['z'][0])/zf)*nf.smootherstep((m['z'][1]-Z)/zf)
    w = (wx*wy*wz).astype(np.float32)
    return (B+w*(Bmir-B)).astype(np.float32)


def blurs(F, stages, X, Y, Z, step, shape):
    for st in stages:
        Fb = nf.gaussian_blur3(F, st['sigma']/step).astype(np.float32)
        wb = np.zeros(shape, np.float32)
        for e in st['mask']:
            q = np.sqrt(((X-e['c'][0])/e['s'][0])**2+((Y-e['c'][1])/e['s'][1])**2+((Z-e['c'][2])/e['s'][2])**2)
            wb = np.maximum(wb, nf.smootherstep((e['fade'][1]-q)/(e['fade'][1]-e['fade'][0])))
        F = (F+wb*(Fb-F)).astype(np.float32)
    return F


def compose(S, spec, repo, log=print, tails_on=True):
    """Return F1 (the composed field before the region fade), the records (root and tails), the per-tail fields, the root
    field, the fork weight and the body-and-root field Bs."""
    step, lo, shape, _ = grid(spec)
    X, Y, Z = nf.grid_coords(lo, step, shape)
    B = body(S, spec, X, Y, Z, lo, step, shape, repo)
    log('body')
    rs, rss = samples(spec['stem'])
    # the root's sweep reaches farther than rootK, so the smooth minimum never sees its capped background value
    R = sweep(rs, lo, step, shape, reach=max(.06, 2*float(spec['rootK'])))
    records = {'stem': {'samples': rs.round(4).tolist(), 'length': float(rss[-1])}, 'tails': []}
    B = blurs(B, spec.get('blur', []), X, Y, Z, step, shape)
    cl = spec.get('cleft')
    wcl = ellipsoid_weight(X, Y, Z, cl['mask']) if cl else 0.0
    if cl:
        B = blurs(B, cl.get('blur', []), X, Y, Z, step, shape)
    if spec.get('mirror'):
        B = mirror(B, spec['mirror'], X, Y, Z, lo, step, yshift=(cl['shift']*wcl if cl else 0.0))
    log('body blurs and mirror')
    if spec.get('rootBlend') == 'round':
        Bs = smin_round(B, R, float(spec['rootK']))
    else:
        Bs = nf.smin3(B, R, spec['rootK']).astype(np.float32)
    del B
    Bs = blurs(Bs, spec.get('rootBlur', []), X, Y, Z, step, shape)
    log('root and blurs')
    fk = spec['fork']
    df = np.sqrt((X-fk['c'][0])**2+(Y-fk['c'][1])**2+(Z-fk['c'][2])**2).astype(np.float32)
    wfork = nf.smootherstep((fk['r'][1]-df)/(fk['r'][1]-fk['r'][0])).astype(np.float32)  # 1 at the fork, 0 beyond it
    del df
    Ts = []
    for t in spec['tails']:
        smp, s = samples(t)
        records['tails'].append({'samples': smp.round(4).tolist(), 'length': float(s[-1])})
        Ts.append(sweep(smp, lo, step, shape))
    if not tails_on:
        return Bs, records, Ts, R, wfork, Bs
    kfield = (float(spec['tailUnionK'])*wfork).astype(np.float32)
    T_new = Ts[0]
    for Ti in Ts[1:]:
        T_new = smin_var(T_new, Ti, kfield)
    if spec.get('join'):
        # spec 'join' {c, r} and 'joinK': the tails meet the body (and root) with a round fillet of radius joinK inside the
        # join sphere (full to r[0], gone by r[1]), in place of the fork's cubic smooth minimum
        jn = spec['join']
        dj = np.sqrt((X-jn['c'][0])**2+(Y-jn['c'][1])**2+(Z-jn['c'][2])**2).astype(np.float32)
        wj = nf.smootherstep((jn['r'][1]-dj)/(jn['r'][1]-jn['r'][0])).astype(np.float32)
        del dj
        F1 = smin_round(Bs, T_new, (float(spec['joinK'])*wj).astype(np.float32))
    else:
        F1 = smin_var(Bs, T_new, (float(spec['forkK'])*wfork).astype(np.float32))
    del kfield, T_new
    log('tails')
    if spec.get('keepY'):
        ky = spec['keepY']
        wky = nf.smootherstep((Y-ky[0]-(cl['shift']*wcl if cl else 0.0))/(ky[1]-ky[0])).astype(np.float32)
        # spec 'keepYMirror': below the band the field is the input skin mirrored like the rump (spec 'mirror'), so the band
        # does not hand a symmetric rump back to the old skin's asymmetric cleft (a ledge under the rump)
        S0 = mirror(S, spec['mirror'], X, Y, Z, lo, step, yshift=(cl['shift']*wcl if cl else 0.0)) if spec.get('keepYMirror') else S
        F1 = (S0+wky*(F1-S0)).astype(np.float32)
        Bs = (S0+wky*(Bs-S0)).astype(np.float32)
    if spec.get('finalBlur'):
        # spec 'finalBlur': masked Gaussian blurs of the whole composed field after the keepY band (so they reach the
        # original skin's flat inner buttock walls below the band); the tails lie outside their masks
        F1 = blurs(F1, spec['finalBlur'], X, Y, Z, step, shape)
    return F1, records, Ts, R, wfork, Bs
