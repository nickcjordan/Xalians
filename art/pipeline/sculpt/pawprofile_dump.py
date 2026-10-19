"""B-4cj4: dump Luceras body mesh, claws and paw bones from a sculpt blend to npz for numpy-side paw work.
Usage: blender -b IN.blend --python pawprofile_dump.py -- OUT.npz"""
import bpy, numpy as np, sys, json, hashlib
out = sys.argv[sys.argv.index('--') + 1]
body = bpy.data.objects['luceras_blockout']; mw = np.array(body.matrix_world)
co = np.empty(len(body.data.vertices) * 3); body.data.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
w = co @ mw[:3, :3].T + mw[:3, 3]
vi = np.empty(len(body.data.loops), np.int32); body.data.loops.foreach_get('vertex_index', vi)
m = body.data; m.calc_loop_triangles(); tris = np.array([t.vertices[:] for t in m.loop_triangles], np.int32)
d = {'co_local': co, 'world': w, 'tris': tris, 'mw': mw}
names = []
for o in bpy.data.objects:
    if o.type == 'MESH' and 'claw' in o.name.lower():
        v = np.array([o.matrix_world @ p.co for p in o.data.vertices]); d['claw_' + o.name] = v; names.append(o.name)
meta = {'topology_sha256': hashlib.sha256(vi.tobytes()).hexdigest(), 'nverts': len(co), 'claws': names,
        'objects': [(o.name, o.type, o.parent.name if o.parent else None) for o in bpy.data.objects],
        'mods': [(md.name, md.type) for md in body.modifiers]}
np.savez_compressed(out, **d); open(out + '.json', 'w').write(json.dumps(meta, indent=1)); print('DUMPED', meta['topology_sha256'], len(co))
