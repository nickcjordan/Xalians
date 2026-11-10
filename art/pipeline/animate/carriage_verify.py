"""luceras-final: dump the poses that the render-time carriage made (old clips + reskin_furcheck.py offsets) or that the
rebaked clips play on their own (new clips, no offsets), for the bake check.

blender -b CLIPS.blend --python carriage_verify.py -- MODE PARAMS.json OUT.npz
  MODE old   clips from before the bake (anim3): rest = review.poses frame 1 + carriage, idle frames + carriage, the
             signature + the render-time root height offset (rig object z), transitions = signature frame 0 / 59 with
             the carriage eased by the 7-frame weight (exactly reskin_furcheck.py pose() / apply_carriage())
  MODE new   rebaked clips: rest = action 'rest', idle, signature and the 'trans.*' actions as baked, rig at the origin
Writes per pose: world head/tail of every bone, world positions of every 5th evaluated body vertex, and every bone's
local rotation (for the hind-joint check).
"""
import bpy, sys, json, math
import numpy as np
from mathutils import Vector, Matrix, Quaternion

A = sys.argv[sys.argv.index('--') + 1:]
MODE, PARAMS, OUT = A[0], json.load(open(A[1])), A[2]
CAR = PARAMS['carriage']
s = bpy.context.scene; rig = bpy.data.objects['luceras_rig']; body = bpy.data.objects['luceras_blockout']
rig['controls_enabled'] = 0.0; rig.animation_data_create()
POSES = [('rest', 0)] + [('idle', f) for f in (0, 39)] + [('sig', f) for f in (8, 16, 22, 28, 29, 30, 31, 32, 33, 38)] + \
        [('tin', f) for f in range(8)] + [('tout', f) for f in range(8)]
ACT = {'idle': 'idle', 'sig': 'sig.horns-first-descent', 'tin': 'trans.idle-to-sig', 'tout': 'trans.sig-to-idle', 'rest': 'rest'}


def clear():
    rig.location = (0, 0, 0); rig.rotation_euler = (0, 0, 0)
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)


def set_action(name, f):
    rig.animation_data.action = bpy.data.actions[name]; ac = rig.animation_data.action
    if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(ac.slots): rig.animation_data.action_slot = ac.slots[0]
    s.frame_set(f); bpy.context.view_layer.update()


def carriage(car, scale):
    sp = car.get('stance_pitch_deg', 0.0) * scale
    if sp:
        pv = Vector(car['stance_pivot']); R_ = Matrix.Rotation(math.radians(sp), 4, 'X'); T_ = Matrix.Translation(pv) @ R_ @ Matrix.Translation(-pv)
        Ta = rig.matrix_world.inverted() @ T_ @ rig.matrix_world; pr = rig.pose.bones['root']; pr.matrix = Ta @ pr.matrix; bpy.context.view_layer.update()
    for bn, deg in car['bones'].items():
        pb = rig.pose.bones[bn]; pb.rotation_quaternion = pb.rotation_quaternion @ Quaternion((1, 0, 0), math.radians(deg * scale))
    bpy.context.view_layer.update()


def tw(kind, f, n=7):
    t = min(max(f / n, 0.0), 1.0); sm = t * t * (3 - 2 * t); return 1.0 - sm if kind == 'tin' else sm


def pose(kind, f):
    clear()
    if MODE == 'old':
        if kind == 'rest': set_action('review.poses', 1); carriage(CAR['rest'], 1.0)
        elif kind == 'idle': set_action('idle', f); carriage(CAR['idle'], 1.0)
        elif kind == 'sig':
            set_action('sig.horns-first-descent', f); dz = CAR['sig_root_dz'].get(str(f), 0.0)
            if dz: rig.location = (0, 0, dz); bpy.context.view_layer.update()
        else:
            set_action('sig.horns-first-descent', 0 if kind == 'tin' else CAR.get('transition_sig_frame_out', 59)); carriage(CAR['idle'], tw(kind, f, CAR.get('transition_frames', 7)))
    else:
        set_action(ACT[kind], f)


out = {}; meta = []
for kind, f in POSES:
    pose(kind, f); key = f'{kind}_{f:02d}'
    W = rig.matrix_world
    out[key + '_bones'] = np.array([[*(W @ pb.head), *(W @ pb.tail)] for pb in rig.pose.bones])
    out[key + '_local'] = np.array([list(pb.matrix_basis.to_quaternion()) + list(pb.matrix_basis.translation) for pb in rig.pose.bones])
    dg = bpy.context.evaluated_depsgraph_get(); e = body.evaluated_get(dg); m = e.to_mesh()
    V = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', V); e.to_mesh_clear()
    V = V.reshape(-1, 3)[::5]; Wb = np.array(body.matrix_world); out[key + '_body'] = V @ Wb[:3, :3].T + Wb[:3, 3]
    meta.append(key); print('POSE', MODE, key, flush=True)
gn_ = [g.name for g in body.vertex_groups]; dom_ = []
for v in list(body.data.vertices)[::5]:
    dom_.append(gn_[max(v.groups, key=lambda x: x.weight).group] if len(v.groups) else '')
np.savez_compressed(OUT, names=np.array([pb.name for pb in rig.pose.bones]), keys=np.array(meta), body_dom=np.array(dom_), **out)
print('VERIFY dump done', MODE, flush=True)
