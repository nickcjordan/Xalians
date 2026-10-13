"""Akinza tails v4 field composition (numpy only; shared by tails_v4_post.py and its development harness).

Tails v3 (tails_v2_post.py) joined its three tails with one smooth minimum everywhere, from three roots spread down the rump,
on centrelines that ran side by side for the first third of their length, so the tails overlapped and webbed to about a third
of the way out. Here the three tails leave one shared base and are kept apart beyond it:

  T_i            round-cone sweep distance of tail i (spec 'tails': control points from the shared base, radius profile)
  T_new          the tails' union: a C2 smooth minimum whose radius k is spec 'tailUnionK' inside the base sphere (spec 'base':
                 centre c, radius r[0]) and falls to 0 by r[1], so beyond the base the union is the hard minimum and the tails
                 only meet where their surfaces really touch (the design keeps a positive gap there)
  B              the input skin S with the old B-14 tails carved out, plus the authored masses (sacrum, shared base knob)
  F1             smin(B, T_new, rootK), then masked Gaussian blurs; with 'protectTails' a blur is switched off wherever a point
                 lies within reach of two tails beyond the base (second-nearest tail distance T2 under 'protectTails'[1],
                 fading in from [0]), so no blur can bridge the air between two tails
  keepY          below that y band the field is S (the stitch stays off the crotch), as tails v2

Everything is in world units on the level-set grid of the spec.
"""
import json
from pathlib import Path

import numpy as np

import neck_v1_field as nf


def catmull(c, n=12):
    c = np.array(c, float)
    out = []
    for i in range(len(c)-1):
        a, b, cc, d = c[max(0, i-1)], c[i], c[i+1], c[min(len(c)-1, i+2)]
        for j in range(n):
            t = j/n
            out.append(.5*((2*b)+(-a+cc)*t+(2*a-5*b+4*cc-d)*t*t+(-a+3*b-3*cc+d)*t**3))
    out.append(c[-1])
    return np.array(out)


def grid(spec):
    G = spec['grid']
    step = float(G['step'])
    i0 = np.round(np.array(G['lo'])/step).astype(int)
    i1 = np.round(np.array(G['hi'])/step).astype(int)
    shape = tuple(int(v) for v in i1-i0+1)
    lo = i0*step
    return step, lo, shape, i0


def sweep(samples, lo, step, shape, reach=.06):
    """Round-cone distance to a sampled sweep [x, y, z, r], on the grid, per segment box."""
    xs, ys, zs = (lo[k]+step*np.arange(shape[k]) for k in range(3))
    out = np.full(shape, reach, np.float32)
    for a, b in zip(samples[:-1], samples[1:]):
        ra, rb = max(a[3], .0008), max(b[3], .0008)
        blo = np.minimum(a[:3], b[:3])-max(ra, rb)-reach
        bhi = np.maximum(a[:3], b[:3])+max(ra, rb)+reach
        sl = []
        for k, arr in enumerate((xs, ys, zs)):
            j0 = max(int(np.searchsorted(arr, blo[k])), 0)
            j1 = min(int(np.searchsorted(arr, bhi[k])), shape[k])
            sl.append(slice(j0, j1))
        if any(s.stop <= s.start for s in sl):
            continue
        X, Y, Z = np.meshgrid(xs[sl[0]], ys[sl[1]], zs[sl[2]], indexing='ij')
        ba = b[:3]-a[:3]
        L2 = float(ba@ba)
        h = np.clip(((X-a[0])*ba[0]+(Y-a[1])*ba[1]+(Z-a[2])*ba[2])/L2, 0, 1)
        d = np.sqrt((X-a[0]-ba[0]*h)**2+(Y-a[1]-ba[1]*h)**2+(Z-a[2]-ba[2]*h)**2)-(ra+(rb-ra)*h)
        out[tuple(sl)] = np.minimum(out[tuple(sl)], d.astype(np.float32))
    return out


def tail_samples(t):
    P = np.array(t['points'], float)
    smp = catmull(np.c_[P, np.zeros(len(P))], 16)[:, :3]
    s = np.r_[0, np.cumsum(np.linalg.norm(np.diff(smp, axis=0), axis=1))]
    u = s/s[-1]
    pr = t['radius']
    r = pr['root']*np.interp(u, pr['u'], pr['scale'])
    return np.c_[smp, r], s


