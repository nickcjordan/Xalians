"""B-yqgg pass 2: clean the right fore weld band only (seam line and sliver triangles).

Usage: blender -b --factory-startup --python pawint_band_fix.py -- PASS1_DIR PASS2_DIR
Band = right fore vertices within BAND_UP mm above to BAND_DOWN mm below the right fore join plane (own side only).
1. Slivers: triangulate the band faces, collapse band edges shorter than COLLAPSE mm (bmesh dissolve_degenerate),
   flip band edges toward better triangles (beautify_fill), then join band triangles back into quads where flat.
2. Seam: relax band vertices (umbrella Laplacian, tangential plus a small normal share) with a weight that is 1 within
   CORE mm of the plane and falls to 0 at the band edge; band boundary vertices are pinned. Nothing outside the band moves.
Mirror check: rest geometry of the right band mirrored onto the left fore surface (the left fore has no seam), before and after.
Writes PASS2_DIR/luceras_sculpt.blend (body + every other object unchanged) and PASS2_DIR/work/band_fix.json, band_map.npz.
"""
import bpy, bmesh, sys, json, hashlib, numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index('--') + 1:]; P1, P2 = a[0], a[1]; SIDE = a[2] if len(a) > 2 else 'r'   # B-yqgg pass 3: same fix on the left fore
PZ = np.load('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-pawpart/pass8/work/u3/paws.npz')
BAND_UP, BAND_DOWN, CORE, COLLAPSE, RELAX_IT, NORMAL_SHARE = 0.012, 0.006, 0.0035, 0.00030, 20, 0.35
SLIVER_DEG = 6.0; TINY_AREA = 0.08e-6
SG = -1 if SIDE == 'r' else 1; C = PZ['fore_cut'] * [SG, 1, 1]; AX = PZ['fore_axis'] * [SG, 1, 1]
CL = PZ['fore_cut'] * [-SG, 1, 1]; AXL = PZ['fore_axis'] * [-SG, 1, 1]   # the other fore leg (mirror reference)


def topo_hash(m):
    h = hashlib.sha256()
    for coll, prop, dt in [(m.loops, 'vertex_index', np.int32), (m.polygons, 'loop_start', np.int32), (m.polygons, 'loop_total', np.int32)]:
        x = np.empty(len(coll), dt); coll.foreach_get(prop, x); h.update(x.tobytes())
    return h.hexdigest()


def co(m):
    x = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', x); return x.reshape(-1, 3)


def tri_stats(V, T):
    angs = []
    for i in range(3):
        u = V[T[:, (i + 1) % 3]] - V[T[:, i]]; v = V[T[:, (i + 2) % 3]] - V[T[:, i]]
        angs.append(np.degrees(np.arccos(np.clip((u * v).sum(1) / np.maximum(np.linalg.norm(u, axis=1) * np.linalg.norm(v, axis=1), 1e-30), -1, 1))))
    return np.min(angs, axis=0)


def band_report(V, T, c, ax, sg):
    h = (V - c) @ ax; near = np.linalg.norm(V - c, axis=1) < .16; side = sg * V[:, 0] > 0
    sel = (h > -0.012) & (h < 0.010) & near & side; Tb = T[sel[T].all(1)]
    n = np.cross(V[Tb[:, 1]] - V[Tb[:, 0]], V[Tb[:, 2]] - V[Tb[:, 0]]); n /= np.maximum(np.linalg.norm(n, axis=1), 1e-30)[:, None]
    ed = {}
    for k, t in enumerate(Tb):
        for u, v in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])): ed.setdefault((min(u, v), max(u, v)), []).append(k)
    pr = np.array([v for v in ed.values() if len(v) == 2]); dih = np.degrees(np.arccos(np.clip((n[pr[:, 0]] * n[pr[:, 1]]).sum(1), -1, 1)))
    ma = tri_stats(V, Tb)
    return dict(tris=int(len(Tb)), minang_below_5=int((ma < 5).sum()), minang_below_10=int((ma < 10).sum()), minang_min=float(ma.min()),
                rest_dihedral_over_15=int((dih > 15).sum()), rest_dihedral_over_25=int((dih > 25).sum()), rest_dihedral_p99=float(np.quantile(dih, .99)), rest_dihedral_max=float(dih.max()))


