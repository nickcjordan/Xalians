"""B-bafy pass 5: what is the downward point under the chest behind the left foreleg in the sheet crouch? (read only)

blender -b --factory-startup --python sheet_knob_diag.py -- RIG OUT_JSON
Poses review.poses frame 11, finds the lowest body vertices in a box behind the posed left elbow (the belly line in the
sheet's side view), and reports their rest positions, posed positions, skin weights, how far the elbow-crouch
corrective moves them, and the same vertices skinned with the weights of their rest-pose neighbours on the chest.
"""
import bpy, sys, json
import numpy as np

RIG, OUTJ = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.open_mainfile(filepath=RIG)
sc = bpy.context.scene; vl = bpy.context.view_layer
rig = bpy.data.objects['luceras_rig']; rig['controls_enabled'] = 0.0
rig.animation_data_create(); act = bpy.data.actions['review.poses']; rig.animation_data.action = act
if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(act.slots): rig.animation_data.action_slot = act.slots[0]
body = bpy.data.objects['luceras_blockout']; me = body.data; kb = me.shape_keys.key_blocks
gi = {g.index: g.name for g in body.vertex_groups}
REST = np.array([v.co[:] for v in me.vertices])


def ev():
    dg = bpy.context.evaluated_depsgraph_get(); e = body.evaluated_get(dg); m = e.to_mesh()
    x = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', x); e.to_mesh_clear(); return x.reshape(-1, 3)


sc.frame_set(11); vl.update(); V = ev()
el = np.array(rig.pose.bones['leg_fl_02'].head); sh = np.array(rig.pose.bones['leg_fl_01'].head)
for k in kb:
    if k.name.startswith('PSD_elbow_f') and k.name.endswith('_crouch'): k.mute = True
vl.update(); Vm = ev()
for k in kb: k.mute = False
vl.update()
box = (V[:, 0] > 0.01) & (V[:, 1] > el[1] - 0.02) & (V[:, 1] < el[1] + 0.12) & (V[:, 2] < el[2] + 0.12)
idx = np.flatnonzero(box)
# belly line seen from the side: for each 5 mm y bin the lowest vertex
rows = []
for y0 in np.arange(el[1] - 0.02, el[1] + 0.12, 0.005):
    s = idx[np.abs(V[idx, 1] - y0) < 0.0025]
    if len(s) == 0: continue
    i = int(s[np.argmin(V[s, 2])])
    w = {gi[g.group]: round(g.weight, 3) for g in me.vertices[i].groups if g.weight > 0.02}
    rows.append({'y_behind_elbow_mm': round((y0 - el[1]) * 1000), 'vertex': i, 'posed_z_mm': round(V[i, 2] * 1000, 1), 'rest': [round(x, 4) for x in REST[i]],
                 'posed': [round(x, 4) for x in V[i]], 'elbow_corrective_moves_mm': round(float(np.linalg.norm(V[i] - Vm[i]) * 1000), 1), 'weights': w})
res = {'elbow_posed': el.round(4).tolist(), 'shoulder_posed': sh.round(4).tolist(), 'elbow_rest': [round(x, 4) for x in rig.data.bones['leg_fl_02'].head_local],
       'belly_line': rows}
open(OUTJ, 'w').write(json.dumps(res, indent=1))
for r in rows: print('ROW', json.dumps(r), flush=True)
print('elbow', res['elbow_posed'], 'rest', res['elbow_rest'])
