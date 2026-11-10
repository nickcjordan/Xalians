"""Luceras tail shaft (B-ajd4, D-a3hs): thicken the shaft fur so the shaft reads as a furred whip, dark grey on top and
the white strip underneath, as on the sheet.

The interpolated coat on the shaft (tail_02 to tail_05) is short (about 11 mm) and sparse (about 31 roots per cm2,
against about 97 on the tail root), so the bare tail and the white underside strip dominate at sprite size.
This adds one new curves object, 'Tail shaft coat', bound with the groom's own frame binding on the shaft triangles.
No existing strand is touched (the plume tufts, the coat and every other curves object keep their data bit for bit).

Strands: density topped up to target_density_per_cm2 on the shaft (faded in from the tail root and out toward the
plume start), each strand lying along the shaft toward the tip at lift_deg from the skin (curving down to a third of
that at its tip), length len_top_m on the dorsal side and len_under_m on the ventral side (blended by the side), faded
toward the plume. Colour attributes: the mean of the colour_k nearest existing coat strands on the tail (the tail's own
pattern: grey top, white underside strip); on the dorsal side, optionally the colour of the darkest existing tail
strands near it (dark_top: share of the darkest donors used), so the top darkens with an existing coat colour only.
The dorsal direction is each tail bone's rest Z axis (checked against the white strip in the report).

Usage: blender -b SCENE --python tail_shaft.py -- PARAMS.json OUT.blend REPORT.json
"""
import bpy, sys, json, math
import numpy as np
from pathlib import Path
from mathutils.kdtree import KDTree

A = sys.argv[sys.argv.index('--') + 1:]
P = json.loads(Path(A[0]).read_text()); OUTB = A[1]; REP = Path(A[2])
def g(k, d): return P.get(k, d)
s = bpy.context.scene; body = s.objects['luceras_blockout']; rig = s.objects['luceras_rig']; coat = s.objects['Luceras interpolated coat']
LOG = {'params': P}


def arr(items, key, n=3, dt=np.float32):
    x = np.empty(len(items) * n, dt); items.foreach_get(key, x); return x.reshape(-1, n) if n > 1 else x


def sst(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)


def tri_frame(Va, Vb, Vc):
    e_ = Vb - Va; f_ = Vc - Va; n_ = np.cross(e_, f_); n_ /= np.linalg.norm(n_, axis=-1, keepdims=True)
    t_ = e_ / np.linalg.norm(e_, axis=-1, keepdims=True); b_ = np.cross(n_, t_); return n_, t_, b_


rig.data.pose_position = 'REST'; bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
Mw = np.array(body.matrix_world); NV = len(body.data.vertices)
me = body.data; me.calc_loop_triangles(); LT = arr(me.loop_triangles, 'vertices', 3, np.int32)
e = body.evaluated_get(dg); m = e.to_mesh(); VL = arr(m.vertices, 'co').astype(np.float64); VNL = arr(m.vertices, 'normal').astype(np.float64); e.to_mesh_clear()
VW = VL @ Mw[:3, :3].T + Mw[:3, 3]; VN = VNL @ Mw[:3, :3].T
gn = [x.name for x in body.vertex_groups]; Wt = np.zeros((NV, len(gn)), np.float32)
for v in me.vertices:
    for gg in v.groups: Wt[v.index, gg.group] = gg.weight
dgi = [i for i, x in enumerate(gn) if x.startswith(('root', 'spine', 'neck', 'head', 'jaw', 'ear', 'horn', 'leg', 'tail', 'scapula'))]
DOM = np.array(gn)[np.array(dgi)][Wt[:, dgi].argmax(1)]
TAILS = ['tail_0%d' % i for i in range(1, 7)]
# per vertex: position along the tail (bone index + fraction along the bone), the bone's axis (toward the tip) and its Z
Mr = np.array(rig.matrix_world)
bones = {}
for b in TAILS:
    bb = rig.data.bones[b]; Mb = Mr @ np.array(bb.matrix_local)
    h = (Mr @ np.r_[np.array(bb.head_local[:]), 1])[:3]; t_ = (Mr @ np.r_[np.array(bb.tail_local[:]), 1])[:3]
    bones[b] = dict(h=h, t=t_, y=(t_ - h) / np.linalg.norm(t_ - h), z=Mb[:3, 2] / np.linalg.norm(Mb[:3, 2]), L=float(np.linalg.norm(t_ - h)))
