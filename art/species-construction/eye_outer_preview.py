"""Eye outer half previews (Nick 2026-10-11): quick, not finished builds, of three ways to keep each eye's outer end on
the front plane of the face instead of wrapping onto the side of the head.

Run with Blender (through loop_tools.py blender), on the v5t3 head (H48 output):
  --python eye_outer_preview.py -- --scene <head.blend> --out <new-dir> --variant A|B|C [--spec <json>]

Variants (per eye, mirrored):
  A  the opening's outer end shorter and rounder: in the plane of the opening, the outline beyond `aCut` (fraction of the
     half width outward of the centre) is replaced by a round cap, so the opening ends before the head turns; the globe
     stays where it is and the skin is grown over its outer end;
  B  globe and iris rotated about the vertical through the eye centre by `bTurn` degrees (outer side forward) and moved
     `bIn` toward the midline, the opening outline carried with them;
  C  a flatter globe: the globe and iris compressed along the eye axis by `cFlat` on the outer half (more on the side
     that wraps), so the front view of the opening is about the same and the outer end no longer reaches back.
The opening outline is the v5t3 opening's boundary on the globe (marched outward per angle until the skin is in
front of the globe), carried with the globe and smoothed. Skin: in the frame of the (new) opening, the skin depth along the eye axis is refit as a thin plate: inside the new
opening pinned `inside` behind the globe surface (so the globe shows), on a ring `ringW` wide just outside it pinned
`lid` in front of the globe (the lid edge), held as is beyond `hold` from the globe, free between. Only skin within
about `hold` of a globe moves. This is a preview tool: no recipe step, no containment record.
Writes head.blend, shape.glb, preview.json.
"""
import argparse
import json
import math
from pathlib import Path
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

DEFAULTS = {'aCut': .55, 'bTurn': 14., 'bIn': .012, 'cFlat': .45, 'step': .0025, 'half': .26,
            'inside': .004, 'lid': .0015, 'ringW': .006, 'hold': [.06, .085], 'pinData': 50., 'coreData': .002,
            'alpha': 2., 'frontSheet': [.004, .012], 'outlineSmooth': 7}

argv = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--variant', required=True)
parser.add_argument('--spec', type=Path)
args = parser.parse_args(argv)
args.out.mkdir(parents=True, exist_ok=False)
P = dict(DEFAULTS)
if args.spec:
    P.update(json.loads(args.spec.read_text()))
V = args.variant


def ss2(t, a, b):
    t = np.clip((t-a)/(b-a), 0, 1)
    return t*t*t*(t*(6*t-15)+10)


def world_points(o):
    n = len(o.data.vertices)
    c = np.empty(n*3)
    o.data.vertices.foreach_get('co', c)
    M = np.array(o.matrix_world)
    return c.reshape(-1, 3)@M[:3, :3].T+M[:3, 3]


def set_world(o, W):
    Mi = np.linalg.inv(np.array(o.matrix_world))
    o.data.vertices.foreach_set('co', (W@Mi[:3, :3].T+Mi[:3, 3]).ravel())
    o.data.update()


def inside_poly(px, py, poly):
    """Even-odd point in polygon (vectorised over points)."""
    x, y = poly[:, 0], poly[:, 1]
    x2, y2 = np.roll(x, -1), np.roll(y, -1)
    ins = np.zeros(px.shape, bool)
    for i in range(len(poly)):
        cond = ((y[i] > py) != (y2[i] > py)) & (px < (x2[i]-x[i])*(py-y[i])/(y2[i]-y[i]+1e-12)+x[i])
        ins ^= cond
    return ins


bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
head = max(meshes, key=lambda o: len(o.data.vertices))
pts = world_points(head)
head.data.calc_loop_triangles()
tris = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
head.data.loop_triangles.foreach_get('vertices', tris)
tris = tris.reshape(-1, 3)
skin_tree = BVHTree.FromPolygons(pts.tolist(), tris.tolist())
new = pts.copy()
record = {'variant': V, 'eyes': {}}

