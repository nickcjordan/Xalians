"""Akinza tail ring v1: the lowest tail's root ring remeshed, so the ripple bands left in its vertex layout are gone.

A post-assembly recipe step (kind post, RECIPE.md section Post-assembly steps), appended after P-tailbase3. Coordinator,
2026-10-14: "remesh the lowest tail's root ring to remove the ripples". The ripples were not in the surface: tail base v2's
field is smooth along the root (its zero set rises evenly), but the vertices of tail v7's old collar, moved onto that surface
by projection, keep their banded spacing and print as shading bands. Here the skin's own surface is resampled as a level set
(openvdb, step spec grid.step), lightly blurred inside the ring (spec 'blur', sigma well under a millimetre, so the shape does
not change), the old faces inside the region (spec 'region': an ellipsoid with a fade) are removed, the level set is meshed
there and stitched to the old skin at the region's edge, with the seam relax and fold repair of tails_v6_post.py (copied
unchanged). Outside the region the skin's vertices and faces are the input's. Record: tailring-v1.json.
"""
import argparse
import json
import math
import sys
import time
from pathlib import Path

import bpy
import bmesh
import numpy as np
import openvdb as vdb
from mathutils import Vector
from mathutils.kdtree import KDTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, sha
import neck_v1_field as nf

T0 = time.time()


def tick(m):
    print(f'[{time.time()-T0:7.1f}s] {m}', flush=True)


p = argparse.ArgumentParser()
p.add_argument('--asm', type=Path, default=None)
p.add_argument('--out', type=Path, default=None)
p.add_argument('--dry', action='store_true')
p.add_argument('--blend', type=Path, default=None)
p.add_argument('--spec', type=Path, required=True)
p.add_argument('--dump', type=Path, default=None)
args = p.parse_args(sys.argv[sys.argv.index('--')+1:])
spec = json.loads(args.spec.read_text(encoding='utf-8'))
G = spec['grid']
STEP = float(G['step'])
I0 = np.round(np.array(G['lo'])/STEP).astype(int)
I1 = np.round(np.array(G['hi'])/STEP).astype(int)
SHAPE = tuple(int(v) for v in I1-I0+1)
LO = I0*STEP

bpy.ops.wm.open_mainfile(filepath=str(Path(args.blend if args.dry else args.out/'akinza.blend').resolve()))
skin = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
me = skin.data
nv0 = len(me.vertices)
co = np.empty(nv0*3)
me.vertices.foreach_get('co', co)
V0 = co.reshape(-1, 3).copy()
me.calc_loop_triangles()
tris = np.empty(len(me.loop_triangles)*3, np.int32)
me.loop_triangles.foreach_get('vertices', tris)
tris = tris.reshape(-1, 3)
tick(f'skin {nv0} vertices; grid {SHAPE}')

hw = int(math.ceil(G['band']/STEP))
ls = vdb.FloatGrid.createLevelSetFromPolygons(V0.astype(np.float32), triangles=tris.astype(np.uint32),
                                              transform=vdb.createLinearTransform(voxelSize=STEP), halfWidth=hw)
S = np.zeros(SHAPE, np.float32)
ls.copyToArray(S, ijk=tuple(int(v) for v in I0))
tick('S sampled')
X, Y, Z = nf.grid_coords(LO, STEP, SHAPE)


def ell(e):
    q = np.sqrt(((X-e['c'][0])/e['s'][0])**2+((Y-e['c'][1])/e['s'][1])**2+((Z-e['c'][2])/e['s'][2])**2)
    return nf.smootherstep((e['fade'][1]-q)/(e['fade'][1]-e['fade'][0])).astype(np.float32)


F1 = S.copy()
for bl in spec.get('blur', []):
    Fb = nf.gaussian_blur3(F1, bl['sigma']/STEP).astype(np.float32)
    F1 = (F1+ell(bl['mask'])*(Fb-F1)).astype(np.float32)
