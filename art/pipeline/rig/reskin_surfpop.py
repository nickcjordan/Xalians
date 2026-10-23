"""B-sntv pass 6: surface pop check for the shot sculpts (does the per-frame sculpt make the skin jump?).

blender -b --python reskin_surfpop.py -- CLIPS.blend OUT.json FIRST LAST
Plays the signature clip frame by frame, with the ShotSculpt modifier on and off. Per vertex, the second difference of
position over frames (f-1, f, f+1) is the frame's surface acceleration. The sculpt's own share is the second difference
of the sculpt offset (on minus off). A pop is a frame where the sculpt's share at some vertex is above POP_MM (3 mm)
and above the clip's own acceleration there: the skin would visibly jump by more than the motion moves it.
Also reports, per frame, the largest sculpt offset and the frame-to-frame change of the offset.
"""
import bpy, sys, json
import numpy as np
A = sys.argv[sys.argv.index('--') + 1:]
CLIPS, OUT, FIRST, LAST = A[0], A[1], int(A[2]), int(A[3])
POP = 3.0
bpy.ops.wm.open_mainfile(filepath=CLIPS)
sc = bpy.context.scene; vl = bpy.context.view_layer
rig = bpy.data.objects['luceras_rig']; body = bpy.data.objects['luceras_blockout']
rig.animation_data.action = bpy.data.actions['sig.horns-first-descent']
md = body.modifiers.get('ShotSculpt')


def ev():
    dg = bpy.context.evaluated_depsgraph_get(); e = body.evaluated_get(dg); m = e.to_mesh()
    x = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', x); e.to_mesh_clear(); return x.reshape(-1, 3)


on, off = {}, {}
for f in range(FIRST - 1, LAST + 2):
    sc.frame_set(f); vl.update()
    if md: md.show_viewport = True; vl.update()
    on[f] = ev()
    if md: md.show_viewport = False; vl.update(); off[f] = ev(); md.show_viewport = True
    else: off[f] = on[f]
rep = dict(definition=__doc__.strip(), window=[FIRST, LAST], pop_threshold_mm=POP, frames={}, pops=[])
for f in range(FIRST, LAST + 1):
    S = {g: on[g] - off[g] for g in (f - 1, f, f + 1)}
    acc_s = np.linalg.norm(S[f - 1] - 2 * S[f] + S[f + 1], axis=1) * 1000
    acc_c = np.linalg.norm(off[f - 1] - 2 * off[f] + off[f + 1], axis=1) * 1000
    step = np.linalg.norm(S[f] - S[f - 1], axis=1) * 1000
    i = int(acc_s.argmax())
    pop = (acc_s > POP) & (acc_s > acc_c)
    rep['frames'][f] = dict(max_offset_mm=round(float(np.linalg.norm(S[f], axis=1).max() * 1000), 2), max_offset_step_mm=round(float(step.max()), 2),
                            sculpt_accel_max_mm=round(float(acc_s[i]), 2), clip_accel_there_mm=round(float(acc_c[i]), 2), pop_vertices=int(pop.sum()))
    if pop.any(): rep['pops'].append(f)
    print('SURFPOP', f, rep['frames'][f], flush=True)
json.dump(rep, open(OUT, 'w'), indent=1); print('SURFPOP done pops', rep['pops'], flush=True)
