"""Probe assembled Akinza: objects, modifiers, and per-vertex inward thickness of the main skin.

Run: python art/species-construction/loop/loop_tools.py blender probe_thickness.py -- <akinza.blend> <out.npz>
Saves world vertices, triangles, vertex normals and the inward ray distance (to the opposite skin) per vertex.
"""
import sys, time
import bpy, numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

a = sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.open_mainfile(filepath=a[0])
for ob in bpy.data.objects:
    print('OBJ', ob.name, ob.type, len(ob.data.vertices) if ob.type == 'MESH' else '', [m.type for m in ob.modifiers],
          'identity' if ob.matrix_world == ob.matrix_world.Identity(4) else 'MATRIX')
skin = max((o for o in bpy.data.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
me = skin.data
n = len(me.vertices)
co = np.empty(n*3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
nr = np.empty(n*3); me.vertices.foreach_get('normal', nr); nr = nr.reshape(-1, 3)
me.calc_loop_triangles()
tri = np.empty(len(me.loop_triangles)*3, dtype=np.int32); me.loop_triangles.foreach_get('vertices', tri); tri = tri.reshape(-1, 3)
bvh = BVHTree.FromPolygons([tuple(v) for v in co], [tuple(t) for t in tri])
t0 = time.time()
th = np.full(n, -1.0)
for i in range(n):
    p = Vector(co[i]); d = -Vector(nr[i])
    hit = bvh.ray_cast(p + d*0.0015, d, 0.6)
    if hit[0] is not None:
        th[i] = hit[3] + 0.0015
print('raycast', round(time.time()-t0, 1), 'misses', int((th < 0).sum()))
np.savez_compressed(a[1], v=co, t=tri, n=nr, th=th, name=np.array(skin.name))
