"""B-yqgg pass 2: localize the right fore fold triangles and the seam (compare against left fore). Read only.

Usage: blender -b --factory-startup --python pawint_locate.py -- RIG.blend OUT.json
Per fore paw region (25 mm above the join ring and below, own side): rest dihedral angles (sharp rest edges = seam),
crease growth per edge in crouch, leap, landing, and the rest geometry of the worst triangles (area, min angle, edge
lengths, height above the join plane, whether they touch the ring).
"""
import bpy, sys, json, numpy as np
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import pass2 as p
r = p.r
a = sys.argv[sys.argv.index('--') + 1:]; RIG, OUTJ = a[0], a[1]
PZ = np.load('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-pawpart/pass8/work/u3/paws.npz')
rig = p.openfile(RIG); o = bpy.data.objects['luceras_blockout']
rest = r.coords(o, False)
o.data.calc_loop_triangles(); T = np.array([t.vertices[:] for t in o.data.loop_triangles]); TP = np.array([t.polygon_index for t in o.data.loop_triangles])
poses = {}
for pose in ('crouch', 'leap', 'landing'):
    p.showpose(rig, pose); poses[pose] = r.coords(o, True)
rig.animation_data.action = None; r.pose(rig, 'rest')


def tn(P, T):
    n = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]]); A = np.linalg.norm(n, axis=1); return n / np.maximum(A, 1e-30)[:, None], A / 2


out = {}
for side, sg in (('l', 1), ('r', -1)):
    c = PZ['fore_cut'] * [sg, 1, 1]; ax = PZ['fore_axis'] * [sg, 1, 1]; h = (rest - c) @ ax
    sel = (h > -0.025) & (np.linalg.norm(rest - c, axis=1) < 0.16) & (sg * rest[:, 0] > 0)
    TT = np.flatnonzero(sel[T].all(1)); Ts = T[TT]
    ed = {}
    for k, tri in enumerate(Ts):
        for u, v in ((tri[0], tri[1]), (tri[1], tri[2]), (tri[2], tri[0])):
            ed.setdefault((min(u, v), max(u, v)), []).append(k)
    keys = [e for e, v in ed.items() if len(v) == 2]; pairs = np.array([ed[e] for e in keys]); E = np.array(keys)
    n0, a0 = tn(rest, Ts); ang0 = np.degrees(np.arccos(np.clip((n0[pairs[:, 0]] * n0[pairs[:, 1]]).sum(1), -1, 1)))
    # rest geometry per triangle
    L = np.stack([np.linalg.norm(rest[Ts[:, i]] - rest[Ts[:, (i + 1) % 3]], axis=1) for i in range(3)], 1)
    def minang(P, Tq):
        angs = []
        for i in range(3):
            u = P[Tq[:, (i + 1) % 3]] - P[Tq[:, i]]; v = P[Tq[:, (i + 2) % 3]] - P[Tq[:, i]]
            angs.append(np.degrees(np.arccos(np.clip((u * v).sum(1) / np.maximum(np.linalg.norm(u, axis=1) * np.linalg.norm(v, axis=1), 1e-30), -1, 1))))
        return np.min(angs, axis=0)
    ma = minang(rest, Ts)
    hT = h[Ts].mean(1)
    res = dict(tris=int(len(Ts)), rest_sliver_tris_minang_below_5=int((ma < 5).sum()), rest_sliver_tris_minang_below_10=int((ma < 10).sum()),
               rest_sliver_h_mm=[round(float(1000 * x), 1) for x in np.sort(hT[ma < 5])[:40]],
               rest_dihedral_over_30_edges=int((ang0 > 30).sum()), rest_dihedral_over_15_edges=int((ang0 > 15).sum()),
               rest_dihedral_over_15_h_mm_hist=np.histogram(1000 * h[E[ang0 > 15]].mean(1), bins=np.arange(-26, 30, 2))[0].tolist() if (ang0 > 15).any() else [],
               rest_dihedral_p999=float(np.quantile(ang0, .999)), rest_dihedral_max=float(ang0.max()))
    bad = {}
    for pose, P in poses.items():
        n1, a1 = tn(P, Ts); ang1 = np.degrees(np.arccos(np.clip((n1[pairs[:, 0]] * n1[pairs[:, 1]]).sum(1), -1, 1))); g = ang1 - ang0
        idx = np.argsort(-g)[:12]
        bad[pose] = dict(over45=int((g > 45).sum()), max=float(g.max()), area_ratio_min=float((a1 / np.maximum(a0, 1e-30)).min()),
                         worst=[dict(growth=round(float(g[i]), 1), rest_dihedral=round(float(ang0[i]), 1), h_mm=round(float(1000 * h[E[i]].mean()), 2),
                                     pos=[round(float(x), 4) for x in rest[E[i]].mean(0)], tri_minang=[round(float(ma[t]), 2) for t in pairs[i]],
                                     tri_area_mm2=[round(float(1e6 * a0[t]), 4) for t in pairs[i]], tri_edges_mm=[[round(float(1000 * x), 3) for x in L[t]] for t in pairs[i]],
                                     verts=[int(v) for v in E[i]], polys=[int(TP[TT[t]]) for t in pairs[i]]) for i in idx])
    res['folds'] = bad
    out[f'fore_{side}'] = res
Path(OUTJ).write_text(json.dumps(out, indent=1))
print('LOCATE done')
