"""B-bafy: lateral surface profile behind the left elbow (read only).

blender -b --factory-startup --python chest_profile.py -- CLIPS OUT_JSON frame[,frame]
For each posed frame (0 = rest pose with no action), in horizontal bands around the elbow height, the outermost
left-side surface (max x) along the body (y, 5 mm bins, from 4 cm in front of the elbow to 12 cm behind it).
A crease behind the arm shows as a dip in x between the arm's back edge and the chest wall; a protrusion as a peak.
Positions are relative to the posed left elbow joint (leg_fl_02 head).
"""
import bpy, sys, json
import numpy as np

clips, out, frs = sys.argv[sys.argv.index('--') + 1:][:3]
bpy.ops.wm.open_mainfile(filepath=clips)
rig = bpy.data.objects['luceras_rig']; body = bpy.data.objects['luceras_blockout']; sc = bpy.context.scene; rig.animation_data_create()
res = {}
for fr in [int(x) for x in frs.split(',')]:
    if fr < 0:
        rig.animation_data.action = None
        for p in rig.pose.bones: p.rotation_mode = 'QUATERNION'; p.rotation_quaternion = (1, 0, 0, 0); p.location = (0, 0, 0); p.scale = (1, 1, 1)
        sc.frame_set(0)
    else:
        a = bpy.data.actions['sig.horns-first-descent']; rig.animation_data.action = a
        if rig.animation_data.action_slot is None: rig.animation_data.action_slot = a.slots[0]
        sc.frame_set(fr)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh()
    V = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', V); ev.to_mesh_clear(); V = V.reshape(-1, 3)
    el = np.array(rig.pose.bones['leg_fl_02'].head)
    R = V - el; R = R[V[:, 0] > 0]
    tab = {}
    for z0 in (-0.02, 0.0, 0.02, 0.04, 0.06, 0.08):
        band = R[np.abs(R[:, 2] - z0) < 0.006]; row = []
        for y0 in np.arange(-0.04, 0.12, 0.005):
            s = band[np.abs(band[:, 1] - y0) < 0.0025]
            row.append(round(float(s[:, 0].max() * 1000), 1) if len(s) else None)
        tab[f'dz{int(z0 * 1000):+d}mm'] = row
    res[str(fr)] = {'elbow': el.round(4).tolist(), 'y_bins_mm': [int(round(y * 1000)) for y in np.arange(-0.04, 0.12, 0.005)], 'max_x_mm': tab}
    print('PROF', fr, flush=True)
open(out, 'w').write(json.dumps(res, indent=1)); print('PROF done')
