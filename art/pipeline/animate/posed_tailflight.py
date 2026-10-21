"""B-378v: furred posed frames of the signature with the pass 9 groom (Cycles), before and after the plume bones.

Same setup as art/pipeline/groom/posed_pass8.py: appends every hair-curves object, the studio and the world from the
groom into the clips file, retargets the body surface trees to the clip body. Difference: the plume spine tube is
the one already in the clips file (after: reweighted along tail_06..tail_09 by tailflight_rig.py; before: the pass 9
weights), so every plume strand is re-pointed at that tube. Renders the named frames with a camera that frames the
hindquarters, tail and plume, and measures plume root binding on the evaluated tube. Nothing is saved.
Usage: blender -b --python posed_tailflight.py -- GROOM CLIPS OUT TAG frame:label[,frame:label...]
"""
import bpy, sys, json, time, numpy as np
from pathlib import Path
from mathutils import Vector

groom, clips, out, tag, spec = sys.argv[sys.argv.index('--') + 1:][:5]
FRAMES = [(int(x.split(':')[0]), x.split(':')[1]) for x in spec.split(',')]
OUT = Path(out); OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=clips)
s = bpy.context.scene
body = bpy.data.objects['luceras_blockout']
rig = bpy.data.objects['luceras_rig']
proxy = bpy.data.objects['luceras_plume_spine']
for o in list(s.objects):
    if o.name == 'plume_standin': o.hide_render = True


def arr(items, key, n=3, dt=np.float32):
    a = np.empty(len(items) * n, dt); items.foreach_get(key, a)
    return a.reshape(-1, n) if n > 1 else a


with bpy.data.libraries.load(groom, link=False) as (src, dst):
    dst.objects = [n for n in src.objects if n.startswith(('Plume', 'Luceras', 'Pass7', 'Eyelid', 'luceras_blockout', 'lookdev_'))]
    dst.worlds = list(src.worlds)
objs = [o for o in dst.objects if o]
gbody = [o for o in objs if o.type == 'MESH' and o.name.startswith('luceras_blockout')][0]
curves = [o for o in objs if o.type == 'CURVES']
gproxy = next((o for o in bpy.data.objects if o.name.startswith('luceras_plume_spine') and o is not proxy), None)
mw = body.matrix_world.copy()
for o in curves:
    s.collection.objects.link(o); o.parent = None; o.matrix_world = mw
    o.data.surface = proxy if o.name.startswith('Plume') else body
    for m in o.modifiers:
        if m.type == 'NODES' and m.node_group:
            for n in m.node_group.nodes:
                if n.bl_idname == 'GeometryNodeObjectInfo':
                    v = n.inputs['Object'].default_value
                    if v == gbody: n.inputs['Object'].default_value = body
                    elif v is not None and v.name.startswith('luceras_plume_spine'): n.inputs['Object'].default_value = proxy
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
if gproxy is not None and gproxy.name in bpy.data.objects and gproxy.name not in s.objects: bpy.data.objects.remove(gproxy)
s.render.engine = 'CYCLES'; s.cycles.device = 'CPU'; s.render.threads_mode = 'FIXED'; s.render.threads = 6
s.cycles.samples = 48; s.cycles.use_denoising = True; s.view_settings.view_transform = 'Standard'
rig.animation_data_create()
SIG = 'sig.horns-first-descent'


def play(action, f):
    ac = bpy.data.actions[action]; rig.animation_data.action = ac
    if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(ac.slots):
        rig.animation_data.action_slot = ac.slots[0]
    s.frame_set(f); bpy.context.view_layer.update()


def bone_world(name, end='head'):
    pb = rig.pose.bones[name]; return rig.matrix_world @ (pb.head if end == 'head' else pb.tail)


report = {'groom': groom, 'clips': clips, 'tag': tag, 'attributes_copied': copied, 'plume_objects': [o.name for o in curves if o.name.startswith('Plume')], 'frames': {}}
view = Vector((1, -.25, .12)).normalized()
for f, label in FRAMES:
    play(SIG, f); dg = bpy.context.evaluated_depsgraph_get()
    pe = proxy.evaluated_get(dg); pvl = arr(pe.data.vertices, 'co'); pv = np.array([(pe.matrix_world @ v.co)[:] for v in pe.data.vertices])
    res = {}
    for o in curves:
        if not o.name.startswith('Plume'): continue
        d = o.data; cnt = len(d.curves); N = len(d.attributes['position'].data) // cnt
        pos = arr(o.evaluated_get(dg).data.attributes['position'].data, 'vector')
        ids = np.stack([arr(d.attributes['bind_i' + c].data, 'value', 1, np.int32) for c in 'abc'], 1)
        bar = np.stack([arr(d.attributes['bind_' + c].data, 'value', 1) for c in 'abc'], 1)
        err = np.linalg.norm(pos[::N] - np.einsum('ij,ijk->ik', bar, pvl[ids]), axis=1)
        res[o.name] = {'curves': cnt, 'root_error_max_mm': float(err.max() * 1000), 'nonfinite': int((~np.isfinite(pos)).sum())}
    # frame the hindquarters, tail and plume
    pts = np.vstack([pv, np.array([bone_world('spine_02')[:], bone_world('tail_01')[:]])])
    right = view.cross(Vector((0, 0, 1))).normalized(); up = right.cross(view).normalized()
    u = pts @ np.array(right[:]); w = pts @ np.array(up[:])
    c = Vector(pts.mean(0)); c = c + right * float((u.max() + u.min()) / 2 - u.mean()) + up * float((w.max() + w.min()) / 2 - w.mean())
    cd = bpy.data.cameras.new(f'cam_{tag}_{f}'); cd.type = 'ORTHO'; cd.ortho_scale = max(0.9, 1.3 * float(max(u.max() - u.min(), w.max() - w.min()))); cd.clip_end = 30
    cam = bpy.data.objects.new(cd.name, cd); s.collection.objects.link(cam)
    cam.location = c + view * 6; cam.rotation_mode = 'QUATERNION'; cam.rotation_quaternion = (-view).to_track_quat('-Z', 'Y')
    s.camera = cam; s.render.resolution_x = s.render.resolution_y = 800; name = f'{tag}_f{f:02d}_{label}.png'; s.render.filepath = str(OUT / name)
    t0 = time.perf_counter(); bpy.ops.render.render(write_still=True); sec = time.perf_counter() - t0
    report['frames'][name] = {'frame': f, 'label': label, 'seconds': round(sec, 1), 'ortho_scale': cd.ortho_scale,
                              'root_error_max_mm': max(r['root_error_max_mm'] for r in res.values()), 'nonfinite': sum(r['nonfinite'] for r in res.values()), 'plume_binding': res}
    print('RENDERED', name, round(sec, 1), flush=True)
(OUT / f'posed_{tag}.json').write_text(json.dumps(report, indent=1))
print('POSED done')