ti = np.full(NV, -1.0); tdir = np.zeros((NV, 3)); tz = np.zeros((NV, 3))
for k, b in enumerate(TAILS):
    msk = DOM == b; B = bones[b]; f = np.clip(((VW[msk] - B['h']) @ B['y']) / B['L'], 0, 1)
    ti[msk] = k + f; tdir[msk] = B['y']; tz[msk] = B['z']
LOG['bones'] = {b: dict(head=bones[b]['h'].round(4).tolist(), length_mm=round(bones[b]['L'] * 1000, 1), z=bones[b]['z'].round(3).tolist()) for b in TAILS}

# ---- existing coat strands on the tail: colour pattern by side (dorsal = bone Z)
cd = coat.data
cia = arr(cd.attributes['bind_ia'].data, 'value', 1, np.int32); cib = arr(cd.attributes['bind_ib'].data, 'value', 1, np.int32); cic = arr(cd.attributes['bind_ic'].data, 'value', 1, np.int32)
cba = np.stack([arr(cd.attributes['bind_' + k].data, 'value', 1) for k in 'abc'], 1)
coffs = arr(cd.curves, 'first_point_index', 1, np.int32); ccnt = arr(cd.curves, 'points_length', 1, np.int32); crad = arr(cd.attributes['radius'].data, 'value', 1)
ccol = arr(cd.attributes['coat_color'].data, 'color', 4); clum = ccol[:, :3] @ np.array([0.2126, 0.7152, 0.0722])
ontail = (ti[cia] >= 0) & (ti[cib] >= 0) & (ti[cic] >= 0) & (crad[coffs] > 0)
tdon = np.where(ontail & (ti[cia] > g('donor_from', 0.6)) & (ti[cia] < g('donor_to', 5.0)))[0]
troot = (VW[np.stack([cia[tdon], cib[tdon], cic[tdon]], 1)] * cba[tdon][:, :, None]).sum(1)
nr_, _, _ = tri_frame(VW[cia[tdon]], VW[cib[tdon]], VW[cic[tdon]])
vn_ = VN[cia[tdon]] + VN[cib[tdon]] + VN[cic[tdon]]; nr_ = np.where((np.einsum('ij,ij->i', nr_, vn_) < 0)[:, None], -nr_, nr_)
side_d = np.einsum('ij,ij->i', nr_, tz[cia[tdon]])          # +1 dorsal, -1 ventral
LOG['existing_tail_strands'] = int(len(tdon))
LOG['existing_lum_by_side'] = dict(dorsal=[round(float(x), 4) for x in np.percentile(clum[tdon][side_d > 0.5], [10, 50, 90])],
                                   lateral=[round(float(x), 4) for x in np.percentile(clum[tdon][np.abs(side_d) <= 0.5], [10, 50, 90])],
                                   ventral=[round(float(x), 4) for x in np.percentile(clum[tdon][side_d < -0.5], [10, 50, 90])])
kd = KDTree(len(tdon))
for j, p in enumerate(troot): kd.insert(p.tolist(), j)
kd.balance()

