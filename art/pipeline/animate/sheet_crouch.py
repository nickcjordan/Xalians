"""B-bafy pass 5: the rig deformation sheet's crouch (review.poses frame 11) in the sheet's own camera, before and after
an elbow tuck applied to that pose.

blender -b --factory-startup --python sheet_crouch.py -- RIG OUT_DIR TAG TUCK [OUT_RIG]
The sheet (art/pipeline/rig/build_rig.py renders(), prefix 'final'): the baked action review.poses, crouch at frame
1 + 10 * POSES.index('crouch') = 11, controls off; look-dev scene, Cycles 16 samples, clay on sculpt and game meshes,
game hidden; orthographic camera place_camera(bounds of every posed sculpt and game mesh, azimuth 90, elevation 0,
margin 0.04), i.e. from the creature's left, head to the left; 896 px.
TUCK > 0 turns each foreleg's fold plane (shoulder, elbow, wrist) about the shoulder-to-wrist line toward the
leg's own sagittal plane by that share, keeping the shoulder, the wrist and the paw's orientation (the same
operation as the signature's fore_crouch_elbow_tuck in pose_rig.py). With OUT_RIG the turned pose is keyed back
into review.poses at frame 11 and the rig saved there (the input rig is never written).
Writes TAG_sheet_crouch.png (sheet look), TAG_sheet_crouch_grz.png (look-dev lights off, one low raking sun),
TAG_crop.png and TAG_crop_grz.png (3x crops of the chest behind the left foreleg) and TAG_sheet_crouch.json.
"""
import bpy, sys, json, math
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'roster'))
import lookdev

a = sys.argv[sys.argv.index('--') + 1:]
RIG, OUT, TAG, TUCK = a[0], Path(a[1]), a[2], float(a[3]); OUT_RIG = a[4] if len(a) > 4 else None
OUT.mkdir(parents=True, exist_ok=True)
FRAME = 11
bpy.ops.wm.open_mainfile(filepath=RIG)
sc = bpy.context.scene; vl = bpy.context.view_layer
rig = bpy.data.objects['luceras_rig']; rig['controls_enabled'] = 0.0; rig.update_tag()
rig.animation_data_create(); act = bpy.data.actions['review.poses']; rig.animation_data.action = act
if hasattr(rig.animation_data, 'action_slot') and rig.animation_data.action_slot is None and len(act.slots): rig.animation_data.action_slot = act.slots[0]
sc.frame_set(FRAME); vl.update()
body = bpy.data.objects['luceras_blockout']


def elbow(side):
    return rig.pose.bones[f'leg_f{side}_02'].head.copy()


rec = {'rig': RIG, 'frame': FRAME, 'tuck': TUCK, 'elbow_before': {s: [round(x, 4) for x in elbow(s)] for s in 'lr'},
       'elbow_rest': {s: [round(x, 4) for x in rig.data.bones[f'leg_f{s}_02'].head_local] for s in 'lr'}}

if TUCK > 0:
    basis = {p.name: p.matrix_basis.copy() for p in rig.pose.bones}
    rig.animation_data.action = None
    for p in rig.pose.bones: p.matrix_basis = basis[p.name]
    vl.update()
    for s in 'lr':
        a1, b1, c1 = (rig.pose.bones[f'leg_f{s}_{i:02d}'] for i in (1, 2, 3))
        H, K, Wr = a1.head.copy(), a1.tail.copy(), b1.tail.copy(); R3 = c1.matrix.to_3x3().normalized()
        n = (Wr - H).normalized(); side = (K - H) - n * (K - H).dot(n); h = side.length; along = (K - H).dot(n); side.normalize()
        sg = Vector((0.0, side.y, side.z)); sg = sg - n * sg.dot(n); sg.normalize()
        new = side.lerp(sg, TUCK).normalized(); K2 = H + n * along + new * h
        for p, (st, en) in ((a1, (H, K2)), (b1, (K2, Wr))):
            Mx = p.matrix.copy(); cur = Mx.col[1].xyz.normalized()
            q = cur.rotation_difference((en - st).normalized())
            p.matrix = Matrix.Translation(p.head) @ (q.to_matrix() @ Mx.to_3x3()).to_4x4(); vl.update()
        c1.matrix = Matrix.Translation(c1.head) @ R3.to_4x4(); vl.update()
    if OUT_RIG:
        rig.animation_data.action = act
        for s in 'lr':
            for i in (1, 2, 3):
                p = rig.pose.bones[f'leg_f{s}_{i:02d}']
                for prop in ('location', 'rotation_quaternion', 'rotation_euler', 'scale'):
                    try: p.keyframe_insert(prop, frame=FRAME)
                    except Exception: pass
        # keyframe_insert reads the current pose values; re-evaluate from the action to confirm the key holds
        held = {p.name: p.matrix.copy() for p in rig.pose.bones if p.name.startswith('leg_f')}
        sc.frame_set(FRAME); vl.update()
        rec['key_hold_max_diff'] = max(float(max(abs(x) for row in (rig.pose.bones[n].matrix - m) for x in row)) for n, m in held.items())
        rig['review_crouch_elbow_tuck'] = TUCK
        bpy.ops.wm.save_as_mainfile(filepath=OUT_RIG); rec['saved'] = OUT_RIG
