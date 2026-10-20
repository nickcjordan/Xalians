"""B-exrv / B-xsze: build the paw part objects in Blender from paw_part_build.py output, save paws.blend and the preview blend,
and render clay views (current sculpt and new paws, same cameras).

Usage: blender -b SCULPT.blend --python paw_part_blend.py -- PAWS.npz OUT_DIR TAG [--save]
  OUT_DIR/clay/<TAG>_<view>.png and OUT_DIR/clay/current_<view>.png (current only when missing).
  --save also writes OUT_DIR/paws.blend (paw objects only) and OUT_DIR/luceras_pawpart_preview.blend.
The approved sculpt is opened read only and never saved over.
"""
import bpy, bmesh, sys, os, numpy as np
from mathutils import Vector, Matrix

args = sys.argv[sys.argv.index('--') + 1:]
NO_CURRENT = '--no-current' in args
npz, OUT, TAG = args[0], args[1], args[2]; SAVE = '--save' in args
os.makedirs(OUT + '/clay', exist_ok=True)
D = dict(np.load(npz))
# B-t5dc: optional surface cleanup (paw_part_clean.py) after the remesh and after the weld; off unless --clean CFG.json
CLEAN = None; CLOG = {}
if '--clean' in args:
    import json as _json
    sys.path.insert(0, '/mnt/c/dev/src/xalians-creature-pipeline/art/pipeline/sculpt'); import paw_part_clean as PC
    CLEAN = _json.loads(open(args[args.index('--clean') + 1]).read())
# B-pzrq: optional remesh voxel size (default 1.2 mm, as passes 1 to 7) and projection-limited shrinkwrap
VOXEL = float(args[args.index('--voxel') + 1]) * 0.001 if '--voxel' in args else 0.0012
SW_LIMIT = float(args[args.index('--sw-limit') + 1]) * 0.001 if '--sw-limit' in args else 0.0
sc = bpy.context.scene
SCULPT_PATH = bpy.data.filepath


def mesh_obj(name, V, F, coll=None):
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in V], [], [tuple(int(i) for i in f) for f in F]); me.update()
    ob = bpy.data.objects.new(name, me); (coll or sc.collection).objects.link(ob); return ob


def remesh_onto(ob, voxel):
    """Voxel remesh (closed, manifold quads) then shrinkwrap back onto the accurate surface-nets mesh."""
    ref = ob.copy(); ref.data = ob.data.copy(); sc.collection.objects.link(ref)
    m = ob.modifiers.new('rm', 'REMESH'); m.mode = 'VOXEL'; m.voxel_size = voxel; m.use_smooth_shade = True
    bpy.context.view_layer.objects.active = ob; ob.select_set(True); bpy.ops.object.modifier_apply(modifier='rm')
    s = ob.modifiers.new('sw', 'SHRINKWRAP'); s.wrap_method = 'NEAREST_SURFACEPOINT'; s.target = ref
    if SW_LIMIT:   # B-pzrq: project along the vertex normal, both ways, within a limit (no snapping across a cleft)
        s.wrap_method = 'PROJECT'; s.use_project_x = s.use_project_y = s.use_project_z = False
        s.use_negative_direction = True; s.use_positive_direction = True; s.project_limit = SW_LIMIT
    bpy.ops.object.modifier_apply(modifier='sw'); bpy.data.objects.remove(ref, do_unlink=True)
    # keep only the largest shell (voxel remesh can leave specks in tight clefts)
    bm = bmesh.new(); bm.from_mesh(ob.data); seen = set(); shells = []
    for v0 in bm.verts:
        if v0.index in seen: continue
        stack = [v0]; shell = []; seen.add(v0.index)
        while stack:
            v = stack.pop(); shell.append(v)
            for e in v.link_edges:
                w = e.other_vert(v)
                if w.index not in seen: seen.add(w.index); stack.append(w)
        shells.append(shell)
    shells.sort(key=len)
    bmesh.ops.delete(bm, geom=[v for sh in shells[:-1] for v in sh], context='VERTS'); bm.to_mesh(ob.data); bm.free()
    ob['removed_specks'] = len(shells) - 1
    for p in ob.data.polygons: p.use_smooth = True


