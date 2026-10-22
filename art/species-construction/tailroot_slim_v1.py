"""Akinza tail root slim v1: the three tails meet the rump directly, with narrow tail-to-tail and tail-to-body
fillets, and the shared root knob filled in (rig pass 6 fix, step E; Nick: "There should be no base to the tail.
The tails should just connect to the body." This overrides the 2026-10-14 tail base v3 approval of the broad
shared root).

Method (distance fields on a grid round the root, numpy only; same topology and vertex order, so the rig's
weights and the fur binding carry over):
1. The skin's signed distance on a grid round the tail fork (sign from the nearest vertex's normal).
2. The body alone: a morphological opening of the inside (erode then dilate by `openRadius`) removes everything
   thinner than the opening ball, the tails and the knob where they join, and keeps the rump's own broad form.
3. The tails as capsules along each tail's first joints (radius measured on the tail just past its base),
   extended a few cm into the body so each tail enters the rump.
4. The new root surface is the smooth union of body and tails with a small blend radius (`fillet`): narrow
   crotches between tails and where each tail meets the rump.
5. Each skin vertex near the root moves along its smoothed normal to the new surface's zero crossing nearest to
   it (at most `maxMove`), faded out by distance from the fork, then the displacement field is smoothed.
Measures are rig metres; input and output are source units.

  python art/species-construction/tailroot_slim_v1.py --skin <npz with src, tri, edges> --rig <rig dir>
      --spec art/species-construction/specs/tailroot-slim-v1.json --out <out.npz> [--record <json>]
"""
import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

import numpy as np
import scipy.sparse as sp
from scipy import ndimage
from scipy.spatial import cKDTree

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import rig_core as rc  # noqa: E402


