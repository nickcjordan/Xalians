"""B-yqgg: weld the approved pass 8 paws (B-pzrq) onto the approved sculpt (luceras-hindpaw pass1).

Usage: blender -b --factory-startup --python pawint_sculpt.py -- OUT_DIR
Opens the base sculpt read only, cuts each old paw off below its join plane with the same bisect the pass 8 preview used
(paw_part_blend.cut_body, join planes from pass8/work/u3/paws.npz), appends the four paw parts and sixteen claws from
pass8/paws.blend, deletes each part's cap face, joins it into the body and merges the ring vertices by distance.
The new claws take the old claw names (matched by nearest old claw) and the old claws' bone parenting; the dewclaws stay.
Vertex groups the base body carried are filled on the new paw vertices by nearest surface interpolation.
Writes OUT_DIR/luceras_sculpt.blend and OUT_DIR/work/sculpt_map.npz + sculpt_checks.json. Inputs are never saved over.
"""
import bpy, bmesh, sys, os, json, hashlib, numpy as np
from mathutils import Vector, Matrix
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree

OUT = sys.argv[sys.argv.index('--') + 1]
CS = '/mnt/c/dev/art-data/pipeline/codex-stream'
BASE = f'{CS}/luceras-hindpaw/pass1/luceras_sculpt.blend'
PAWS = f'{CS}/luceras-pawpart/pass8/paws.blend'
PREVIEW = f'{CS}/luceras-pawpart/pass8/luceras_pawpart_preview.blend'
NPZ = f'{CS}/luceras-pawpart/pass8/work/u3/paws.npz'
os.makedirs(OUT + '/work', exist_ok=True)
D = {k: v for k, v in np.load(NPZ).items() if k.endswith(('_cut', '_axis'))}


def topo_hash(m):
    h = hashlib.sha256()
    for coll, prop, dt in [(m.loops, 'vertex_index', np.int32), (m.polygons, 'loop_start', np.int32), (m.polygons, 'loop_total', np.int32)]:
        a = np.empty(len(coll), dt); coll.foreach_get(prop, a); h.update(a.tobytes())
    return h.hexdigest()


def geom_hash(m):
    h = hashlib.sha256(); a = np.empty(len(m.vertices) * 3, np.float32); m.vertices.foreach_get('co', a); h.update(a.tobytes()); return h.hexdigest()


def world_co(o):
    a = np.empty(len(o.data.vertices) * 3); o.data.vertices.foreach_get('co', a); a = a.reshape(-1, 3)
    W = np.array(o.matrix_world); return a @ W[:3, :3].T + W[:3, 3]


def mesh_checks(o):
    o.data.update()
    bm = bmesh.new(); bm.from_mesh(o.data)
    nm = sum(1 for e in bm.edges if not e.is_manifold); bnd = sum(1 for e in bm.edges if e.is_boundary)
    nmv = sum(1 for v in bm.verts if not v.is_manifold)
    seen = set(); shells = 0
    for v0 in bm.verts:
        if v0.index in seen: continue
        shells += 1; stack = [v0]; seen.add(v0.index)
        while stack:
            v = stack.pop()
            for e in v.link_edges:
                w = e.other_vert(v)
                if w.index not in seen: seen.add(w.index); stack.append(w)
    r = dict(verts=len(bm.verts), edges=len(bm.edges), faces=len(bm.faces), nonmanifold_edges=nm, boundary_edges=bnd,
             nonmanifold_verts=nmv, shells=shells, euler=len(bm.verts) - len(bm.edges) + len(bm.faces),
             tris=sum(1 for f in bm.faces if len(f.verts) == 3), quads=sum(1 for f in bm.faces if len(f.verts) == 4),
             ngons=sum(1 for f in bm.faces if len(f.verts) > 4), zero_area_faces=sum(1 for f in bm.faces if f.calc_area() < 1e-12))
    bm.free(); return r


# ---------------- same cut as paw_part_blend.cut_body (pass 8 preview) ----------------
def cut_body(body):
    bm = bmesh.new(); bm.from_mesh(body.data); mw = body.matrix_world; inv = mw.inverted(); n3 = mw.to_3x3().inverted().transposed()
    for kind in ('hind', 'fore'):
        c = D[f'{kind}_cut']; a = D[f'{kind}_axis']
        for sg in (1, -1):
            cc = c * [sg, 1, 1]; aa = a * [sg, 1, 1]
            def inreg(v):
                p = mw @ v.co
                return p.x * sg > 0.002 and p.z < 0.15 and ((kind == 'hind') == (p.y > 0))
            faces = [f for f in bm.faces if any(inreg(v) for v in f.verts)]
            bm.verts.index_update(); bm.edges.index_update()   # sorted geom: deterministic vertex order (the preview's set order varied run to run)
            geom = sorted({v for f in faces for v in f.verts}, key=lambda x: x.index) + sorted({e for f in faces for e in f.edges}, key=lambda x: x.index) + faces
            bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-6, plane_co=inv @ Vector(cc), plane_no=(n3 @ Vector(aa)).normalized(), clear_outer=True)
    bm.to_mesh(body.data); bm.free(); body.data.update()