bpy.ops.wm.open_mainfile(filepath=P1 + '/luceras_sculpt.blend')
body = bpy.data.objects['luceras_blockout']; me = body.data
assert np.allclose(np.array(body.matrix_world), np.eye(4)), 'body transform expected identity'
V0 = co(me); me.calc_loop_triangles(); T0 = np.array([t.vertices[:] for t in me.loop_triangles])
old_topo = topo_hash(me); n0 = len(V0)
before = dict(fixed_side=band_report(V0, T0, C, AX, SG), other_side=band_report(V0, T0, CL, AXL, -SG))
# vertex groups of the pass 1 sculpt body (for re-interpolation of touched vertices)
gn = [g.name for g in body.vertex_groups]; W0 = np.zeros((n0, len(gn)))
for v in me.vertices:
    for g in v.groups: W0[v.index, g.group] = g.weight
bvh0 = BVHTree.FromPolygons(V0.tolist(), T0.tolist(), all_triangles=True)

bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
def hval(p): return float((np.array(p) - C) @ AX)
def inband(v):
    p = np.array(v.co); return SG * p[0] > 0 and np.linalg.norm(p - C) < .16 and -BAND_UP < hval(p) < BAND_DOWN
bv = {v for v in bm.verts if inband(v)}
bf = [f for f in bm.faces if any(v in bv for v in f.verts)]   # faces touching the band (bisect n-gons straddle its top)
pinned = {v for v in bv if any(e.other_vert(v) not in bv for e in v.link_edges)}   # band verts with an edge to a vertex outside the band
bmesh.ops.triangulate(bm, faces=bf, quad_method='BEAUTY', ngon_method='BEAUTY')
bf = [f for f in bm.faces if all(v in bv for v in f.verts)]
inner_edges = [e for e in bm.edges if e.verts[0] in bv and e.verts[1] in bv and e.verts[0] not in pinned and e.verts[1] not in pinned]
nv_before = len(bm.verts)
bmesh.ops.dissolve_degenerate(bm, dist=COLLAPSE, edges=inner_edges)
collapsed = nv_before - len(bm.verts)
bv = {v for v in bm.verts if v.is_valid and inband(v)}
bf = [f for f in bm.faces if all(v in bv for v in f.verts) and len(f.verts) == 3]
be = [e for e in bm.edges if all(v in bv for v in e.verts) and not any(v in pinned for v in e.verts) and len(e.link_faces) == 2]
bmesh.ops.beautify_fill(bm, faces=bf, edges=be, method='AREA')
# remaining needles and caps: flip the longest edge when that raises the worst angle, else collapse a short edge
def minang_f(vs):
    out = 180.0
    for i in range(3):
        u = vs[(i + 1) % 3].co - vs[i].co; w = vs[(i + 2) % 3].co - vs[i].co
        if u.length < 1e-12 or w.length < 1e-12: return 0.0
        out = min(out, np.degrees(u.angle(w)))
    return out
sliver_log = []
for rnd in range(8):
    tris = [f for f in bm.faces if f.is_valid and len(f.verts) == 3 and any(inband(v) for v in f.verts) and (minang_f(list(f.verts)) < SLIVER_DEG or f.calc_area() < TINY_AREA)]
    if not tris: break
    acted = 0
    for f in tris:
        if not f.is_valid or len(f.verts) != 3: continue
        es = sorted(f.edges, key=lambda e: -e.calc_length()); e = es[0]
        if len(e.link_faces) == 2 and all(len(g.verts) == 3 and any(inband(v) for v in g.verts) for g in e.link_faces):
            g = [x for x in e.link_faces if x is not f][0]
            worst0 = min(minang_f(list(f.verts)), minang_f(list(g.verts)))
            a_, b_ = e.verts; c_ = [v for v in f.verts if v not in e.verts][0]; d_ = [v for v in g.verts if v not in e.verts][0]
            worst1 = min(minang_f([c_, d_, a_]), minang_f([c_, d_, b_]))
            n0_ = (f.normal + g.normal).normalized()
            convex = ((d_.co - c_.co).cross(a_.co - c_.co)).dot(n0_) * ((d_.co - c_.co).cross(b_.co - c_.co)).dot(n0_) < 0
            if convex and worst1 > worst0 + 1.0:
                r_ = bmesh.ops.rotate_edges(bm, edges=[e], use_ccw=False)
                if r_['edges']: acted += 1; sliver_log.append(('flip', round(worst0, 2), round(worst1, 2))); continue
        s = es[-1]
        if s.calc_length() < 4 * COLLAPSE and not any(v in pinned for v in s.verts):
            L_ = s.calc_length(); mid = (s.verts[0].co + s.verts[1].co) / 2
            bmesh.ops.pointmerge(bm, verts=list(s.verts), merge_co=mid); acted += 1; sliver_log.append(('collapse_short', round(L_ * 1000, 3))); continue
        # cap: the vertex opposite the longest edge sits on it; merge it into the nearer end of that edge
        c_ = [v for v in f.verts if v not in e.verts][0]
        if c_ not in pinned:
            t_ = min(e.verts, key=lambda v: (v.co - c_.co).length); L_ = (t_.co - c_.co).length
            if L_ < 0.0016:
                bmesh.ops.pointmerge(bm, verts=[c_, t_], merge_co=t_.co.copy()); acted += 1; sliver_log.append(('merge_cap', round(L_ * 1000, 3)))
    if not acted: break
