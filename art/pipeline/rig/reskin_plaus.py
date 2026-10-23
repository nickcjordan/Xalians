"""B-sntv pass 5: pose plausibility probe (read only).

blender -b --python reskin_plaus.py -- BLEND OUT.json ACTION FRAMES NAMES
  FRAMES / NAMES: comma lists (same length). For review.poses use frames 1 + 10 * index.
Per frame and limb, in the body frame (forelimbs: spine_05, hind limbs: spine_01; lateral axis = the bone's X):
  abduction_deg   angle of each segment out of the parasagittal plane, outward positive
                  (humerus, forearm for the forelimbs; thigh, gaskin for the hind limbs), and the same minus its rest value
  joint angles    included angle at the elbow and stifle (180 = straight), flexion at the carpus and hock
                  (0 = straight, the cannon in line with the segment above)
"""
import bpy, sys, json, math
from mathutils import Vector

A = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT, ACT = A[0], A[1], A[2]
FR = [int(x) for x in A[3].split(',')]; NM = A[4].split(',')
bpy.ops.wm.open_mainfile(filepath=SRC)
sc = bpy.context.scene
rig = bpy.data.objects['luceras_rig']; rig['controls_enabled'] = 0.0; rig.animation_data_create()


def seg(pb, n):
    b = pb[n]; return (b.tail - b.head)


def measure(pb):
    out = {}
    for leg in ('fl', 'fr', 'hl', 'hr'):
        body = pb['spine_05' if leg[0] == 'f' else 'spine_01'].matrix.to_3x3()
        lat = body.col[0].normalized() * (1.0 if leg[1] == 'l' else -1.0)
        if lat.x * (1.0 if leg[1] == 'l' else -1.0) < 0: lat = -lat
        s1, s2, s3 = (seg(pb, f'leg_{leg}_{i:02d}') for i in (1, 2, 3))
        ab = lambda v: math.degrees(math.asin(max(-1, min(1, v.normalized().dot(lat)))))
        r = {}
        names = ('humerus', 'forearm') if leg[0] == 'f' else ('thigh', 'gaskin')
        r[names[0] + '_abd'] = round(ab(s1), 1); r[names[1] + '_abd'] = round(ab(s2), 1)
        r['elbow_deg' if leg[0] == 'f' else 'stifle_deg'] = round(math.degrees((-s1).angle(s2)), 1)
        r['carpus_flex_deg' if leg[0] == 'f' else 'hock_flex_deg'] = round(math.degrees(s2.angle(s3)), 1)
        out[leg] = r
    return out


rig.animation_data.action = None
for p in rig.pose.bones: p.rotation_mode = 'QUATERNION'; p.rotation_quaternion = (1, 0, 0, 0); p.location = (0, 0, 0); p.scale = (1, 1, 1)
bpy.context.view_layer.update(); rest = measure(rig.pose.bones)
act = bpy.data.actions[ACT]; rig.animation_data.action = act
if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(act.slots): rig.animation_data.action_slot = act.slots[0]
res = {'rest': rest}
for f, n in zip(FR, NM):
    sc.frame_set(f); bpy.context.view_layer.update(); m = measure(rig.pose.bones)
    for leg, r in m.items():
        for k in list(r):
            if k.endswith('_abd'): r[k + '_vs_rest'] = round(r[k] - rest[leg][k], 1)
    res[n] = m
    print('PLAUS', n, json.dumps(m), flush=True)
json.dump(res, open(OUT, 'w'), indent=1)
print('PLAUS done', flush=True)