rg = spec['region']
w = ell(rg['mask'])
F = (S+w*(F1-S)).astype(np.float32)
tick('field composed')

# 3. region of the old skin: vertices with w > 0 (trilinear)
tw = nf.Trilinear(w, LO, STEP)
inside_grid = np.all((V0 > LO+2*STEP) & (V0 < LO+STEP*(np.array(SHAPE)-3)), axis=1)
wv = np.zeros(nv0)
wv[inside_grid] = tw(V0[inside_grid])
cut_v = wv > rg['cut']
tick(f'old vertices in the region: {int(cut_v.sum())}')

# 4. new surface in the region
Fm = F
grid = vdb.FloatGrid(.02)
grid.copyFromArray(Fm, ijk=tuple(int(v) for v in I0))
grid.transform = vdb.createLinearTransform(voxelSize=STEP)
pts, tri, quads = grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
pts = np.asarray(pts, float)
faces_new = [list(q) for q in np.asarray(quads)]+[list(t_) for t_ in np.asarray(tri)]
# keep the new faces whose vertices all lie in the region (beyond the cut)
wn = tw(pts)
keepf = [f for f in faces_new if all(wn[i] > rg['cut'] for i in f)]
tick(f'new surface: {len(pts)} points, {len(keepf)} faces kept of {len(faces_new)}')

# 5. assemble: old mesh minus region faces, plus the new faces; bridge the boundary loops
bm = bmesh.new()
bm.from_mesh(me)
bm.verts.ensure_lookup_table()
old_face_centres = np.array([f.calc_center_median()[:] for f in bm.faces])
old_face_mat = np.array([f.material_index for f in bm.faces])
kd = KDTree(len(old_face_centres))
for i, c in enumerate(old_face_centres):
    kd.insert(c, i)
kd.balance()
dead = [f for f in bm.faces if any(cut_v[v.index] for v in f.verts)]
bmesh.ops.delete(bm, geom=dead, context='FACES_ONLY')
loose = [v for v in bm.verts if not v.link_faces]
bmesh.ops.delete(bm, geom=loose, context='VERTS')
used = sorted({i for f in keepf for i in f})
remap = {}
for i in used:
    remap[i] = bm.verts.new(Vector(pts[i]))
newf = []
for f in keepf:
    vs = []
    for i in f:
        if remap[i] not in vs:
            vs.append(remap[i])
    if len(vs) < 3:
        continue
    try:
        nf_ = bm.faces.new(vs)
    except ValueError:
        continue
    _, idx, _ = kd.find(nf_.calc_center_median())
    nf_.material_index = int(old_face_mat[idx])
    newf.append(nf_)
bmesh.ops.recalc_face_normals(bm, faces=newf)


def components_of(faces):
    faces = set(faces)
    comps = []
    while faces:
        f0 = faces.pop()
        comp, stack = [f0], [f0]
        while stack:
            f = stack.pop()
            for e in f.edges:
                for g in e.link_faces:
                    if g in faces:
                        faces.remove(g)
                        comp.append(g)
                        stack.append(g)
        comps.append(comp)
    return sorted(comps, key=len, reverse=True)


newset = set(newf)
comps = components_of(newf)
islands = [f for c in comps[1:] if len(c) < int(spec.get('islandFaces', 300)) for f in c]
tick(f'new surface components {[len(c) for c in comps[:8]]}; removing {len(islands)} island faces')
bmesh.ops.delete(bm, geom=islands, context='FACES_ONLY')
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
allc = components_of(list(bm.faces))
if len(allc) > 2:
    small = [f for c in allc if len(c) < 300 for f in c]
    tick(f'removing {len(small)} faces of {sum(1 for c in allc if len(c) < 300)} small old islands')
    bmesh.ops.delete(bm, geom=small, context='FACES_ONLY')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