bpy.ops.wm.open_mainfile(filepath=BASE)
sc = bpy.context.scene
body = bpy.data.objects['luceras_blockout']; rig = bpy.data.objects['luceras_rig']
base_checks = mesh_checks(body)
old_hash = dict(topology_sha256=topo_hash(body.data), geometry_sha256=geom_hash(body.data), verts=len(body.data.vertices), polys=len(body.data.polygons))
base_W = world_co(body); base_local = np.array([v.co[:] for v in body.data.vertices])
# base body vertex groups (weights) for the nearest-surface fill on the new vertices
gnames = [g.name for g in body.vertex_groups]
base_w = np.zeros((len(base_W), len(gnames)))
for v in body.data.vertices:
    for g in v.groups: base_w[v.index, g.group] = g.weight
body.data.calc_loop_triangles(); base_tri = np.array([t.vertices[:] for t in body.data.loop_triangles])
base_bvh = BVHTree.FromPolygons(base_W.tolist(), base_tri.tolist(), all_triangles=True)
old_claws = {o.name: o for o in bpy.data.objects if o.type == 'MESH' and ('fore_claw_' in o.name or 'hind_claw_' in o.name)}
dewclaws = [o for o in bpy.data.objects if 'dewclaw' in o.name]
old_claw_info = {n: dict(center=world_co(o).mean(0), parent_bone=o.parent_bone, parent_type=o.parent_type, mats=[s.material for s in o.material_slots]) for n, o in old_claws.items()}

cut_body(body)

# ---------------- append paw parts and claws ----------------
with bpy.data.libraries.load(PAWS, link=False) as (src, dst):
    dst.objects = [n for n in src.objects if n.startswith('paw_')]
parts = []; claws = []
for o in dst.objects:
    sc.collection.objects.link(o); o.hide_render = False; o.hide_set(False)
    (claws if '_claw_' in o.name else parts).append(o)
parts.sort(key=lambda o: o.name); claws.sort(key=lambda o: o.name)

part_info = {}; ring_pts = []
nb0 = len(body.data.vertices)
for ob in parts:
    bm = bmesh.new(); bm.from_mesh(ob.data); cap = max(bm.faces, key=lambda f: len(f.verts))
    W = np.array(ob.matrix_world)
    pts = [np.array(W[:3, :3] @ np.array(v.co) + W[:3, 3]) for v in cap.verts]; ring_pts += pts
    part_info[ob.name] = dict(verts=len(bm.verts), cap_verts=len(cap.verts), part_topology_sha256=topo_hash(ob.data))
    bmesh.ops.delete(bm, geom=[cap], context='FACES_ONLY'); bm.to_mesh(ob.data); bm.free(); ob.data.materials.clear()
    n = len(body.data.vertices)
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); body.select_set(True); bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
# merge by distance, restricted to the ring vertices (body cut ring + part ring, coincident by construction)
mw = body.matrix_world; bm = bmesh.new(); bm.from_mesh(body.data)
kd = KDTree(len(ring_pts)); [kd.insert(Vector(p), i) for i, p in enumerate(ring_pts)]; kd.balance()
vs = [v for v in bm.verts if kd.find(mw @ v.co)[2] < 1e-5]
n0 = len(bm.verts); bmesh.ops.remove_doubles(bm, verts=vs, dist=1e-6); merged = n0 - len(bm.verts)
bm.to_mesh(body.data); bm.free(); body.data.update()
for p in body.data.polygons: p.use_smooth = True
print('WELD merged', merged, 'of', len(ring_pts), 'ring verts (', len(vs), 'candidates)')

# ---------------- index map: which new vertex came from which base vertex ----------------
NW = world_co(body)
kdb = KDTree(len(base_W)); [kdb.insert(Vector(p), i) for i, p in enumerate(base_W)]; kdb.balance()
src = np.full(len(NW), -1, np.int64); dist = np.zeros(len(NW))
for i, p in enumerate(NW):
    _, j, d = kdb.find(Vector(p)); dist[i] = d
    if d < 1e-9: src[i] = j
# which paw each new vertex belongs to: nearest part region by side/kind
is_new = src < 0
kdr = KDTree(len(ring_pts)); [kdr.insert(Vector(p), i) for i, p in enumerate(ring_pts)]; kdr.balance()
ring_mask = np.array([kdr.find(Vector(p))[2] < 1e-6 for p in NW])
paw_label = np.zeros(len(NW), np.int8)   # 0 body, 1 hind_l, 2 hind_r, 3 fore_l, 4 fore_r (new vertices only)
segs = []
for k, s_ in [('hind', 1), ('hind', -1), ('fore', 1), ('fore', -1)]:
    PO = np.load(NPZ)[f'{k}_O'] * [s_, 1, 1]; segs.append((D[f'{k}_cut'] * [s_, 1, 1], PO))