coll = bpy.data.collections.new('pawpart'); sc.collection.children.link(coll)
new_objs = []
for kind in ('hind', 'fore'):
    V = D[f'{kind}_V']; Q = D[f'{kind}_Q']
    for side, sg in (('l', 1), ('r', -1)):
        VV = V * [sg, 1, 1]; QQ = Q if sg == 1 else Q[:, ::-1]
        ob = mesh_obj(f'paw_{kind}_{side}', VV, QQ, coll); remesh_onto(ob, VOXEL); new_objs.append(ob)
        if CLEAN: print('CLEAN', ob.name, PC.clean_part(ob, kind, sg, D, CLEAN, CLOG))
        src = bpy.data.objects[{'hind': 'hind_claw_l_2', 'fore': 'fore_claw_l_2'}[kind]]
        sv = np.array([src.matrix_world @ v.co for v in src.data.vertices]); faces = [list(p.vertices) for p in src.data.polygons]
        for i in range(1, 5):
            cv = D[f'{kind}_claw_{i}'] * [sg, 1, 1]; ff = faces if sg == 1 else [f[::-1] for f in faces]
            co = mesh_obj(f'paw_{kind}_{side}_claw_{i}', cv, ff, coll)
            for p in co.data.polygons: p.use_smooth = True
            new_objs.append(co)


def cut_body(body):
    """Preview only: bisect the sculpt body at each join plane and drop the part below it (that leg's old paw)."""
    bm = bmesh.new(); bm.from_mesh(body.data); mw = body.matrix_world; inv = mw.inverted(); n3 = mw.to_3x3().inverted().transposed()
    for kind in ('hind', 'fore'):
        c = D[f'{kind}_cut']; a = D[f'{kind}_axis']
        for sg in (1, -1):
            cc = c * [sg, 1, 1]; aa = a * [sg, 1, 1]
            def inreg(v):
                p = mw @ v.co
                return p.x * sg > 0.002 and p.z < 0.15 and ((kind == 'hind') == (p.y > 0))
            faces = [f for f in bm.faces if any(inreg(v) for v in f.verts)]
            geom = list({v for f in faces for v in f.verts}) + list({e for f in faces for e in f.edges}) + faces
            bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-6, plane_co=inv @ Vector(cc), plane_no=(n3 @ Vector(aa)).normalized(), clear_outer=True)
    bm.to_mesh(body.data); bm.free(); body.data.update()


def ring_loops(bm, mw, c, a, r):
    """Ordered boundary loops of bm lying in the plane (c, a) within r of c (world coordinates)."""
    def ok(v):
        p = np.array(mw @ v.co); return abs((p - c) @ a) < 2e-4 and np.linalg.norm(p - c) < r
    E = [e for e in bm.edges if e.is_boundary and ok(e.verts[0]) and ok(e.verts[1])]
    adj = {}
    for e in E:
        for v in e.verts: adj.setdefault(v, []).append(e.other_vert(v))
    seen = set(); loops = []
    for v0 in adj:
        if v0 in seen: continue
        lp = [v0]; seen.add(v0); prev = None; cur = v0
        while True:
            nx = [w for w in adj[cur] if w is not prev and w not in seen]
            if not nx: break
            prev, cur = cur, nx[0]; seen.add(cur); lp.append(cur)
        loops.append(lp)
    return sorted(loops, key=len)


def order_ring(P, c, e1, e2):
    """Loop points P (n,3), already in walk order: orient counterclockwise in (e1,e2) and start at the smallest angle.
    Returns (index order, unwrapped angles)."""
    ang = np.arctan2((P - c) @ e2, (P - c) @ e1); n = len(P); idx = np.arange(n)
    un = np.unwrap(ang)
    if un[-1] < un[0]: idx = idx[::-1]; ang = ang[::-1]
    k = int(np.argmin(np.mod(ang, 2 * np.pi))); idx = np.roll(idx, -k); ang = np.mod(np.roll(ang, -k) - np.roll(ang, -k)[0], 2 * np.pi)
    ang = np.unwrap(ang); return idx, ang


