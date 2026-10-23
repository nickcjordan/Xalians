"""B-sntv pass 7: intersection gate split by visibility.

blender -b --python reskin_gate7.py -- BLEND OUT.json SHEET_POSES SIG_FRAMES
SHEET_POSES: comma list of review pose names (posed from review.poses at 1 + 10 * index of POSE_ORDER), or '-'.
SIG_FRAMES: comma list of frames of the baked signature clip, or '-'.

For every crossing triangle pair (audit definition: different dominant bones, no shared vertex) the crossing points
are the edge-triangle intersections of the two triangles. A pair is visible when any crossing point can be seen from
any of the 8 audit cameras (orthographic directions: left, right, front, back, top, underside, low 3/4 front left and
rear left; the sprite side camera is the left/right direction): a ray from the point toward the camera does not hit the
evaluated body. For the hidden pairs the buried depth is the deepest vertex of either triangle behind the other
triangle's plane, limited to vertices that project inside it.
"""
import bpy, sys, json, math, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import reskin_vis as RV
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import intersect_ray_tri

A = sys.argv[sys.argv.index('--') + 1:]
BLEND, OUT, SHEET, SIG = A[:4]
POSE_ORDER = 'rest,crouch,leap,landing,head_left_up,tail_side_up,foreleg_step,breath_in,crouch_deep,landing_old'.split(',')
bpy.ops.wm.open_mainfile(filepath=BLEND)
sc = bpy.context.scene; vl = bpy.context.view_layer
rig = bpy.data.objects['luceras_rig']; body = bpy.data.objects['luceras_blockout']; me = body.data
me.calc_loop_triangles()
NT = len(me.loop_triangles); F = np.empty(NT * 3, np.int64); me.loop_triangles.foreach_get('vertices', F); F = F.reshape(-1, 3)
gn = [x.name for x in body.vertex_groups]; deform = {b.name for b in rig.data.bones if b.use_deform}
Wd = np.zeros((len(me.vertices), len(gn)), np.float32)
for v in me.vertices:
    for gg in v.groups:
        if gn[gg.group] in deform: Wd[v.index, gg.group] = gg.weight
DOM = Wd.argmax(1); TDOM = DOM[F[:, 0]]


def ev():
    dg = bpy.context.evaluated_depsgraph_get(); e = body.evaluated_get(dg); m = e.to_mesh()
    x = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', x); e.to_mesh_clear(); return x.reshape(-1, 3)


def pairs_all(V):
    trees = {}
    for j in np.unique(TDOM):
        ti = np.nonzero(TDOM == j)[0]; P = V[F[ti]].reshape(-1, 3)
        trees[j] = (BVHTree.FromPolygons(V.tolist(), F[ti].tolist(), all_triangles=True), ti, P.min(0), P.max(0))
    keys = sorted(trees); out = set()
    for a in range(len(keys)):
        ta, ia, la, ha = trees[keys[a]]
        for b in range(a + 1, len(keys)):
            tb, ib, lb, hb = trees[keys[b]]
            if np.any(ha < lb) or np.any(hb < la): continue
            for p, q in ta.overlap(tb):
                g1, g2 = int(ia[p]), int(ib[q])
                if len(set(F[g1]) & set(F[g2])): continue
                out.add((min(g1, g2), max(g1, g2)))
    return out


res = {}
if SHEET != '-':
    rig.animation_data.action = bpy.data.actions['review.poses']
    for p in SHEET.split(','):
        sc.frame_set(1 + 10 * POSE_ORDER.index(p)); vl.update(); V = ev(); r = RV.measure(V, pairs_all(V), F, TDOM, gn); r.pop('visible_pairs'); r.pop('deep_pairs'); res[p] = r; print('GATE', p, res[p], flush=True)
if SIG != '-':
    rig.animation_data.action = bpy.data.actions['sig.horns-first-descent']
    for f in [int(x) for x in SIG.split(',')]:
        sc.frame_set(f); vl.update(); V = ev(); r = RV.measure(V, pairs_all(V), F, TDOM, gn); r.pop('visible_pairs'); r.pop('deep_pairs'); res[f'sig_f{f:02d}'] = r; print('GATE', f, res[f'sig_f{f:02d}'], flush=True)
tot = dict(pairs=sum(r['pairs'] for r in res.values()), visible=sum(r['visible'] for r in res.values()),
           hidden_over_5mm=sum(r['hidden_over_5mm'] for r in res.values()), hidden_buried_max_mm=max([r['hidden_buried_max_mm'] for r in res.values()] or [0]))
json.dump(dict(definition=__doc__.strip(), totals=tot, poses=res), open(OUT, 'w'), indent=1); print('GATE totals', tot, flush=True)