for sgn, side in ((-1., '-1'), (1., '1')):
    globe = bpy.data.objects[f'eye_globe_{side}']
    iris = bpy.data.objects[f'iris_and_pupil_{side}']
    G = world_points(globe)
    I = world_points(iris)
    gpoly = [tuple(p.vertices) for p in globe.data.polygons]
    gtree0 = BVHTree.FromPolygons(G.tolist(), gpoly)
    # opening ring: skin vertices on the lid edge
    box = (pts > G.min(0)-.03).all(1) & (pts < G.max(0)+.03).all(1)
    cand = np.where(box)[0]
    dc = np.array([gtree0.find_nearest(Vector(p_))[3] for p_ in pts[cand]])
    ring = pts[cand[dc < .003]]
    c0 = ring.mean(0)
    _, _, vt = np.linalg.svd(ring-c0, full_matrices=False)
    n0 = vt[2] if vt[2][1] < 0 else -vt[2]
    gc = G.mean(0)
    a0 = np.cross([0., 0., 1.], n0)
    a0 /= np.linalg.norm(a0)
    b0 = np.cross(n0, a0)
    edge3 = []
    for t_ in np.linspace(-np.pi, np.pi, 240, endpoint=False):
        dirv = math.cos(t_)*a0+math.sin(t_)*b0
        last = None
        for rr in np.arange(0., .30, .0005):   # march outward until the skin is in front of the globe
            o_ = c0+rr*dirv+n0
            hg = gtree0.ray_cast(Vector(o_), Vector(-n0), 2.)
            hs = skin_tree.ray_cast(Vector(o_), Vector(-n0), 2.)
            if hg[0] is None or (hs[0] is not None and hs[3] < hg[3]-1e-5):
                break
            last = np.array(hg[0])
        if last is not None:
            edge3.append(last)
    edge3 = np.array(edge3)
    # ---- variant transform of globe, iris and ring
    if V == 'B':
        th = math.radians(P['bTurn'])*(-sgn)   # outer side forward: rotate about z through the eye centre
        Rz = np.array([[math.cos(th), -math.sin(th), 0], [math.sin(th), math.cos(th), 0], [0, 0, 1]])
        shift = np.array([-sgn*P['bIn'], 0., 0.])

        def T(X):
            return (X-c0)@Rz.T+c0+shift
    elif V == 'C':
        a_ = np.cross([0., 0., 1.], n0)
        a_ /= np.linalg.norm(a_)
        out_dir = a_*np.sign(a_[0]*sgn)

        def T(X):
            rel = X-c0
            dn = rel@n0
            du = rel@out_dir
            k = 1-P['cFlat']*ss2(du, 0., .12)   # flatten depth on the outer half only
            front = dn.max() if False else 0.
            return X+((dn-0.)*(k-1))[:, None]*n0[None, :]
    else:
        def T(X):
            return X
    G2, I2, ring2, edge3n = T(G), T(I), T(ring), T(edge3)
    set_world(globe, G2)
    set_world(iris, I2)
    gtree = BVHTree.FromPolygons(G2.tolist(), gpoly)
    c = ring2.mean(0)
    _, _, vt = np.linalg.svd(ring2-c, full_matrices=False)
    n = vt[2] if vt[2][1] < 0 else -vt[2]
    a = np.cross([0., 0., 1.], n)
    a /= np.linalg.norm(a)
    b = np.cross(n, a)
    outward = np.sign(a[0]*sgn)
    # opening outline in the plane: the carried opening boundary, radius smoothed round the loop
    eu, ev_ = (edge3n-c)@a, (edge3n-c)@b
    ang = np.arctan2(ev_, eu)
    rad = np.sqrt(eu**2+ev_**2)
    o_ = np.argsort(ang)
    ang, rad = ang[o_], rad[o_]
    m_ = 9   # running median first: a stray far hit (a patch of globe showing through the skin) must not bulge the outline
    radm = np.concatenate([rad[-m_:], rad, rad[:m_]])
    rad = np.array([np.median(radm[k:k+2*m_+1]) for k in range(len(rad))])
    kern = np.ones(P['outlineSmooth'])/P['outlineSmooth']
    radp = np.concatenate([rad[-len(kern):], rad, rad[:len(kern)]])
    rad = np.convolve(radp, kern, mode='same')[len(kern):-len(kern)]
    poly = np.stack([rad*np.cos(ang), rad*np.sin(ang)], 1)
    if V == 'A':   # round cap on the outer end
        pu = poly[:, 0]*outward
        umax = pu.max()
        cut = P['aCut']*umax
        top = poly[(pu > cut-.004) & (pu < cut+.004)]
        hv = np.abs(top[:, 1]).max() if len(top) else .05
        newp = []
        for p_ in poly:
            if p_[0]*outward > cut:
                vv = np.clip(p_[1]/hv, -1, 1)
                uu = cut+(umax-cut)*.0+hv*.6*math.sqrt(max(0., 1-vv*vv))
                newp.append([outward*min(p_[0]*outward, uu), p_[1]])
            else:
                newp.append(p_)
        poly = np.array(newp)
    # ---- skin depth grid
    g = np.arange(-P['half'], P['half']+1e-9, P['step'])
    N = len(g)
    GU, GV = np.meshgrid(g, g, indexing='ij')
    H0 = np.full((N, N), np.nan)
    Hg = np.full((N, N), np.nan)
    far = 1.
    for i, u in enumerate(g):
        for j, v in enumerate(g):
            o_ = c+u*a+v*b+far*n
            hs = skin_tree.ray_cast(Vector(o_), Vector(-n), 2*far)
            if hs[0] is not None:
                H0[i, j] = float(np.dot(np.array(hs[0])-c, n))
            hg = gtree.ray_cast(Vector(o_), Vector(-n), 2*far)
            if hg[0] is not None:
                Hg[i, j] = float(np.dot(np.array(hg[0])-c, n))
    valid = np.isfinite(H0)
    inO = inside_poly(GU, GV, poly) & np.isfinite(Hg)
    # distance in the plane to the outline
    dO = np.full((N, N), 9.)
    for k0 in range(0, len(poly), 60):
        du = GU[..., None]-poly[k0:k0+60, 0][None, None, :]
        dv = GV[..., None]-poly[k0:k0+60, 1][None, None, :]
        dO = np.minimum(dO, np.sqrt(du*du+dv*dv).min(2))
    # distance from the skin point to the (new) globe, for the hold
    Dg = np.full((N, N), 1.)
    for i in range(N):
        for j in range(N):
            if valid[i, j] and dO[i, j] < P['hold'][1]+.05:
                p_ = c+g[i]*a+g[j]*b+H0[i, j]*n
                Dg[i, j] = min(gtree.find_nearest(Vector(p_))[3], gtree0.find_nearest(Vector(p_))[3])
    tgt = np.where(valid, H0, 0.)
    wd = np.where(valid, P['pinData']*ss2(Dg, *P['hold']), 0.)
    free = valid & (wd < P['pinData']*.999)
    wd = np.where(free, np.maximum(wd, P['coreData']), wd)
    pin_in = valid & inO
    tgt = np.where(pin_in, np.minimum(H0, Hg-P['inside']), tgt)
    wd = np.where(pin_in, P['pinData'], wd)
    lid = valid & ~inO & (dO < P['ringW']) & np.isfinite(Hg)
    tgt = np.where(lid, Hg+P['lid'], tgt)
    wd = np.where(lid, P['pinData'], wd)
    over = valid & ~inO & ~lid & np.isfinite(Hg) & (H0 < Hg+P['lid'])   # skin that would sit inside the globe
    tgt = np.where(over, Hg+P['lid'], tgt)
    wd = np.where(over, np.maximum(wd, 1.), wd)
    h0 = np.where(valid, H0, np.nanmean(H0))

    def lap(z):
        zp = np.pad(z, 1, mode='edge')
        return zp[2:, 1:-1]+zp[:-2, 1:-1]+zp[1:-1, 2:]+zp[1:-1, :-2]-4*z

    def A(z):
        return wd*z+P['alpha']*lap(lap(z))
    u_ = h0.copy()
    r = wd*np.where(valid, tgt, h0)-A(u_)
    pdir = r.copy()
    rs = rs0 = (r*r).sum()
    for it in range(20000):
        Ap = A(pdir)
        st = rs/(pdir*Ap).sum()
        u_ += st*pdir
        r -= st*Ap
        rs2 = (r*r).sum()
        if rs2 < 1e-14*rs0:
            break
        pdir = r+(rs2/rs)*pdir
        rs = rs2
    dH = np.where(valid, u_-h0, 0.)
    rel = pts-c
    pu_, pv_, pn_ = rel@a, rel@b, rel@n
    sel = np.where((np.abs(pu_) < P['half']-2*P['step']) & (np.abs(pv_) < P['half']-2*P['step']) & (pn_ > -.25))[0]
    fu = (pu_[sel]+P['half'])/P['step']
    fv = (pv_[sel]+P['half'])/P['step']
    i0 = np.clip(np.floor(fu).astype(int), 0, N-2)
    j0 = np.clip(np.floor(fv).astype(int), 0, N-2)
    tu, tv = fu-i0, fv-j0
    wu = [(1-tu)**3/6, (3*tu**3-6*tu**2+4)/6, (-3*tu**3+3*tu**2+3*tu+1)/6, tu**3/6]
    wv = [(1-tv)**3/6, (3*tv**3-6*tv**2+4)/6, (-3*tv**3+3*tv**2+3*tv+1)/6, tv**3/6]
    dd = np.zeros(len(sel))
    hh = np.zeros(len(sel))
    vs = np.zeros(len(sel))
    Hf = np.where(valid, H0, 0.)
    for p in range(4):
        ip = np.clip(i0-1+p, 0, N-1)
        for q in range(4):
            jq = np.clip(j0-1+q, 0, N-1)
            w4 = wu[p]*wv[q]
            dd += w4*dH[ip, jq]
            hh += w4*Hf[ip, jq]*valid[ip, jq]
            vs += w4*valid[ip, jq]
    hs_ = np.where(vs > .5, hh/np.maximum(vs, 1e-9), np.nan)
    front = np.where(np.isfinite(hs_), 1-ss2(np.abs(pn_[sel]-np.nan_to_num(hs_, nan=9.)), *P['frontSheet']), 0.)
    move = dd*front
    new[sel] += move[:, None]*n[None, :]
    record['eyes'][side] = {'iterations': it+1, 'maxMove': round(float(np.abs(move).max()), 4),
                            'moved': int((np.abs(move) > 1e-7).sum()), 'openingCells': int(inO.sum())}

set_world(head, new)
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'preview.json').write_text(json.dumps({'parameters': P, 'record': record}, indent=1)+'\n')
print('eye outer preview ok', json.dumps(record), flush=True)