rec['elbow_after'] = {s: [round(x, 4) for x in elbow(s)] for s in 'lr'}
kb = body.data.shape_keys.key_blocks
import os
if os.environ.get('MUTE_ELBOW_CORR'):   # diagnosis only: the elbow-crouch correctives off
    for k in kb:
        if k.name.startswith('PSD_elbow_f') and k.name.endswith('_crouch'): k.mute = True
    vl.update(); rec['muted'] = 'PSD_elbow_f*_crouch'
rec['correctives'] = {k.name: round(float(k.value), 3) for k in kb[1:]}

# lateral surface profile behind the left elbow (as chest_profile.py)
dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh()
V = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', V); ev.to_mesh_clear(); V = V.reshape(-1, 3)
el = np.array(elbow('l')); Rr = V - el; Rr = Rr[V[:, 0] > 0]; prof = {}
for z0 in (0.0, 0.02, 0.04):
    band = Rr[np.abs(Rr[:, 2] - z0) < 0.006]; row = []
    for y0 in np.arange(-0.04, 0.10, 0.005):
        s_ = band[np.abs(band[:, 1] - y0) < 0.0025]; row.append(round(float(s_[:, 0].max() * 1000), 1) if len(s_) else None)
    drops = [row[i] - row[i + 1] for i in range(len(row) - 1) if row[i] is not None and row[i + 1] is not None]
    prof[f'dz+{int(z0 * 1000)}mm'] = {'max_x_mm': row, 'largest_one_bin_drop_mm': round(max(drops), 1)}
rec['profile_behind_left_elbow'] = prof

# render, sheet look
lookdev.setup_scene('CYCLES'); sc.cycles.samples = 16
sculpt = [o for o in sc.objects if o.type == 'MESH' and o.get('body_kind') == 'sculpt']
game = [o for o in sc.objects if o.type == 'MESH' and o.get('body_kind') == 'game']
for o in sculpt + game: lookdev.apply_clay(o)
for o in sc.objects:
    if o.type == 'MESH': o.hide_render = o.get('body_kind') != 'sculpt'
dg = bpy.context.evaluated_depsgraph_get(); pts = []
for o in sculpt + game:
    e = o.evaluated_get(dg); mm = e.to_mesh(); x = np.empty(len(mm.vertices) * 3); mm.vertices.foreach_get('co', x); e.to_mesh_clear()
    x = x.reshape(-1, 3); W = np.array(o.matrix_world); pts.append(x @ W[:3, :3].T + W[:3, 3])
P = np.vstack(pts); box = (Vector(P.min(0).tolist()), Vector(P.max(0).tolist()))
cam = lookdev.place_camera('lookdev_pose', box, 90, 0, .04); sc.camera = cam
SIZE = 896
lookdev.render(cam, OUT / f'{TAG}_sheet_crouch.png', size=SIZE)
lights = [o for o in sc.objects if o.type == 'LIGHT']
ld = bpy.data.lights.new('graze_sun', 'SUN'); ld.energy = 4.0; ld.angle = math.radians(1.0)
sun = bpy.data.objects.new('graze_sun', ld); sc.collection.objects.link(sun)
cd = lookdev.camera_direction(90, 0)
d = (Vector((0, 0.75, -0.55)).normalized() * math.cos(math.radians(25)) - cd * math.sin(math.radians(25))).normalized()
sun.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
for l in lights: l.hide_render = True
bgs = sc.world.node_tree.nodes['Background'].inputs['Strength']; bg0 = bgs.default_value; bgs.default_value = 0.08
sc.cycles.samples = 32
lookdev.render(cam, OUT / f'{TAG}_sheet_crouch_grz.png', size=SIZE)
# crop: centred 3 cm behind and 2 cm above the posed left elbow, 0.20 m wide, upscaled 3x
c = world_to_camera_view(sc, cam, Vector((el[0], el[1] + 0.03, el[2] + 0.02)))
rec['crop'] = {'centre_ndc': [round(c.x, 4), round(c.y, 4)], 'width_m': 0.20, 'ortho_scale': cam.data.ortho_scale}
(OUT / f'{TAG}_sheet_crouch.json').write_text(json.dumps(rec, indent=1))
print('SHEET', json.dumps({k: rec[k] for k in ('elbow_before', 'elbow_after', 'correctives')}), json.dumps({k: v['largest_one_bin_drop_mm'] for k, v in prof.items()}), flush=True)
