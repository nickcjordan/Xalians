"""Luceras lower hind leg, paw half (B-t3sm): what covers the foot between mid-metatarsus and the toe base, by side of the foot.
blender -b SCENE --python foot_diag.py -- OUT.json OUTDIR [FROM_FRAC TO_FRAC]
Region: vertices whose dominant deform bone is leg_h?_03 with a bone fraction in [FROM, TO] (default 0.39 to 0.78: mid-metatarsus
to the toe base; the toes start at about 0.80, where the toe sculpt's vertex density jumps). Each vertex is classed by its rest
normal against the foot's own frame: 'back' (the plantar side, facing down and back along the bone's perpendicular),
'front' (the dorsal side), 'side' (lateral and medial). Saves foot_<class>.npy vertex ids (for coverage.py) and, for every
rendered body-bound curves object, roots per cm2, length, lift and colour luminance per class."""
import bpy, sys, json, math
import numpy as np
from pathlib import Path
A = sys.argv[sys.argv.index('--') + 1:]; OUT = Path(A[0]); OD = Path(A[1]); OD.mkdir(parents=True, exist_ok=True)
F0 = float(A[2]) if len(A) > 2 else 0.39; F1 = float(A[3]) if len(A) > 3 else 0.78
s = bpy.context.scene; body = s.objects['luceras_blockout']; rig = s.objects['luceras_rig']
rig.data.pose_position = 'REST'; bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()


def arr(items, key, n=3, dt=np.float32):
    x = np.empty(len(items) * n, dt); items.foreach_get(key, x); return x.reshape(-1, n) if n > 1 else x


e = body.evaluated_get(dg); m = e.to_mesh(); M = np.array(e.matrix_world)
V = arr(m.vertices, 'co').astype(np.float64) @ M[:3, :3].T + M[:3, 3]; N = arr(m.vertices, 'normal').astype(np.float64) @ M[:3, :3].T
N /= np.linalg.norm(N, axis=1, keepdims=True); m.calc_loop_triangles(); LT = arr(m.loop_triangles, 'vertices', 3, np.int32); e.to_mesh_clear(); NV = len(V)
gn = [x.name for x in body.vertex_groups]; W = np.zeros((NV, len(gn)), np.float32)
for v in body.data.vertices:
    for g in v.groups: W[v.index, g.group] = g.weight
dgi = [i for i, x in enumerate(gn) if x.startswith(('root', 'spine', 'neck', 'head', 'jaw', 'ear', 'horn', 'leg', 'tail', 'scapula'))]
DOM = np.array(gn)[np.array(dgi)][W[:, dgi].argmax(1)]
Mr = np.array(rig.matrix_world); cls = np.full(NV, '', object); frac = np.full(NV, np.nan)
for bn in ('leg_hl_03', 'leg_hr_03'):
    b = rig.data.bones[bn]; h = (Mr @ np.r_[np.array(b.head_local[:]), 1])[:3]; t = (Mr @ np.r_[np.array(b.tail_local[:]), 1])[:3]
    u = (t - h) / np.linalg.norm(t - h); idx = np.where(DOM == bn)[0]; f = ((V[idx] - h) @ u) / np.linalg.norm(t - h); frac[idx] = f
    p = np.array([0, 0, -1.0]) - u * (-u[2]); p /= np.linalg.norm(p)            # plantar: down and back, square to the bone
    d = N[idx] @ p; sel = (f >= F0) & (f <= F1)
    cls[idx[sel & (d > 0.4)]] = 'back'; cls[idx[sel & (d < -0.4)]] = 'front'; cls[idx[sel & (np.abs(d) <= 0.4)]] = 'side'
TA = np.linalg.norm(np.cross(V[LT[:, 1]] - V[LT[:, 0]], V[LT[:, 2]] - V[LT[:, 0]]), axis=1) / 2
out = dict(from_frac=F0, to_frac=F1, classes={})
for c in ('back', 'side', 'front'):
    vm = cls == c; tri = vm[LT].all(1); np.save(OD / f'foot_{c}.npy', np.where(vm)[0])
    out['classes'][c] = dict(vertices=int(vm.sum()), area_cm2=round(float(TA[tri].sum()) * 1e4, 1), rest_z_mm_p10_50_90=[round(float(x) * 1000, 1) for x in np.percentile(V[vm, 2], [10, 50, 90])] if vm.any() else None, objects={})
np.save(OD / 'foot_all.npy', np.where(cls != '')[0])
for o in s.objects:
    if o.type != 'CURVES' or o.hide_render or o.data.surface is None or o.data.surface.name != body.name or 'bind_ia' not in o.data.attributes: continue
    d = o.data; ia = arr(d.attributes['bind_ia'].data, 'value', 1, np.int32)
    offs = arr(d.curves, 'first_point_index', 1, np.int32); cnt = arr(d.curves, 'points_length', 1, np.int32); rad = arr(d.attributes['radius'].data, 'value', 1)
    H = arr(d.attributes['bind_height'].data, 'value', 1); X = arr(d.attributes['bind_offset_x'].data, 'value', 1); Y = arr(d.attributes['bind_offset_y'].data, 'value', 1)
    P = np.c_[H, X, Y]; seg = np.linalg.norm(np.diff(P, axis=0), axis=1); cid = np.repeat(np.arange(len(offs)), cnt); same = cid[1:] == cid[:-1]
    L = np.bincount(cid[1:][same], weights=seg[same], minlength=len(offs)); tip = offs + cnt - 1; mid = offs + (cnt - 1) // 2
    lift = np.degrees(np.arctan2(H[tip], np.hypot(X[tip], Y[tip]))); hmid = H[mid]
    colattr = 'coat_color' if 'coat_color' in d.attributes else None
    lum = arr(d.attributes[colattr].data, 'color', 4)[:, :3] @ np.array([0.2126, 0.7152, 0.0722]) if colattr else None
    live = rad[offs] > 0
    for c in ('back', 'side', 'front'):
        on = (cls[ia] == c) & live; n = int(on.sum())
        if not n: continue
        a = out['classes'][c]['area_cm2']
        out['classes'][c]['objects'][o.name] = dict(roots=n, per_cm2=round(n / max(a, 1e-9), 1), len_mm_p10_50_90=[round(float(x) * 1000, 1) for x in np.percentile(L[on], [10, 50, 90])],
                                                     lift_tip_deg_p50=round(float(np.median(lift[on])), 1), height_mid_mm_p50=round(float(np.median(hmid[on])) * 1000, 2),
                                                     lum_p10_50_90=[round(float(x), 3) for x in np.percentile(lum[on], [10, 50, 90])] if lum is not None else None,
                                                     materials=[mm.name for mm in d.materials if mm])
OUT.write_text(json.dumps(out, indent=1)); print('FOOT', json.dumps(out)[:3000], flush=True)