# ---- shaft triangles and the density top-up
TA = np.linalg.norm(np.cross(VW[LT[:, 1]] - VW[LT[:, 0]], VW[LT[:, 2]] - VW[LT[:, 0]]), axis=1) / 2
tt = ti[LT]; tri = np.where((tt >= 0).all(1))[0]; tc = tt[tri].mean(1)
a0, a1, b0, b1 = g('fade_in', [1.0, 1.4]) + g('fade_out', [4.2, 4.7])     # ramp in from the tail root, out toward the plume
wpos = sst(a0, a1, tc) * (1 - sst(b0, b1, tc)); keep = wpos > 0.02; tri = tri[keep]; wpos = wpos[keep]; tc = tc[keep]
# existing live roots per triangle
cnt_ = np.zeros(len(LT)); onr = np.where(ontail)[0]
# map each existing strand to a triangle: its (ia, ib, ic) set -> triangle index via a dict
key = {tuple(sorted(x)): i for i, x in enumerate(LT[tri].tolist())}
for i in onr:
    k_ = key.get(tuple(sorted((int(cia[i]), int(cib[i]), int(cic[i])))))
    if k_ is not None: cnt_[k_] += 1
ex_d = cnt_[:len(tri)] / np.maximum(TA[tri] * 1e4, 1e-9)
# smooth the existing density over the shaft band (per tail position bin) so the top-up is even
bins = np.floor(tc * 4).astype(int); ex_bin = {b: (cnt_[:len(tri)][bins == b].sum() / max(TA[tri][bins == b].sum() * 1e4, 1e-9)) for b in np.unique(bins)}
ex_s = np.array([ex_bin[b] for b in bins])
need = np.clip(g('target_density_per_cm2', 110.0) - ex_s, 0, None) * wpos
rng = np.random.default_rng(int(g('seed', 23)))
nfur = rng.poisson(TA[tri] * 1e4 * need); tri_rep = np.repeat(np.arange(len(tri)), nfur); n_new = len(tri_rep)
r1 = np.sqrt(rng.random(n_new)); r2 = rng.random(n_new); ba = np.c_[1 - r1, r1 * (1 - r2), r1 * r2]
ids = LT[tri[tri_rep]].copy()
nchk, _, _ = tri_frame(VW[ids[:, 0]], VW[ids[:, 1]], VW[ids[:, 2]]); vn = VN[ids].sum(1)
sw = np.einsum('ij,ij->i', nchk, vn) < 0; ids[sw] = ids[sw][:, [0, 2, 1]]; ba[sw] = ba[sw][:, [0, 2, 1]]
rootW = (VW[ids] * ba[:, :, None]).sum(1); nW, tW, bW = tri_frame(VW[ids[:, 0]], VW[ids[:, 1]], VW[ids[:, 2]])
LOG['shaft_triangles'] = int(len(tri)); LOG['shaft_area_cm2'] = round(float(TA[tri].sum()) * 1e4, 1); LOG['new_strands'] = int(n_new)
LOG['existing_density_per_cm2_by_quarter_bone'] = {str(b / 4): round(float(v), 1) for b, v in sorted(ex_bin.items())}