def weld_part(ob, kind, sg, body_ring_world, off=0.0015):
    """B-xsze: make the paw's top ring the body's cut ring exactly. Cut the part off_mm below the join plane, bridge its
    open ring to a copy of the body's cut-ring vertices, and close the ring with one cap face (a weld-ready closed part:
    delete the cap and merge by distance onto the body ring to weld). Returns the ring vertex indices."""
    c = D[f'{kind}_cut'] * [sg, 1, 1]; a = D[f'{kind}_axis'] * [sg, 1, 1]
    e1 = np.cross(a, [0, 0, 1.0]); e1 /= np.linalg.norm(e1); e2 = np.cross(a, e1)
    bm = bmesh.new(); bm.from_mesh(ob.data)
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-7, plane_co=Vector(c + a * off), plane_no=Vector(a), clear_inner=True)
    bm.verts.ensure_lookup_table()
    pl = ring_loops(bm, Matrix.Identity(4), c + a * off, a, 0.08)[-1]
    PP = np.array([v.co for v in pl]); ip, ap = order_ring(PP, c, e1, e2); pl = [pl[i] for i in ip]
    BR = np.asarray(body_ring_world); ib, ab = order_ring(BR, c, e1, e2); BR = BR[ib]
    rv = [bm.verts.new(Vector(p)) for p in BR]
    i = j = 0; n, m = len(pl), len(rv)
    while i < n or j < m:
        an = ap[i + 1] if i + 1 < n else 2 * np.pi + ap[0]; bn = ab[j + 1] if j + 1 < m else 2 * np.pi + ab[0]
        if (an <= bn and i < n) or j >= m:
            bm.faces.new((pl[i], pl[(i + 1) % n], rv[j % m])); i += 1
        else:
            bm.faces.new((pl[i % n], rv[(j + 1) % m], rv[j])); j += 1
    bm.faces.new(rv)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.verts.index_update(); ring_idx = [v.index for v in rv]
    bm.to_mesh(ob.data); bm.free(); ob.data.update()
    for p in ob.data.polygons: p.use_smooth = True
    ob['ring_verts'] = len(ring_idx); return ring_idx


def body_rings(body):
    bm = bmesh.new(); bm.from_mesh(body.data); mw = body.matrix_world; out = {}
    for kind in ('hind', 'fore'):
        for side, sg in (('l', 1), ('r', -1)):
            c = D[f'{kind}_cut'] * [sg, 1, 1]; a = D[f'{kind}_axis'] * [sg, 1, 1]
            L = ring_loops(bm, mw, c, a, 0.08); out[(kind, side)] = np.array([np.array(mw @ v.co) for v in L[-1]])
            print('WELD body ring', kind, side, 'loops', [len(x) for x in L])
    bm.free(); return out


def weld_preview(body, parts):
    """Preview only: join copies of the welded parts into the body, drop their caps, merge the ring vertices."""
    ring_pts = []
    for ob in parts:
        cp = ob.copy(); cp.data = ob.data.copy(); sc.collection.objects.link(cp)
        bm = bmesh.new(); bm.from_mesh(cp.data); cap = max(bm.faces, key=lambda f: len(f.verts))
        ring_pts += [np.array(v.co) for v in cap.verts]; bmesh.ops.delete(bm, geom=[cap], context='FACES_ONLY'); bm.to_mesh(cp.data); bm.free()
        bpy.ops.object.select_all(action='DESELECT'); cp.select_set(True); body.select_set(True); bpy.context.view_layer.objects.active = body
        bpy.ops.object.join()
    from mathutils.kdtree import KDTree
    mw = body.matrix_world; bm = bmesh.new(); bm.from_mesh(body.data)
    kd = KDTree(len(ring_pts)); [kd.insert(Vector(p), i) for i, p in enumerate(ring_pts)]; kd.balance()
    vs = [v for v in bm.verts if kd.find(mw @ v.co)[2] < 1e-5]
    n0 = len(bm.verts); bmesh.ops.remove_doubles(bm, verts=vs, dist=1e-6); merged = n0 - len(bm.verts)
    nm = sum(1 for e in bm.edges if not e.is_manifold)
    bm.to_mesh(body.data); bm.free(); body.data.update()
    for p in body.data.polygons: p.use_smooth = True
    print('WELD preview merged', merged, 'of', len(ring_pts), 'ring verts; body nonmanifold edges', nm)
    return merged, nm


