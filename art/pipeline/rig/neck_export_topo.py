"""B-6kf7: export the sculpt body's edges, triangles and rest coordinates (read only) for numpy-side fitting."""
import bpy, sys, numpy as np
a = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.open_mainfile(filepath=a[0]); me = bpy.data.objects['luceras_blockout'].data
V = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', V)
E = np.empty(len(me.edges) * 2, np.int32); me.edges.foreach_get('vertices', E)
me.calc_loop_triangles(); F = np.empty(len(me.loop_triangles) * 3, np.int32); me.loop_triangles.foreach_get('vertices', F)
np.savez_compressed(a[1], V=V.reshape(-1, 3), E=E.reshape(-1, 2), F=F.reshape(-1, 3))
print('TOPO done', len(V) // 3)
