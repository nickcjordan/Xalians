"""Luceras tail shaft colour (B-cy8f, decision N-vsx4): darken the shaft toward the sheet, dark grey on top, lighter underneath,
a soft change round the sides, blended into the body coat at the tail root and back to the existing colour at the plume base.

Only the coat_color attribute of strands rooted on the shaft changes: every strand of 'Tail shaft coat', and the strands of
'Luceras interpolated coat' whose root lies on the shaft (tail position 1.0 to 4.75, i.e. tail_02 to the plume base). Every other
attribute, every other strand of the interpolated coat, the plume objects, every other curves object and the body stay bit for bit.
Optionally (enable_skipped) the Tail shaft coat strands that u11 left at radius 0 (the band just above the white strip) get the
shaft's own radius profile back, so the darker coat covers that band too.

Tail position t: tail_01 = 0..1, tail_02 = 1..2, ... (per vertex, from the dominant tail bone and the fraction along it).
Side sd: the strand root's surface normal against the tail bone's rest Z axis (+1 dorsal, -1 ventral).
Target linear colour = hue * L, L = lerp(L_under(t), L_top, smoothstep(-0.6, 0.6, sd)); L_under(t) ramps from under_root to
under_plume between t 1.5 and 4.3. Weight toward the target = smoothstep(root_blend) * (1 - smoothstep(plume_blend)).

blender -b SCENE --python tail_recolor.py -- PARAMS.json OUT.blend REPORT.json
"""
import bpy, sys, json
import numpy as np
from pathlib import Path
A = sys.argv[sys.argv.index('--') + 1:]; P = json.loads(Path(A[0]).read_text()); OUTB = A[1]; REP = Path(A[2])
def g(k, d): return P.get(k, d)
s = bpy.context.scene; body = s.objects['luceras_blockout']; rig = s.objects['luceras_rig']


def arr(items, key, n=3, dt=np.float32):
    x = np.empty(len(items) * n, dt); items.foreach_get(key, x); return x.reshape(-1, n) if n > 1 else x


def sst(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)


rig.data.pose_position = 'REST'; bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
Mw = np.array(body.matrix_world); NV = len(body.data.vertices)
e = body.evaluated_get(dg); m = e.to_mesh(); VL = arr(m.vertices, 'co').astype(np.float64); VNL = arr(m.vertices, 'normal').astype(np.float64); e.to_mesh_clear()
VW = VL @ Mw[:3, :3].T + Mw[:3, 3]; VN = VNL @ Mw[:3, :3].T; VN /= np.linalg.norm(VN, axis=1, keepdims=True)
gn = [x.name for x in body.vertex_groups]; Wt = np.zeros((NV, len(gn)), np.float32)
for v in body.data.vertices:
    for gg in v.groups: Wt[v.index, gg.group] = gg.weight
dgi = [i for i, x in enumerate(gn) if x.startswith(('root', 'spine', 'neck', 'head', 'jaw', 'ear', 'horn', 'leg', 'tail', 'scapula'))]
DOM = np.array(gn)[np.array(dgi)][Wt[:, dgi].argmax(1)]
TAILS = ['tail_0%d' % i for i in range(1, 7)]; Mr = np.array(rig.matrix_world)
ti = np.full(NV, -1.0); tz = np.zeros((NV, 3))
for k, b in enumerate(TAILS):
    bb = rig.data.bones[b]; Mb = Mr @ np.array(bb.matrix_local); h = (Mr @ np.r_[np.array(bb.head_local[:]), 1])[:3]; t_ = (Mr @ np.r_[np.array(bb.tail_local[:]), 1])[:3]
    y = (t_ - h) / np.linalg.norm(t_ - h); msk = DOM == b; ti[msk] = k + np.clip(((VW[msk] - h) @ y) / np.linalg.norm(t_ - h), 0, 1); tz[msk] = Mb[:3, 2] / np.linalg.norm(Mb[:3, 2])