NPT = 9; POS = np.zeros((n_new * NPT, 3), np.float32); BH = np.zeros(n_new * NPT, np.float32); BX = np.zeros_like(BH); BY = np.zeros_like(BH); RAD = np.zeros_like(BH)
SRCK = []; lens = []; sides = []; Mi = np.linalg.inv(Mw[:3, :3])
lt, lu = g('len_top_m', 0.016), g('len_under_m', 0.011); lift = math.radians(g('lift_deg', 28.0))
rad_prof = crad[coffs[tdon[0]]:coffs[tdon[0]] + ccnt[tdon[0]]] if ccnt[tdon[0]] == NPT else np.linspace(crad[coffs[tdon[0]]], crad[coffs[tdon[0]]] * 0.3, NPT)
tvi = (ti[ids] * ba).sum(1)
for k in range(n_new):
    v0 = ids[k]; wv = ba[k]
    ax = (tdir[v0] * wv[:, None]).sum(0); ax /= np.linalg.norm(ax); zz = (tz[v0] * wv[:, None]).sum(0); zz /= np.linalg.norm(zz)
    n_ = nW[k]; sd = float(n_ @ zz); sides.append(sd)
    d = ax - n_ * (ax @ n_); d /= max(np.linalg.norm(d), 1e-9)
    if g('lateral_comb_deg', 0.0) and abs(sd) < 0.5:
        # lateral strands lean toward the dorsal side, so the ventral white strip stays clear in profile
        up_ = zz - n_ * (zz @ n_); nu = np.linalg.norm(up_)
        if nu > 1e-6:
            cb = math.radians(g('lateral_comb_deg', 0.0)) * (1 - abs(sd) / 0.5); d = d * math.cos(cb) + (up_ / nu) * math.sin(cb); d /= np.linalg.norm(d)
    fpos = float(sst(a0, a1, np.array(tvi[k])) * (1 - sst(b0 - 0.3, b1, np.array(tvi[k]))))
    L = (lu + (lt - lu) * float(sst(-0.6, 0.6, np.array(sd)))) * (0.45 + 0.55 * fpos) * float(np.exp(rng.normal(0, 0.12)))
    # a strand lying toward the tip: elevation lift at the root, a third of it at the tip
    lk = (math.radians(g('lift_ventral_deg', math.degrees(lift))) if sd < -0.5 else lift) + math.radians(rng.normal(0, g('lift_jitter_deg', 0.0)))
    fs_ = g('flat_side', None)
    if fs_ and fs_[0] < sd < fs_[1]:
        # a band lying close to the skin (covers it without reaching past the silhouette edge below): own lift, shorter
        lk = math.radians(fs_[2]) + math.radians(rng.normal(0, g('lift_jitter_deg', 0.0)) * 0.4); L *= fs_[3]
    u = np.linspace(0, 1, NPT); ang = lk * (1 - g('tip_droop', 0.66) * u); step = L / (NPT - 1)
    hh = np.r_[0, np.cumsum(np.sin(ang[1:]) * step)]; ss_ = np.r_[0, np.cumsum(np.cos(ang[1:]) * step)]
    ids_ = v0; nL, tL, bL = tri_frame(VL[ids_[0]], VL[ids_[1]], VL[ids_[2]])
    dl_ = Mi @ d; dx, dy = float(dl_ @ tL), float(dl_ @ bL); nn = math.hypot(dx, dy); dx, dy = dx / nn, dy / nn
    if g('angle_jitter_deg', 0.0):
        aj = math.radians(rng.normal(0, g('angle_jitter_deg', 0.0))); dx, dy = dx * math.cos(aj) - dy * math.sin(aj), dx * math.sin(aj) + dy * math.cos(aj)
    Pn = np.c_[hh, ss_ * dx, ss_ * dy]
    rootL = (VL[ids_] * wv[:, None]).sum(0); pts = rootL + Pn[:, 0:1] * nL + Pn[:, 1:2] * tL + Pn[:, 2:3] * bL
    sl = slice(k * NPT, (k + 1) * NPT); POS[sl] = pts; BH[sl] = Pn[:, 0]; BX[sl] = Pn[:, 1]; BY[sl] = Pn[:, 2]; RAD[sl] = rad_prof * (0.0 if g('skip_side', None) and g('skip_side', None)[0] < sd < g('skip_side', None)[1] else 1.0)
    nb = [x[1] for x in kd.find_n(rootW[k].tolist(), int(g('colour_k', 12)))]
    if g('dark_top', 0.0) > 0 and sd > 0.3:
        # dorsal side: the darkest share of the nearby existing tail strands (an existing coat colour, darker top)
        cand = [x[1] for x in kd.find_n(rootW[k].tolist(), int(g('colour_k', 12)) * 4)]
        cand = sorted(cand, key=lambda j: clum[tdon[j]]); nb = cand[:max(1, int(len(cand) * g('dark_top', 0.25)))]
        if g('colour_single', 1): nb = [nb[int(rng.integers(0, len(nb)))]]      # one existing strand's colour: no blend, no new colour
    elif g('colour_single', 1): nb = nb[:1]
    SRCK.append(tdon[nb]); lens.append(L)