newverts = set(remap.values())
for _ in range(int(spec.get('pinchPasses', 6))):
    pin = [v for v in bm.verts if v.is_valid and sum(1 for e in v.link_edges if e.is_boundary) > 2]
    if not pin:
        break
    # faces at a pinch: only the new surface's (the old skin keeps its faces), and only those on the boundary
    kill = {f for v in pin for f in v.link_faces if all(u in newverts for u in f.verts) and any(e.is_boundary for e in f.edges)}
    if not kill:
        kill = {f for v in pin for f in v.link_faces if all(u in newverts for u in f.verts)}
    bmesh.ops.delete(bm, geom=list(kill), context='FACES_ONLY')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    comps2 = components_of(list(bm.faces))
    small2 = [f for c in comps2 if len(c) < int(spec.get('islandFaces', 300)) for f in c]
    if small2:
        bmesh.ops.delete(bm, geom=small2, context='FACES_ONLY')
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    tick(f'pinch pass: {len(pin)} pinched vertices')
newverts = {v for v in newverts if v.is_valid}


def boundary_loops():
    be = [e for e in bm.edges if e.is_boundary]
    adj = {}
    for e in be:
        a, b = e.verts
        adj.setdefault(a, []).append(b)
        adj.setdefault(b, []).append(a)
    seen, loops = set(), []
    for v0 in adj:
        if v0 in seen:
            continue
        loop, prev, cur = [v0], None, v0
        seen.add(v0)
        while True:
            nxt = [u for u in adj[cur] if u is not prev and (u not in seen or (u is v0 and len(loop) > 2))]
            if not nxt:
                break
            u = nxt[0]
            if u is v0:
                break
            loop.append(u)
            seen.add(u)
            prev, cur = cur, u
        loops.append(loop)
    return loops


loops = boundary_loops()
tick(f'boundary loops: {[(len(l), sum(v in newverts for v in l), np.array([v.co[:] for v in l]).mean(0).round(3).tolist(), np.array([v.co[:] for v in l]).min(0).round(3).tolist(), np.array([v.co[:] for v in l]).max(0).round(3).tolist()) for l in loops]}')
old_loops = [l for l in loops if not any(v in newverts for v in l)]
new_loops = [l for l in loops if all(v in newverts for v in l)]
zf = []
for nl in new_loops:
    P = np.array([v.co[:] for v in nl])
    best = min(old_loops, key=lambda ol: np.linalg.norm(np.array([v.co[:] for v in ol]).mean(0)-P.mean(0)))
    ol = best
    Q = np.array([v.co[:] for v in ol])
    c = Q.mean(0)
    nrm = np.cross(Q-c, np.roll(Q, -1, 0)-c).sum(0)
    nrm2 = np.cross(P-c, np.roll(P, -1, 0)-c).sum(0)
    if nrm@nrm2 < 0:
        nl = nl[::-1]
        P = P[::-1]
    _kd = KDTree(len(P))
    for _i, _p in enumerate(P):
        _kd.insert(_p, _i)
    _kd.balance()
    _dq = np.array([_kd.find(q)[2] for q in Q])
    _tS, _tF1 = nf.Trilinear(S, LO, STEP), nf.Trilinear(F, LO, STEP)
    tick(f'at old loop: |S| max {np.abs(_tS(Q)).max():.4f}, |F| median {np.median(np.abs(_tF1(Q))):.4f} max {np.abs(_tF1(Q)).max():.4f}, w median {np.median(tw(Q)):.3f}; at new loop: |S| median {np.median(np.abs(_tS(P))):.4f}, w median {np.median(tw(P)):.3f}')
    tick(f'loop gap: old-to-new boundary distance max {_dq.max():.4f} at {Q[_dq.argmax()].round(3).tolist()}, 95th {np.percentile(_dq, 95):.4f}')
    k0 = int(np.argmin(np.linalg.norm(P-Q[0], axis=1)))
    nl = nl[k0:]+nl[:k0]
    P = np.array([v.co[:] for v in nl])
    A, Bl = ol+[ol[0]], nl+[nl[0]]
    PA, PB = np.vstack([Q, Q[:1]]), np.vstack([P, P[:1]])
    tA = np.r_[0, np.cumsum(np.linalg.norm(np.diff(PA, axis=0), axis=1))]
    tA /= tA[-1]
    tB = np.r_[0, np.cumsum(np.linalg.norm(np.diff(PB, axis=0), axis=1))]
    tB /= tB[-1]
    i = j = 0
    while i < len(ol) or j < len(nl):
        if i >= len(ol):
            adv_a = False
        elif j >= len(nl):
            adv_a = True
        else:
            adv_a = np.linalg.norm(PA[i+1]-PB[j]) < np.linalg.norm(PB[j+1]-PA[i])
        if adv_a:
            tri_ = [A[i], A[i+1], Bl[j]]
            i += 1
        else:
            tri_ = [A[i], Bl[j+1], Bl[j]]
            j += 1
        if len({id(x) for x in tri_}) == 3:
            try:
                zf.append(bm.faces.new(tri_))
            except ValueError:
                pass
    tick(f'zipped old loop {len(ol)} with new loop {len(nl)}')
