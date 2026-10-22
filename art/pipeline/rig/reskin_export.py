"""B-sntv step A: export the sculpt body (rest coordinates, edges, triangles, current weights) and bones to an npz.
With a bone-segment JSON it also ray-tests visibility from each vertex to its nearest proxy segments.

blender -b --python reskin_export.py -- RIG.blend OUT.npz [SEGMENTS.json CANDIDATES.npz VIS_OUT.npz]
  CANDIDATES.npz: cand (n, k) segment indices, pts (n, k, 3) closest points on those segments
"""
import bpy, sys, json
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

A = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.open_mainfile(filepath=A[0])
rig = bpy.data.objects['luceras_rig']
body = bpy.data.objects['luceras_blockout']; me = body.data
n = len(me.vertices)
co = np.empty(n * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
E = np.empty(len(me.edges) * 2, np.int64); me.edges.foreach_get('vertices', E); E = E.reshape(-1, 2)
me.calc_loop_triangles()
T = np.empty(len(me.loop_triangles) * 3, np.int64); me.loop_triangles.foreach_get('vertices', T); T = T.reshape(-1, 3)
gn = [g.name for g in body.vertex_groups]
W = np.zeros((n, len(gn)), np.float32)
for v in me.vertices:
    for g in v.groups: W[v.index, g.group] = g.weight
bones = {b.name: (list(b.head_local), list(b.tail_local)) for b in rig.data.bones}
nrm = np.empty(n * 3); me.vertices.foreach_get('normal', nrm); nrm = nrm.reshape(-1, 3)
if len(A) <= 2 or A[1] != '-':
    np.savez_compressed(A[1], co=co, E=E, T=T, W=W, groups=np.array(gn), nrm=nrm, bones=json.dumps(bones))
    print('EXPORT done', n, len(E), len(T), flush=True)
if len(A) > 2:
    C = np.load(A[3])
    cand, pts = C['cand'], C['pts']
    tree = BVHTree.FromPolygons(co.tolist(), T.tolist(), all_triangles=True)
    k = cand.shape[1]
    vis = np.zeros(cand.shape, bool)
    for i in range(n):
        p = Vector(co[i]) - Vector(nrm[i]) * 0.0015    # start just inside the skin
        for j in range(k):
            if cand[i, j] < 0: continue
            q = Vector(pts[i, j]); d = q - p; L = d.length
            if L < 1e-5: vis[i, j] = True; continue
            hit = tree.ray_cast(p, d / L, L)
            vis[i, j] = hit[0] is None
        if i % 20000 == 0: print('VIS', i, flush=True)
    np.savez_compressed(A[4], vis=vis)
    print('VIS done', vis.mean(0).tolist(), flush=True)
