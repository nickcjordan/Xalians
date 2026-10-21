"""Export the shaved skin of the fur of record (and list every object) for the rig.

  run_blender.py probe_skin.py probe.log -- <surface.blend> <out dir>
Writes skin.npz (verts world, tris, material index per tri), objects.json.
"""
import json
import sys
from pathlib import Path

import bpy
import numpy as np

src, out = sys.argv[sys.argv.index('--')+1:][:2]
out = Path(out)
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=src)
info = []
for o in bpy.data.objects:
    d = dict(name=o.name, type=o.type, parent=o.parent.name if o.parent else None,
             modifiers=[(m.type, m.name) for m in o.modifiers], hide_render=o.hide_render,
             matrix=[list(r) for r in o.matrix_world])
    if o.type == 'MESH':
        d.update(vertices=len(o.data.vertices), polygons=len(o.data.polygons),
                 materials=[m.name if m else None for m in o.data.materials],
                 uv=[u.name for u in o.data.uv_layers], groups=[g.name for g in o.vertex_groups])
        co = np.empty(len(o.data.vertices)*3, np.float32)
        o.data.vertices.foreach_get('co', co)
        co = co.reshape(-1, 3)@np.array(o.matrix_world)[:3, :3].T+np.array(o.matrix_world)[:3, 3]
        d['bounds'] = [co.min(0).tolist(), co.max(0).tolist()]
    if o.type == 'CURVES':
        d.update(curves=len(o.data.curves), points=len(o.data.points),
                 surface=o.data.surface.name if o.data.surface else None,
                 attributes=[a.name for a in o.data.attributes])
    info.append(d)
(out/'objects.json').write_text(json.dumps(info, indent=1))
skin = bpy.data.objects['akinza_continuous_construction']
m = skin.data
co = np.empty(len(m.vertices)*3, np.float32)
m.vertices.foreach_get('co', co)
mw = np.array(skin.matrix_world)
co = co.reshape(-1, 3)@mw[:3, :3].T+mw[:3, 3]
m.calc_loop_triangles()
tri = np.empty(len(m.loop_triangles)*3, np.int32)
m.loop_triangles.foreach_get('vertices', tri)
mat = np.empty(len(m.loop_triangles), np.int32)
m.loop_triangles.foreach_get('material_index', mat)
e = np.empty(len(m.edges)*2, np.int32)
m.edges.foreach_get('vertices', e)
np.savez_compressed(out/'skin.npz', verts=co, tris=tri.reshape(-1, 3), mat=mat, edges=e.reshape(-1, 2))
print('PROBE_DONE', len(co), len(tri)//3)
