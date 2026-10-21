"""B-hxhq: posed plume frames from the baked clips (luceras-neck pass2 clips.blend, read only).

Appends every hair-curves object, the plume spine proxy, the studio and the world from the pass 8 groom.blend into
clips.blend, retargets the body surface trees to the clip body and the proxy Armature modifier and parent to the clip
luceras_rig, then plays the signature clip at its apex (highest spine_03) and the idle clip at its largest tail sway,
renders a plume-centred frame of each, and measures plume root binding on the evaluated proxy. Nothing is saved.
Usage: blender -b --python posed_pass8.py -- GROOM CLIPS OUT
"""
import bpy, sys, json, time, numpy as np
from pathlib import Path
from mathutils import Vector

groom, clips, out = sys.argv[sys.argv.index('--') + 1:][:3]
OUT = Path(out)
bpy.ops.wm.open_mainfile(filepath=clips)
s = bpy.context.scene
body = bpy.data.objects['luceras_blockout']
rig = bpy.data.objects['luceras_rig']


def arr(items, key, n=3, dt=np.float32):
    a = np.empty(len(items) * n, dt); items.foreach_get(key, a)
    return a.reshape(-1, n) if n > 1 else a


with bpy.data.libraries.load(groom, link=False) as (src, dst):
    dst.objects = [n for n in src.objects if n.startswith(('Plume', 'Luceras', 'Pass7', 'Eyelid', 'luceras_plume_spine', 'luceras_blockout', 'lookdev_'))]
    dst.worlds = list(src.worlds)
objs = [o for o in dst.objects if o]
gbody = [o for o in objs if o.type == 'MESH' and o.name.startswith('luceras_blockout')][0]
proxy = [o for o in objs if o.name.startswith('luceras_plume_spine')][0]
curves = [o for o in objs if o.type == 'CURVES']
mw = body.matrix_world.copy()
s.collection.objects.link(proxy); proxy.parent = rig; proxy.matrix_world = mw
for m in proxy.modifiers:
    if m.type == 'ARMATURE': m.object = rig
for o in curves:
    s.collection.objects.link(o); o.parent = None; o.matrix_world = mw
    if not o.name.startswith('Plume'): o.data.surface = body
    for m in o.modifiers:
        if m.type == 'NODES' and m.node_group:
            for n in m.node_group.nodes:
                if n.bl_idname == 'GeometryNodeObjectInfo' and n.inputs['Object'].default_value == gbody:
                    n.inputs['Object'].default_value = body
copied = []
for a in gbody.data.attributes:
    if a.name.startswith('.') or a.name in body.data.attributes or a.domain not in ('POINT', 'CORNER', 'FACE') or a.data_type not in ('FLOAT', 'FLOAT_COLOR', 'FLOAT_VECTOR'):
        continue
    key = {'FLOAT_VECTOR': 'vector', 'FLOAT_COLOR': 'color'}.get(a.data_type, 'value'); n = {'FLOAT_VECTOR': 3, 'FLOAT_COLOR': 4}.get(a.data_type, 1)
    v = np.empty(len(a.data) * n, np.float32); a.data.foreach_get(key, v)
    body.data.attributes.new(a.name, a.data_type, a.domain).data.foreach_set(key, v); copied.append(a.name)
body.data.materials.clear()
for m in gbody.data.materials: body.data.materials.append(m)
body.data.polygons.foreach_set('material_index', arr(gbody.data.polygons, 'material_index', 1, np.int32)); body.data.update()
for o in objs:
    if o.type == 'LIGHT' or o.name.startswith('lookdev_ground'):
        s.collection.objects.link(o); o.parent = None
if dst.worlds: s.world = dst.worlds[0]
for o in list(s.objects):
    if o.name.startswith(('game_', 'whiskers_')): o.hide_render = True
for o in objs:
    if o.name not in s.objects: bpy.data.objects.remove(o)
s.render.engine = 'CYCLES'; s.cycles.device = 'CPU'; s.render.threads_mode = 'FIXED'; s.render.threads = 6
s.cycles.samples = 48; s.cycles.use_denoising = True; s.view_settings.view_transform = 'Standard'
rig.animation_data_create()


