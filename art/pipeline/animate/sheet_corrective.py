"""B-bafy pass 5: round the chest-floor point behind the forelegs in the rig review crouch, inside the existing
elbow-crouch correctives (PSD_elbow_fl_crouch, PSD_elbow_fr_crouch), which are at 1.0 in exactly that pose.

blender -b --factory-startup --python sheet_corrective.py -- RIG OUT_RIG OUT_JSON
Poses review.poses frame 11 (the deformation sheet's crouch), takes the posed body (correctives on), smooths the
posed surface inside a mask on the chest floor between and behind the elbows (rest position: lower chest, |x| under
6 cm, 2 cm in front of to 9 cm behind the rest elbow line), caps the move, inverse-skins it with the pose's skinning
matrices, and adds it to the two elbow-crouch keys split by side (x > 0 to the left key, x < 0 to the right, shared
smoothly across the midline). At this pose both keys are 1, so the posed result is the smoothed target. Elsewhere
the keys act at their own driven values. Saves OUT_RIG (the input rig is never written).
"""
import bpy, sys, json, math
import numpy as np
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'rig'))
import neck_lib as NL

RIG, OUT_RIG, OUTJ = sys.argv[sys.argv.index('--') + 1:][:3]
import os
STEPS, RATE, CAP = int(os.environ.get("SC_STEPS", "160")), 0.6, float(os.environ.get("SC_CAP", "0.020"))
bpy.ops.wm.open_mainfile(filepath=RIG)
sc = bpy.context.scene; vl = bpy.context.view_layer
rig = bpy.data.objects['luceras_rig']; CTRL0 = rig.get('controls_enabled', 0.0); rig['controls_enabled'] = 0.0
rig.animation_data_create(); ORIG_ACT = rig.animation_data.action; act = bpy.data.actions['review.poses']; rig.animation_data.action = act
if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(act.slots): rig.animation_data.action_slot = act.slots[0]
body = bpy.data.objects['luceras_blockout']; me = body.data; kb = me.shape_keys.key_blocks
names = [b.name for b in rig.data.bones]; gi = {g.index: g.name for g in body.vertex_groups}
RAW = np.array([v.co[:] for v in me.vertices]); nv = len(RAW)
E = np.empty(len(me.edges) * 2, int); me.edges.foreach_get('vertices', E); E = E.reshape(-1, 2)
me.calc_loop_triangles(); F = np.empty(len(me.loop_triangles) * 3, int); me.loop_triangles.foreach_get('vertices', F); F = F.reshape(-1, 3)
Wb = np.zeros((nv, len(names)))
for v in me.vertices:
    for g in v.groups:
        n = gi[g.group]
        if n in names: Wb[v.index, names.index(n)] = g.weight
Wb /= np.maximum(Wb.sum(1, keepdims=True), 1e-9)


def sstep(x):
    x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)


def evalV():
    dg = bpy.context.evaluated_depsgraph_get(); e = body.evaluated_get(dg); m = e.to_mesh()
    x = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', x); e.to_mesh_clear(); return x.reshape(-1, 3)


sc.frame_set(11); vl.update()
vals = {k.name: float(k.value) for k in kb[1:]}
q = evalV()
yel = rig.data.bones['leg_fl_02'].head_local.y          # rest elbow line (-0.066)
mask = sstep((0.335 - RAW[:, 2]) / 0.03) * sstep((0.06 - np.abs(RAW[:, 0])) / 0.02) * sstep((RAW[:, 1] - (yel - 0.02)) / 0.02) * sstep(((yel + 0.16) - RAW[:, 1]) / 0.03)
i = np.concatenate((E[:, 0], E[:, 1])); j = np.concatenate((E[:, 1], E[:, 0])); deg = np.bincount(i, minlength=nv).clip(1)
x = q.copy()
for _ in range(STEPS):
    avg = np.column_stack([np.bincount(i, weights=x[j, c], minlength=nv) for c in range(3)]) / deg[:, None]
    x += (avg - x) * (RATE * mask[:, None])
delta = x - q; L = np.linalg.norm(delta, axis=1); delta *= np.minimum(1, CAP / np.maximum(L, 1e-12))[:, None]; L = np.linalg.norm(delta, axis=1)
mats = np.array([np.array(rig.matrix_world @ rig.pose.bones[n].matrix @ rig.data.bones[n].matrix_local.inverted() @ rig.matrix_world.inverted() @ body.matrix_world)[:3, :3] for n in names])
skin = np.einsum('nb,bij->nij', Wb, mats)
ids = np.flatnonzero(mask > 1e-6); back = np.zeros_like(delta); back[ids] = np.linalg.solve(skin[ids], delta[ids, :, None])[:, :, 0]
share_l = sstep((RAW[:, 0] + 0.01) / 0.02)       # 0 right of -1 cm, 1 left of +1 cm
for name, share in (('PSD_elbow_fl_crouch', share_l), ('PSD_elbow_fr_crouch', 1 - share_l)):
    k = kb[name]; co = np.array([d.co[:] for d in k.data]); k.data.foreach_set('co', (co + back * share[:, None]).ravel())
vl.update(); sc.frame_set(11); vl.update(); after = evalV()
mods = [(mo.type, mo.name) for mo in body.modifiers]
first_err = float(np.linalg.norm((after - x)[ids], axis=1).max())
for it in range(4):   # the stack after the keys is not purely linear in them; fold the residual back in
    r = np.zeros_like(delta); r[ids] = (q + delta - after)[ids]
    br = np.zeros_like(delta); br[ids] = np.linalg.solve(skin[ids], r[ids, :, None])[:, :, 0]
    for name, share in (('PSD_elbow_fl_crouch', share_l), ('PSD_elbow_fr_crouch', 1 - share_l)):
        k = kb[name]; co = np.array([d.co[:] for d in k.data]); k.data.foreach_set('co', (co + br * share[:, None]).ravel())
    back += br; vl.update(); sc.frame_set(11); vl.update(); after = evalV()
H = lambda V: NL.smooth_field(NL.curvature(V, NL.vertex_normals(V, F), E), E, 2)
m = mask > 0.3
rec = {'pose': 'review.poses frame 11 (deformation sheet crouch)', 'corrective_values_at_pose': vals, 'mask_vertices': int((mask > 1e-3).sum()),
       'max_posed_move_mm': round(float(L.max() * 1000), 2), 'max_key_offset_added_mm': round(float(np.linalg.norm(back, axis=1).max() * 1000), 2),
       'reached_target_max_err_mm': round(float(np.linalg.norm((after - (q + delta))[ids], axis=1).max() * 1000), 3), 'first_pass_err_mm': round(first_err * 1000, 3), 'body_modifiers': mods,
       'region_curvature_top30_before': round(float(np.sort(H(q)[m])[-30:].mean()), 3), 'region_curvature_top30_after': round(float(np.sort(H(after)[m])[-30:].mean()), 3),
       'params': dict(STEPS=STEPS, RATE=RATE, CAP_M=CAP)}
rig['review_crouch_keel_fix'] = 'B-bafy pass 5: chest-floor smoothing added to PSD_elbow_f*_crouch'
rig.animation_data.action = ORIG_ACT; rig['controls_enabled'] = CTRL0
bpy.ops.wm.save_as_mainfile(filepath=OUT_RIG); rec['saved'] = OUT_RIG
Path(OUTJ).write_text(json.dumps(rec, indent=1)); print('SC', json.dumps(rec), flush=True)
