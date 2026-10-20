"""B-j5p6: profile the new welded paws along each claw-derived toe line (diagnostic only, read only)."""
import bpy, sys, numpy as np, json
bpy.ops.wm.open_mainfile(filepath=sys.argv[sys.argv.index('--')+1])
b = bpy.data.objects['luceras_blockout']; m = b.data
co = np.empty(len(m.vertices)*3); m.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
inv = b.matrix_world.inverted(); out = {}
for o in bpy.context.scene.objects:
    if o.type != 'MESH' or 'claw' not in o.name or 'dew' in o.name: continue
    if not (o.name.endswith('_l_2') or o.name.endswith('_l_1')): continue
    v = np.array([inv @ (o.matrix_world @ p.co) for p in o.data.vertices]); c = v.mean(0)
    _, _, vt = np.linalg.svd(v - c); d = vt[0]
    if d[1] > 0: d = -d
    s = (v - c) @ d; tip = v[s.argmax()]; base = v[s.argmin()]
    dh = np.array([d[0], d[1], 0.]); dh /= np.linalg.norm(dh)
    rel = co[:, :2] - tip[:2]; along = -(rel @ dh[:2]); perp = np.abs(rel @ np.array([-dh[1], dh[0]]))
    prof = []
    for a in np.arange(-4, 70, 3) / 1000:
        sel = (np.abs(along - a) < .0015) & (perp < .0025) & (co[:, 2] < .1)
        prof.append((round(a*1000), round(float(co[sel, 2].max())*1000, 1) if sel.any() else None))
    # lateral profile across the paw at 12 mm behind tip
    lat = []
    for q in np.arange(-30, 31, 2) / 1000:
        pq = rel @ np.array([-dh[1], dh[0]])
        sel = (np.abs(along - .012) < .0015) & (np.abs(pq - q) < .0012) & (co[:, 2] < .1)
        lat.append((round(q*1000), round(float(co[sel, 2].max())*1000, 1) if sel.any() else None))
    out[o.name] = {'tip': tip.round(4).tolist(), 'base': base.round(4).tolist(), 'dir': dh.round(3).tolist(), 'top_z_along_mm': prof, 'lateral_12mm_mm': lat}
print('PROFILE', json.dumps(out))