dbg = []
for f in bm.faces:
    if f.is_valid and len(f.verts) == 3 and any(inband(v) for v in f.verts) and (minang_f(list(f.verts)) < SLIVER_DEG or f.calc_area() < TINY_AREA):
        dbg.append(dict(minang=round(minang_f(list(f.verts)), 2), area_mm2=round(f.calc_area() * 1e6, 4), h_mm=[round(hval(v.co) * 1000, 2) for v in f.verts], inband=[inband(v) for v in f.verts], pinned=[v in pinned for v in f.verts],
                        edges_mm=[round(e.calc_length() * 1000, 3) for e in f.edges], nfaces=[len(e.link_faces) for e in f.edges], nbr_tri=[all(len(g.verts) == 3 for g in e.link_faces) for e in f.edges]))
sliver_log.append(('remaining', dbg))
# relax: umbrella Laplacian, tangential plus a small normal share, weighted by distance from the ring plane
bv = [v for v in bm.verts if v.is_valid and inband(v) and v not in pinned]
wt = {v: min(1.0, max(0.0, 1 - (abs(hval(v.co)) - CORE) / ((BAND_UP if hval(v.co) < 0 else BAND_DOWN) - CORE))) if abs(hval(v.co)) > CORE else 1.0 for v in bv}
for _ in range(RELAX_IT):
    bm.normal_update(); new = {}
    for v in bv:
        nb = [e.other_vert(v).co for e in v.link_edges]
        if not nb: continue
        avg = sum(nb, Vector()) / len(nb); d = avg - v.co; n = v.normal
        new[v] = v.co + 0.5 * wt[v] * ((d - n * d.dot(n)) + NORMAL_SHARE * n * d.dot(n))
    for v, c in new.items(): v.co = c
# join band triangles back to quads where flat and well shaped
bf = [f for f in bm.faces if len(f.verts) == 3 and all(v.is_valid and inband(v) for v in f.verts)]
bmesh.ops.join_triangles(bm, faces=bf, angle_face_threshold=np.radians(10), angle_shape_threshold=np.radians(35))
nm = sum(1 for e in bm.edges if not e.is_manifold); bnd = sum(1 for e in bm.edges if e.is_boundary)
bm.to_mesh(me); bm.free(); me.update()
for p in me.polygons: p.use_smooth = True
V1 = co(me); me.calc_loop_triangles(); T1 = np.array([t.vertices[:] for t in me.loop_triangles])
# map: pass 2 vertex -> pass 1 vertex where the position is unchanged
kd = KDTree(n0); [kd.insert(Vector(x), i) for i, x in enumerate(V0)]; kd.balance()
src1 = np.full(len(V1), -1)
for i, x in enumerate(V1):
    _, j, d = kd.find(Vector(x))
    if d < 1e-10: src1[i] = j
touched = src1 < 0
h1 = (V1 - C) @ AX
outside_moved = int((touched & ~((SG * V1[:, 0] > 0) & (h1 > -BAND_UP - 1e-6) & (h1 < BAND_DOWN + 1e-6))).sum())
# vertex groups: unchanged vertices keep theirs, touched ones re-interpolated from the pass 1 surface
Wn = np.zeros((len(V1), len(gn))); Wn[~touched] = W0[src1[~touched]]
for i in np.flatnonzero(touched):
    hit, nrm, fi, d = bvh0.find_nearest(Vector(V1[i])); t = T0[fi]; Q = V0[t]
    u = Q[1] - Q[0]; v = Q[2] - Q[0]; w = np.array(hit) - Q[0]; uu, uv, vv, wu, wv = u @ u, u @ v, v @ v, w @ u, w @ v; den = uu * vv - uv * uv
    bc = np.array([1., 0, 0]) if abs(den) < 1e-20 else np.clip([1 - (vv * wu - uv * wv) / den - (uu * wv - uv * wu) / den, (vv * wu - uv * wv) / den, (uu * wv - uv * wu) / den], 0, 1)
    Wn[i] = (bc / bc.sum()) @ W0[t]
