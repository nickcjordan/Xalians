"""Eye surround v5e (Nick 2026-10-11): the v5m2 head with only the skin around each eye changed.

Run with Blender (through loop_tools.py blender or a recipe step), on the v5m2 head (H44 output):
  --python eye_v5e_field.py -- --scene <head.blend> --out <new-dir> --spec <eye spec json>

Nick on v5's eyes: "weird artifacts left in place from what I'm interpreting as leftover eye sockets that got moved
outward ... It's like almost on the outside of the eyeballs on either side." v5 kept H37's skin within .02 to .06 of each
globe; that skin carried the old socket rims, a soft cushion ring round each eye, a fold behind the outer corner and
halo bands. Rule: one part at a time, nothing else changes. Like the mouth step, this step does not rebuild a field or
remesh: it moves vertices of the input skin in place, only inside a tight mask round each eye, so every vertex outside the
mask keeps its exact position. What it keeps (lessons of the rejected v6 line): the globes, irises and the opening are not
touched (the skin within `pin` of a globe, the lid edge that makes the opening and the dark outline with its heavier upper
line, is held exactly), the skin is not wrapped over the globe, and nothing beyond `out` from a globe moves (no wider
face or skull smoothing).

Per eye, a frame: the plane of the opening (skin vertices within `edgeBand` of the globe, fitted by PCA): centre c, forward
axis n (its normal, toward the front), plane axes a, b. The skin's depth along n is sampled on a square (a, b) grid (`step`, half width `half`) by rays along -n,
first skin hit; a cell whose ray meets the globe before the skin lies in the opening and carries no data. Each cell's
data weight comes from its skin point's distance d to the globe: held (`pinData`) where d < pin[0], free (`coreData`)
from pin[1] to out[0], held again beyond out[1] (C2 steps). The depth is refit as a thin plate (data plus `alpha` times
the squared Laplacian, conjugate gradients), so the ring between the lid edge and the face becomes the smoothest surface
that meets both. Skin vertices move along n by the change, looked up by a cubic B-spline over the grid, weighted by the
same free weight at the vertex's own distance to the globe (so held skin moves exactly 0), and only on the front sheet
(`frontSheet`: within that depth of the cell's first hit).

With `pinOpening` [o0, o1] the hold is by distance in the eye's plane to the opening (the cells whose ray meets the globe
first): held within o0 of the opening, free beyond o1. Skin that lies close over the buried part of a globe, away from
the opening (the old socket hollow behind the outer corner), is then free too; `pin` stays as a small hard hold by
distance to the globe, and no vertex is moved to within `globeClear` of a globe (closer than it was).

Writes head.blend, shape.glb, eye-v5e.json.
"""
import argparse
import json
from pathlib import Path
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, require_single_closed_mesh, sha
from study_provenance import snapshot

DEFAULTS = {
    'step': .0025, 'half': .20, 'pin': [.004, .012], 'out': [.05, .08],
    'pinData': 50., 'edgeBand': .003, 'coreData': .002, 'alpha': 1., 'frontSheet': [.004, .012], 'iters': 20000, 'pinOpening': None, 'globeClear': .001,
}

argv = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--spec', type=Path, required=True)
args = parser.parse_args(argv)
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene, args.spec])
P = dict(DEFAULTS)
P.update({k: v for k, v in json.loads(args.spec.read_text()).items() if k != 'note'})


def ss2(t, a, b):
    t = np.clip((t-a)/(b-a), 0, 1)
    return t*t*t*(t*(6*t-15)+10)


def free_w(d):
    return ss2(d, *P['pin'])*(1-ss2(d, *P['out']))


def world_points(o):
    n = len(o.data.vertices)
    c = np.empty(n*3)
    o.data.vertices.foreach_get('co', c)
    M = np.array(o.matrix_world)
    return c.reshape(-1, 3)@M[:3, :3].T+M[:3, 3]


def tree_of(o):
    V = world_points(o)
    return BVHTree.FromPolygons(V.tolist(), [tuple(p.vertices) for p in o.data.polygons])


bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
head = max(meshes, key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before eye v5e')
before = mesh_stats(head)
M = np.array(head.matrix_world)
pts = world_points(head)
head.data.calc_loop_triangles()
tris = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
head.data.loop_triangles.foreach_get('vertices', tris)
skin_tree = BVHTree.FromPolygons(pts.tolist(), tris.reshape(-1, 3).tolist())
new = pts.copy()
record = {'eyes': {}}

for side in ('-1', '1'):
    globe = bpy.data.objects[f'eye_globe_{side}']
    iris = bpy.data.objects[f'iris_and_pupil_{side}']
    G = world_points(globe)
    gtree = tree_of(globe)
    # frame from the opening: skin vertices on the lid edge (within edgeBand of the globe), plane fit by PCA
    box = (pts > G.min(0)-.03).all(1) & (pts < G.max(0)+.03).all(1)
    cand_ = np.where(box)[0]
    dcand = np.array([gtree.find_nearest(Vector(p_))[3] for p_ in pts[cand_]])
    ring = pts[cand_[dcand < P['edgeBand']]]
    c = ring.mean(0)
    _, _, vt = np.linalg.svd(ring-c, full_matrices=False)
    n = vt[2]
    if n[1] > 0:
        n = -n
    a = np.cross([0., 0., 1.], n)
    a /= np.linalg.norm(a)
    b = np.cross(n, a)
    R = np.linalg.norm(G-c, axis=1).max()
    g = np.arange(-P['half'], P['half']+1e-9, P['step'])
    N = len(g)
    H0 = np.full((N, N), np.nan)
    D = np.full((N, N), 1.)
    Opn = np.zeros((N, N), bool)
    far = 1.
    for i, u in enumerate(g):
        for j, v in enumerate(g):
            o_ = c+u*a+v*b+far*n
            hs = skin_tree.ray_cast(Vector(o_), Vector(-n), 2*far)
            if hs[0] is None:
                continue
            hg = gtree.ray_cast(Vector(o_), Vector(-n), 2*far)
            if hg[0] is not None and hg[3] < hs[3]-1e-5:
                Opn[i, j] = True
                continue   # inside the opening: the globe is in front
            p_ = np.array(hs[0])
            H0[i, j] = float(np.dot(p_-c, n))
            D[i, j] = gtree.find_nearest(Vector(p_))[3]
    valid = np.isfinite(H0)
    fw = np.where(valid, free_w(D), 0.)
    dO = None
    if P['pinOpening']:   # hold by distance to the opening in the eye's plane, not by closeness to the (buried) globe
        oi, oj = np.nonzero(Opn)
        edge = np.zeros_like(Opn)
        edge[1:-1, 1:-1] = Opn[1:-1, 1:-1] & ~(Opn[2:, 1:-1] & Opn[:-2, 1:-1] & Opn[1:-1, 2:] & Opn[1:-1, :-2])
        ei, ej = np.nonzero(edge)
        GU, GV = np.meshgrid(g, g, indexing='ij')
        dO = np.full((N, N), 9.)
        for k0 in range(0, len(ei), 200):
            du = GU[..., None]-g[ei[k0:k0+200]][None, None, :]
            dv = GV[..., None]-g[ej[k0:k0+200]][None, None, :]
            dO = np.minimum(dO, np.sqrt(du*du+dv*dv).min(2))
        dO[Opn] = 0.
        fw = np.where(valid, ss2(D, *P['pin'])*(1-ss2(D, *P['out']))*ss2(dO, *P['pinOpening']), 0.)
    wd = np.where(valid, P['pinData']-(P['pinData']-P['coreData'])*fw, 0.)
    h0 = np.where(valid, H0, np.nanmean(H0))
    alpha = P['alpha']

    def lap(z):
        zp = np.pad(z, 1, mode='edge')
        return zp[2:, 1:-1]+zp[:-2, 1:-1]+zp[1:-1, 2:]+zp[1:-1, :-2]-4*z

    def A(z):
        return wd*z+alpha*lap(lap(z))
    bvec = wd*h0
    u_ = h0.copy()
    r = bvec-A(u_)
    pdir = r.copy()
    rs = (r*r).sum()
    rs0 = rs
    for it in range(P['iters']):
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
    # vertices near this eye
    rel = pts-c
    pu, pv, pn = rel@a, rel@b, rel@n
    sel = np.where((np.abs(pu) < P['half']-2*P['step']) & (np.abs(pv) < P['half']-2*P['step']) & (pn > -.25))[0]
    dg = np.array([gtree.find_nearest(Vector(p_))[3] for p_ in pts[sel]])
    w = free_w(dg)
    keep = w > 0
    sel, dg, w = sel[keep], dg[keep], w[keep]
    fu = (pu[sel]+P['half'])/P['step']
    fv = (pv[sel]+P['half'])/P['step']
    i0 = np.clip(np.floor(fu).astype(int), 0, N-2)
    j0 = np.clip(np.floor(fv).astype(int), 0, N-2)
    tu, tv = fu-i0, fv-j0

    def bspl(t):
        return [(1-t)**3/6, (3*t**3-6*t**2+4)/6, (-3*t**3+3*t**2+3*t+1)/6, t**3/6]
    wu, wv = bspl(tu), bspl(tv)
    dd = np.zeros(len(sel))
    oo = np.zeros(len(sel))
    hh = np.zeros(len(sel))
    wsum = np.zeros(len(sel))
    Hf = np.where(valid, H0, 0.)
    for p in range(4):
        ip = np.clip(i0-1+p, 0, N-1)
        for q in range(4):
            jq = np.clip(j0-1+q, 0, N-1)
            ww = wu[p]*wv[q]
            dd += ww*dH[ip, jq]
            if dO is not None:
                oo += ww*dO[ip, jq]
            hh += ww*Hf[ip, jq]*valid[ip, jq]
            wsum += ww*valid[ip, jq]
    hs_ = np.where(wsum > .5, hh/np.maximum(wsum, 1e-9), np.nan)
    front = np.where(np.isfinite(hs_), 1-ss2(np.abs(pn[sel]-np.nan_to_num(hs_, nan=9.)), *P['frontSheet']), 0.)
    if dO is not None:
        w = w*ss2(oo, *P['pinOpening'])
    move = dd*w*front
    trial = pts[sel]+move[:, None]*n[None, :]
    # never into the globe: a vertex that would come within globeClear of it (closer than it was) keeps its place
    near_ = np.where((dg < .02) & (move != 0))[0]
    dn_ = np.array([gtree.find_nearest(Vector(p_))[3] for p_ in trial[near_]]) if len(near_) else np.zeros(0)
    bad = near_[(dn_ < P['globeClear']) & (dn_ < dg[near_])]
    move[bad] = 0.
    new[sel] += move[:, None]*n[None, :]
    record['eyes'][side] = {'centre': c.round(4).tolist(), 'axis': n.round(4).tolist(), 'globeRadius': round(float(R), 4),
                            'grid': N, 'iterations': it+1, 'maxCellChange': round(float(np.abs(dH).max()), 5),
                            'vertices': int((move != 0).sum()), 'heldOffGlobe': int(len(bad)), 'maxMove': round(float(np.abs(move).max()), 5)}

disp = np.linalg.norm(new-pts, axis=1)
Mi = np.linalg.inv(M)
head.data.vertices.foreach_set('co', (new@Mi[:3, :3].T+Mi[:3, 3]).ravel())
head.data.update()
record['displacement'] = {'moved': int((disp > 0).sum()), 'max': float(disp.max())}
require_single_closed_mesh(head, args.out, 'Head skin eye v5e')
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'eye-v5e.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Eye surround v5e (Nick 2026-10-11): the skin round each eye refit as a thin plate between the held lid edge '
             'and the face, moved in place along the eye axis inside a tight mask; globes, irises and opening untouched',
    'parameters': P, 'parts': record, 'skinBefore': before, 'skinAfter': mesh_stats(head),
    'outputs': {q.name: sha(q) for q in args.out.iterdir() if q.suffix in ['.glb', '.blend']},
}, indent=2)+'\n')
print('eye v5e ok', json.dumps(record), flush=True)
