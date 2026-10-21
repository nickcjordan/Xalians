"""B-bafy: a crouch elbow-chest corrective authored at the signature's deepest crouch (frame 8).

blender -b --factory-startup --python chest_corrective.py -- CLIPS OUT_DIR MODE [OUT_RIG]
MODE try:   build the keys in memory, report the region curvature before and after at frame 8 and the driver value
            on every frame of both clips; render review and curvature crops. Nothing is saved.
MODE apply: the same, then write OUT_DIR/chest_keys.npz (key coordinates) next to corrective_apply.json.
MODE install: CLIPS is a rig file; add the two keys and drivers from OUT_DIR and save OUT_RIG (input never written).

Why (see report): in the planted crouch the foreleg folds 39 deg more at the elbow and the humerus swings 18 deg out
and back, so the back edge of the upper arm (triceps) stands off the chest as a long ridge and the elbow point juts
out behind it at the belly line. The approved elbow-crouch correctives only reach 0.29 there: their driver peaks
at the deeper flexion of the rig's review crouch pose. The posed-space fix follows pass2_correctives.py: smooth the
posed surface inside a mask (the back of the upper arm, the elbow point and the chest wall behind them), cap the
displacement, inverse-skin it to a shape key per side, and drive it from the same elbow joint (leg_f*_02 local X
rotation) with a tent that is zero below DEAD of the crouch angle (so the idle never reaches it), one at the crouch
angle and zero again at HI times it.
"""
import bpy, sys, json, math, os
import numpy as np
from pathlib import Path
from mathutils import Vector
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'rig')); sys.path.insert(0, str(HERE.parent / 'roster'))
import neck_lib as NL

a = sys.argv[sys.argv.index('--') + 1:]
CLIPS, OUT, MODE = a[0], Path(a[1]), a[2]; OUT_RIG = a[3] if len(a) > 3 else None
OUT.mkdir(parents=True, exist_ok=True)
FRAME = 8
STEPS = int(os.environ.get('CC_STEPS', '120')); RATE = 0.6
CAP_M = float(os.environ.get('CC_CAP', '0.012'))
R_ARM = float(os.environ.get('CC_RARM', '0.050')); FADE = 0.025
DEAD, HI = float(os.environ.get('CC_DEAD', '0.5')), float(os.environ.get('CC_HI', '1.8'))

if MODE == 'install':
    # CLIPS is the rig to extend; keys and drivers come from OUT/chest_keys.npz and corrective_apply.json
    bpy.ops.wm.open_mainfile(filepath=CLIPS)
    rig = bpy.data.objects['luceras_rig']; body = bpy.data.objects['luceras_blockout']
    z = np.load(str(OUT / 'chest_keys.npz')); info = json.loads((OUT / 'corrective_apply.json').read_text())
    for side in ('l', 'r'):
        r = info['sides'][side]; k = body.shape_key_add(name=r['key'], from_mix=False); k.data.foreach_set('co', z[side].ravel()); k.value = 0.0
        fc = k.driver_add('value'); d = fc.driver; d.type = 'SCRIPTED'; var = d.variables.new(); var.name = 'a'; var.type = 'TRANSFORMS'
        t = var.targets[0]; t.id = rig; t.bone_target = f'leg_f{side}_02'; t.transform_type = 'ROT_X'; t.transform_space = 'LOCAL_SPACE'; t.rotation_mode = 'XYZ'
        d.expression = r['driver']
    rig['chest_corrective_build'] = 'B-bafy'
    bpy.ops.wm.save_as_mainfile(filepath=OUT_RIG); print('INSTALLED', OUT_RIG, flush=True); sys.exit(0)
