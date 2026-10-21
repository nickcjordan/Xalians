"""B-5wvn (groom pass 10): dump body and curve data around the tail for the tail pattern mask. Read only.
Usage: blender -b --python inspect_tail_pass10.py -- GROOM OUT.npz"""
import bpy, sys, json, numpy as np
groom, out = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.open_mainfile(filepath=groom)
def arr(items, key, n=3, dt=np.float32):
    a = np.empty(len(items) * n, dt); items.foreach_get(key, a); return a.reshape(-1, n) if n > 1 else a
body = bpy.data.objects['luceras_blockout']; m = body.data
co = arr(m.vertices, 'co'); nrm = arr(m.vertices, 'normal')
col = arr(m.attributes['coat_color'].data, 'color', 4)
groups = {g.index: g.name for g in body.vertex_groups}
names = sorted(set(groups.values())); W = np.zeros((len(co), len(names)), np.float32); idx = {n: i for i, n in enumerate(names)}
for v in m.vertices:
    for g in v.groups: W[v.index, idx[groups[g.group]]] = g.weight
D = dict(co=co, nrm=nrm, col=col, W=W, names=np.array(names))
info = {'objects': [], 'body_attrs': [(a.name, a.domain, a.data_type) for a in m.attributes], 'body_materials': [x.name for x in m.materials]}
for o in bpy.data.objects:
    e = {'name': o.name, 'type': o.type, 'hide_render': o.hide_render, 'parent': o.parent.name if o.parent else None}
    if o.type == 'CURVES':
        d = o.data; c = len(d.curves); N = len(d.attributes['position'].data) // max(c, 1)
        e.update(curves=c, points=N, surface=d.surface.name if d.surface else None, attrs=[(a.name, a.domain, a.data_type) for a in d.attributes], mods=[(x.name, x.type) for x in o.modifiers], mats=[x.name for x in d.materials])
        if d.surface == body and c > 1000:
            pos = arr(d.attributes['position'].data, 'vector').reshape(c, N, 3)
            key = o.name.replace(' ', '_')
            D[key + '__pos'] = pos[:, ::max(1, (N - 1) // 4)]
            for a in d.attributes:
                if a.domain == 'CURVE' and a.data_type in ('FLOAT', 'FLOAT_COLOR', 'INT'):
                    n = 4 if a.data_type == 'FLOAT_COLOR' else 1
                    D[key + '__' + a.name] = arr(a.data, 'color' if n == 4 else 'value', n, np.int32 if a.data_type == 'INT' else np.float32)
    info['objects'].append(e)
np.savez_compressed(out, **D)
open(out.replace('.npz', '.json'), 'w').write(json.dumps(info, indent=1))
print('INSPECTED', len(co))
