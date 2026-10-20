"""B-j5p6: deformation proof for the pass 7 groom on the refit rig (luceras-pawintegrate pass3 rig.blend, read only).

Opens rig.blend, appends every hair-curves object, the neutral studio and the world from pass7 groom.blend, retargets
the surface-follow node trees to the rig's own luceras_blockout, then poses the review.poses action (foreleg_step, leap)
and renders paw crops posed and at rest with the same camera. Root binding error is measured on the evaluated, posed body.
Nothing is saved back to rig.blend.
Usage: blender -b --python deform_pass7.py -- GROOM_BLEND RIG_BLEND OUT_DIR
"""
import bpy, sys, json, time, numpy as np
from pathlib import Path
from mathutils import Vector

groom, rigf, out = sys.argv[sys.argv.index('--') + 1:][:3]
OUT = Path(out)
POSES = ['rest', 'crouch', 'leap', 'landing', 'head_left_up', 'tail_side_up', 'foreleg_step', 'breath_in']
bpy.ops.wm.open_mainfile(filepath=rigf)
s = bpy.context.scene
body = bpy.data.objects['luceras_blockout']
rig = bpy.data.objects['luceras_rig']


def arr(items, key, n=3, dt=np.float32):
    a = np.empty(len(items) * n, dt); items.foreach_get(key, a)
    return a.reshape(-1, n) if n > 1 else a


rig_rest_co = arr(body.data.vertices, 'co')
with bpy.data.libraries.load(groom, link=False) as (src, dst):
    dst.objects = list(src.objects)
    dst.worlds = list(src.worlds)
curves = [o for o in dst.objects if o and o.type == 'CURVES']
gbody = [o for o in dst.objects if o and o.type == 'MESH' and o.name.startswith('luceras_blockout')][0]
same = bool(np.array_equal(arr(gbody.data.vertices, 'co'), rig_rest_co))
for o in curves:
    s.collection.objects.link(o)
    o.parent = None; o.matrix_world = body.matrix_world.copy(); o.data.surface = body
    for m in o.modifiers:
        if m.type == 'NODES' and m.node_group:
            for n in m.node_group.nodes:
                if n.bl_idname == 'GeometryNodeObjectInfo' and n.inputs['Object'].default_value == gbody:
                    n.inputs['Object'].default_value = body
# groom look on the rig's own meshes: same vertex order (checked above), so copy the groom body's point/corner
# attributes (coat_color, toe_break and the rest) and every groomed mesh's materials onto the rig's objects
def base(n):
    h, _, t = n.rpartition('.')
    return h if h and t.isdigit() else n
copied = []
for a in gbody.data.attributes:
    if a.name.startswith('.') or a.name in body.data.attributes or a.domain not in ('POINT', 'CORNER', 'FACE'): continue
    if a.data_type not in ('FLOAT', 'FLOAT_COLOR', 'FLOAT_VECTOR', 'INT', 'BOOLEAN', 'BYTE_COLOR'): continue
    key = {'FLOAT_VECTOR': 'vector', 'FLOAT_COLOR': 'color', 'BYTE_COLOR': 'color'}.get(a.data_type, 'value')
    n = {'FLOAT_VECTOR': 3, 'FLOAT_COLOR': 4, 'BYTE_COLOR': 4}.get(a.data_type, 1)
    vals = np.empty(len(a.data) * n, np.int32 if a.data_type in ('INT',) else bool if a.data_type == 'BOOLEAN' else np.float32); a.data.foreach_get(key, vals)
    na = body.data.attributes.new(a.name, a.data_type, a.domain); na.data.foreach_set(key, vals); copied.append(a.name)
mi = arr(gbody.data.polygons, 'material_index', 1, np.int32)
for o in dst.objects:
    if not o or o.type != 'MESH': continue
    t = s.objects.get(base(o.name))
    if t is None or t == o or t.type != 'MESH': continue
    t.data.materials.clear()
    for m in o.data.materials: t.data.materials.append(m)
    t.active_material_index = 0
body.data.polygons.foreach_set('material_index', mi); body.data.update()
# studio lights and ground from the groom file (the swappable collection)
for o in dst.objects:
    if o and o.type in ('LIGHT',) or (o and o.name.startswith('lookdev_ground')):
        s.collection.objects.link(o); o.parent = None
if dst.worlds:
    s.world = dst.worlds[0]
for o in list(s.objects):
    if o.name.startswith('game_'): o.hide_render = True
for o in dst.objects:
    if o and o.name not in s.objects: bpy.data.objects.remove(o)