bpy.ops.wm.open_mainfile(filepath=CLIPS)
rig = bpy.data.objects['luceras_rig']; rig.animation_data_create(); sc = bpy.context.scene
body = bpy.data.objects['luceras_blockout']; me = body.data
names = [b.name for b in rig.data.bones]
E = np.empty(len(me.edges) * 2, int); me.edges.foreach_get('vertices', E); E = E.reshape(-1, 2)
me.calc_loop_triangles(); F = np.empty(len(me.loop_triangles) * 3, int); me.loop_triangles.foreach_get('vertices', F); F = F.reshape(-1, 3)
RAW = np.array([v.co[:] for v in me.vertices]); nv = len(RAW)
gi = {g.index: g.name for g in body.vertex_groups}
Wb = np.zeros((nv, len(names)))
for v in me.vertices:
    for g in v.groups:
        n = gi[g.group]
        if n in names: Wb[v.index, names.index(n)] = g.weight
kb = me.shape_keys.key_blocks


def sstep(x):
    x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)


def play(act, f):
    if act is None:
        rig.animation_data.action = None
        for p in rig.pose.bones: p.rotation_mode = 'QUATERNION'; p.rotation_quaternion = (1, 0, 0, 0); p.location = (0, 0, 0); p.scale = (1, 1, 1)
    else:
        ac = bpy.data.actions[act]; rig.animation_data.action = ac
        if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(ac.slots): rig.animation_data.action_slot = ac.slots[0]
    sc.frame_set(f); bpy.context.view_layer.update()


def evalV():
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh()
    x = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', x); ev.to_mesh_clear(); return x.reshape(-1, 3)


def curv(V):
    return NL.smooth_field(NL.curvature(V, NL.vertex_normals(V, F), E), E, 2)


def seg(P, a, b):
    ab = b - a; t = np.clip(((P - a) @ ab) / (ab @ ab), 0, 1); return np.linalg.norm(P - (a + t[:, None] * ab), axis=1), t


def mask_for(side):
    b1 = rig.data.bones[f'leg_f{side}_01']; h, t = np.array(b1.head_local), np.array(b1.tail_local)
    d, u = seg(RAW, h, t)
    s = np.clip((RAW[:, 2] - t[2]) / (h[2] - t[2]), 0, 1); post = RAW[:, 1] - (t[1] + (h[1] - t[1]) * s)
    sgn = 1 if side == 'l' else -1
    near_arm = sstep((R_ARM - d) / FADE)                         # within ~5 cm of the humerus (fading to 7.5)
    behind = sstep((post + 0.005) / 0.02)                          # on its back side
    lower = sstep((h[2] - 0.035 - RAW[:, 2]) / 0.03)               # below the shoulder point
    above_forearm = sstep((RAW[:, 2] - (t[2] - 0.045)) / 0.02)     # down to just under the elbow point
    m = near_arm * behind * lower * above_forearm * (sgn * RAW[:, 0] > 0.004)
    return m


def smooth_surface(q, mask, steps):
    i = np.concatenate((E[:, 0], E[:, 1])); j = np.concatenate((E[:, 1], E[:, 0])); deg = np.bincount(i, minlength=len(q)).clip(1)
    x = q.copy()
    for _ in range(steps):
        avg = np.column_stack([np.bincount(i, weights=x[j, c], minlength=len(q)) for c in range(3)]) / deg[:, None]
        x += (avg - x) * (RATE * mask[:, None])
    return x


def elbow_angle(side):
    b = rig.pose.bones[f'leg_f{side}_02']
    m = rig.convert_space(pose_bone=b, matrix=b.matrix, from_space='POSE', to_space='LOCAL')
    return abs(m.to_euler('XYZ').x)


