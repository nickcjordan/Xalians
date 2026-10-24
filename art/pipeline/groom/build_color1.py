"""Luceras colour pass 1 (D-hrgh): one soft white/grey field for the body coat and the skin under it.

blender -b --python build_color1.py -- GROOM_IN.blend OUT_GROOM.blend REPORT.json PARAMS.json
Input: luceras-surface/headpass1/k16/groom.blend (never written). Topology, strand shapes (the hair texture) and every
binding are unchanged; only colour data changes.

Diagnosis (colorpass1/diag): the near-black stripes down the legs came from build_surface_fur2.py's leg rule, which
painted the leg faces it did not whiten with `dark` (the median of the darkest 30 percent of the coat, far darker than the
flank grey) over a narrow smoothstep, so a thin near-black band followed the leg's outer edge; the skin carried its own
leg pattern with a different reach, so dark skin sat under white fur. The neck's hard edge is the original groom's
throat boundary.

Method: a white fraction w per body vertex (0 = flank grey, 1 = white):
  1. torso and neck: from the current strands (their colour normalised between the flank grey and the chest white),
     accumulated on the vertices they are bound to;
  2. legs: re-derived from the sheet with wide transitions (forelegs white on the rear and inner faces, hind legs white on
     the front of the shank and the inner faces, the outer thigh and the front of the forelegs flank grey, never darker);
  3. diffused over the mesh (vertex neighbours, so it never jumps across a thin leg) with the head and tail pinned, so
     every white/grey boundary is a gradient several centimetres wide;
  4. each strand takes w from its bound triangle, plus a per-strand jitter in the transition (fur-broken edge); legs are
     set absolutely (colour and shading attributes from the flank grey and chest white references), the rest shifted by
     the change in w so the coat's own strand-to-strand variation stays;
  5. the skin takes the same field, so the skin under white fur is white-matched.
Head (head_01, jaw, ears), tail and plume strands and the paw fur are left as they are.
"""
import bpy, sys, json, math
import numpy as np
from pathlib import Path

A = sys.argv[sys.argv.index('--') + 1:]
GIN, GOUT, REP, PARP = A[:4]
P = json.load(open(PARP)); rep = dict(input=GIN, output=GOUT, params=P)
bpy.ops.wm.open_mainfile(filepath=GIN)
rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and o.name.startswith('luceras_rig'))
body = bpy.data.objects['luceras_blockout']; me = body.data
LUM = np.array([0.2126, 0.7152, 0.0722])


def arr(items, key, n, dt=np.float32):
    x = np.empty(len(items) * n, dt); items.foreach_get(key, x); return x.reshape(-1, n) if n > 1 else x
def sstep(e0, e1, x): t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)


Rw = np.array(rig.matrix_world); Mb = np.array(body.matrix_world)
V = arr(me.vertices, 'co', 3) @ Mb[:3, :3].T + Mb[:3, 3]; NV = len(V)
E = arr(me.edges, 'vertices', 2, np.int32)
gn = [g.name for g in body.vertex_groups]; Wt = np.zeros((NV, len(gn)), np.float32)
for v in me.vertices:
    for g in v.groups: Wt[v.index, g.group] = g.weight
DOM = np.array(gn)[Wt.argmax(1)]
PIN = np.isin(DOM, ['head_01', 'jaw_01', 'ear_l_01', 'ear_l_02', 'ear_r_01', 'ear_r_02']) | np.char.startswith(DOM.astype(str), 'tail_')
rep['pinned_vertices'] = int(PIN.sum())

coat = bpy.data.objects['Luceras interpolated coat']; cd = coat.data
ids = np.stack([arr(cd.attributes['bind_i' + c].data, 'value', 1, np.int32) for c in 'abc'], 1)
bar = np.stack([arr(cd.attributes['bind_' + c].data, 'value', 1) for c in 'abc'], 1)
col = arr(cd.attributes['coat_color'].data, 'color', 4); lum = col[:, :3] @ LUM
attrs = {n: arr(cd.attributes[n].data, 'value', 1) for n in ('coat_gain', 'strand_tone', 'white_shade', 'paw_mask')}
tailp = arr(cd.attributes['tail_pattern'].data, 'value', 1) if 'tail_pattern' in cd.attributes else np.zeros(len(lum))
sdom = DOM[ids[np.arange(len(ids)), bar.argmax(1)]]
s_pin = PIN[ids].any(1) | (tailp > 0)

# references: flank grey = dorsal torso strands (spine bones, upper half); white = the chest/belly white strands
torso = np.isin(sdom, ['spine_01', 'spine_02', 'spine_03', 'spine_04', 'spine_05', 'neck_01', 'neck_02']) & ~s_pin
rootz = (V[ids] * bar[:, :, None]).sum(1)[:, 2]
zt = np.percentile(rootz[torso], [10, 90])
dorsal = torso & (rootz > zt[0] + 0.6 * (zt[1] - zt[0]))
white = torso & (lum > np.percentile(lum[torso], 92))
G = np.median(col[dorsal, :3], 0); Wc = np.median(col[white, :3], 0); Gl, Wl = float(G @ LUM), float(Wc @ LUM)
ref = {n: (float(np.median(v[dorsal])), float(np.median(v[white]))) for n, v in attrs.items()}
rep['refs'] = dict(grey=G.round(4).tolist(), white=Wc.round(4).tolist(), grey_lum=round(Gl, 4), white_lum=round(Wl, 4), attrs={k: [round(a, 3), round(b, 3)] for k, (a, b) in ref.items()},
                   leg_dark_before=None)