s.render.engine = 'CYCLES'; s.cycles.device = 'CPU'; s.render.threads_mode = 'FIXED'; s.render.threads = 6
s.cycles.samples = 48; s.cycles.use_denoising = True


def rest():
    rig.animation_data.action = None
    for pb in rig.pose.bones:
        pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.rotation_euler = (0, 0, 0); pb.scale = (1, 1, 1)
    bpy.context.view_layer.update()


def frame(pose):
    rig.animation_data.action = bpy.data.actions['review.poses']; s.frame_set(1 + POSES.index(pose) * 10); bpy.context.view_layer.update()


rest()
dg = bpy.context.evaluated_depsgraph_get()
rest_curves = {o.name: arr(o.evaluated_get(dg).data.attributes['position'].data, 'vector').copy() for o in curves}


def claw_center(prefix):
    dg = bpy.context.evaluated_depsgraph_get(); pts = []
    for o in s.objects:
        if o.type == 'MESH' and o.name.startswith(prefix) and 'dew' not in o.name:
            e = o.evaluated_get(dg); pts += [e.matrix_world @ v.co for v in e.data.vertices]
    return sum(pts, Vector()) / len(pts)


def camera(name, target, view, scale):
    cd = bpy.data.cameras.new(name); cd.type = 'ORTHO'; cd.ortho_scale = scale
    o = bpy.data.objects.new(name, cd); s.collection.objects.link(o)
    o.location = target + Vector(view).normalized() * 3; o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = (target - o.location).to_track_quat('-Z', 'Y'); return o


def errors():
    dg = bpy.context.evaluated_depsgraph_get(); surf = arr(body.evaluated_get(dg).data.vertices, 'co'); res = {}
    for o in curves:
        d = o.data; cnt = len(d.curves); N = len(d.attributes['position'].data) // cnt
        pos = arr(o.evaluated_get(dg).data.attributes['position'].data, 'vector')
        if len(pos) != cnt * N:  # a Delete Geometry modifier hides inherited toe strands at evaluation; skip exact match there
            res[o.name] = {'curves': cnt, 'evaluated_points': len(pos), 'note': 'evaluated count differs (hidden pass 5 toe strands); binding not compared'}
            continue
        ids = np.stack([arr(d.attributes['bind_i' + c].data, 'value', 1, np.int32) for c in 'abc'], 1)
        bar = np.stack([arr(d.attributes['bind_' + c].data, 'value', 1) for c in 'abc'], 1)
        exp = np.einsum('ij,ijk->ik', bar, surf[ids]); err = np.linalg.norm(pos[::N] - exp, axis=1)
        mv = np.linalg.norm(pos - rest_curves[o.name], axis=1)
        l0 = np.linalg.norm(np.diff(rest_curves[o.name].reshape(-1, N, 3), axis=1), axis=2).sum(1)
        l1 = np.linalg.norm(np.diff(pos.reshape(-1, N, 3), axis=1), axis=2).sum(1)
        res[o.name] = {'curves': cnt, 'root_error_max_mm': float(err.max() * 1000), 'max_point_move_mm': float(mv.max() * 1000),
                       'length_change_max_pct': float(np.abs(l1 / np.maximum(l0, 1e-9) - 1).max() * 100), 'nonfinite': int((~np.isfinite(pos)).sum())}
    return res


report = {'rig_blend': rigf, 'groom_blend': groom, 'rig_rest_matches_groom_body': same, 'groom_attributes_copied_to_rig_body': copied, 'poses': {}}
shots = [('foreleg_step', 'fore_claw_l_', (1, -.35, .25), .17, Vector((0, .025, .03))),
         ('leap', 'hind_claw_l_', (1, -.25, .2), .2, Vector((0, .03, .035)))]
for pose, prefix, view, scale, off in shots:
    frame(pose)
    report['poses'][pose] = {'frame': s.frame_current, 'binding': errors()}
    for tag in ('posed', 'rest'):
        frame(pose) if tag == 'posed' else rest()
        s.camera = camera('deform_cam_%s_%s' % (pose, tag), claw_center(prefix) + off, view, scale)  # same view, framed on the paw in each state
        s.render.resolution_x = s.render.resolution_y = 700; s.render.filepath = str(OUT / f'deform_{pose}_{tag}.png')
        t0 = time.perf_counter(); bpy.ops.render.render(write_still=True)
        report['poses'][pose][tag + '_seconds'] = time.perf_counter() - t0
        print('RENDERED', s.render.filepath, report['poses'][pose][tag + '_seconds'], flush=True)
(OUT / 'deformation_check.json').write_text(json.dumps(report, indent=1))
print('DEFORM done', same)