# ---------------- render setup (same look as the pawprofile clay composites) ----------------
for o in bpy.data.objects:
    if o.type in ('CURVES', 'EMPTY', 'LIGHT', 'CAMERA'): o.hide_render = True
for o in list(bpy.data.objects):
    if o.name == 'lookdev_ground': o.hide_render = True
sc.render.engine = 'BLENDER_WORKBENCH'
sh = sc.display.shading; sh.light = 'STUDIO'; sh.color_type = 'SINGLE'; sh.single_color = (0.62, 0.6, 0.57)
sh.show_cavity = True; sh.cavity_type = 'BOTH'; sh.cavity_ridge_factor = 1.0; sh.cavity_valley_factor = 1.2; sh.show_shadows = True; sh.shadow_intensity = 0.35
sc.display.light_direction = (0.35, -0.45, 0.82)
sc.world = sc.world or bpy.data.worlds.new('w'); sc.world.color = (0.85, 0.85, 0.85)
gme = bpy.data.meshes.new('pp_ground'); gme.from_pydata([(-30, -30, -0.0002), (30, -30, -0.0002), (30, 30, -0.0002), (-30, 30, -0.0002)], [], [(0, 1, 2, 3)])
gro = bpy.data.objects.new('pp_ground', gme); sc.collection.objects.link(gro)
cam_data = bpy.data.cameras.new('ppcam'); cam = bpy.data.objects.new('ppcam', cam_data); sc.collection.objects.link(cam); sc.camera = cam


def shoot(target, dirv, scale, path, res=(640, 640), persp=False):
    dv = Vector(dirv).normalized(); cam.location = Vector(target) + dv * (1.0 if not persp else persp)
    cam.rotation_euler = (-dv).to_track_quat('-Z', 'Y').to_euler()
    if persp:
        cam_data.type = 'PERSP'; cam_data.lens = 50; cam_data.clip_start = 0.01
    else:
        cam_data.type = 'ORTHO'; cam_data.ortho_scale = scale; cam_data.clip_start = 0.93 if path.endswith('_top.png') else 0.01
    sole = path.endswith('_sole.png'); gro.hide_render = sole   # B-xsze: underside view (pads) with the ground hidden
    if sole: cam_data.clip_start = 0.95
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.filepath = path; bpy.ops.render.render(write_still=True)
    gro.hide_render = False


def views():
    out = []
    for kind, back, zt, s in (('hind', 0.040, 0.020, 0.135), ('fore', 0.026, 0.018, 0.105)):
        O = Vector(D[f'{kind}_O']); f = Vector(D[f'{kind}_f']); l = Vector(D[f'{kind}_l']); z = Vector((0, 0, 1))
        t = O - f * back + z * zt
        V = {'side': (l + z * 0.06, s), 'front': (f + z * 0.12, s * 0.8), 'tq': (f * 0.75 + l * 0.75 + z * 0.42, s),
             'top': (z + f * 0.0001, s), 'back_tq': (-f * 0.8 + l * 0.8 + z * 0.22, s), 'sole': (-z + f * 0.0001, s)}
        for v, (dv, scl) in V.items(): out.append((f'{kind}_{v}', t, dv, scl, (640, 640), False))
    out.append(('all_front', Vector((0, -0.02, 0.035)), (0.18, -1, 0.12), 0.50, (1280, 420), False))
    out.append(('full_side', Vector((0, 0.03, 0.33)), (1, 0, 0.03), 1.25, (1280, 1000), False))
    return out


body = bpy.data.objects['luceras_blockout']
old_claws = [o for o in bpy.data.objects if o.type == 'MESH' and 'claw' in o.name and not o.name.startswith('paw_')]
VIEWS = views()
need_current = (not os.path.exists(f'{OUT}/clay/current_all_front.png') or '--current' in args) and not NO_CURRENT
if need_current:
    for o in new_objs: o.hide_render = True
    for name, t, dv, s, res, persp in VIEWS: shoot(t, dv, s, f'{OUT}/clay/current_{name}.png', res, persp)
