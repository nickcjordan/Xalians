"""Probe the groom around the muzzle: coat curve objects, their attributes, strand roots near the nose tip, the body's
UV map and the muzzle block's vertices. blender -b GROOM.blend --python head_muzzle_probe.py -- OUT.json"""
import bpy, sys, json
import numpy as np
OUT = sys.argv[sys.argv.index('--') + 1]
def arr(items, key, n, dt=np.float32):
    x = np.empty(len(items) * n, dt); items.foreach_get(key, x); return x.reshape(-1, n) if n > 1 else x
body = bpy.data.objects['luceras_blockout']; Mb = np.array(body.matrix_world)
V = arr(body.data.vertices, 'co', 3) @ Mb[:3, :3].T + Mb[:3, 3]
rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and o.name.startswith('luceras_rig'))
Rw = np.array(rig.matrix_world); hb = rig.data.bones['head_01']
hh = (Rw @ np.r_[hb.head_local, 1])[:3]; ht = (Rw @ np.r_[hb.tail_local, 1])[:3]
ax = ht - hh; u = np.clip(((V - hh) @ ax) / (ax @ ax), 0, 1); dh = np.linalg.norm(V - (hh + u[:, None] * ax), axis=1)
head = np.where(dh < 0.07)[0]; tipi = head[np.argmin(V[head, 1])]; tip = V[tipi]
rep = dict(tip=tip.round(4).tolist(), body_attrs=[(a.name, a.domain, a.data_type) for a in body.data.attributes if not a.name.startswith('.')],
           uv=[u_.name for u_ in body.data.uv_layers], mods=[(m.name, m.type) for m in body.modifiers])
blk = np.where((np.linalg.norm(V - tip, axis=1) < 0.03) & (V[:, 1] < tip[1] + 0.012))[0]
rep['block_verts'] = [[int(i)] + V[i].round(4).tolist() for i in blk]
cs = {}
for o in bpy.data.objects:
    if o.type != 'CURVES': continue
    d = o.data; offs = arr(d.curves, 'first_point_index', 1, np.int32)
    P = arr(d.attributes['position'].data, 'vector', 3); Mo = np.array(o.matrix_world); R = P[offs] @ Mo[:3, :3].T + Mo[:3, 3]
    near = np.linalg.norm(R - tip, axis=1)
    cnt = arr(d.curves, 'points_length', 1, np.int32)
    seg = np.linalg.norm(np.diff(P, axis=0), axis=1)
    L = np.array([seg[a_:a_ + c - 1].sum() for a_, c in zip(offs, cnt)])
    nn = np.argsort(near)[:5]
    cs[o.name] = dict(n=len(offs), pts=len(P), surface=getattr(d.surface, 'name', None), uvmap=d.surface_uv_map,
                      attrs=[(a.name, a.domain, a.data_type) for a in d.attributes if not a.name.startswith('.')],
                      within_15mm=int((near < 0.015).sum()), within_25mm=int((near < 0.025).sum()), within_40mm=int((near < 0.04).sum()),
                      nearest=[[round(float(near[i]) * 1000, 1)] + R[i].round(4).tolist() + [round(float(L[i]) * 1000, 1), int(cnt[i])] for i in nn],
                      mods=[(m.name, m.type, m.node_group.name if m.type == 'NODES' and m.node_group else None) for m in o.modifiers])
rep['curves'] = cs
json.dump(rep, open(OUT, 'w'), indent=1); print('PROBE done', flush=True)