for f in zf:
    _, idx, _ = kd.find(f.calc_center_median())
    f.material_index = int(old_face_mat[idx])
# relax the seam: new vertices within a few rings of the zipper are averaged with their neighbours (old vertices stay put)
sm = spec.get('seamRelax', {})
if sm.get('iterations', 0) and zf:
    ring = {v for f in zf for v in f.verts}
    for _ in range(int(sm.get('rings', 3))):
        ring |= {u for v in ring for e in v.link_edges for u in e.verts}
    # old vertices may move too when they lie inside the region's fade band (w > 0), where the new field equals the old
    # surface; every relaxed vertex is projected back onto the field, so the seam lies on the surface
    def wpos(v):
        q = np.array([v.co[:]])
        return float(tw(q)[0]) if np.all((q > LO+2*STEP) & (q < LO+STEP*(np.array(SHAPE)-3))) else 0.0
    movable = [v for v in ring if v in newverts or wpos(v) > 0]
    tF = nf.Trilinear(F, LO, STEP)
    gF = [nf.Trilinear(g, LO, STEP) for g in np.gradient(F, STEP)]
    for _ in range(int(sm['iterations'])):
        newco = {}
        for v in movable:
            nb = [e.other_vert(v).co for e in v.link_edges]
            if nb:
                avg = sum(nb, Vector())/len(nb)
                newco[v] = v.co.lerp(avg, .5)
        if not newco:
            break
        vs = list(newco)
        P = np.array([newco[v][:] for v in vs])
        for _k in range(6):
            e_ = tF(P)
            g_ = np.stack([f(P) for f in gF], 1)
            P = P-(e_/np.maximum((g_*g_).sum(1), 1e-8))[:, None]*g_
        for v, c in zip(vs, P):
            v.co = Vector(c)
    tick(f'seam relax: {len(movable)} new vertices')
# fold repair: vertices of faces folded against their neighbours (zipper ladders) are smoothed and projected onto the field
fr = spec.get('foldRepair', {})
if fr.get('passes', 0):
    tF2 = nf.Trilinear(F, LO, STEP)
    gF2 = [nf.Trilinear(g, LO, STEP) for g in np.gradient(F, STEP)]
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    region_faces = [f for f in bm.faces if any(v in newverts for v in f.verts)]
    for _p in range(int(fr['passes'])):
        bad = []
        for f in region_faces:
            if not f.is_valid:
                continue
            n = f.normal
            vn = sum((v.normal for v in f.verts), Vector())
            if vn.length > 0 and n.dot(vn.normalized()) < float(fr.get('threshold', .3)):
                bad.append(f)
        if not bad:
            break
        vs = {v for f in bad for v in f.verts}
        for _r in range(int(fr.get('rings', 2))):
            vs |= {u for v in vs for e in v.link_edges for u in e.verts}
        vs = list(vs)
        for _it in range(int(fr.get('iterations', 6))):
            P = np.array([(sum((e.other_vert(v).co for e in v.link_edges), Vector())/max(len(v.link_edges), 1))[:] for v in vs])
            P = .5*P+.5*np.array([v.co[:] for v in vs])
            for _k in range(6):
                e_ = tF2(P)
                g_ = np.stack([f_(P) for f_ in gF2], 1)
                P = P-(e_/np.maximum((g_*g_).sum(1), 1e-8))[:, None]*g_
            for v, c in zip(vs, P):
                v.co = Vector(c)
        bm.normal_update()
        tick(f'fold repair pass {_p}: {len(bad)} folded faces, {len(vs)} vertices smoothed')
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
left = sum(1 for e in bm.edges if e.is_boundary)
bridged = zf
zip_centres = np.array([f.calc_center_median()[:] for f in zf if f.is_valid]) if zf else np.zeros((0, 3))
tick(f'zipped {len(zf)} faces; boundary edges left {left}')
bm.to_mesh(me)
bm.free()
me.update()

