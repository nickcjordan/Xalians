"""B-sntv: print joint positions per review.poses frame (read-only)."""
import bpy, sys
A = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.open_mainfile(filepath=A[0])
rig = bpy.data.objects['luceras_rig']; rig['controls_enabled'] = 0.0
rig.animation_data.action = bpy.data.actions['review.poses']
for i, nm in enumerate(['rest', 'crouch', 'leap', 'landing', 'head_left_up', 'tail_side_up', 'foreleg_step', 'breath_in']):
    bpy.context.scene.frame_set(1 + 10 * i); pb = rig.pose.bones
    f = lambda b, e='head': tuple(round(x, 3) for x in getattr(pb[b], e))
    print('PC', nm, 'pelvis', f('spine_01'), 'withers', f('spine_05'), 'elbowL', f('leg_fl_02'), 'stifleL', f('leg_hl_02'), 'toeFL', f('leg_fl_03', 'tail'), 'toeHL', f('leg_hl_03', 'tail'), 'scapL', f('scapula_l', 'tail'))