w_old = np.clip((lum - Gl) / (Wl - Gl), 0, 1)

# 1. vertex field from the strands
acc = np.zeros(NV); wsum = np.zeros(NV)
for j in range(3):
    np.add.at(acc, ids[:, j], bar[:, j] * w_old); np.add.at(wsum, ids[:, j], bar[:, j])
known = wsum > 0.05; w0 = np.where(known, acc / np.maximum(wsum, 1e-9), 0.0)

# 2. legs: re-derived, wide transitions, grey never darker than the flank
def bone_seg(n):
    b = rig.data.bones[n]; return (Rw @ np.r_[b.head_local, 1])[:3], (Rw @ np.r_[b.tail_local, 1])[:3]
def seg_param(p, h, t):
    ax = t - h; u = np.clip(((p - h) @ ax) / (ax @ ax), 0, 1); foot = h + u[:, None] * ax; return u, foot, np.linalg.norm(p - foot, axis=1)
LEGF = np.zeros(NV); LEGW = np.zeros(NV)
for side, sx in (('l', 1.0), ('r', -1.0)):
    for kind in ('f', 'h'):
        segs = [bone_seg(f'leg_{kind}{side}_0{i}') for i in (1, 2, 3)]
        best = np.full(NV, 1e9); u_all = np.zeros(NV); seg_i = np.zeros(NV, int); foot_all = np.zeros((NV, 3))
        for i, (h, t) in enumerate(segs):
            u, foot, d = seg_param(V, h, t); m = d < best; best[m] = d[m]; u_all[m] = u[m]; seg_i[m] = i; foot_all[m] = foot[m]
        legdom = np.char.startswith(DOM.astype(str), f'leg_{kind}{side}')
        inleg = legdom & (best < P['leg_reach_m'])
        rad = V - foot_all; rad /= np.maximum(np.linalg.norm(rad, axis=1), 1e-9)[:, None]
        medial = np.array([-sx, 0.0, 0.0]); rear = np.array([0.0, 1.0, 0.0])
        if kind == 'f':
            want = medial * P['fore_medial'] + rear * P['fore_rear']; lo, hi = P['fore_from_cos'], P['fore_full_cos']
        else:
            want = medial * P['hind_medial'] - rear * P['hind_front']; lo, hi = P['hind_from_cos'], P['hind_full_cos']
        want /= np.linalg.norm(want); cs = rad @ want
        w = sstep(lo, hi, cs)
        if kind == 'h':
            w = w * np.where(seg_i == 0, P['hind_thigh_white'], 1.0)
        top = np.where(seg_i == 0, sstep(P['upper_from_u'], P['upper_full_u'], u_all), 1.0)
        f = inleg * top
        LEGF = np.maximum(LEGF, f); LEGW = np.where(f > 0, w, LEGW)
w0 = np.where(LEGF > 0, w0 * (1 - LEGF) + LEGW * LEGF, w0); known = known | (LEGF > 0)

# 3. diffusion over the mesh: unknown vertices fill first, then everything not pinned relaxes
nb_cnt = np.bincount(E.ravel(), minlength=NV).astype(float)
def relax(w, fixed, iters, lam):
    for _ in range(iters):
        s = np.bincount(E[:, 0], weights=w[E[:, 1]], minlength=NV) + np.bincount(E[:, 1], weights=w[E[:, 0]], minlength=NV)
        avg = s / np.maximum(nb_cnt, 1); w = np.where(fixed, w, w + lam * (avg - w))
    return w
