"""B-ykwq: measure Luceras paw ratios on the clay mesh (paw width / ankle width, paw length / leg height)."""
import bpy, numpy as np, sys, json
from pathlib import Path
a = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.open_mainfile(filepath=a[0]); out = Path(a[1])
body = bpy.data.objects['luceras_blockout']; rig = bpy.data.objects['luceras_rig']
mw = np.array(body.matrix_world)
co = np.array([v.co[:] for v in body.data.vertices]); w = co @ mw[:3, :3].T + mw[:3, 3]
bones = {b.name: {'head': list(rig.matrix_world @ b.head_local), 'tail': list(rig.matrix_world @ b.tail_local), 'parent': b.parent.name if b.parent else None} for b in rig.data.bones if b.name.startswith('leg')}
def claws(prefix):
    out = []
    for o in bpy.data.objects:
        if o.type == 'MESH' and o.name.startswith(prefix) and 'dew' not in o.name:
            v = np.array([o.matrix_world @ p.co for p in o.data.vertices]); out.append(v)
    return out
import hashlib
vi = np.empty(len(body.data.loops), np.int32); body.data.loops.foreach_get('vertex_index', vi)
res = {'bones': bones, 'paws': {}, 'topology_sha256': hashlib.sha256(vi.tobytes()).hexdigest(), 'faces': len(body.data.polygons), 'edges_sha256': hashlib.sha256(np.array([e.vertices[:] for e in body.data.edges], np.int32).tobytes()).hexdigest()}
print('TOPO', res['topology_sha256'], res['edges_sha256'])
for key, side, prefix, bone in [('fore_l', 1, 'fore_claw_l', 'leg_fl_03'), ('fore_r', -1, 'fore_claw_r', 'leg_fr_03'), ('hind_l', 1, 'hind_claw_l', 'leg_hl_03'), ('hind_r', -1, 'hind_claw_r', 'leg_hr_03')]:
    cl = claws(prefix); tips = np.array([c[np.argmin(c[:, 1])] for c in cl])
    ctr = np.concatenate(cl).mean(0)
    hb = np.array(bones[bone]['head'])
    v = w[(np.sign(w[:, 0]) == side) & (np.abs(w[:, 0]) > 0.005) & (w[:, 2] < hb[2] + 0.002) & ((w[:, 1] < 0) if key.startswith('fore') else (w[:, 1] > 0))]
    up = v[(v[:, 2] > hb[2] - 0.03)]; legc = up[:, :2].mean(0)
    ax = ctr[:2] - legc; ax /= np.linalg.norm(ax); perp = np.array([-ax[1], ax[0]])
    def ext(m, d): x = v[m][:, :2] @ d; return float(x.max() - x.min()) if m.any() else 0.0
    paw_w = ext(v[:, 2] < 0.03, perp)
    slices = []
    for z in np.arange(0.035, hb[2] + 0.001, 0.005):
        m = (np.abs(v[:, 2] - z) < 0.0025); slices.append((float(z), ext(m, perp), ext(m, ax)))
    print("SL", key, [tuple(round(x, 3) for x in s) for s in slices])
    ank = min([s for s in slices if s[1] > 0.01], key=lambda s: s[1])
    am = np.abs(v[:, 2] - ank[0]) < 0.0025; pivot = v[am][:, :2].mean(0)
    ground = v[v[:, 2] < 0.012]; gx = ground[:, :2] @ ax; paw_l = float(gx.max() - gx.min())
    res['paws'][key] = {'joint_m': hb.tolist(), 'paw_axis_xy': ax.tolist(), 'width_axis_xy': perp.tolist(), 'paw_width_m': paw_w, 'ankle_width_m': ank[1], 'ankle_z_m': ank[0], 'paw_length_ground_m': paw_l, 'pivot_xy_m': pivot.tolist(),
                        'heel_xyz_m': ground[np.argmin(gx)].tolist(), 'toe_xyz_m': ground[np.argmax(gx)].tolist(),
                        'leg_height_m': float(hb[2]), 'width_ratio': paw_w / ank[1], 'length_ratio': paw_l / hb[2], 'slices': slices, 'claw_tips': tips.tolist(), 'claw_centroid': ctr.tolist()}
out.write_text(json.dumps(res, indent=1))
for k, p in res['paws'].items(): print('PAW', k, {x: round(p[x], 4) for x in ['paw_width_m', 'ankle_width_m', 'ankle_z_m', 'paw_length_ground_m', 'leg_height_m', 'width_ratio', 'length_ratio']})
for k, b in bones.items(): print('BONE', k, np.round(b['head'], 3), np.round(b['tail'], 3))
