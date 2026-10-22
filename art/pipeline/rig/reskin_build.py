"""B-sntv: re-skin the Luceras sprite sculpt (scapula girdle, heat weights, volume, correctives, review poses).

blender -b --python reskin_build.py -- RIG_IN.blend WEIGHTS.npz SKEL.json CONFIG.json OUT.blend REPORT.json

Inputs are opened read-only; the result is saved to OUT.blend only.
  1 skeleton   scapula_l / scapula_r (sprite-only deform bones, children of spine_05, dorsal border to shoulder joint),
               each aimed by a Damped Track at a non-deform helper scapula_*_aim parented to the upper arm, so the blade
               swings with the arm (the existing clips drive it without new keys); every existing bone name is kept
  2 weights    heat weights from reskin_weights.py on the sculpt body (all old groups kept by name, plus the scapulae)
  3 volume     Armature (linear) + optional dual-quaternion blend through a vertex-group mask (multi-modifier), then a
               Corrective Smooth (delta mush, rest = original coordinates) masked off the rigid head
  4 correctives the six old PSD keys are removed; new ones are added later by reskin_corrective.py only if needed
  5 review.poses rewritten: plausible extremes, same names and frames (1 + 10 * index)
"""
import bpy, sys, json, math
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion

A = sys.argv[sys.argv.index('--') + 1:]
RIG_IN, WPATH, SKP, CFGP, OUTB, REPP = A[:6]
SK = json.load(open(SKP)); CFG = json.load(open(CFGP))
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'animate'))
_argv = sys.argv; sys.argv = ['x', '--', str(Path(OUTB).parent / 'posetmp'), 'none']
import pose_rig as PR   # only the Poser class is used
sys.argv = _argv

bpy.ops.wm.open_mainfile(filepath=RIG_IN)
sc = bpy.context.scene
rig = bpy.data.objects['luceras_rig']; rig['controls_enabled'] = 0.0
rig.animation_data_create(); rig.animation_data.action = None
body = bpy.data.objects['luceras_blockout']; me = body.data
rep = {'config': CFG}

# ------------------------------------------------------------------------------------------- 1 skeleton
bpy.context.view_layer.objects.active = rig
for o in bpy.context.view_layer.objects: o.select_set(False)
rig.select_set(True); rig.hide_set(False)
bpy.ops.object.mode_set(mode='EDIT')
eb = rig.data.edit_bones
new_bones = []
for side in ('l', 'r'):
    nm = f'scapula_{side}'
    h, t = SK['extra_bones'][nm]
    b = eb.new(nm); b.head = Vector(h); b.tail = Vector(t); b.parent = eb['spine_05']; b.use_connect = False
    b.align_roll(Vector((1, 0, 0)) if side == 'l' else Vector((-1, 0, 0)))
    b.use_deform = True; b.inherit_scale = 'NONE'
    u = (Vector(t) - Vector(h)).normalized()
    a = eb.new(nm + '_aim'); a.head = Vector(t) + u * CFG['scap_aim_dist']; a.tail = a.head + u * 0.02
    a.parent = eb[f'leg_f{side}_01']; a.use_connect = False; a.use_deform = False
    new_bones += [nm, nm + '_aim']
bpy.ops.object.mode_set(mode='OBJECT')
for nm in new_bones:
    bn = rig.data.bones[nm]; bn['sprite_only'] = True
    bn['role'] = ('B-sntv shoulder girdle: the shoulder blade slides on the ribs and swings with the upper arm (Damped Track at '
                  'scapula_*_aim, a child of the upper arm); sprite renders only, the parked game mesh has no weights on it'
                  if not nm.endswith('_aim') else 'B-sntv: aim point for the scapula, carried by the upper arm (non-deform)')
for side in ('l', 'r'):
    pb = rig.pose.bones[f'scapula_{side}']; pb.rotation_mode = 'QUATERNION'
    c = pb.constraints.new('DAMPED_TRACK'); c.name = 'girdle follows upper arm'
    c.target = rig; c.subtarget = f'scapula_{side}_aim'; c.track_axis = 'TRACK_Y'; c.influence = CFG['scap_influence']
    rig.pose.bones[f'scapula_{side}_aim'].rotation_mode = 'QUATERNION'
prev = eval(rig.get('sprite_only_bones', '[]')) if isinstance(rig.get('sprite_only_bones'), str) else []
rig['sprite_only_bones'] = str(list(prev) + new_bones)
rig['build_id'] = 'B-sntv'
for k in ('review_crouch_keel_fix',):
    if k in rig.keys(): del rig[k]
rep['new_bones'] = {nm: dict(head=list(rig.data.bones[nm].head_local), tail=list(rig.data.bones[nm].tail_local),
                             parent=rig.data.bones[nm].parent.name, deform=rig.data.bones[nm].use_deform) for nm in new_bones}

# ------------------------------------------------------------------------------------------- 4 correctives off
rep['removed_shape_keys'] = [k.name for k in me.shape_keys.key_blocks] if me.shape_keys else []
if me.shape_keys:
    if me.shape_keys.animation_data: me.shape_keys.animation_data_clear()
    body.shape_key_clear()

# ------------------------------------------------------------------------------------------- optional sculpt patches
if CFG.get('patch'):
    P = np.load(CFG['patch']); idx = P['idx']; new = P['co']
    co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    rep['patch'] = dict(vertices=int(len(idx)), max_move_mm=float(np.linalg.norm(co[idx] - new, axis=1).max() * 1000))
    co[idx] = new; me.vertices.foreach_set('co', co.ravel()); me.update()