def smin_var(a, b, k):
    """smin3 with a spatially varying radius k (k = 0 is the hard minimum)."""
    kk = np.maximum(k, 1e-6)
    h = np.clip(kk-np.abs(a-b), 0.0, None)/kk
    return (np.minimum(a, b)-h*h*h*kk/6.0).astype(np.float32)


def ellipsoid(X, Y, Z, m):
    e = np.sqrt(((np.abs(X) if m.get('mirror') else X)-m['c'][0])**2/m['s'][0]**2+(Y-m['c'][1])**2/m['s'][1]**2
                + (Z-m['c'][2])**2/m['s'][2]**2)
    return ((e-1)*min(m['s'])).astype(np.float32)


def compose(S, spec, repo, log=print):
    """Return F1 (the composed field before the region fade), the tails' records and the per-tail fields."""
    step, lo, shape, _ = grid(spec)
    X, Y, Z = nf.grid_coords(lo, step, shape)
    old_controls = json.loads((Path(repo)/spec['oldControls']).read_text())['tailControls']
    T_old = np.full(shape, .06, np.float32)
    for c in old_controls:
        cc = np.array(c, float)
        T_old = np.minimum(T_old, sweep(catmull(np.c_[cc[:, :3], np.maximum(cc[:, 3], cc[:, 4])]), lo, step, shape))
    log('T_old')
    bs = spec['base']
    db = np.sqrt((X-bs['c'][0])**2+(Y-bs['c'][1])**2+(Z-bs['c'][2])**2).astype(np.float32)
    wbase = nf.smootherstep((bs['r'][1]-db)/(bs['r'][1]-bs['r'][0])).astype(np.float32)  # 1 in the base, 0 beyond it
    del db
    records, Ts = [], []
    for t in spec['tails']:
        smp, s = tail_samples(t)
        records.append({'samples': smp.round(4).tolist(), 'length': float(s[-1])})
        Ts.append(sweep(smp, lo, step, shape))
    kfield = (float(spec['tailUnionK'])*wbase).astype(np.float32)
    T_new = Ts[0]
    for Ti in Ts[1:]:
        T_new = smin_var(T_new, Ti, kfield)
    del kfield
    log('T_new')
    cv = spec['carve']
    wy = nf.smootherstep((Y-cv['y'][0])/(cv['y'][1]-cv['y'][0]))
    carve = (wy*(cv['margin']-T_old)+(1-wy)*(-1.0)).astype(np.float32)
    del wy, T_old
    B = (-nf.smin3(-S, -carve, cv['k'])).astype(np.float32) if cv.get('k') else np.maximum(S, carve)
    del carve
    for m in spec.get('masses', []):
        B = nf.smin3(B, ellipsoid(X, Y, Z, m), m['k']).astype(np.float32)
    F1 = nf.smin3(B, T_new, spec['rootK']).astype(np.float32)
    del B
    protect = None
    if spec.get('protectTails'):
        p0, p1 = spec['protectTails']
        Tst = np.stack(Ts)
        T2 = (Tst.sum(0)-Tst.min(0)-Tst.max(0)) if len(Ts) == 3 else np.sort(Tst, 0)[1]
        del Tst
        protect = ((1-wbase)*nf.smootherstep((p1-T2)/(p1-p0))).astype(np.float32)
        del T2
    for st in spec.get('blur', []):
        Fb = nf.gaussian_blur3(F1, st['sigma']/step).astype(np.float32)
        wb = np.zeros(shape, np.float32)
        for e in st['mask']:
            q = np.sqrt(((X-e['c'][0])/e['s'][0])**2+((Y-e['c'][1])/e['s'][1])**2+((Z-e['c'][2])/e['s'][2])**2)
            wb = np.maximum(wb, nf.smootherstep((e['fade'][1]-q)/(e['fade'][1]-e['fade'][0])))
        if protect is not None:
            wb = wb*(1-protect)
        F1 = (F1+wb*(Fb-F1)).astype(np.float32)
    log('blurs')
    if spec.get('keepY'):
        ky = spec['keepY']
        wky = nf.smootherstep((Y-ky[0])/(ky[1]-ky[0])).astype(np.float32)
        F1 = (S+wky*(F1-S)).astype(np.float32)
    return F1, records, Ts, wbase
