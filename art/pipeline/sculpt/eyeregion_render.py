"""Luceras eye-region rebuild: view-board renders of a saved scene of record (no rebuild of the scene).

Poses and cameras follow art/pipeline/rig/reskin_furcheck.py exactly (review 'rest' pose plus the appeal carriage and
stance pitch from the head params file; 'face', 'face_front', 'face_side' oblique cameras fitted to the head; the 1.5 m
'side' sprite cell). The scene keeps its own studio light, render settings and materials.

Usage: blender -b SCENE.blend --python eyeregion_render.py -- OUTDIR PARAMS.json VIEWS [clay|fur|both] [eyes]
  VIEWS  comma list of face, face_front, face_side, side, eye_l (a close crop camera on the left eye), eye_r
"""
import bpy, sys, json, os, math
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion

A = sys.argv[sys.argv.index('--') + 1:]
OUT = Path(A[0]); HP = json.loads(Path(A[1]).read_text()); VIEWS = A[2].split(','); MODE = A[3] if len(A) > 3 else 'both'
sys.path.insert(0, '/mnt/c/dev/src/xalians-creature-pipeline/art/pipeline/roster')
import lookdev  # noqa: E402
s = bpy.context.scene
body = bpy.data.objects['luceras_blockout']; rig = bpy.data.objects['luceras_rig']
POSE_ORDER = 'rest,crouch,leap,landing,head_left_up,tail_side_up,foreleg_step,breath_in,crouch_deep,landing_old'.split(',')
OBLIQUE = {'face': (35.0, 4.0), 'face_front': (0.0, 4.0), 'face_side': (270.0, 4.0)}
s.render.threads_mode = 'FIXED'; s.render.threads = int(os.environ.get('FUR_THREADS', '12'))
s.cycles.samples = int(os.environ.get('FUR_SAMPLES', '40'))


def arr(items, key, n=3, dt=np.float32):
    a = np.empty(len(items) * n, dt); items.foreach_get(key, a)
    return a.reshape(-1, n) if n > 1 else a


def pose_rest():
    rig.location = (0, 0, 0); rig.rotation_euler = (0, 0, 0)
    for pb_ in rig.pose.bones:
        pb_.rotation_mode = 'QUATERNION'; pb_.rotation_quaternion = (1, 0, 0, 0); pb_.location = (0, 0, 0); pb_.scale = (1, 1, 1)
    rig.animation_data.action = bpy.data.actions['review.poses']; s.frame_set(1 + 10 * POSE_ORDER.index('rest'))
    ac = rig.animation_data.action
    if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(ac.slots): rig.animation_data.action_slot = ac.slots[0]
    bpy.context.view_layer.update()
    car = HP.get('carriage') or {}
    sp = HP.get('stance_pitch_deg', 0.0)
    if sp:
        pv = Vector(HP['stance_pivot']); R_ = Matrix.Rotation(math.radians(sp), 4, 'X'); T_ = Matrix.Translation(pv) @ R_ @ Matrix.Translation(-pv)
        Ri = rig.matrix_world.inverted(); Ta = Ri @ T_ @ rig.matrix_world
        pr = rig.pose.bones['root']; pr.matrix = Ta @ pr.matrix; bpy.context.view_layer.update()
    for bn, deg in car.items():
        pb = rig.pose.bones.get(bn)
        if pb is None: continue
        pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = pb.rotation_quaternion @ Quaternion((1, 0, 0), math.radians(deg))
    bpy.context.view_layer.update()


_gn = [x.name for x in body.vertex_groups]
_W = np.zeros((len(body.data.vertices), len(_gn)), np.float32)
for _v in body.data.vertices:
    for _g in _v.groups: _W[_v.index, _g.group] = _g.weight
_DOM = np.array(_gn)[_W.argmax(1)]
HEADM = np.isin(_DOM, ['head_01', 'jaw_01', 'ear_l_01', 'ear_r_01', 'ear_l_02', 'ear_r_02'])
GROUND = [o for o in s.objects if o.name.startswith('lookdev_ground')]


def evbody():
    dg = bpy.context.evaluated_depsgraph_get(); e = body.evaluated_get(dg); m = e.to_mesh(); V = arr(m.vertices, 'co'); e.to_mesh_clear()
    W = np.array(body.matrix_world); return V @ W[:3, :3].T + W[:3, 3]


def cam_oblique(view):
    az, el = OBLIQUE[view]
    V = evbody()[HEADM]; lo, hi = V.min(0), V.max(0); pad = 0.004
    cam = lookdev.place_camera('furcheck_' + view, (Vector((lo - pad).tolist()), Vector((hi + pad).tolist())), az, el, 0.05)
    s.render.resolution_x = 960; s.render.resolution_y = 960; s.camera = cam; bpy.context.view_layer.update(); return cam