# ------------------------------------------------------------------------------------------- 2 weights
WZ = np.load(WPATH); Wn = WZ['W']; names = [str(x) for x in WZ['names']]
old_names = [g.name for g in body.vertex_groups]
body.vertex_groups.clear()
for nm in old_names + [n for n in names if n not in old_names]:
    body.vertex_groups.new(name=nm)
Q = np.round(Wn * 4096).astype(np.int32)
for j, nm in enumerate(names):
    vg = body.vertex_groups[nm]
    col = Q[:, j]; nzi = np.nonzero(col)[0]
    for q in np.unique(col[nzi]):
        ids = nzi[col[nzi] == q]
        vg.add(ids.tolist(), float(q) / 4096.0, 'REPLACE')
# masks
fixed = WZ['fixed']
def set_group(nm, w):
    vg = body.vertex_groups.get(nm) or body.vertex_groups.new(name=nm)
    q = np.round(np.clip(w, 0, 1) * 256).astype(int)
    for v in np.unique(q):
        if v == 0: continue
        vg.add(np.nonzero(q == v)[0].tolist(), v / 256.0, 'REPLACE')
headw = np.zeros(len(me.vertices))
for nm in ('head_01', 'jaw_01', 'ear_l_01', 'ear_r_01'):
    if nm in names: headw += Wn[:, names.index(nm)]
cs_mask = 1.0 - np.clip((headw - 0.6) / 0.4, 0, 1)
set_group('cs_mask', cs_mask)
dq = np.zeros(len(me.vertices))
for nm in CFG.get('dq_bones', []):
    dq += Wn[:, names.index(nm)]
set_group('dq_mask', np.clip(dq, 0, 1) * CFG.get('dq_amount', 0.0))
rep['weights'] = dict(influences_hist=np.bincount((Wn > 0).sum(1)).tolist())

# ------------------------------------------------------------------------------------------- 3 volume
arm = [m for m in body.modifiers if m.type == 'ARMATURE'][0]
arm.use_deform_preserve_volume = False
for m in list(body.modifiers):
    if m.name != arm.name: body.modifiers.remove(m)
if CFG.get('dq_amount', 0) > 0:
    dqm = body.modifiers.new('Armature DQ', 'ARMATURE'); dqm.object = rig; dqm.use_deform_preserve_volume = True
    dqm.use_multi_modifier = True; dqm.vertex_group = 'dq_mask'
if CFG.get('cs_iterations', 0) > 0:
    cs = body.modifiers.new('Corrective Smooth', 'CORRECTIVE_SMOOTH')
    cs.rest_source = 'ORCO'; cs.smooth_type = CFG.get('cs_type', 'LENGTH_WEIGHTED'); cs.iterations = CFG['cs_iterations']
    cs.factor = CFG['cs_factor']; cs.scale = CFG.get('cs_scale', 1.0); cs.use_only_smooth = False; cs.use_pin_boundary = False
    cs.vertex_group = 'cs_mask'
rep['modifiers'] = [(m.type, m.name) for m in body.modifiers]

# ------------------------------------------------------------------------------------------- 5 review poses
poser = PR.Poser(rig)
X = Vector((1, 0, 0)); Y = Vector((0, 1, 0)); Z = Vector((0, 0, 1))


def extra(rots):
    for nm, axis, deg in rots:
        poser.rot(nm, {'X': X, 'Y': Y, 'Z': Z, '-X': -X}[axis], deg)
    bpy.context.view_layer.update()


def pose(name):
    P = CFG['poses'].get(name, {})
    poser.pin_local = None
    spec = dict(P.get('spec', {}))
    if 'body' in spec: spec['body'] = tuple(spec['body'])
    if 'neck' in spec: spec['neck'] = tuple(spec['neck'])
    if 'tail' in spec: spec['tail'] = [tuple(t) for t in spec['tail']]
    if 'legs' in spec: spec['legs'] = {k: {kk: (tuple(vv) if isinstance(vv, list) else vv) for kk, vv in v.items()} for k, v in spec['legs'].items()}
    poser.apply(spec)
    extra(P.get('extra', []))
    if P.get('breath_scale'):
        for n in ('spine_03', 'spine_04', 'spine_05'): rig.pose.bones[n].scale = tuple(P['breath_scale'])
    bpy.context.view_layer.update()


old = bpy.data.actions.get('review.poses')
if old: bpy.data.actions.remove(old)
act = bpy.data.actions.new('review.poses'); act.use_fake_user = True
rig.animation_data.action = act
POSES = ['rest', 'crouch', 'leap', 'landing', 'head_left_up', 'tail_side_up', 'foreleg_step', 'breath_in']
store = []
for i, nm in enumerate(POSES):
    pose(nm)
    store.append({p.name: (tuple(p.location), tuple(p.rotation_quaternion), tuple(p.scale)) for p in rig.pose.bones})
for i, st in enumerate(store):
    for bn, (loc, q, s) in st.items():
        p = rig.pose.bones[bn]; p.rotation_mode = 'QUATERNION'; p.location = loc; p.rotation_quaternion = q; p.scale = s
        for prop in ('location', 'rotation_quaternion', 'scale'): p.keyframe_insert(prop, frame=1 + 10 * i, group=bn)
try:
    for fc in act.layers[0].strips[0].channelbags[0].fcurves:
        for k in fc.keyframe_points: k.interpolation = 'CONSTANT'
except Exception:
    pass
rig.animation_data.action = None; poser.reset(); bpy.context.view_layer.update()
rep['review_poses'] = {nm: CFG['poses'].get(nm, {}) for nm in POSES}

body['reskin_build'] = 'B-sntv'
bpy.ops.wm.save_as_mainfile(filepath=OUTB)
Path(REPP).write_text(json.dumps(rep, indent=1, default=str))
print('BUILD done', rep['modifiers'], flush=True)
