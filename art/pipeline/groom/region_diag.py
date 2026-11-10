"""Groom diagnosis per skin region (luceras limbs and tail): roots per cm2, strand length, strand lift, colour.
blender -b SCENE --python region_diag.py -- OUT.json OUTDIR_FOR_REGION_NPY
Regions are deform-dominant bone groups on the body (rest pose). Lift: the angle of a strand above its own skin plane,
read from its frame binding (bind_height against the bind_offset_x/y distance), at a third of its length and at the tip.
Every rendered body-bound curves object counts (live strands: root radius above zero)."""
import bpy, sys, json, math
import numpy as np
from pathlib import Path
A = sys.argv[sys.argv.index('--') + 1:]; OUT = Path(A[0]); RD = Path(A[1]); RD.mkdir(parents=True, exist_ok=True)
s = bpy.context.scene; body = s.objects['luceras_blockout']; rig = s.objects['luceras_rig']
rig.data.pose_position = 'REST'; bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()


def arr(items, key, n=3, dt=np.float32):
    x = np.empty(len(items) * n, dt); items.foreach_get(key, x); return x.reshape(-1, n) if n > 1 else x


e = body.evaluated_get(dg); m = e.to_mesh(); M = np.array(e.matrix_world); V = arr(m.vertices, 'co').astype(np.float64) @ M[:3, :3].T + M[:3, 3]
m.calc_loop_triangles(); LT = arr(m.loop_triangles, 'vertices', 3, np.int32); e.to_mesh_clear(); NV = len(V)
gn = [x.name for x in body.vertex_groups]; W = np.zeros((NV, len(gn)), np.float32)
for v in body.data.vertices:
    for g in v.groups: W[v.index, g.group] = g.weight
dgi = [i for i, x in enumerate(gn) if x.startswith(('root', 'spine', 'neck', 'head', 'jaw', 'ear', 'horn', 'leg', 'tail', 'scapula'))]
DOM = np.array(gn)[np.array(dgi)][W[:, dgi].argmax(1)]
REG = {'forearm': ['leg_fl_02', 'leg_fr_02'], 'upper_arm': ['leg_fl_01', 'leg_fr_01'], 'fore_paw': ['leg_fl_03', 'leg_fr_03'],
       'hind_shank': ['leg_hl_02', 'leg_hr_02'], 'lower_hind': ['leg_hl_03', 'leg_hr_03'], 'thigh': ['leg_hl_01', 'leg_hr_01'],
       'tail_root': ['tail_01'], 'tail_shaft': ['tail_02', 'tail_03', 'tail_04']}
TA = np.linalg.norm(np.cross(V[LT[:, 1]] - V[LT[:, 0]], V[LT[:, 2]] - V[LT[:, 0]]), axis=1) / 2
objs = []
for o in s.objects:
    if o.type != 'CURVES' or o.hide_render or o.data.surface is None or o.data.surface.name != body.name or 'bind_ia' not in o.data.attributes: continue
    d = o.data
    ia = arr(d.attributes['bind_ia'].data, 'value', 1, np.int32); ib = arr(d.attributes['bind_ib'].data, 'value', 1, np.int32); ic = arr(d.attributes['bind_ic'].data, 'value', 1, np.int32)
    offs = arr(d.curves, 'first_point_index', 1, np.int32); cnt = arr(d.curves, 'points_length', 1, np.int32)
    rad = arr(d.attributes['radius'].data, 'value', 1); H = arr(d.attributes['bind_height'].data, 'value', 1); X = arr(d.attributes['bind_offset_x'].data, 'value', 1); Y = arr(d.attributes['bind_offset_y'].data, 'value', 1)
    col = arr(d.attributes['coat_color'].data, 'color', 4)[:, :3] @ np.array([0.2126, 0.7152, 0.0722]) if 'coat_color' in d.attributes else np.full(len(offs), np.nan)
    P = np.c_[H, X, Y]; seg = np.linalg.norm(np.diff(P, axis=0), axis=1); cid = np.repeat(np.arange(len(offs)), cnt); same = cid[1:] == cid[:-1]
    L = np.bincount(cid[1:][same], weights=seg[same], minlength=len(offs))
    tip = offs + cnt - 1; third = offs + np.maximum(1, (cnt - 1) // 3)
    lift_tip = np.degrees(np.arctan2(H[tip], np.hypot(X[tip], Y[tip]))); lift_3 = np.degrees(np.arctan2(H[third], np.hypot(X[third], Y[third])))
    objs.append(dict(name=o.name, ia=ia, ib=ib, ic=ic, live=rad[offs] > 0, L=L, lift_tip=lift_tip, lift_3=lift_3, lum=col, rad0=rad[offs]))
out = {}
for rn, groups in REG.items():
    vm = np.isin(DOM, groups); tri = vm[LT].all(1); area = float(TA[tri].sum()) * 1e4
    np.save(RD / f'reg_{rn}.npy', np.where(vm)[0])
    r = dict(vertices=int(vm.sum()), area_cm2=round(area, 1), objects={})
    allL = []; allT = []; all3 = []; n_all = 0
    for ob in objs:
        on = vm[ob['ia']] & vm[ob['ib']] & vm[ob['ic']] & ob['live']
        n = int(on.sum())
        if not n: continue
        n_all += n; allL.append(ob['L'][on]); allT.append(ob['lift_tip'][on]); all3.append(ob['lift_3'][on])
        lum = ob['lum'][on]
        r['objects'][ob['name']] = dict(roots=n, per_cm2=round(n / max(area, 1e-9), 1), len_mm_p10_50_90=[round(float(x) * 1000, 1) for x in np.percentile(ob['L'][on], [10, 50, 90])],
                                        lift_tip_deg_p10_50_90=[round(float(x), 1) for x in np.percentile(ob['lift_tip'][on], [10, 50, 90])],
                                        lift_third_deg_p50=round(float(np.median(ob['lift_3'][on])), 1), rad0_mm_p50=round(float(np.median(ob['rad0'][on])) * 1000, 4),
                                        lum_p10_50_90=[round(float(x), 3) for x in np.nanpercentile(lum, [10, 50, 90])] if np.isfinite(lum).any() else None)
    if allL:
        allL = np.concatenate(allL); allT = np.concatenate(allT); all3 = np.concatenate(all3)
        r.update(roots_all=n_all, per_cm2_all=round(n_all / max(area, 1e-9), 1), len_mm_p10_50_90=[round(float(x) * 1000, 1) for x in np.percentile(allL, [10, 50, 90])],
                 lift_tip_deg_p10_50_90=[round(float(x), 1) for x in np.percentile(allT, [10, 50, 90])], lift_third_deg_p50=round(float(np.median(all3)), 1),
                 coverage_index_mm_per_mm2=round(float(n_all * np.median(allL)) / max(area * 100, 1e-9), 3))
    out[rn] = r; print('REGION', rn, json.dumps({k: v for k, v in r.items() if k != 'objects'}), flush=True)
OUT.write_text(json.dumps(out, indent=1)); print('DIAG done', flush=True)