hue = np.array(g('hue', [1.0, 0.955, 0.93])); hue = hue / (hue @ np.array([0.2126, 0.7152, 0.0722]))
Lt, Lu0, Lu1 = g('L_top', 0.07), g('under_root', 0.12), g('under_plume', 0.35)
rb = g('root_blend', [1.0, 1.5]); pb = g('plume_blend', [4.45, 4.75]); ur = g('under_ramp', [1.5, 4.3]); sb = g('side_blend', [-0.6, 0.6])
LOG = dict(params=P, objects={})
for name in ('Tail shaft coat', 'Luceras interpolated coat'):
    o = s.objects[name]; d = o.data
    ia = arr(d.attributes['bind_ia'].data, 'value', 1, np.int32); ib = arr(d.attributes['bind_ib'].data, 'value', 1, np.int32); ic = arr(d.attributes['bind_ic'].data, 'value', 1, np.int32)
    bw = np.stack([arr(d.attributes['bind_' + k].data, 'value', 1) for k in 'abc'], 1); ids = np.stack([ia, ib, ic], 1)
    ok = (ti[ids] >= 0).all(1); t = (ti[ids] * bw).sum(1)
    nW = np.cross(VW[ib] - VW[ia], VW[ic] - VW[ia]); nW /= np.maximum(np.linalg.norm(nW, axis=1, keepdims=True), 1e-12)
    vn = VN[ids].sum(1); nW = np.where((np.einsum('ij,ij->i', nW, vn) < 0)[:, None], -nW, nW)
    zz = (tz[ids] * bw[:, :, None]).sum(1); zz /= np.maximum(np.linalg.norm(zz, axis=1, keepdims=True), 1e-12); sd = np.einsum('ij,ij->i', nW, zz)
    sel = ok & (t >= rb[0]) & (t <= pb[1]) if name != 'Tail shaft coat' else ok
    w = sst(rb[0], rb[1], t) * (1 - sst(pb[0], pb[1], t)); w[~sel] = 0
    Lu = Lu0 + (Lu1 - Lu0) * sst(ur[0], ur[1], t); tr_ = g('top_ramp', [2.0, 3.9]); Ltt = Lt + (g('L_top_plume', Lt) - Lt) * sst(tr_[0], tr_[1], t)
    L = Lu + (Ltt - Lu) * sst(sb[0], sb[1], sd)
    col = arr(d.attributes['coat_color'].data, 'color', 4); old = col.copy()
    tgt = np.c_[np.outer(L, hue), col[:, 3]]; col[:, :3] = old[:, :3] + (tgt[:, :3] - old[:, :3]) * w[:, None]
    ch = np.where(w > 0)[0]
    d.attributes['coat_color'].data.foreach_set('color', col.astype(np.float32).ravel())
    info = dict(curves=int(len(ia)), recoloured=int(len(ch)), t_range=[round(float(t[ch].min()), 3), round(float(t[ch].max()), 3)] if len(ch) else None,
                lum_before_p10_50_90=[round(float(x), 4) for x in np.percentile(old[ch, :3] @ np.array([0.2126, 0.7152, 0.0722]), [10, 50, 90])] if len(ch) else None,
                lum_after_p10_50_90=[round(float(x), 4) for x in np.percentile(col[ch, :3] @ np.array([0.2126, 0.7152, 0.0722]), [10, 50, 90])] if len(ch) else None)
    if name == 'Tail shaft coat' and g('enable_skipped', False):
        offs = arr(d.curves, 'first_point_index', 1, np.int32); cnt = arr(d.curves, 'points_length', 1, np.int32); rad = arr(d.attributes['radius'].data, 'value', 1)
        live = rad[offs] > 0; prof = rad[offs[live][0]:offs[live][0] + cnt[live][0]].copy(); dead = np.where(~live)[0]
        for i in dead: rad[offs[i]:offs[i] + cnt[i]] = prof[:cnt[i]]
        d.attributes['radius'].data.foreach_set('value', rad); info['enabled_strands'] = int(len(dead))
    LOG['objects'][name] = info; print('RECOLOR', name, json.dumps(info), flush=True)
rig.data.pose_position = 'POSE'; bpy.context.view_layer.update()      # the scene is saved posed, as it was opened
Path(OUTB).parent.mkdir(parents=True, exist_ok=True); REP.parent.mkdir(parents=True, exist_ok=True); REP.write_text(json.dumps(LOG, indent=1))
bpy.ops.wm.save_as_mainfile(filepath=OUTB, compress=True); print('RECOLOR saved', OUTB, flush=True)
