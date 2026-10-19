"""B-exrv: dump Luceras body mesh, claws and rig bones (world space) from a sculpt blend to npz. Read only.
Usage: blender -b IN.blend --python paw_part_dump.py -- OUT.npz"""
import bpy, numpy as np, sys, json
out = sys.argv[sys.argv.index('--') + 1]
body = bpy.data.objects['luceras_blockout']; mw = np.array(body.matrix_world)
dg = bpy.context.evaluated_depsgraph_get()
co = np.empty(len(body.data.vertices) * 3); body.data.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
w = co @ mw[:3, :3].T + mw[:3, 3]
m = body.data; m.calc_loop_triangles(); tris = np.array([t.vertices[:] for t in m.loop_triangles], np.int32)
d = {'world': w, 'tris': tris, 'mw': mw}
for o in bpy.data.objects:
    if o.type == 'MESH' and 'claw' in o.name.lower():
        d['claw_' + o.name] = np.array([o.matrix_world @ p.co for p in o.data.vertices])
        d['clawF_' + o.name] = np.array([list(p.vertices) for p in o.data.polygons if len(p.vertices) == 3] or [[0, 0, 0]])
rig = bpy.data.objects['luceras_rig']; bones = {}
for b in rig.data.bones:
    bones[b.name] = {'head': list(rig.matrix_world @ b.head_local), 'tail': list(rig.matrix_world @ b.tail_local), 'parent': b.parent.name if b.parent else None}
meta = {'nverts': len(co), 'mods': [(md.name, md.type) for md in body.modifiers], 'bones': bones,
        'claw_info': {o.name: {'nv': len(o.data.vertices), 'nf': len(o.data.polygons), 'parent_type': o.parent_type, 'parent_bone': o.parent_bone} for o in bpy.data.objects if 'claw' in o.name}}
np.savez_compressed(out, **d); open(out + '.json', 'w').write(json.dumps(meta, indent=1)); print('DUMPED', len(co))