sides = np.array(sides)
LOG['new_len_mm_p10_50_90'] = [round(float(np.percentile(lens, p)) * 1000, 1) for p in (10, 50, 90)]
LOG['new_side_share'] = dict(dorsal=round(float((sides > 0.5).mean()), 3), lateral=round(float((np.abs(sides) <= 0.5).mean()), 3), ventral=round(float((sides < -0.5).mean()), 3))

hc = bpy.data.hair_curves.new('Tail shaft coat'); hc.add_curves([NPT] * n_new)
hc.attributes['position'].data.foreach_set('vector', POS.ravel())
def add_attr(name, dom, typ, vals):
    at = hc.attributes.get(name) or hc.attributes.new(name, typ, dom)
    key_ = {'FLOAT_COLOR': 'color', 'FLOAT_VECTOR': 'vector'}.get(typ, 'value'); at.data.foreach_set(key_, np.ascontiguousarray(vals).ravel())
add_attr('radius', 'POINT', 'FLOAT', RAD)
for nm, v in (('bind_height', BH), ('bind_offset_x', BX), ('bind_offset_y', BY)): add_attr(nm, 'POINT', 'FLOAT', v)
add_attr('bind_ia', 'CURVE', 'INT', ids[:, 0].astype(np.int32)); add_attr('bind_ib', 'CURVE', 'INT', ids[:, 1].astype(np.int32)); add_attr('bind_ic', 'CURVE', 'INT', ids[:, 2].astype(np.int32))
for nm, j in (('bind_a', 0), ('bind_b', 1), ('bind_c', 2)): add_attr(nm, 'CURVE', 'FLOAT', ba[:, j].astype(np.float32))
for a_ in cd.attributes:
    if a_.name.startswith(('.', 'bind_')) or a_.domain != 'CURVE' or a_.data_type not in ('FLOAT', 'FLOAT_COLOR', 'FLOAT_VECTOR'): continue
    key_ = {'FLOAT_COLOR': 'color', 'FLOAT_VECTOR': 'vector'}.get(a_.data_type, 'value'); w_ = {'FLOAT_COLOR': 4, 'FLOAT_VECTOR': 3}.get(a_.data_type, 1)
    av_ = arr(a_.data, key_, w_); vv_ = np.array([av_[x].mean(0) for x in SRCK], np.float32).reshape(n_new, -1) if w_ > 1 else np.array([av_[x].mean() for x in SRCK], np.float32)
    add_attr(a_.name, 'CURVE', a_.data_type, vv_)
nl = np.array([ccol[x, :3].mean(0) for x in SRCK]) @ np.array([0.2126, 0.7152, 0.0722])
LOG['new_lum_by_side'] = dict(dorsal=[round(float(x), 4) for x in np.percentile(nl[sides > 0.5], [10, 50, 90])] if (sides > 0.5).any() else None,
                              ventral=[round(float(x), 4) for x in np.percentile(nl[sides < -0.5], [10, 50, 90])] if (sides < -0.5).any() else None)
for m_ in cd.materials: hc.materials.append(m_)
hc.surface = body
ob = coat.copy(); ob.data = hc; ob.name = 'Tail shaft coat'
for m in list(ob.modifiers):
    if not m.name.startswith('Follow'): ob.modifiers.remove(m)
(coat.users_collection[0] if coat.users_collection else s.collection).objects.link(ob)
rig.data.pose_position = 'POSE'; bpy.context.view_layer.update()
REP.write_text(json.dumps(LOG, indent=1)); bpy.ops.wm.save_as_mainfile(filepath=OUTB, compress=True); print('TAIL saved', OUTB, json.dumps({k: v for k, v in LOG.items() if k not in ('params', 'bones')}), flush=True)