body.vertex_groups.clear()
for j, nme in enumerate(gn):
    g = body.vertex_groups.new(name=nme)
    for i in np.flatnonzero(Wn[:, j] > 1e-6): g.add([int(i)], float(Wn[i, j]), 'REPLACE')
# displacement of touched vertices from the pass 1 surface
disp = np.array([bvh0.find_nearest(Vector(V1[i]))[3] for i in np.flatnonzero(touched)])
after = dict(fixed_side=band_report(V1, T1, C, AX, SG), other_side=band_report(V1, T1, CL, AXL, -SG))
# mirror check: right band (mirrored) against the left fore surface, before and after
def mirror_gap(V, T, Vl, Tl):
    h = (V - C) @ AX; sel = (SG * V[:, 0] > 0) & (h > -BAND_UP) & (h < BAND_DOWN) & (np.linalg.norm(V - C, axis=1) < .16)
    bl = BVHTree.FromPolygons(Vl.tolist(), Tl.tolist(), all_triangles=True)
    d = np.array([bl.find_nearest(Vector(x * [-1, 1, 1]))[3] for x in V[sel]]); return dict(verts=int(sel.sum()), mean_mm=float(1000 * d.mean()), p99_mm=float(1000 * np.quantile(d, .99)), max_mm=float(1000 * d.max()))
mg = dict(before=mirror_gap(V0, T0, V0, T0), after=mirror_gap(V1, T1, V1, T1))
import bmesh as _b
bmc = _b.new(); bmc.from_mesh(me)
shells = 0; seen = set()
for v0 in bmc.verts:
    if v0.index in seen: continue
    shells += 1; st = [v0]; seen.add(v0.index)
    while st:
        v = st.pop()
        for e in v.link_edges:
            w = e.other_vert(v)
            if w.index not in seen: seen.add(w.index); st.append(w)
mesh = dict(verts=len(bmc.verts), faces=len(bmc.faces), nonmanifold_edges=sum(1 for e in bmc.edges if not e.is_manifold), boundary_edges=sum(1 for e in bmc.edges if e.is_boundary),
            nonmanifold_verts=sum(1 for v in bmc.verts if not v.is_manifold), shells=shells, euler=len(bmc.verts) - len(bmc.edges) + len(bmc.faces))
bmc.free()
res = dict(side=SIDE, params=dict(band_up_mm=BAND_UP * 1000, band_down_mm=BAND_DOWN * 1000, core_mm=CORE * 1000, collapse_mm=COLLAPSE * 1000, relax_iterations=RELAX_IT, sliver_deg=SLIVER_DEG, normal_share=NORMAL_SHARE),
           pass1_topology_sha256=old_topo, pass2_topology_sha256=topo_hash(me), verts_pass1=n0, verts_pass2=len(V1), collapsed_vertices=collapsed, sliver_ops=sliver_log,
           touched_vertices=int(touched.sum()), touched_outside_band=outside_moved, pinned_band_boundary=len(pinned),
           touched_offset_from_pass1_surface_mm=dict(max=float(1000 * disp.max()), p99=float(1000 * np.quantile(disp, .99)), mean=float(1000 * disp.mean())),
           band_before=before, band_after=after, mirror_gap_right_band_vs_left=mg, mesh=mesh)
bpy.context.scene['sculpt_build_id'] = 'B-yqgg ' + Path(P2).name
bpy.ops.wm.save_as_mainfile(filepath=P2 + '/luceras_sculpt.blend')
np.savez_compressed(P2 + '/work/band_map.npz', src1=src1, touched=touched, V1=V1)
open(P2 + '/work/band_fix.json', 'w').write(json.dumps(res, indent=1))
print('BAND done', json.dumps(dict(mesh=mesh, touched=res['touched_vertices'], outside=outside_moved, before=before['fixed_side'], after=after['fixed_side'], other=after['other_side'], mirror=mg, disp=res['touched_offset_from_pass1_surface_mm'])))
