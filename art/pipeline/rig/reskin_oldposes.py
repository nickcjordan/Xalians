"""B-sntv pass 2: read the pass 5 review.poses channels (crouch frame 11, landing frame 31) to JSON, read-only.

blender -b --python reskin_oldposes.py -- RIG.blend OUT.json
"""
import bpy, sys, json
A = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.open_mainfile(filepath=A[0])
rig = bpy.data.objects['luceras_rig']; rig['controls_enabled'] = 0.0
rig.animation_data.action = bpy.data.actions['review.poses']
out = {}
for nm, f in (('crouch', 11), ('landing', 31), ('leap', 21), ('head_left_up', 41), ('tail_side_up', 51), ('foreleg_step', 61)):
    bpy.context.scene.frame_set(f)
    out[nm] = {p.name: dict(loc=list(p.location), rot=list(p.rotation_quaternion), scale=list(p.scale), mode=p.rotation_mode) for p in rig.pose.bones}
json.dump(out, open(A[1], 'w'), indent=0)
print('OLDPOSES done', {k: v['leg_hl_01']['mode'] for k, v in out.items()}, flush=True)