def segd(P, a, b):
    t = np.clip(((P - a) @ (b - a)) / ((b - a) @ (b - a)), 0, 1); return np.linalg.norm(P - (a + t[:, None] * (b - a)), axis=1)
SD = np.column_stack([segd(NW, a, b) for a, b in segs])
paw_label[is_new] = 1 + SD[is_new].argmin(1)
unlabeled_new = int((is_new & (paw_label == 0)).sum())

# ---------------- fill base vertex groups on the new vertices (nearest surface interpolation) ----------------
neww = np.zeros((len(NW), len(gnames)))
neww[~is_new] = base_w[src[~is_new]]
fill_d = []
for i in np.flatnonzero(is_new):
    hit, nrm, fi, d = base_bvh.find_nearest(Vector(NW[i])); t = base_tri[fi]; P = base_W[t]
    from mathutils.geometry import barycentric_transform
    u = P[1] - P[0]; v = P[2] - P[0]; w = np.array(hit) - P[0]
    uu, uv_, vv, wu, wv = u @ u, u @ v, v @ v, w @ u, w @ v; den = uu * vv - uv_ * uv_
    if abs(den) < 1e-20: bc = np.array([1., 0, 0])
    else:
        b = (vv * wu - uv_ * wv) / den; cc = (uu * wv - uv_ * wu) / den; bc = np.clip([1 - b - cc, b, cc], 0, 1); bc /= bc.sum()
    neww[i] = bc @ base_w[t]; fill_d.append(d)
body.vertex_groups.clear()
for j, nme in enumerate(gnames):
    g = body.vertex_groups.new(name=nme)
    for i in np.flatnonzero(neww[:, j] > 1e-6): g.add([int(i)], float(neww[i, j]), 'REPLACE')

# ---------------- claws: new claws take the old names and bone parenting ----------------
rig_mw = rig.matrix_world
claw_map = {}
used = set()
for co in claws:
    cen = world_co(co).mean(0)
    k = 'hind' if '_hind_' in co.name else 'fore'; s = co.name.split('_')[2]
    cands = [n for n in old_claw_info if n.startswith(f'{k}_claw_{s}_') and n not in used]
    best = min(cands, key=lambda n: np.linalg.norm(old_claw_info[n]['center'] - cen)); used.add(best)
    claw_map[co.name] = dict(old=best, center_shift_mm=float(1000 * np.linalg.norm(old_claw_info[best]['center'] - cen)))
claw_world_before = {}
for co in claws:
    best = claw_map[co.name]['old']; info = old_claw_info[best]; old = old_claws[best]
    world = co.matrix_world.copy(); claw_world_before[best] = world_co(co)
    for c in list(co.users_collection): c.objects.unlink(co)
    for c in old.users_collection: c.objects.link(co)
    bpy.data.objects.remove(old, do_unlink=True)
    co.name = best; co.data.name = best
    co.parent = rig; co.parent_type = info['parent_type']; co.parent_bone = info['parent_bone']
    bpy.context.view_layer.update(); co.matrix_world = world; bpy.context.view_layer.update()
    co.data.materials.clear()
    for m in info['mats']: co.data.materials.append(m)
    co.hide_render = False; co.hide_set(False)
bpy.context.view_layer.update()
claw_drift = max(float(np.abs(world_co(bpy.data.objects[n]) - claw_world_before[n]).max()) for n in claw_world_before)
# claw seating: distance from each claw's nearest vertex to the new body surface, and old claws to the base body
body.data.calc_loop_triangles(); NT = np.array([t.vertices[:] for t in body.data.loop_triangles])
new_bvh = BVHTree.FromPolygons(NW.tolist(), NT.tolist(), all_triangles=True)
def seat(o, bvh):
    P = world_co(o); ds = [bvh.find_nearest(Vector(p))[3] for p in P]
    return float(1000 * min(ds))
claw_seat = {n: dict(new_min_gap_mm=seat(bpy.data.objects[n], new_bvh)) for n in claw_world_before}
dew = {o.name: dict(min_gap_to_new_body_mm=seat(o, new_bvh), min_gap_to_base_body_mm=seat(o, base_bvh)) for o in dewclaws}

# remove leftover paw collection (parts were joined; claws moved)
for c in list(bpy.data.collections):
    if c.name == 'pawpart' and not c.objects: bpy.data.collections.remove(c)

