"""B-exrv: build the paw part objects in Blender from paw_part_build.py output, save paws.blend and the preview blend,
and render clay views (current sculpt and new paws, same cameras).

Usage: blender -b SCULPT.blend --python paw_part_blend.py -- PAWS.npz OUT_DIR TAG [--save]
  OUT_DIR/clay/<TAG>_<view>.png and OUT_DIR/clay/current_<view>.png (current only when missing).
  --save also writes OUT_DIR/paws.blend (paw objects only) and OUT_DIR/luceras_pawpart_preview.blend.
The approved sculpt is opened read only and never saved over.
"""
import bpy, bmesh, sys, os, numpy as np
from mathutils import Vector, Matrix

args = sys.argv[sys.argv.index('--') + 1:]
npz, OUT, TAG = args[0], args[1], args[2]; SAVE = '--save' in args
os.makedirs(OUT + '/clay', exist_ok=True)
D = dict(np.load(npz))
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
        ob = mesh_obj(f'paw_{kind}_{side}', VV, QQ, coll); remesh_onto(ob, 0.0012); new_objs.append(ob)
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
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.filepath = path; bpy.ops.render.render(write_still=True)


def views():
    out = []
    for kind, back, zt, s in (('hind', 0.040, 0.020, 0.135), ('fore', 0.026, 0.018, 0.105)):
        O = Vector(D[f'{kind}_O']); f = Vector(D[f'{kind}_f']); l = Vector(D[f'{kind}_l']); z = Vector((0, 0, 1))
        t = O - f * back + z * zt
        V = {'side': (l + z * 0.06, s), 'front': (f + z * 0.12, s * 0.8), 'tq': (f * 0.75 + l * 0.75 + z * 0.42, s),
             'top': (z + f * 0.0001, s), 'back_tq': (-f * 0.8 + l * 0.8 + z * 0.22, s)}
        for v, (dv, scl) in V.items(): out.append((f'{kind}_{v}', t, dv, scl, (640, 640), False))
    out.append(('all_front', Vector((0, -0.02, 0.035)), (0.18, -1, 0.12), 0.50, (1280, 420), False))
    out.append(('full_side', Vector((0, 0.03, 0.33)), (1, 0, 0.03), 1.25, (1280, 1000), False))
    return out


body = bpy.data.objects['luceras_blockout']
old_claws = [o for o in bpy.data.objects if o.type == 'MESH' and 'claw' in o.name and not o.name.startswith('paw_')]
VIEWS = views()
need_current = not os.path.exists(f'{OUT}/clay/current_all_front.png') or '--current' in args
if need_current:
    for o in new_objs: o.hide_render = True
    for name, t, dv, s, res, persp in VIEWS: shoot(t, dv, s, f'{OUT}/clay/current_{name}.png', res, persp)
for o in new_objs: o.hide_render = False
for o in old_claws: o.hide_render = True
cut_body(body)
for name, t, dv, s, res, persp in VIEWS: shoot(t, dv, s, f'{OUT}/clay/{TAG}_{name}.png', res, persp)

if SAVE:
    import json
    # mesh checks on the final objects
    rep = {}
    for o in new_objs:
        if '_claw_' in o.name: continue
        bm = bmesh.new(); bm.from_mesh(o.data)
        nm = sum(1 for e in bm.edges if not e.is_manifold); bnd = sum(1 for e in bm.edges if e.is_boundary)
        quads = sum(1 for f in bm.faces if len(f.verts) == 4); el = [e.calc_length() for e in bm.edges]
        rep[o.name] = dict(verts=len(bm.verts), faces=len(bm.faces), quads=quads, nonmanifold_edges=nm, boundary_edges=bnd,
                           edge_mm_mean=1000 * float(np.mean(el)), edge_mm_p5=1000 * float(np.percentile(el, 5)), edge_mm_p95=1000 * float(np.percentile(el, 95)), euler=len(bm.verts) - len(bm.edges) + len(bm.faces), removed_specks=int(o.get('removed_specks', 0)))
        bm.free()
    ex = {}
    for o in new_objs:
        ex[o.name + '_V'] = np.array([o.matrix_world @ v.co for v in o.data.vertices]); fl = [list(p.vertices) for p in o.data.polygons]
        ex[o.name + '_T'] = np.array([[f[0], f[i], f[i + 1]] for f in fl for i in range(1, len(f) - 1)])
    np.savez_compressed(f'{OUT}/work/final_mesh.npz', **ex)
    open(f'{OUT}/mesh_checks.json', 'w').write(json.dumps(rep, indent=1))
    # preview blend: sculpt copy with old paw region cut, old claws hidden, new paws in
    for o in old_claws: o.hide_set(True); o.hide_render = True
    bpy.data.objects.remove(cam, do_unlink=True); bpy.data.objects.remove(gro, do_unlink=True)
    bpy.ops.wm.save_as_mainfile(filepath=f'{OUT}/luceras_pawpart_preview.blend', copy=True)
    # paws.blend: only the new paw objects
    bpy.data.libraries.write(f'{OUT}/paws.blend', set(new_objs) | {coll}, fake_user=True)
    print('SAVED')
print('PAWPART BLEND done')
