"""B-bafy pass 5: per-frame body vertex difference between two clips files (read only).

blender -b --factory-startup --python mesh_diff.py -- CLIPS_A CLIPS_B OUT_JSON
Evaluates luceras_blockout in both files on every frame of both clips; reports per frame the largest vertex
distance and how many vertices moved more than 0.5 mm, plus the elbow-crouch corrective value.
"""
import bpy, sys, json
import numpy as np
A, B, OUT = sys.argv[sys.argv.index('--') + 1:][:3]


def run(path):
    bpy.ops.wm.open_mainfile(filepath=path)
    rig = bpy.data.objects['luceras_rig']; body = bpy.data.objects['luceras_blockout']; sc = bpy.context.scene; rig.animation_data_create()
    out = {}
    for act in ('sig.horns-first-descent', 'idle'):
        a = bpy.data.actions[act]; rig.animation_data.action = a
        if rig.animation_data.action_slot is None: rig.animation_data.action_slot = a.slots[0]
        rows = []
        for f in range(int(a.frame_range[1]) + 1):
            sc.frame_set(f); dg = bpy.context.evaluated_depsgraph_get(); e = body.evaluated_get(dg); m = e.to_mesh()
            x = np.empty(len(m.vertices) * 3, np.float32); m.vertices.foreach_get('co', x); e.to_mesh_clear()
            rows.append((x.reshape(-1, 3), float(body.data.shape_keys.key_blocks['PSD_elbow_fl_crouch'].value)))
        out[act] = rows
    return out


ra = run(A); rb = run(B); res = {}
for act in ra:
    res[act] = [{'frame': f, 'max_mm': round(float(np.linalg.norm(x[0] - y[0], axis=1).max() * 1000), 2),
                 'moved_over_0_5mm': int((np.linalg.norm(x[0] - y[0], axis=1) > 5e-4).sum()), 'elbow_crouch_corrective': round(y[1], 3)}
                for f, (x, y) in enumerate(zip(ra[act], rb[act]))]
open(OUT, 'w').write(json.dumps(res, indent=1))
for act, rows in res.items():
    print('DIFF', act, [(r['frame'], r['max_mm'], r['elbow_crouch_corrective']) for r in rows if r['max_mm'] > 0.01], flush=True)