# 6. records
co = np.empty(len(me.vertices)*3)
me.vertices.foreach_get('co', co)
V1 = co.reshape(-1, 3)
from mathutils.bvhtree import BVHTree
bvh_old = BVHTree.FromPolygons([Vector(v) for v in V0], tris.tolist(), all_triangles=True)
alive_face = ~cut_v[tris].any(1)
kept_old = np.zeros(nv0, bool)
kept_old[np.unique(tris[alive_face])] = True
nk = int(kept_old.sum())
newpart = V1[nk:]
dnew = np.array([bvh_old.find_nearest(Vector(v))[3] for v in newpart])
st = mesh_stats(skin)
stats = {'skinVerticesBefore': int(nv0), 'skinVerticesAfter': int(len(V1)), 'oldVerticesKept': nk, 'oldVerticesRemoved': int(cut_v.sum()),
         'removedBounds': [V0[cut_v].min(0).round(4).tolist(), V0[cut_v].max(0).round(4).tolist()],
         'newVertices': int(len(newpart)), 'newSurfaceDistanceToOldMax': float(dnew.max()), 'newSurfaceDistanceToOldMedian': float(np.median(dnew)),
         'keptVerticesMovedMax': float(np.abs(V1[:nk]-V0[kept_old]).max()), 'boundaryEdgesLeft': left}
tick(json.dumps(stats))
if args.dump:
    me.calc_loop_triangles()
    t2 = np.empty(len(me.loop_triangles)*3, np.int32)
    me.loop_triangles.foreach_get('vertices', t2)
    np.savez_compressed(args.dump, before=V0, before_tris=tris, after=V1, after_tris=t2.reshape(-1, 3), kept=kept_old, newdist=dnew)
if st['components'] != 1 or st['nonManifoldEdges'] != 0:
    raise SystemExit(f'skin is not one closed component: {st}')
if args.dry:
    tick('dry run: nothing saved')
    raise SystemExit(0)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(args.out/'akinza.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'akinza.blend'))
asm_record = json.loads((args.out/'assembly.json').read_text(encoding='utf-8'))
asm_record['objects'][skin.name] = {'components': st['components'], 'nonManifoldEdges': st['nonManifoldEdges'], 'vertices': st['vertices']}
asm_record['outputs'] = {q.name: sha(q) for q in args.out.iterdir() if q.suffix in ['.glb', '.blend']}
(args.out/'assembly.json').write_text(json.dumps(asm_record, indent=1)+'\n', encoding='utf-8')
record = {'approval': None, 'step': 'tail ring v1 (post-assembly)', 'input': str(args.asm), 'spec': spec, 'specSha256': sha(args.spec),
          'scriptSha256': sha(Path(__file__)), 'stats': stats, 'skinAfter': st, 'seconds': round(time.time()-T0, 1), 'outputs': asm_record['outputs']}
(args.out/'tailring-v1.json').write_text(json.dumps(record, indent=1, default=float)+'\n', encoding='utf-8')
tick(f'done {st}')