def play(action, f):
    ac = bpy.data.actions[action]; rig.animation_data.action = ac
    if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(ac.slots):
        rig.animation_data.action_slot = ac.slots[0]
    s.frame_set(f); bpy.context.view_layer.update()


def bone_world(name, end='head'):
    pb = rig.pose.bones[name]; return rig.matrix_world @ (pb.head if end == 'head' else pb.tail)


rig.animation_data.action = None
for pb in rig.pose.bones:
    pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.rotation_euler = (0, 0, 0); pb.scale = (1, 1, 1)
bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
rest = {o.name: arr(o.evaluated_get(dg).data.attributes['position'].data, 'vector').copy() for o in curves if o.name.startswith('Plume')}
rest_dir = (bone_world('tail_06', 'tail') - bone_world('tail_05')).normalized()
sig = 'sig.horns-first-descent'; best = None
for f in range(0, 61):
    play(sig, f); z = bone_world('spine_03').z
    if best is None or z > best[1]: best = (f, z)
apex = best[0]; best = None
for f in range(0, 91):
    play('idle', f); v = (bone_world('tail_06', 'tail') - bone_world('tail_05')).normalized(); ang = v.angle(rest_dir)
    if best is None or ang > best[1]: best = (f, ang)
idle = best[0]
report = {'groom': groom, 'clips': clips, 'attributes_copied': copied, 'frames': {}}
for tag, action, f in (('posed_apex', sig, apex), ('posed_idle', 'idle', idle)):
    play(action, f); dg = bpy.context.evaluated_depsgraph_get()
    pe = proxy.evaluated_get(dg); pvl = arr(pe.data.vertices, 'co'); pv = np.array([(pe.matrix_world @ v.co)[:] for v in pe.data.vertices])
    res = {}
    for o in curves:
        if not o.name.startswith('Plume'): continue
        d = o.data; cnt = len(d.curves); N = len(d.attributes['position'].data) // cnt
        pos = arr(o.evaluated_get(dg).data.attributes['position'].data, 'vector')
        ids = np.stack([arr(d.attributes['bind_i' + c].data, 'value', 1, np.int32) for c in 'abc'], 1)
        bar = np.stack([arr(d.attributes['bind_' + c].data, 'value', 1) for c in 'abc'], 1)
        err = np.linalg.norm(pos[::N] - np.einsum('ij,ijk->ik', bar, pvl[ids]), axis=1)
        l0 = np.linalg.norm(np.diff(rest[o.name].reshape(-1, N, 3), axis=1), axis=2).sum(1); l1 = np.linalg.norm(np.diff(pos.reshape(-1, N, 3), axis=1), axis=2).sum(1)
        res[o.name] = {'curves': cnt, 'root_error_max_mm': float(err.max() * 1000), 'max_point_move_mm': float(np.linalg.norm(pos - rest[o.name], axis=1).max() * 1000),
                       'length_change_max_pct': float(np.abs(l1 / np.maximum(l0, 1e-9) - 1).max() * 100), 'nonfinite': int((~np.isfinite(pos)).sum())}
    center = Vector(pv.mean(0)); target = (center * .6 + bone_world('tail_03') * .4)
    cd = bpy.data.cameras.new('cam_' + tag); cd.type = 'ORTHO'; cd.ortho_scale = .9; cd.clip_end = 30
    cam = bpy.data.objects.new(cd.name, cd); s.collection.objects.link(cam)
    view = Vector((1, -.25, .12)).normalized(); cam.location = target + view * 6; cam.rotation_mode = 'QUATERNION'; cam.rotation_quaternion = (-view).to_track_quat('-Z', 'Y')
    s.camera = cam; s.render.resolution_x = s.render.resolution_y = 800; s.render.filepath = str(OUT / (tag + '.png'))
    t0 = time.perf_counter(); bpy.ops.render.render(write_still=True); sec = time.perf_counter() - t0
    report['frames'][tag] = {'action': action, 'frame': f, 'seconds': sec, 'tail_06_angle_from_rest_deg': float(np.degrees((bone_world('tail_06', 'tail') - bone_world('tail_05')).normalized().angle(rest_dir))), 'plume_binding': res}
    print('RENDERED', tag, action, f, round(sec, 1), flush=True)
(OUT / 'posed_check.json').write_text(json.dumps(report, indent=1))
print('POSED done')
