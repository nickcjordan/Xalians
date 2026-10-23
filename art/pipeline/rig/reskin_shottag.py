"""B-sntv pass 6: key the shot sculpt selector bone in every action of a baked clips.blend (in place).

blender -b --python reskin_shottag.py -- CLIPS.blend
shot_key location x = 1 on the signature clip, 2 on review.poses, 0 on every other action, constant over the action.
"""
import bpy, sys
CLIPS = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.open_mainfile(filepath=CLIPS)
rig = bpy.data.objects['luceras_rig']; rig.animation_data_create()
assert 'shot_key' in rig.pose.bones, 'rig has no shot sculpt'
pb = rig.pose.bones['shot_key']; out = {}
for ac in list(bpy.data.actions):
    val = 1.0 if ac.name == 'sig.horns-first-descent' else 2.0 if ac.name == 'review.poses' else 0.0
    rig.animation_data.action = ac
    if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(ac.slots): rig.animation_data.action_slot = ac.slots[0]
    f0 = int(ac.frame_range[0]); pb.location = (val, 0, 0); pb.keyframe_insert('location', index=0, frame=f0, group='shot_key')
    out[ac.name] = val
rig.animation_data.action = None; pb.location = (0, 0, 0)
bpy.ops.wm.save_mainfile(filepath=CLIPS)
print('SHOTTAG', out, flush=True)
