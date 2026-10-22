"""B-sntv pass 2: does the groom's binding (loop-triangle index + barycentrics on luceras_blockout) still hold?

blender -b --python reskin_groomcheck.py -- OLD_RIG.blend NEW_RIG.blend OUT.json
Compares polygons, loop order and the loop-triangle tessellation of the sculpt body between the two files, and the rest
movement of the vertices (the hair roots ride on them).
"""
import bpy, sys, json
import numpy as np

A = sys.argv[sys.argv.index('--') + 1:]


def grab(path):
    bpy.ops.wm.open_mainfile(filepath=path)
    me = bpy.data.objects['luceras_blockout'].data
    if me.shape_keys:
        co = np.array([v.co[:] for v in me.shape_keys.key_blocks[0].data])
    else:
        co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    lv = np.empty(len(me.loops), np.int64); me.loops.foreach_get('vertex_index', lv)
    ls = np.empty(len(me.polygons), np.int64); me.polygons.foreach_get('loop_start', ls)
    me.calc_loop_triangles()
    lt = np.empty(len(me.loop_triangles) * 3, np.int64); me.loop_triangles.foreach_get('vertices', lt)
    tp = np.empty(len(me.loop_triangles), np.int64); me.loop_triangles.foreach_get('polygon_index', tp)
    return dict(co=co, lv=lv, ls=ls, lt=lt.reshape(-1, 3), tp=tp)


o = grab(A[0]); n = grab(A[1])
same_loops = o['lv'].shape == n['lv'].shape and bool((o['lv'] == n['lv']).all()) and bool((o['ls'] == n['ls']).all())
same_tris = o['lt'].shape == n['lt'].shape and bool((o['lt'] == n['lt']).all())
diff_tris = int((o['lt'] != n['lt']).any(1).sum()) if o['lt'].shape == n['lt'].shape else None
mv = np.linalg.norm(n['co'] - o['co'], axis=1)
out = dict(vertices=len(o['co']), polygons_and_loops_identical=same_loops, loop_triangles_identical=same_tris, loop_triangles_differing=diff_tris,
           triangles=len(o['lt']), rest_move_mm=dict(max=float(mv.max() * 1000), moved_over_0p1mm=int((mv > 1e-4).sum()), moved_over_1mm=int((mv > 1e-3).sum())))
json.dump(out, open(A[2], 'w'), indent=1)
print('GROOMCHECK', out, flush=True)
