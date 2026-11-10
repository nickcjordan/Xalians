"""Remove the curves of one (new) curves object that reach below the ground in any listed frame.
blender -b SCENE --python ground_trim.py -- OUT.blend REPORT.json OBJECT clip:f0-f1:step ...
Every frame is evaluated (rig at the origin, as the sprites play), the lowest point of each curve is taken over all of
them, and every curve whose lowest point is under -limit_mm (default 0.3 mm) is dropped; the object is rebuilt from the
kept curves with every attribute copied unchanged."""
import bpy, sys, json, os
import numpy as np
A = sys.argv[sys.argv.index('--') + 1:]; OUTB, REP, NAME = A[0], A[1], A[2]; JOBS = A[3:]
LIM = float(os.environ.get('GT_LIMIT_MM', '0.3')) / 1000
s = bpy.context.scene; rig = s.objects['luceras_rig']; ob = s.objects[NAME]; d = ob.data
offs = np.empty(len(d.curves), np.int32); d.curves.foreach_get('first_point_index', offs); cnt = np.empty(len(d.curves), np.int32); d.curves.foreach_get('points_length', cnt)
cid = np.repeat(np.arange(len(offs)), cnt); low = np.full(len(offs), 9.0); frames = 0
for j in JOBS:
    clip, rng_, step = j.split(':'); f0, f1 = [int(x) for x in rng_.split('-')]
    rig.animation_data.action = bpy.data.actions[clip]; ac = rig.animation_data.action
    if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(ac.slots): rig.animation_data.action_slot = ac.slots[0]
    rig.location = (0, 0, 0)
    for f in range(f0, f1 + 1, int(step)):
        s.frame_set(f); dg = bpy.context.evaluated_depsgraph_get(); e = ob.evaluated_get(dg)
        P = np.empty(len(e.data.points) * 3, np.float32); e.data.attributes['position'].data.foreach_get('vector', P)
        M = np.array(e.matrix_world); z = (P.reshape(-1, 3) @ M[:3, :3].T + M[:3, 3])[:, 2]
        if len(z) != len(cid): raise SystemExit('evaluated point count differs from the original')
        np.minimum.at(low, cid, z); frames += 1
keep = np.where(low >= -LIM)[0]; drop = len(offs) - len(keep)
pk = np.concatenate([np.arange(offs[i], offs[i] + cnt[i]) for i in keep]) if len(keep) else np.array([], int)
hc = bpy.data.hair_curves.new(d.name + '_trim'); hc.add_curves(cnt[keep].tolist())
for a in d.attributes:
    if a.name.startswith('.') and a.name not in ('.selection',): continue
    key = {'FLOAT_COLOR': 'color', 'FLOAT_VECTOR': 'vector', 'BYTE_COLOR': 'color', 'FLOAT2': 'vector'}.get(a.data_type, 'value')
    w = {'FLOAT_COLOR': 4, 'BYTE_COLOR': 4, 'FLOAT_VECTOR': 3, 'FLOAT2': 2}.get(a.data_type, 1); dt = np.int32 if a.data_type in ('INT', 'BOOLEAN') else np.float32
    v = np.empty(len(a.data) * w, dt); a.data.foreach_get(key, v); v = v.reshape(len(a.data), w) if w > 1 else v
    sel = pk if a.domain == 'POINT' else keep
    t = hc.attributes.get(a.name) or hc.attributes.new(a.name, a.data_type, a.domain); t.data.foreach_set(key, np.ascontiguousarray(v[sel]).ravel())
for m in d.materials: hc.materials.append(m)
hc.surface = d.surface; old = d; ob.data = hc; nm = old.name; bpy.data.hair_curves.remove(old); hc.name = nm
rep = dict(object=NAME, frames_evaluated=frames, limit_mm=LIM * 1000, curves_before=int(len(offs)), dropped=int(drop), kept=int(len(keep)),
           lowest_before_mm=round(float(low.min()) * 1000, 2), lowest_kept_mm=round(float(low[keep].min()) * 1000, 2) if len(keep) else None)
json.dump(rep, open(REP, 'w'), indent=1); print('TRIM', json.dumps(rep), flush=True)
os.makedirs(os.path.dirname(OUTB), exist_ok=True); bpy.ops.wm.save_as_mainfile(filepath=OUTB, compress=True); print('TRIM saved', OUTB, flush=True)
