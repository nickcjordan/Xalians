"""B-bafy: diagnose the crouch chest/belly protrusion behind the foreleg (read only).

blender -b --factory-startup --python chest_diag.py -- CLIPS OUT_JSON
For rest and signature frames 0..12 (and the idle's strongest elbow-crouch frame): corrective values, then per
vertex in a box around each elbow, mean curvature with every corrective on and with the elbow correctives muted,
compared with rest. Reports the strongest new convex bump, where it is, its skin weights, how far the elbow
corrective moves it, and how far it sits from the humerus and forearm bone segments.
"""
import bpy, sys, json, math
import numpy as np
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'rig'))
import neck_lib as NL

clips, out = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.open_mainfile(filepath=clips)
rig = bpy.data.objects['luceras_rig']; body = bpy.data.objects['luceras_blockout']; sc = bpy.context.scene
rig.animation_data_create()
me = body.data
E = np.empty(len(me.edges) * 2, int); me.edges.foreach_get('vertices', E); E = E.reshape(-1, 2)
me.calc_loop_triangles(); F = np.empty(len(me.loop_triangles) * 3, int); me.loop_triangles.foreach_get('vertices', F); F = F.reshape(-1, 3)
kb = me.shape_keys.key_blocks
gi = {g.index: g.name for g in body.vertex_groups}
W = {}
for v in me.vertices:
    W[v.index] = {gi[g.group]: g.weight for g in v.groups if g.weight > 0.02}
REST = np.array([v.co[:] for v in me.vertices])


def pose(act, f):
    if act is None:
        rig.animation_data.action = None
        for p in rig.pose.bones: p.rotation_mode = 'QUATERNION'; p.rotation_quaternion = (1, 0, 0, 0); p.location = (0, 0, 0); p.scale = (1, 1, 1)
    else:
        a = bpy.data.actions[act]; rig.animation_data.action = a
        if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(a.slots): rig.animation_data.action_slot = a.slots[0]
    sc.frame_set(f); bpy.context.view_layer.update()


def evalV():
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh()
    x = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', x); ev.to_mesh_clear(); return x.reshape(-1, 3)


def curv(V):
    return NL.smooth_field(NL.curvature(V, NL.vertex_normals(V, F), E), E, 2)


def seg_dist(P, a, b):
    ab = b - a; t = np.clip(((P - a) @ ab) / (ab @ ab), 0, 1); return np.linalg.norm(P - (a + t[:, None] * ab), axis=1)


pose(None, 0); V0 = evalV(); H0 = curv(V0)
res = {'correctives': {}, 'frames': {}}
elbow_keys = [k for k in kb if k.name.startswith('PSD_elbow')]
for k in kb[1:]:
    off = np.linalg.norm(np.array([d.co[:] for d in k.data]) - REST, axis=1)
    res['correctives'][k.name] = {'vertices_moved': int((off > 1e-6).sum()), 'max_key_offset_mm': float(off.max() * 1000)}
frames = [('rest', None, 0)] + [(f'sig_f{f:02d}', 'sig.horns-first-descent', f) for f in range(0, 13)] + [(f'idle_f{f:02d}', 'idle', f) for f in (0, 5, 50)]
for tag, act, f in frames:
    pose(act, f)
    vals = {k.name: round(float(k.value), 3) for k in kb[1:]}
    V = evalV(); H = curv(V)
    for k in elbow_keys: k.mute = True
    bpy.context.view_layer.update(); Vm = evalV(); Hm = curv(Vm)
    for k in elbow_keys: k.mute = False
    bpy.context.view_layer.update()
    rec = {'corrective_values': vals, 'sides': {}}
    for side in ('l', 'r'):
        pb = rig.pose.bones
        a1, b1 = np.array(pb[f'leg_f{side}_01'].head), np.array(pb[f'leg_f{side}_01'].tail)
        a2, b2 = np.array(pb[f'leg_f{side}_02'].head), np.array(pb[f'leg_f{side}_02'].tail)
        elbow = a2
        sel = np.flatnonzero(np.linalg.norm(V - elbow, axis=1) < 0.13)
        dH = H[sel] - H0[sel]
        order = sel[np.argsort(-dH)[:30]]
        i = order[0]
        rec['sides'][side] = {
            'top_bump_vertex': int(i), 'rest_co': REST[i].round(4).tolist(), 'posed_co': V[i].round(4).tolist(),
            'curvature_rest': round(float(H0[i]), 4), 'curvature_posed': round(float(H[i]), 4), 'curvature_posed_no_elbow_corrective': round(float(Hm[i]), 4),
            'top30_mean_curv_increase': round(float((H[order] - H0[order]).mean()), 4),
            'top30_mean_curv_increase_no_elbow_corrective': round(float((Hm[order] - H0[order]).mean()), 4),
            'elbow_corrective_moves_top30_mm': round(float(np.linalg.norm(V[order] - Vm[order], axis=1).max() * 1000), 2),
            'weights': W[int(i)],
            'dist_to_humerus_mm': round(float(seg_dist(V[i:i + 1], a1, b1)[0] * 1000), 1), 'dist_to_forearm_mm': round(float(seg_dist(V[i:i + 1], a2, b2)[0] * 1000), 1),
            'rest_dist_to_humerus_mm': round(float(seg_dist(REST[i:i + 1], np.array(rig.data.bones[f'leg_f{side}_01'].head_local), np.array(rig.data.bones[f'leg_f{side}_01'].tail_local))[0] * 1000), 1),
            'elbow_joint': elbow.round(4).tolist(), 'top30': order.tolist(),
        }
    res['frames'][tag] = rec
    print('DIAG', tag, json.dumps({s: {k: rec['sides'][s][k] for k in ('top_bump_vertex', 'posed_co', 'curvature_rest', 'curvature_posed', 'curvature_posed_no_elbow_corrective', 'top30_mean_curv_increase', 'top30_mean_curv_increase_no_elbow_corrective', 'elbow_corrective_moves_top30_mm', 'dist_to_humerus_mm')} for s in ('l',)}),
          {k: v for k, v in vals.items() if v > 0.01}, flush=True)
Path(out).write_text(json.dumps(res, indent=1))
print('DIAG done', flush=True)
