"""Outer eye corner v5t2 (Nick 2026-10-11): the v5t head with the buried outer tip of each eye globe trimmed and the skin
over where it was refit, so the lid end rounds onto the side of the head with no shadow pocket.

Run with Blender (through loop_tools.py blender or a recipe step), on the v5t head (H46 output):
  --python corner_v5t2_field.py -- --scene <head.blend> --out <new-dir> --spec <spec json>

v5t filled what was concave beside each outer corner, but the shadow stayed: the eye globe's outer tip runs back under
the skin toward the side of the head, the skin rides on it, and the lid end slopes down into a corner about .05 behind
the lids. This step works in two parts, both in place (no remesh, same vertices) and only round the outer corners.

1. Globe trim (`trim`): globe vertices that are covered by skin (a ray along the vertex normal meets skin within
   `coverRay`) move toward the globe's centroid by `trim.depth` times a weight that is 0 within `trim.fromExposed[0]`
   of any exposed (uncovered) globe vertex, full beyond `[1]`, and only on the outer side (`trim.outerX`: by |x| beyond
   the eye centre). The visible white, iris and dark outline do not move; only the hidden tip shrinks back.
2. Skin refit: per eye, in the plane of its opening (as eye_v5e_field.py), the skin depth along the eye axis is refit as
   a thin plate inside an ellipse round the outer corner of the opening (`corner`: offset of the ellipse centre outward of
   the corner, radii, C2 fade), held elsewhere, so the valley between the lid ends fills with the smoothest surface the
   lids and head side allow. Near the opening the skin is held within `hold` of it in the plane; with `cornerHold` the
   hold is relaxed to that inside the corner ellipse (the skin there may cover a sliver of the globe's outer end). No
   skin vertex is left within `globeClear` of the trimmed globe; ears and everything beyond |x| `maxX` are not moved.

With `close` {iters, cap, blur} the plate is replaced by an upper closing of the depth in the same frame (each cell
raised to its neighbours' blur when it lies below it, repeated), capped, masked by the free weight and smoothed: the
saddle where the lid ends dip into the deep outer corner fills toward the lids' level instead of staying as it is.

Writes head.blend, shape.glb, corner-v5t2.json.
"""
import argparse
import json
from pathlib import Path
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, require_single_closed_mesh, sha
from study_provenance import snapshot

DEFAULTS = {
    'trim': {'depth': .03, 'fromExposed': [.008, .025], 'outerX': [.03, .08], 'coverRay': .04},
    'step': .0025, 'half': .26, 'corner': {'offset': .012, 'radii': [.05, .075], 'blend': [.55, 1.]},
    'hold': [.004, .010], 'cornerHold': None, 'pinData': 50., 'coreData': .002, 'alpha': 4.,
    'frontSheet': [.004, .012], 'globeClear': .001, 'maxX': [.35, .365], 'iters': 20000,
}

argv = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--spec', type=Path, required=True)
args = parser.parse_args(argv)
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene, args.spec])
P = json.loads(json.dumps(DEFAULTS))
for k, v in json.loads(args.spec.read_text()).items():
    if k == 'note':
        continue
    if isinstance(v, dict) and isinstance(P.get(k), dict):
        P[k].update(v)
    else:
        P[k] = v


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


bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
head = max(meshes, key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before corner v5t2')
before = mesh_stats(head)
pts = world_points(head)
head.data.calc_loop_triangles()
tris = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
head.data.loop_triangles.foreach_get('vertices', tris)
skin_tree = BVHTree.FromPolygons(pts.tolist(), tris.reshape(-1, 3).tolist())
new = pts.copy()
record = {'eyes': {}}

for side in ('-1', '1'):
    globe = bpy.data.objects[f'eye_globe_{side}']
    G = world_points(globe)
    gpoly = [tuple(p.vertices) for p in globe.data.polygons]
    gtree0 = BVHTree.FromPolygons(G.tolist(), gpoly)
    gn = np.empty(len(G)*3)
    globe.data.vertices.foreach_get('normal', gn)
    gn = gn.reshape(-1, 3)@np.array(globe.matrix_world)[:3, :3].T
    gn /= np.linalg.norm(gn, axis=1, keepdims=True)+1e-12
    gc = G.mean(0)
    # ---- 1. trim the buried outer tip
    T = P['trim']
    covered = np.array([skin_tree.ray_cast(Vector(G[k]+gn[k]*.0005), Vector(gn[k]), T['coverRay'])[0] is not None
                        for k in range(len(G))])
    exposed = np.where(~covered)[0]
    kd = KDTree(len(exposed))
    for i_, k in enumerate(exposed):
        kd.insert(Vector(G[k]), i_)
    kd.balance()
    dE = np.array([kd.find(Vector(G[k]))[2] for k in range(len(G))])
    outer = ss2(np.abs(G[:, 0])-abs(gc[0]), *T['outerX'])
    wt = np.where(covered, ss2(dE, *T['fromExposed']), 0.)*outer
    toward = gc-G
    toward /= np.linalg.norm(toward, axis=1, keepdims=True)+1e-12
    G2 = G+(T['depth']*wt)[:, None]*toward
    set_world(globe, G2)
    gtree = BVHTree.FromPolygons(G2.tolist(), gpoly)
    # ---- 2. skin refit in the opening's frame
    box = (pts > G.min(0)-.03).all(1) & (pts < G.max(0)+.03).all(1)
    cand_ = np.where(box)[0]
    dcand = np.array([gtree0.find_nearest(Vector(p_))[3] for p_ in pts[cand_]])
    ring = pts[cand_[dcand < .003]]
    c = ring.mean(0)
    _, _, vt = np.linalg.svd(ring-c, full_matrices=False)
    n = vt[2] if vt[2][1] < 0 else -vt[2]
    a = np.cross([0., 0., 1.], n)
    a /= np.linalg.norm(a)
    b = np.cross(n, a)
    g = np.arange(-P['half'], P['half']+1e-9, P['step'])
    N = len(g)
    H0 = np.full((N, N), np.nan)
    Opn = np.zeros((N, N), bool)
    far = 1.
    for i, u in enumerate(g):
        for j, v in enumerate(g):
            o_ = c+u*a+v*b+far*n
            hs = skin_tree.ray_cast(Vector(o_), Vector(-n), 2*far)
            if hs[0] is None:
                continue
            hg = gtree0.ray_cast(Vector(o_), Vector(-n), 2*far)
            if hg[0] is not None and hg[3] < hs[3]-1e-5:
                Opn[i, j] = True
                continue
            H0[i, j] = float(np.dot(np.array(hs[0])-c, n))
    valid = np.isfinite(H0)
    GU, GV = np.meshgrid(g, g, indexing='ij')
    outward = np.sign(a[0]*np.sign(c[0]))   # +1 when u grows toward the side of the head
    oi, oj = np.nonzero(Opn)
    ou = GU[oi, oj]*outward
    k_c = np.argmax(ou)
    cu, cv = GU[oi[k_c], oj[k_c]], GV[oi[k_c], oj[k_c]]
    C = P['corner']
    eu = cu+outward*C['offset']
    qc = np.sqrt(((GU-eu)/C['radii'][0])**2+((GV-cv)/C['radii'][1])**2)
    free = 1-ss2(qc, *C['blend'])
    edge = np.zeros_like(Opn)
    edge[1:-1, 1:-1] = Opn[1:-1, 1:-1] & ~(Opn[2:, 1:-1] & Opn[:-2, 1:-1] & Opn[1:-1, 2:] & Opn[1:-1, :-2])
    ei, ej = np.nonzero(edge)
    dO = np.full((N, N), 9.)
    for k0 in range(0, len(ei), 200):
        du = GU[..., None]-g[ei[k0:k0+200]][None, None, :]
        dv = GV[..., None]-g[ej[k0:k0+200]][None, None, :]
        dO = np.minimum(dO, np.sqrt(du*du+dv*dv).min(2))
    dO[Opn] = 0.
    hold = ss2(dO, *P['hold'])
    if P['cornerHold']:
        hold = hold+(ss2(dO, *P['cornerHold'])-hold)*free
    fw = np.where(valid, free*hold, 0.)
    wd = np.where(valid, P['pinData']-(P['pinData']-P['coreData'])*fw, 0.)
    h0 = np.where(valid, H0, np.nanmean(H0))

    def lap(z):
        zp = np.pad(z, 1, mode='edge')
        return zp[2:, 1:-1]+zp[:-2, 1:-1]+zp[1:-1, 2:]+zp[1:-1, :-2]-4*z

    def A(z):
        return wd*z+P['alpha']*lap(lap(z))
    u_ = h0.copy()
    r = wd*h0-A(u_)
    pdir = r.copy()
    rs = rs0 = (r*r).sum()
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
    if P.get('close'):   # upper closing in the eye frame: raise every spot that lies below its neighbours' blur
        CL = P['close']

        def blur(hh_, m_):
            hp = np.pad(np.where(m_, hh_, 0.), 1)
            mp = np.pad(m_.astype(float), 1)
            s_ = sum(hp[1+di:hp.shape[0]-1+di, 1+dj:hp.shape[1]-1+dj] for di in (-1, 0, 1) for dj in (-1, 0, 1))
            c_ = sum(mp[1+di:mp.shape[0]-1+di, 1+dj:mp.shape[1]-1+dj] for di in (-1, 0, 1) for dj in (-1, 0, 1))
            return np.where(c_ > 0, s_/np.maximum(c_, 1e-9), hh_)
        hcl = np.where(valid, H0, -9.)
        for _ in range(CL['iters']):
            hcl = np.where(valid, np.maximum(hcl, blur(hcl, valid)), hcl)
        rise = np.where(valid, np.minimum(hcl-H0, CL['cap']), 0.)*fw
        for _ in range(CL['blur']):
            rise = blur(rise, valid)
        dH = rise
    rel = pts-c
    pu, pv, pn = rel@a, rel@b, rel@n
    sel = np.where((np.abs(pu) < P['half']-2*P['step']) & (np.abs(pv) < P['half']-2*P['step']) & (pn > -.25))[0]
    fu = (pu[sel]+P['half'])/P['step']
    fv = (pv[sel]+P['half'])/P['step']
    i0 = np.clip(np.floor(fu).astype(int), 0, N-2)
    j0 = np.clip(np.floor(fv).astype(int), 0, N-2)
    tu, tv = fu-i0, fv-j0

    def bspl(t):
        return [(1-t)**3/6, (3*t**3-6*t**2+4)/6, (-3*t**3+3*t**2+3*t+1)/6, t**3/6]
    wu, wv = bspl(tu), bspl(tv)
    dd = np.zeros(len(sel))
    ww = np.zeros(len(sel))
    hh = np.zeros(len(sel))
    vs = np.zeros(len(sel))
    Hf = np.where(valid, H0, 0.)
    for p in range(4):
        ip = np.clip(i0-1+p, 0, N-1)
        for q in range(4):
            jq = np.clip(j0-1+q, 0, N-1)
            w4 = wu[p]*wv[q]
            dd += w4*dH[ip, jq]
            ww += w4*fw[ip, jq]
            hh += w4*Hf[ip, jq]*valid[ip, jq]
            vs += w4*valid[ip, jq]
    hs_ = np.where(vs > .5, hh/np.maximum(vs, 1e-9), np.nan)
    front = np.where(np.isfinite(hs_), 1-ss2(np.abs(pn[sel]-np.nan_to_num(hs_, nan=9.)), *P['frontSheet']), 0.)
    lim = 1-ss2(np.abs(pts[sel, 0]), *P['maxX'])
    move = dd*np.clip(ww, 0, 1)*front*lim
    trial = pts[sel]+move[:, None]*n[None, :]
    near_ = np.where(move != 0)[0]
    dn_ = np.array([gtree.find_nearest(Vector(p_))[3] for p_ in trial[near_]]) if len(near_) else np.zeros(0)
    # a vertex that would come closer than globeClear to the (trimmed) globe keeps its old place
    d_old = np.array([gtree.find_nearest(Vector(p_))[3] for p_ in pts[sel][near_]]) if len(near_) else np.zeros(0)
    bad = near_[(dn_ < P['globeClear']) & (dn_ < d_old)]
    move[bad] = 0.
    new[sel] += move[:, None]*n[None, :]
    probes = []
    for pp in P.get('probe', []):
        pw_ = np.array(pp, float)*[np.sign(c[0]), 1., 1.]
        rr_ = pw_-c
        iu = int(round((rr_@a+P['half'])/P['step'])); iv = int(round((rr_@b+P['half'])/P['step']))
        k_ = np.argmin(np.linalg.norm(pts[sel]-pw_, axis=1))
        probes.append({'p': pw_.round(3).tolist(), 'cell': [iu, iv], 'valid': bool(valid[iu, iv]), 'H0': float(np.nan_to_num(H0[iu, iv])),
                       'h0n': float(rr_@n), 'dH': float(dH[iu, iv]), 'fw': float(fw[iu, iv]), 'dO': float(dO[iu, iv]),
                       'free': float(free[iu, iv]), 'vertFront': float(front[k_]), 'vertMove': float(move[k_]), 'vertDist': float(np.linalg.norm(pts[sel][k_]-pw_))})
    record['eyes'][side+'_probes'] = probes
    record['eyes'][side] = {'globeCovered': int(covered.sum()), 'globeTrimmed': int((wt > 0).sum()),
                            'globeMaxTrim': round(float((T['depth']*wt).max()), 4),
                            'corner': [round(float(cu), 4), round(float(cv), 4)], 'outward': float(outward),
                            'iterations': it+1, 'skinMoved': int((move != 0).sum()), 'heldOffGlobe': int(len(bad)),
                            'maxMove': round(float(np.abs(move).max()), 5), 'maxCellChange': round(float(np.abs(dH).max()), 5)}

set_world(head, new)
disp = np.linalg.norm(new-pts, axis=1)
record['displacement'] = {'moved': int((disp > 0).sum()), 'max': float(disp.max())}
require_single_closed_mesh(head, args.out, 'Head skin corner v5t2')
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'corner-v5t2.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Outer eye corner v5t2 (Nick 2026-10-11): buried outer globe tips trimmed back, the skin over them refit as a '
             'thin plate round each outer corner in place; visible eye, iris and outline unchanged',
    'parameters': P, 'parts': record, 'skinBefore': before, 'skinAfter': mesh_stats(head),
    'outputs': {q.name: sha(q) for q in args.out.iterdir() if q.suffix in ['.glb', '.blend']},
}, indent=2)+'\n')
print('corner v5t2 ok', json.dumps(record), flush=True)
