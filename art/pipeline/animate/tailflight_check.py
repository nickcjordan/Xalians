"""B-378v: per-frame record of a clips file for before/after checks (read only).

blender -b --factory-startup --python tailflight_check.py -- CLIPS OUT_JSON
Writes, per clip and frame: every pose bone's matrix (armature space), and the plume direction measured on the plume
stand-in mesh (the ring at the old tail_06 tip to the tip vertex), so pass 2 (no plume bones) and this pass compare
on the same geometry: elevation 0 = straight back, 90 = straight up, over 90 = leaning forward.
"""
import bpy, sys, json, math
import numpy as np

clips, out = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.open_mainfile(filepath=clips)
rig = bpy.data.objects['luceras_rig']; sd = bpy.data.objects['plume_standin']; sc = bpy.context.scene
K = 10
# ring nearest the rest tail_06 tip
co = np.array([v.co[:] for v in sd.data.vertices]); t6 = np.array(rig.data.bones['tail_06'].tail_local)
rings = co[:-1].reshape(-1, K, 3).mean(1); r0 = int(np.argmin(np.linalg.norm(rings - t6, axis=1)))
res = {'ring': r0, 'parents': {b.name: (b.parent.name if b.parent else None) for b in rig.data.bones}}
for name in ('sig.horns-first-descent', 'idle'):
    act = bpy.data.actions[name]; rig.animation_data.action = act
    if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(act.slots):
        rig.animation_data.action_slot = act.slots[0]
    n = int(act.frame_range[1]); rows = []
    for f in range(n + 1):
        sc.frame_set(f); dg = bpy.context.evaluated_depsgraph_get(); ev = sd.evaluated_get(dg)
        P = np.array([v.co[:] for v in ev.data.vertices]); base = P[r0 * K:(r0 + 1) * K].mean(0); tip = P[-1]
        mid = P[:-1].reshape(-1, K, 3).mean(1)
        d = tip - base; dm = tip - mid[-12]
        rows.append(dict(frame=f, plume_elev_deg=math.degrees(math.atan2(d[2], d[1])), plume_tip_elev_deg=math.degrees(math.atan2(dm[2], dm[1])),
                         mats={p.name: [list(r) for r in p.matrix] for p in rig.pose.bones}))
    res[name] = rows
open(out, 'w').write(json.dumps(res))
print('CHECK done', flush=True)