def cam_side():
    cam = lookdev.place_camera('furcheck_side', (Vector((-0.2, -0.6, 0.0)), Vector((0.2, 0.6, 0.9))), 270.0, 0.0, 0.05)
    cam.data.ortho_scale = 1.5; cam.data.shift_x = cam.data.shift_y = 0.0
    s.render.resolution_x = 960; s.render.resolution_y = 640; s.render.resolution_percentage = 100; s.camera = cam
    for o in GROUND: o.hide_render = False
    V = evbody(); lo, hi = V.min(0), V.max(0); cam.location = (cam.location.x, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2)
    cam.data.ortho_scale = max(1.5, (hi[1] - lo[1]) * 1.1, (hi[2] - lo[2]) * 1.1 * 1.5)
    bpy.context.view_layer.update(); return cam


def cam_eye(side):
    """Close camera on one eye along the bisector of the eye's opening axis and the front, 960 px, about 70 mm wide."""
    eo = bpy.data.objects['eye_' + side]; dg = bpy.context.evaluated_depsgraph_get(); e = eo.evaluated_get(dg); m = e.to_mesh()
    V = arr(m.vertices, 'co') @ np.array(e.matrix_world)[:3, :3].T + np.array(e.matrix_world)[:3, 3]; e.to_mesh_clear(); c = V.mean(0)
    sx = 1.0 if c[0] > 0 else -1.0; d = np.array([sx * 0.55, -1.0, 0.12]); d /= np.linalg.norm(d)
    data = bpy.data.cameras.get('eye_cam') or bpy.data.cameras.new('eye_cam'); data.type = 'ORTHO'; data.ortho_scale = 0.095; data.clip_start = 0.01
    cam = bpy.data.objects.get('eye_cam') or bpy.data.objects.new('eye_cam', data)
    if cam.name not in s.collection.objects: s.collection.objects.link(cam)
    cam.location = Vector((c + d * 1.0).tolist()); cam.rotation_euler = Vector((-d).tolist()).to_track_quat('-Z', 'Y').to_euler()
    s.render.resolution_x = 960; s.render.resolution_y = 960; s.camera = cam; bpy.context.view_layer.update(); return cam


curves = [o for o in s.objects if o.type == 'CURVES']
fur_vis = {o.name: o.hide_render for o in curves}
clay = bpy.data.materials.get('furcheck_clay') or bpy.data.materials.new('furcheck_clay'); clay.use_nodes = True
bs = clay.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value = (0.09, 0.09, 0.09, 1); bs.inputs['Roughness'].default_value = 0.8
skin_mats = list(body.data.materials)


def set_clay(on):
    for o in curves: o.hide_render = True if on else fur_vis[o.name]
    for i in range(len(body.data.materials)): body.data.materials[i] = clay if on else skin_mats[i]


def pose_clip(clip, f):
    # motion check: a frame of an approved clip, rig in place (no carriage), as reskin_furcheck.py pose() does
    rig.location = (0, 0, 0); rig.rotation_euler = (0, 0, 0)
    for pb_ in rig.pose.bones:
        pb_.rotation_mode = 'QUATERNION'; pb_.rotation_quaternion = (1, 0, 0, 0); pb_.location = (0, 0, 0); pb_.scale = (1, 1, 1)
    rig.animation_data.action = bpy.data.actions[clip]; ac = rig.animation_data.action
    if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(ac.slots): rig.animation_data.action_slot = ac.slots[0]
    s.frame_set(f); bpy.context.view_layer.update()


POSE = os.environ.get('ER_POSE', 'rest')
if POSE == 'rest': pose_rest()
else:
    _c, _f = POSE.rsplit(':', 1); pose_clip({'sig': 'sig.horns-first-descent'}.get(_c, _c), int(_f))
OUT.mkdir(parents=True, exist_ok=True); done = []
TAG = 'rest' if POSE == 'rest' else POSE.replace(':', '_f')
modes = {'clay': (True,), 'fur': (False,), 'both': (False, True)}[MODE]
for v in VIEWS:
    if v == 'side': cam_side()
    elif v.startswith('eye_'): cam_eye(v[-1])
    else: cam_oblique(v)
    for c_ in modes:
        set_clay(c_); bpy.context.view_layer.update()
        p = OUT / f'{TAG}_{v}_{"clay" if c_ else "fur"}.png'; s.render.filepath = str(p); bpy.ops.render.render(write_still=True); done.append(p.name)
        print('RENDER', p.name, flush=True)
    set_clay(False)
print('EYEREGION render done', done, flush=True)