checks = mesh_checks(body)
faces_new = {}
for f in body.data.polygons:
    nv = len(f.vertices)
    if nv > 4 or f.area < 1e-12:
        key = ('ngon' if nv > 4 else 'zero_area') + ('_new' if any(src[v] < 0 for v in f.vertices) else '_preserved')
        faces_new[key] = faces_new.get(key, 0) + 1
new_hash = dict(topology_sha256=topo_hash(body.data), geometry_sha256=geom_hash(body.data), verts=len(body.data.vertices), polys=len(body.data.polygons))

# ---------------- left/right symmetry of the paws (mirrored left surface against right) ----------------
sym = {}
for k, (l, r) in (('hind', (1, 2)), ('fore', (3, 4))):
    L = NW[paw_label == l] * [-1, 1, 1]; R = NW[paw_label == r]
    kr = KDTree(len(R)); [kr.insert(Vector(p), i) for i, p in enumerate(R)]; kr.balance()
    d = np.array([kr.find(Vector(p))[2] for p in L])
    sym[k] = dict(left_verts=int(len(L)), right_verts=int(len(R)), mirrored_nearest_mm_max=float(1000 * d.max()), mirrored_nearest_mm_p99=float(1000 * np.quantile(d, .99)), mirrored_nearest_mm_mean=float(1000 * d.mean()))
claw_sym = {}
for k in ('hind', 'fore'):
    for i in range(1, 5):
        a = world_co(bpy.data.objects[f'{k}_claw_l_{i}']) * [-1, 1, 1]; b = world_co(bpy.data.objects[f'{k}_claw_r_{i}'])
        claw_sym[f'{k}_{i}'] = float(1000 * np.abs(a.mean(0) - b.mean(0)).max())

# ---------------- compare against the pass 8 preview body ----------------
np.save(OUT + '/work/new_body_world.npy', NW)
np.savez_compressed(OUT + '/work/sculpt_map.npz', src=src, paw_label=paw_label, ring=ring_mask, new_world=NW, base_world=base_W)
res = dict(build_id='B-yqgg', base=BASE, paws=PAWS, join_planes=NPZ, old_body=old_hash, new_body=new_hash,
           weld=dict(ring_points=len(ring_pts), merge_candidates=len(vs), merged=merged, parts=part_info), mesh=checks, base_mesh=base_checks, odd_faces_by_region=faces_new,
           new_vertices=int(is_new.sum()), preserved_vertices=int((~is_new).sum()), ring_vertices=int(ring_mask.sum()), unlabeled_new_vertices=unlabeled_new,
           paw_vertices={n: int((paw_label == i).sum()) for i, n in enumerate(['body', 'hind_l', 'hind_r', 'fore_l', 'fore_r'])},
           vertex_group_fill=dict(groups=len(gnames), new_vertices=len(fill_d), surface_distance_mm_max=float(1000 * max(fill_d)), mean=float(1000 * np.mean(fill_d))),
           claws=dict(map=claw_map, world_drift_after_parenting_m=claw_drift, seating=claw_seat, mirror_center_diff_mm=claw_sym),
           dewclaws=dew, paw_symmetry=sym)
sc['sculpt_build_id'] = 'B-yqgg'
bpy.ops.wm.save_as_mainfile(filepath=OUT + '/luceras_sculpt.blend')
# preview comparison (open after saving)
bpy.ops.wm.open_mainfile(filepath=PREVIEW)
PV = world_co(bpy.data.objects['luceras_blockout'])
kp = KDTree(len(PV)); [kp.insert(Vector(p), i) for i, p in enumerate(PV)]; kp.balance()
d1 = np.array([kp.find(Vector(p))[2] for p in NW])
kn = KDTree(len(NW)); [kn.insert(Vector(p), i) for i, p in enumerate(NW)]; kn.balance()
d2 = np.array([kn.find(Vector(p))[2] for p in PV])
pclaws = {o.name: world_co(o).mean(0) for o in bpy.data.objects if o.name.startswith('paw_') and '_claw_' in o.name}
res['preview_compare'] = dict(preview_verts=len(PV), new_verts=len(NW), new_to_preview_max_m=float(d1.max()), preview_to_new_max_m=float(d2.max()),
                              preview_topology_sha256=topo_hash(bpy.data.objects['luceras_blockout'].data),
                              claw_center_vs_preview_max_mm=float(1000 * max(np.abs(pclaws[k] - claw_world_before[v['old']].mean(0)).max() for k, v in claw_map.items())))
json.dump(res, open(OUT + '/work/sculpt_checks.json', 'w'), indent=1, default=lambda x: x.item() if hasattr(x, 'item') else str(x))
print('SCULPT done', json.dumps(dict(old=old_hash, new=new_hash, mesh=checks, base_mesh=base_checks, odd_faces_by_region=faces_new, merged=merged, preview=res['preview_compare']), default=str))
