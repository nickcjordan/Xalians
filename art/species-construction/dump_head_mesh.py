"""Dump every mesh of a head blend to an npz (the blend's world space is head-local units): <name>__v vertices,
<name>__t triangles, <name>__m triangle material index. Input of fit_head_mass.py.

Run through loop_tools.py blender:  dump_head_mesh.py -- <head.blend> <out.npz>
"""
import sys

import bpy
import numpy as np

a = sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.open_mainfile(filepath=a[0])
out = {}
for o in bpy.context.scene.objects:
    if o.type != 'MESH':
        continue
    me = o.data
    me.calc_loop_triangles()
    v = np.empty(len(me.vertices)*3)
    me.vertices.foreach_get('co', v)
    M = np.array(o.matrix_world)
    v = v.reshape(-1, 3)@M[:3, :3].T+M[:3, 3]
    t = np.empty(len(me.loop_triangles)*3, np.int32)
    me.loop_triangles.foreach_get('vertices', t)
    pm = np.empty(len(me.polygons), np.int32)
    me.polygons.foreach_get('material_index', pm)
    tp = np.empty(len(me.loop_triangles), np.int32)
    me.loop_triangles.foreach_get('polygon_index', tp)
    key = o.name.replace(' ', '_')
    out[key+'__v'] = v.astype(np.float32)
    out[key+'__t'] = t.reshape(-1, 3)
    out[key+'__m'] = pm[tp]
    print('obj', o.name, len(v))
np.savez_compressed(a[1], **out)
