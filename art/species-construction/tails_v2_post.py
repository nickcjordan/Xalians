"""Akinza tails v2: tails v1 (round tapering cores from separate roots) grown from an authored rump and sacrum.

As tails_v1_post.py (in place of P-tails1, after P-hips1), plus spec 'masses': authored ellipsoids (a sacrum under the roots,
the backs of the buttocks) joined to the carved body with a C2 smooth minimum, so the rump behind the hips is a defined, rounded
surface instead of what the carve leaves; and 'keepY': below that y band (the underside between the legs) the field is the old
one, which keeps the stitched seam off the crotch. The v1 description follows.

v1:

A post-assembly recipe step (kind post, RECIPE.md section Post-assembly steps), after P-hips1. The tails were built in B-14 as
three round sweeps (tail-controls-stack-b.json) whose radius swells to .09 to .11 at mid length and whose roots meet in one
point on the rump, so they fuse into a shared stem and read as broad crescent blades. Here the tails are rebuilt on the same
centrelines (count, length, fan, curl and direction kept) with a tapering round section, from three separate roots.

Because slimmer tails separate where the old ones were fused into each other, the surface's topology changes, so this step
remeshes its region: the region's old faces are removed, the new field is meshed there (openvdb), and the two boundary loops
are bridged. Outside the region the skin's vertices and faces are the input's, untouched.

Run by recipe.py (the stage has already copied akinza.glb, akinza.blend and assembly.json from the input assembly into --out):
  blender -b --factory-startup --python tails_v1_post.py -- --asm <assembly dir> --out <new assembly dir> --spec specs/tails-v1.json

Field (world units): S, the input skin's signed distance (openvdb level set); T_old, the round sweep distance of the old
controls; T_new, the new sweeps (spec 'tails': per tail control points and a radius profile), smooth-unioned with each other;
B = max(S, carve), the body with the old tails carved out behind the rump; F1 = smin(B, T_new, kRoot) then masked blurs at the
roots; F = S + w (F1 - S) with w the region (near the old or new tails, behind the rump).
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
p.add_argument('--asm', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
p.add_argument('--spec', type=Path, required=True)
p.add_argument('--s-cache', type=Path, default=None)
p.add_argument('--dump', type=Path, default=None)
args = p.parse_args(sys.argv[sys.argv.index('--')+1:])
spec = json.loads(args.spec.read_text(encoding='utf-8'))
G = spec['grid']
STEP = float(G['step'])
I0 = np.round(np.array(G['lo'])/STEP).astype(int)
I1 = np.round(np.array(G['hi'])/STEP).astype(int)
SHAPE = tuple(int(v) for v in I1-I0+1)
LO = I0*STEP

bpy.ops.wm.open_mainfile(filepath=str((args.out/'akinza.blend').resolve()))
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

# 1. S from a level set
key = {'lo': LO.tolist(), 'step': STEP, 'shape': list(SHAPE), 'band': G['band'], 'input': sha(args.out/'akinza.glb')}
S = None
if args.s_cache and args.s_cache.is_file():
    z = np.load(args.s_cache)
    if json.loads(str(z['key'])) == key:
        S = z['S']
        tick('S from cache')
if S is None:
    hw = int(math.ceil(G['band']/STEP))
    ls = vdb.FloatGrid.createLevelSetFromPolygons(V0.astype(np.float32), triangles=tris.astype(np.uint32),
                                                  transform=vdb.createLinearTransform(voxelSize=STEP), halfWidth=hw)
    S = np.zeros(SHAPE, np.float32)
    ls.copyToArray(S, ijk=tuple(int(v) for v in I0))
    tick('S sampled')
    if args.s_cache:
        np.savez_compressed(args.s_cache, S=S, key=json.dumps(key))
S = S.astype(np.float32)
xs = LO[0]+STEP*np.arange(SHAPE[0])
ys = LO[1]+STEP*np.arange(SHAPE[1])
zs = LO[2]+STEP*np.arange(SHAPE[2])


# 2. sweeps
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


def sweep(samples, reach=.06):
    """Round-cone distance to a sampled sweep [x, y, z, r], on the grid, per segment box."""
    out = np.full(SHAPE, reach, np.float32)
    for a, b in zip(samples[:-1], samples[1:]):
        ra, rb = max(a[3], .0008), max(b[3], .0008)
        lo = np.minimum(a[:3], b[:3])-max(ra, rb)-reach
        hi = np.maximum(a[:3], b[:3])+max(ra, rb)+reach
        sl = []
        for k, arr in enumerate((xs, ys, zs)):
            i0 = max(int(np.searchsorted(arr, lo[k])), 0)
            i1 = min(int(np.searchsorted(arr, hi[k])), SHAPE[k])
            sl.append(slice(i0, i1))
        if any(s.stop <= s.start for s in sl):
            continue
        X, Y, Z = np.meshgrid(xs[sl[0]], ys[sl[1]], zs[sl[2]], indexing='ij')
        ba = b[:3]-a[:3]
        L2 = float(ba@ba)
        h = np.clip(((X-a[0])*ba[0]+(Y-a[1])*ba[1]+(Z-a[2])*ba[2])/L2, 0, 1)
        d = np.sqrt((X-a[0]-ba[0]*h)**2+(Y-a[1]-ba[1]*h)**2+(Z-a[2]-ba[2]*h)**2)-(ra+(rb-ra)*h)
        out[tuple(sl)] = np.minimum(out[tuple(sl)], d.astype(np.float32))
    return out


old_controls = json.loads((Path(__file__).resolve().parents[2]/spec['oldControls']).read_text())['tailControls']
T_old = np.full(SHAPE, .06, np.float32)
for c in old_controls:
    cc = np.array(c, float)
    T_old = np.minimum(T_old, sweep(catmull(np.c_[cc[:, :3], np.maximum(cc[:, 3], cc[:, 4])])))
tick('T_old')

new_tails = []
T_new = None
for t in spec['tails']:
    P = np.array(t['points'], float)
    smp = catmull(np.c_[P, np.zeros(len(P))], 16)[:, :3]
    s = np.r_[0, np.cumsum(np.linalg.norm(np.diff(smp, axis=0), axis=1))]
    u = s/s[-1]
    pr = t['radius']
    r = pr['root']*np.interp(u, pr['u'], pr['scale'])
    smp = np.c_[smp, r]
    new_tails.append({'samples': smp.round(4).tolist(), 'length': float(s[-1])})
    Ti = sweep(smp)
    T_new = Ti if T_new is None else nf.smin3(T_new, Ti, spec['tailUnionK'])
tick('T_new')

X, Y, Z = np.meshgrid(xs, ys, zs, indexing='ij')
cv = spec['carve']
wy = nf.smootherstep((Y-cv['y'][0])/(cv['y'][1]-cv['y'][0]))
carve = (wy*(cv['margin']-T_old)+(1-wy)*(-1.0)).astype(np.float32)
B = (-nf.smin3(-S, -carve, cv['k'])).astype(np.float32) if cv.get('k') else np.maximum(S, carve)
for m in spec.get('masses', []):
    e = np.sqrt(((np.abs(X) if m.get('mirror') else X)-m['c'][0])**2/m['s'][0]**2+(Y-m['c'][1])**2/m['s'][1]**2+(Z-m['c'][2])**2/m['s'][2]**2)
    B = nf.smin3(B, ((e-1)*min(m['s'])).astype(np.float32), m['k']).astype(np.float32)
F1 = nf.smin3(B, T_new, spec['rootK']).astype(np.float32)
for st in spec.get('blur', []):
    Fb = nf.gaussian_blur3(F1, st['sigma']/STEP).astype(np.float32)
    wb = np.zeros(SHAPE, np.float32)
    for e in st['mask']:
        q = np.sqrt(((X-e['c'][0])/e['s'][0])**2+((Y-e['c'][1])/e['s'][1])**2+((Z-e['c'][2])/e['s'][2])**2)
        wb = np.maximum(wb, nf.smootherstep((e['fade'][1]-q)/(e['fade'][1]-e['fade'][0])))
    F1 = F1+wb*(Fb-F1)
if spec.get('keepY'):
    ky = spec['keepY']
    wky = nf.smootherstep((Y-ky[0])/(ky[1]-ky[0])).astype(np.float32)
    F1 = (S+wky*(F1-S)).astype(np.float32)
rg = spec['region']
# the region is wherever the composed field differs from the old one, grown by a fade band in which the two agree, so the
# region's edge (where the old and new meshes are stitched) lies on the old surface exactly
changed = ((np.abs(F1-S) > rg['tol'])&(np.minimum(np.abs(F1), np.abs(S)) < rg['nearSurface'])).astype(np.float32)
grown = nf.gaussian_blur3(changed, rg['grow']/STEP).astype(np.float32)
w = np.maximum(changed, np.clip(grown*rg['gain'], 0, 1)).astype(np.float32)
F = (S+w*(F1-S)).astype(np.float32)
del X, Y, Z
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
         'newVertices': int(len(newpart)), 'newSurfaceDistanceToOldMax': float(dnew.max()), 'newSurfaceDistanceToOldMedian': float(np.median(dnew)),
         'keptVerticesMovedMax': float(np.abs(V1[:nk]-V0[kept_old]).max()), 'boundaryEdgesLeft': left}
tick(json.dumps(stats))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(args.out/'akinza.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'akinza.blend'))
asm_record = json.loads((args.out/'assembly.json').read_text(encoding='utf-8'))
asm_record['objects'][skin.name] = {'components': st['components'], 'nonManifoldEdges': st['nonManifoldEdges'], 'vertices': st['vertices']}
asm_record['outputs'] = {q.name: sha(q) for q in args.out.iterdir() if q.suffix in ['.glb', '.blend']}
(args.out/'assembly.json').write_text(json.dumps(asm_record, indent=1)+'\n', encoding='utf-8')
record = {'approval': None, 'step': 'tails v2 (post-assembly)', 'input': str(args.asm), 'spec': spec, 'specSha256': sha(args.spec),
          'scriptSha256': sha(Path(__file__)), 'stats': stats, 'skinAfter': st, 'newTails': new_tails,
          'seconds': round(time.time()-T0, 1), 'outputs': asm_record['outputs']}
(args.out/'tails-v2.json').write_text(json.dumps(record, indent=1, default=float)+'\n', encoding='utf-8')
if args.dump:
    me.calc_loop_triangles()
    t2 = np.empty(len(me.loop_triangles)*3, np.int32)
    me.loop_triangles.foreach_get('vertices', t2)
    np.savez_compressed(args.dump, before=V0, before_tris=tris, after=V1, after_tris=t2.reshape(-1, 3), kept=kept_old, newdist=dnew, zip_centres=zip_centres)
tick(f'done {st}')
if st['components'] != 1 or st['nonManifoldEdges'] != 0:
    raise SystemExit(f'skin is not one closed component: {st}')