for o in new_objs: o.hide_render = False
for o in old_claws: o.hide_render = True
cut_body(body)
WELD = '--weld' in args; weld_info = {}
if WELD:
    rings = body_rings(body); parts = []
    for o in new_objs:
        if '_claw_' in o.name: continue
        kind, side = o.name.split('_')[1], o.name.split('_')[2]
        ri = weld_part(o, kind, 1 if side == 'l' else -1, rings[(kind, side)]); parts.append(o)
        if CLEAN: print('CLEAN weld', o.name, PC.clean_weld(o, CLEAN, CLOG))
        weld_info[o.name] = dict(ring_verts=len(ri), body_ring_verts=len(rings[(kind, side)]))
    merged, nm = weld_preview(body, parts)
    weld_info['preview_merged_ring_verts'] = merged; weld_info['preview_body_nonmanifold_edges'] = nm
    for o in parts: o.hide_render = True; o.hide_set(True)
for name, t, dv, s, res, persp in VIEWS: shoot(t, dv, s, f'{OUT}/clay/{TAG}_{name}.png', res, persp)
import json
os.makedirs(f'{OUT}/work/{TAG}', exist_ok=True)
ex = {}
for o in new_objs:
    ex[o.name + '_V'] = np.array([o.matrix_world @ v.co for v in o.data.vertices]); fl = [list(p.vertices) for p in o.data.polygons if len(p.vertices) <= 4]
    ex[o.name + '_T'] = np.array([[f[0], f[i], f[i + 1]] for f in fl for i in range(1, len(f) - 1)])
np.savez_compressed(f'{OUT}/work/{TAG}/mesh.npz', **ex)
open(f'{OUT}/work/{TAG}/weld.json', 'w').write(json.dumps(weld_info, indent=1))
if CLEAN: open(f'{OUT}/work/{TAG}/clean.json', 'w').write(json.dumps(CLOG, indent=1))

if SAVE:
    import json
    # mesh checks on the final objects
    rep = {}
    for o in new_objs:
        if '_claw_' in o.name: continue
        bm = bmesh.new(); bm.from_mesh(o.data)
        nm = sum(1 for e in bm.edges if not e.is_manifold); bnd = sum(1 for e in bm.edges if e.is_boundary)
        quads = sum(1 for f in bm.faces if len(f.verts) == 4); tris_ = sum(1 for f in bm.faces if len(f.verts) == 3); ngons = sum(1 for f in bm.faces if len(f.verts) > 4); el = [e.calc_length() for e in bm.edges]
        rep[o.name] = dict(verts=len(bm.verts), faces=len(bm.faces), quads=quads, tris=tris_, ngons=ngons, ring_verts=int(o.get('ring_verts', 0)), nonmanifold_edges=nm, boundary_edges=bnd,
                           edge_mm_mean=1000 * float(np.mean(el)), edge_mm_p5=1000 * float(np.percentile(el, 5)), edge_mm_p95=1000 * float(np.percentile(el, 95)), euler=len(bm.verts) - len(bm.edges) + len(bm.faces), removed_specks=int(o.get('removed_specks', 0)))
        bm.free()
    np.savez_compressed(f'{OUT}/work/final_mesh.npz', **ex)
    open(f'{OUT}/mesh_checks.json', 'w').write(json.dumps(rep, indent=1))
    # preview blend: sculpt copy with old paw region cut, old claws hidden, new paws in
    for o in old_claws: o.hide_set(True); o.hide_render = True
    open(f'{OUT}/weld.json', 'w').write(json.dumps(weld_info, indent=1))
    bpy.data.objects.remove(cam, do_unlink=True); bpy.data.objects.remove(gro, do_unlink=True)
    bpy.ops.wm.save_as_mainfile(filepath=f'{OUT}/luceras_pawpart_preview.blend', copy=True)
    # paws.blend: only the new paw objects
    bpy.data.libraries.write(f'{OUT}/paws.blend', set(new_objs) | {coll}, fake_user=True)
    print('SAVED')
print('PAWPART BLEND done')
