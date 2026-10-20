"""B-6kf7: prove the neck edit stays in the neck band and the correctives behave as before.

Usage: blender -b --factory-startup --python neck_verify.py -- OLD_CLIPS NEW_CLIPS DELTA_NPZ OUT_JSON
For every frame of both baked clips (idle 0..90, signature 0..60), evaluates the body (armature + six correctives) in the
old and new clips blends and compares: corrective driver values (must be equal), vertices outside the moved set (must be
bit-identical), moved vertices (distance reported). Also compares every other mesh object, bones and actions.
"""
import bpy, sys, json, hashlib, numpy as np
a = sys.argv[sys.argv.index('--') + 1:]; OLD, NEW, DELTA, OUTJ = a
moved = np.load(DELTA)['index']


def snapshot(path):
    bpy.ops.wm.open_mainfile(filepath=path)
    rig = bpy.data.objects['luceras_rig']; rig['controls_enabled'] = 0.0; rig.location = (0, 0, 0)
    body = bpy.data.objects['luceras_blockout']; sc = bpy.context.scene
    out = {'frames': {}, 'other': {}}
    for o in bpy.data.objects:
        if o.type == 'MESH' and o is not body:
            x = np.empty(len(o.data.vertices) * 3); o.data.vertices.foreach_get('co', x)
            out['other'][o.name] = hashlib.sha256(x.tobytes()).hexdigest()
    out['bones'] = hashlib.sha256(str([(b.name, tuple(b.head_local), tuple(b.tail_local)) for b in rig.data.bones]).encode()).hexdigest()
    out['actions'] = {ac.name: hashlib.sha256(str([(fc.data_path, fc.array_index, [tuple(k.co) for k in fc.keyframe_points]) for fc in ac.fcurves]).encode()).hexdigest() if hasattr(ac, 'fcurves') else None for ac in bpy.data.actions}
    k = body.data.shape_keys
    out['drivers'] = [(fc.data_path, fc.driver.expression) for fc in k.animation_data.drivers]
    rig.animation_data_create()
    for act, n in (('idle', 90), ('sig.horns-first-descent', 60)):
        rig.animation_data.action = bpy.data.actions[act]
        for f in range(n + 1):
            sc.frame_set(f); bpy.context.view_layer.update()
            dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh()
            x = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', x); ev.to_mesh_clear()
            out['frames'][(act, f)] = (x.reshape(-1, 3), {kb.name: float(kb.value) for kb in k.key_blocks[1:]})
    return out


A = snapshot(OLD); B = snapshot(NEW)
keep = np.ones(len(next(iter(A['frames'].values()))[0]), bool); keep[moved] = False
rows = []; worst_out = 0.0; worst_key = 0.0; worst_in = 0.0; key_active = {}
for key in A['frames']:
    Va, ka = A['frames'][key]; Vb, kb = B['frames'][key]
    do = float(np.abs(Va[keep] - Vb[keep]).max()); di = float(np.linalg.norm(Va[moved] - Vb[moved], axis=1).max())
    dk = max(abs(ka[n] - kb[n]) for n in ka)
    worst_out = max(worst_out, do); worst_key = max(worst_key, dk); worst_in = max(worst_in, di)
    for n, v in ka.items():
        if v > 0.01: key_active.setdefault(n, []).append(f'{key[0]}:{key[1]}')
res = dict(frames_compared=len(A['frames']), moved_vertices=int(len(moved)),
           outside_moved_set_max_abs_diff_m=worst_out, corrective_value_max_diff=worst_key, moved_set_max_posed_diff_mm=1000 * worst_in,
           correctives_active_frames={n: len(v) for n, v in key_active.items()}, correctives_active_examples={n: v[:4] for n, v in key_active.items()},
           other_meshes_identical=A['other'] == B['other'], bones_identical=A['bones'] == B['bones'], actions_identical=A['actions'] == B['actions'],
           drivers_identical=A['drivers'] == B['drivers'])
res['pass'] = bool(worst_out == 0.0 and worst_key == 0.0 and res['other_meshes_identical'] and res['bones_identical'] and res['actions_identical'] and res['drivers_identical'])
open(OUTJ, 'w').write(json.dumps(res, indent=1))
print('VERIFY', json.dumps(res), flush=True)