def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--skin', type=Path, required=True)
    p.add_argument('--rig', type=Path, required=True)
    p.add_argument('--spec', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--record', type=Path)
    a = p.parse_args()
    t0 = time.time()
    spec = json.loads(a.spec.read_text(encoding='utf-8'))
    d = np.load(a.skin)
    src = d['src'].astype(np.float64)
    tri, edges = d['tri'], d['edges']
    rig = json.loads((a.rig/'rig.json').read_text())
    s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
    J = json.loads((a.rig/'joints.json').read_text())
    P = s*(src-off)
    n = len(P)
    wt = np.load(a.rig/'weights.npz')
    dense = np.zeros((n, len(rc.ANIM_NAMES)), np.float32)
    np.put_along_axis(dense, wt['idx'].astype(int), wt['w'], 1)
    NI = {b: i for i, b in enumerate(rc.ANIM_NAMES)}
    share = lambda bs: dense[:, [NI[b] for b in bs]].sum(1)
    A = sp.coo_matrix((np.ones(2*len(edges)), (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]])), shape=(n, n)).tocsr()
    A = sp.diags(1/np.maximum(np.asarray(A.sum(1)).ravel(), 1))@A
    fn = np.cross(P[tri[:, 1]]-P[tri[:, 0]], P[tri[:, 2]]-P[tri[:, 0]])
    N0 = np.zeros_like(P)
    for k in range(3):
        np.add.at(N0, tri[:, k], fn)
    N0 /= np.linalg.norm(N0, axis=1, keepdims=True)+1e-20
    N = N0.copy()
    for _ in range(spec['normalRounds']):
        N = .5*N+.5*(A@N)
        N /= np.linalg.norm(N, axis=1, keepdims=True)+1e-20
    fork = np.array(J['tail_fork'], float)
    h = spec['voxel']
    half = spec['box']
    lo = fork-half
    shape = tuple(int(np.ceil(2*half/h))+1 for _ in range(3))
    g = [lo[i]+h*np.arange(shape[i]) for i in range(3)]
    G = np.stack(np.meshgrid(*g, indexing='ij'), -1).reshape(-1, 3)
    tree = cKDTree(P)
    dist, nn = tree.query(G, k=1, workers=-1)
    inside = (np.einsum('ij,ij->i', G-P[nn], N0[nn]) < 0).reshape(shape)
    # the body alone, two estimates: (a) a morphological opening of the inside by openRadius removes everything
    # thinner than the ball (the tails); (b) the rump surface fitted under the root: a quadratic y = f(x, z) through
    # the bare rump skin in a ring round the fork (no tail, leg or arm weight), so the plate of webs between the
    # tails, which the opening keeps because it lies flat on the rump, is not body. The body is their intersection.
    rho = spec['openRadius']/h
    din = ndimage.distance_transform_edt(inside)
    eroded = din > rho
    dout = ndimage.distance_transform_edt(~eroded)
    body = dout <= rho
    FB = (ndimage.distance_transform_edt(~body)-ndimage.distance_transform_edt(body))*h
    FB = FB.reshape(-1)
    tails_all = share([b for b in rc.ANIM_NAMES if b.startswith('tail_')])
    limbs = share([f'{b}.{sd}' for b in ('thigh', 'shin', 'foot', 'glute', 'clavicle', 'upperarm', 'forearm', 'hand') for sd in 'LR'])
    rr = np.linalg.norm(P-fork, axis=1)
    ring = (tails_all < .005) & (limbs < .2) & (rr > spec['rumpRing'][0]) & (rr < spec['rumpRing'][1]) & (P[:, 1] > fork[1]-.05)
    X_, Z_ = P[ring, 0]-fork[0], P[ring, 2]-fork[2]
    M_ = np.stack([np.ones_like(X_), X_, Z_, X_*X_, X_*Z_, Z_*Z_], 1)
    cf = np.linalg.lstsq(M_, P[ring, 1], rcond=None)[0]
    gx, gz = G[:, 0]-fork[0], G[:, 2]-fork[2]
    rump_y = np.stack([np.ones_like(gx), gx, gz, gx*gx, gx*gz, gz*gz], 1)@cf
    FR = G[:, 1]-rump_y
    # the fitted rump only rules between and round the tails (the webs); elsewhere the buttocks bulge past it
    FB_rump = np.maximum(FB, FR)
    near_axis = np.full(len(G), 9.)
    for t in rc.TAILS:
        js = [np.array(J[f'tail_{t}_j{k}'], float) for k in range(3)]
        for p0, p1 in zip(js[:-1], js[1:]):
            near_axis = np.minimum(near_axis, rc.seg_dist(G, p0, p1)[0])
    wweb = 1-rc.smoothstep(near_axis, spec['webReach'][0], spec['webReach'][1])
    FB = FB*(1-wweb)+FB_rump*wweb
    # the tails as capsules, extended into the body
    FT = np.full(len(G), 9.)
    radii = {}
    for t in rc.TAILS:
        js = [np.array(J[f'tail_{t}_j{k}'], float) for k in range(4)]
        u = (js[1]-js[0])/np.linalg.norm(js[1]-js[0])
        own = share([f'tail_{t}{k}' for k in range(1, rc.TAIL_BONES+1)]) > .5
        q = P-js[0]
        al = q@u
        rad = np.linalg.norm(q-np.outer(al, u), axis=1)
        r = float(np.median(rad[own & (al > spec['radiusFrom']) & (al < spec['radiusTo'])]))
        radii[t] = r
        pts = [js[0]-spec['intoBody']*u]+js[:3]
        for p0, p1 in zip(pts[:-1], pts[1:]):
            dd, _ = rc.seg_dist(G, p0, p1)
            FT = np.minimum(FT, dd-r)
    F = ndimage.gaussian_filter(smin(FB, FT, spec['fillet']).reshape(shape), spec.get('fieldSigma', 1.))   # the voxel sign noise
    # move each root vertex along its normal to the nearest zero crossing of F
    dfork = np.linalg.norm(P-fork, axis=1)
    fade = 1-rc.smoothstep(dfork, spec['reach'][0], spec['reach'][1])
    legs = share([f'{b}.{sd}' for b in ('thigh', 'shin', 'foot', 'glute') for sd in 'LR'])
    fade *= 1-rc.smoothstep(legs, spec.get('legFade', [.02, .2])[0], spec.get('legFade', [.02, .2])[1])
    sel = np.where(fade > 1e-3)[0]
    ts = np.arange(-spec['maxMove'], spec['maxMove']+1e-9, h/3)
    X = P[sel][:, None, :]+ts[None, :, None]*N[sel][:, None, :]
    idx = ((X-lo)/h).reshape(-1, 3).T
    Fs = ndimage.map_coordinates(F, idx, order=1, mode='nearest').reshape(len(sel), len(ts))
    disp = np.zeros(n)
    sgn = np.sign(Fs)
    cross = (sgn[:, :-1]*sgn[:, 1:]) <= 0
    tc = np.where(cross, (ts[:-1]+ts[1:])/2, np.inf)
    best = np.argmin(np.abs(tc), axis=1)
    tbest = tc[np.arange(len(sel)), best]
    ok = np.isfinite(tbest)
    disp[sel[ok]] = tbest[ok]*fade[sel[ok]]
    for _ in range(spec['smoothRounds']):
        disp = .5*disp+.5*(A@disp)
    disp *= (fade > 1e-3)
    newP = P+N*disp[:, None]
    np.savez_compressed(a.out, src=(newP/s+off).astype(np.float32), m=newP.astype(np.float32), tri=tri, edges=edges,
                        disp=disp.astype(np.float32))
    rec = dict(step='tail root slim v1', script='art/species-construction/tailroot_slim_v1.py', spec=spec,
               skinSha256=hashlib.sha256(src.astype(np.float32).tobytes()).hexdigest(), vertices=n,
               movedVertices=int((np.abs(disp) > 1e-4).sum()), maxInM=float(-disp.min()), maxOutM=float(disp.max()),
               tailRadii=radii, grid=list(shape), rumpFit=dict(points=int(ring.sum()), coef=cf.tolist()), seconds=round(time.time()-t0, 1))
    if a.record:
        a.record.write_text(json.dumps(rec, indent=1))
    print(json.dumps({k: v for k, v in rec.items() if k != 'spec'}, indent=1))


if __name__ == '__main__':
    main()
