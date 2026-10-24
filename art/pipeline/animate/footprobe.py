"""Per-frame foot height and pose facts of the baked signature clip (motion polish, pass 10).

blender -b --python footprobe.py -- CLIPS.blend OUT.json [F0 F1]
Per frame: the lowest point of each foot (evaluated body vertices dominated by leg_??_03, world z, metres; the ground is
z = 0), the body pitch proxy (spine_01 to spine_05 angle from horizontal), the near hind cannon angle from vertical
(leg_hl_03 head to tail), the fore elbow and carpus angles and their per-frame change (to find fast unfolds).
"""
import bpy, sys, json, math
import numpy as np

A = sys.argv[sys.argv.index('--') + 1:]
CLIPS, OUT = A[0], A[1]; F0, F1 = (int(A[2]), int(A[3])) if len(A) > 3 else (0, 60)
bpy.ops.wm.open_mainfile(filepath=CLIPS)
sc = bpy.context.scene; vl = bpy.context.view_layer
rig = bpy.data.objects['luceras_rig']; body = bpy.data.objects['luceras_blockout']; me = body.data
rig.animation_data.action = bpy.data.actions['sig.horns-first-descent']
gn = [g.name for g in body.vertex_groups]; W = np.zeros((len(me.vertices), len(gn)), np.float32)
for v in me.vertices:
    for g in v.groups: W[v.index, g.group] = g.weight
DOM = np.array(gn)[W.argmax(1)]
FEET = {k: DOM == f'leg_{k}_03' for k in ('fl', 'fr', 'hl', 'hr')}


def ang(a, b):
    a = np.array(a); b = np.array(b); c = a @ b / (np.linalg.norm(a) * np.linalg.norm(b)); return math.degrees(math.acos(max(-1, min(1, c))))


rows = {}
for f in range(F0, F1 + 1):
    sc.frame_set(f); vl.update()
    dg = bpy.context.evaluated_depsgraph_get(); e = body.evaluated_get(dg); m = e.to_mesh()
    V = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', V); e.to_mesh_clear(); V = V.reshape(-1, 3)
    Mw = np.array(body.matrix_world); V = V @ Mw[:3, :3].T + Mw[:3, 3]
    pb = rig.pose.bones; R = rig.matrix_world
    def hp(n): return np.array(R @ pb[n].head)
    def tp(n): return np.array(R @ pb[n].tail)
    s1, s5 = hp('spine_01'), tp('spine_05'); d = s5 - s1
    r = dict(foot_mm={k: round(float(V[msk, 2].min()) * 1000, 1) for k, msk in FEET.items()},
             pitch_deg=round(math.degrees(math.atan2(d[2], math.hypot(d[0], d[1]))), 1),
             hind_cannon_from_vertical={s: round(ang(tp(f'leg_h{s}_03') - hp(f'leg_h{s}_03'), (0, 0, -1)), 1) for s in 'lr'},
             fore_elbow_deg={s: round(180 - ang(tp(f'leg_f{s}_01') - hp(f'leg_f{s}_01'), tp(f'leg_f{s}_02') - hp(f'leg_f{s}_02')), 1) for s in 'lr'},
             fore_carpus_flex={s: round(ang(tp(f'leg_f{s}_02') - hp(f'leg_f{s}_02'), tp(f'leg_f{s}_03') - hp(f'leg_f{s}_03')), 1) for s in 'lr'},
             hind_stifle_deg={s: round(180 - ang(tp(f'leg_h{s}_01') - hp(f'leg_h{s}_01'), tp(f'leg_h{s}_02') - hp(f'leg_h{s}_02')), 1) for s in 'lr'},
             body_low_mm=round(float(V[:, 2].min()) * 1000, 1))
    rows[f] = r
    print('FOOT', f, json.dumps(r), flush=True)
for f in range(F0 + 1, F1 + 1):
    rows[f]['elbow_step'] = round(rows[f]['fore_elbow_deg']['l'] - rows[f - 1]['fore_elbow_deg']['l'], 1)
    rows[f]['carpus_step'] = round(rows[f]['fore_carpus_flex']['l'] - rows[f - 1]['fore_carpus_flex']['l'], 1)
json.dump(rows, open(OUT, 'w'), indent=1); print('FOOTPROBE done', flush=True)