play(None, 0); V_rest = evalV(); H_rest = curv(V_rest)
play('sig.horns-first-descent', FRAME); q = evalV(); H_before = curv(q)
mats = np.array([np.array(rig.matrix_world @ rig.pose.bones[n].matrix @ rig.data.bones[n].matrix_local.inverted() @ rig.matrix_world.inverted() @ body.matrix_world)[:3, :3] for n in names])
skin = np.einsum('nb,bij->nij', Wb / np.maximum(Wb.sum(1, keepdims=True), 1e-9), mats)
rep = {'frame': FRAME, 'params': dict(STEPS=STEPS, RATE=RATE, CAP_M=CAP_M, R_ARM=R_ARM, FADE=FADE, DEAD=DEAD, HI=HI), 'sides': {}}
keys = []
for side in ('l', 'r'):
    mask = mask_for(side)
    target = smooth_surface(q, mask, STEPS); delta = target - q
    L = np.linalg.norm(delta, axis=1); delta *= np.minimum(1, CAP_M / np.maximum(L, 1e-12))[:, None]; L = np.linalg.norm(delta, axis=1)
    ids = np.flatnonzero(mask > 1e-6); back = np.zeros_like(delta)
    back[ids] = np.linalg.solve(skin[ids], delta[ids, :, None])[:, :, 0]
    name = f'PSD_chest_f{side}_crouch'
    if name in kb: body.shape_key_remove(kb[name])
    k = body.shape_key_add(name=name, from_mix=False); k.data.foreach_set('co', (RAW + back).ravel()); k.value = 0.0
    ang = elbow_angle(side); lo, hi = DEAD * ang, HI * ang
    fc = k.driver_add('value'); d = fc.driver; d.type = 'SCRIPTED'; var = d.variables.new(); var.name = 'a'; var.type = 'TRANSFORMS'
    t = var.targets[0]; t.id = rig; t.bone_target = f'leg_f{side}_02'; t.transform_type = 'ROT_X'; t.transform_space = 'LOCAL_SPACE'; t.rotation_mode = 'XYZ'
    d.expression = f'max(0,min(1,(abs(a)-{lo:.12f})/{ang - lo:.12f},({hi:.12f}-abs(a))/{hi - ang:.12f}))'
    keys.append(k)
    rep['sides'][side] = {'key': name, 'mask_vertices': int((mask > 1e-3).sum()), 'max_posed_delta_mm': round(float(L.max() * 1000), 2),
                          'max_key_offset_mm': round(float(np.linalg.norm(back, axis=1).max() * 1000), 2), 'crouch_angle_rad': ang, 'driver': d.expression}
    k.data.update() if hasattr(k.data, 'update') else None
bpy.context.view_layer.update()
play('sig.horns-first-descent', FRAME); V_after = evalV(); H_after = curv(V_after)
for side in ('l', 'r'):
    m = mask_for(side) > 0.3
    rep['sides'][side]['key_value_f8'] = round(float(kb[f'PSD_chest_f{side}_crouch'].value), 3)
    for tag, H in (('rest', H_rest), ('before', H_before), ('after', H_after)):
        rep['sides'][side][f'curv_{tag}_top30'] = round(float(np.sort(H[m])[-30:].mean()), 3)
        rep['sides'][side][f'curv_{tag}_over_0_15'] = int((H[m] > 0.15).sum())
        rep['sides'][side][f'curv_{tag}_min30'] = round(float(np.sort(H[m])[:30].mean()), 3)
# driver values on every frame of both clips
dv = {}
for act in ('sig.horns-first-descent', 'idle'):
    n = int(bpy.data.actions[act].frame_range[1]); vals = []
    for f in range(n + 1):
        play(act, f); vals.append(round(float(max(kb['PSD_chest_fl_crouch'].value, kb['PSD_chest_fr_crouch'].value)), 3))
    dv[act] = vals
rep['driver_values'] = dv
rep['frames_with_key_on'] = {k: [i for i, v in enumerate(vs) if v > 0.001] for k, vs in dv.items()}
(OUT / f'corrective_{MODE}.json').write_text(json.dumps(rep, indent=1))
print('CC', json.dumps({s: {k: v for k, v in r.items() if k not in ('driver',)} for s, r in rep['sides'].items()}), flush=True)
print('CC frames on', rep['frames_with_key_on'], flush=True)
if MODE == 'apply':
    np.savez(str(OUT / 'chest_keys.npz'), **{s: np.array([d.co[:] for d in kb[f'PSD_chest_f{s}_crouch'].data]) for s in 'lr'})
    print('KEYS saved', flush=True)
print('CC done', flush=True)