w = relax(w0, known, P['fill_iters'], 1.0)
# legs relax a little less than the torso so the stockings keep their shape; the field is pinned on head and tail
rate = np.where(LEGF > 0, P['leg_rate'], 1.0)
for _ in range(P['diffuse_iters'] // 10):
    w = np.where(PIN, w, w + rate * (relax(w, PIN, 10, P['lam']) - w))
w = np.clip(w, 0, 1)
# re-sharpen: the diffusion sets the boundary's width, the soft threshold keeps the flank grey and the bib white
sb = P.get('sharpen_b', 0.5)
if sb < 0.5: w = np.where(PIN, w, sstep(0.5 - sb, 0.5 + sb, w))
rep['field'] = dict(fill_iters=P['fill_iters'], diffuse_iters=P['diffuse_iters'], lam=P['lam'], leg_rate=P['leg_rate'],
                    leg_vertices=int((LEGF > 0).sum()), white_share_vertices=round(float((w > 0.5).mean()), 3))

# 4. strands
rng = np.random.default_rng(P.get('seed', 11))
ws = (w[ids] * bar).sum(1)
jit = (rng.random(len(ws)) - 0.5) * P['jitter'] * 4 * ws * (1 - ws)
ws = np.clip(ws + jit, 0, 1)
legs_s = (LEGF[ids] * bar).sum(1)
abs_col = G[None, :] * (1 - ws[:, None]) + Wc[None, :] * ws[:, None]
# texture kept: each strand's own deviation from the grey/white line of its old w
dev = col[:, :3] - (G[None, :] * (1 - w_old[:, None]) + Wc[None, :] * w_old[:, None])
rel_col = abs_col + dev
newc = rel_col * (1 - legs_s[:, None]) + abs_col * legs_s[:, None]
if P.get('neutral_grey', 0):
    # the sheet's grey is neutral; the groom's grey leans warm (R > B). Shift the grey share of every strand to the
    # same luminance in neutral grey (white share untouched)
    Gn = np.full(3, Gl) * np.array(P.get('grey_tint', [1.0, 1.0, 1.0])) * P.get('grey_gain', 1.0)
    newc = newc + (Gn - G)[None, :] * (1 - ws[:, None])
    rep['refs']['grey_neutral'] = Gn.round(4).tolist()
newc = np.where(s_pin[:, None], col[:, :3], np.clip(newc, 0, 1))
rep['leg_dark_strand_lum_before'] = round(float(np.median(lum[(legs_s > 0.5) & (w_old < 0.05)])), 4) if ((legs_s > 0.5) & (w_old < 0.05)).any() else None
col[:, :3] = newc; cd.attributes['coat_color'].data.foreach_set('color', col.astype(np.float32).ravel())
for n, v in attrs.items():
    g_, w_ = ref[n]
    tgt_new = g_ * (1 - ws) + w_ * ws; tgt_old = g_ * (1 - w_old) + w_ * w_old
    if n == 'paw_mask':
        nv = v * (1 - ws)                     # white strands never take the paw darkening
    else:
        nv = (v + tgt_new - tgt_old) * (1 - legs_s) + tgt_new * legs_s
        if n == 'strand_tone':                # keep the strand-to-strand tone variation (the texture) on the legs too
            nv = nv + (v - np.median(v[dorsal])) * legs_s * (1 - ws)
    nv = np.where(s_pin, v, nv); cd.attributes[n].data.foreach_set('value', nv.astype(np.float32))
rep['strands'] = dict(total=int(len(ws)), pinned=int(s_pin.sum()), legs=int((legs_s > 0.5).sum()), changed_over_0p1=int((np.abs(ws - w_old) > 0.1).sum()))

# guides follow the same field (colour only)
gd = bpy.data.objects.get('Luceras guides')
if gd is not None and 'bind_ia' in gd.data.attributes and 'coat_color' in gd.data.attributes:
    d = gd.data; gi = np.stack([arr(d.attributes['bind_i' + c].data, 'value', 1, np.int32) for c in 'abc'], 1)
    gb = np.stack([arr(d.attributes['bind_' + c].data, 'value', 1) for c in 'abc'], 1); gc = arr(d.attributes['coat_color'].data, 'color', 4)
    gw = (w[gi] * gb).sum(1); gp = PIN[gi].any(1)
    gc[:, :3] = np.where(gp[:, None], gc[:, :3], G[None, :] * (1 - gw[:, None]) + Wc[None, :] * gw[:, None])
    d.attributes['coat_color'].data.foreach_set('color', gc.astype(np.float32).ravel())

# 5. skin: the same field
sa = me.attributes['coat_color']; sc = arr(sa.data, 'color', 4); sl = sc[:, :3] @ LUM
tv = ~PIN
Gs = np.median(sc[tv & (w < 0.05), :3], 0); Ws = np.median(sc[tv & (w > 0.95), :3], 0)
if P.get('neutral_grey', 0): Gs = np.clip(np.full(3, float(Gs @ LUM)) * np.array(P.get('grey_tint', [1.0, 1.0, 1.0])) * P.get('grey_gain', 1.0), 0, 0.9)
sc[:, :3] = np.where(PIN[:, None], sc[:, :3], Gs[None, :] * (1 - w[:, None]) + Ws[None, :] * w[:, None])
sa.data.foreach_set('color', sc.astype(np.float32).ravel())
rep['skin'] = dict(grey=Gs.round(4).tolist(), white=Ws.round(4).tolist())
# the field itself, for the proof
fa = me.attributes.get('white_field') or me.attributes.new('white_field', 'FLOAT', 'POINT'); fa.data.foreach_set('value', w.astype(np.float32))

bpy.ops.wm.save_as_mainfile(filepath=GOUT)
for f in ('plume_spine.npz', 'plume_build.json'):
    Path(GOUT).parent.joinpath(f).write_bytes(Path(GIN).parent.joinpath(f).read_bytes())
Path(REP).write_text(json.dumps(rep, indent=1)); print('COLOR1 done', json.dumps(rep), flush=True)
