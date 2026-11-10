"""Luceras nape (B-ewzn, D-xed4): regrow coat over the bare head-neck junction behind the horn bases.

Cause (measured, see the build report): the interpolated coat has almost no roots on the occiput and dorsal nape
(binding unchanged since headpass1 k16). Neighbouring fur covered that skin until the appeal head scale stretched it and
the carriage raised the head away from the neck fur.

This adds one new curves object, 'Nape coat', bound with the groom's own frame binding (bind_ia/ib/ic, bind_a/b/c,
bind_height, bind_offset_x/y) on the region's triangles, and the coat's materials and follow modifier. No existing
strand is touched: every curves object's data stays as it is, so every strand outside the region keeps its binding
bit for bit (the build report diffs them).

Region: body vertices on the head and upper neck behind the horn bases (rest y > y_front_m, z > z_min_m), not ear or
jaw dominant, at least horn_clear_m from the horns, whose local root density (every rendered body-bound strand,
8 mm disc) is under target_density_per_cm2. Each region triangle gets roots to top its density up to the target, so
the edge has no density step.
Strand: the nearest donor coat strand's shape in its own frame (live, 9 points, rooted outside the region), turned to
the flow (the inverse-distance mean of nearby donors' skin-plane directions, blended with back-and-down along the neck)
and scaled to the inverse-distance mean donor length times len_k. Colour attributes: the mean of the colour_k nearest
grey donor strands (bright blaze strands excluded), so no new colour and no ring.

Usage: blender -b SCENE --python nape_regrow.py -- PARAMS.json OUT.blend REPORT.json
"""
import bpy, sys, json, math
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
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
Mw = np.array(body.matrix_world); V0 = arr(body.data.vertices, 'co').astype(np.float64); NV = len(V0)
me = body.data; me.calc_loop_triangles(); LT = arr(me.loop_triangles, 'vertices', 3, np.int32)
e = body.evaluated_get(dg); m = e.to_mesh(); VL = arr(m.vertices, 'co').astype(np.float64); VNL = arr(m.vertices, 'normal').astype(np.float64); e.to_mesh_clear()
LOG['rest_eval_vs_data_max_mm'] = round(float(np.abs(VL - V0).max()) * 1000, 4)
LOG['body_matrix_is_identity'] = bool(np.allclose(Mw, np.eye(4)))
VW = VL @ Mw[:3, :3].T + Mw[:3, 3]; VN = VNL @ Mw[:3, :3].T
gn = [x.name for x in body.vertex_groups]; Wt = np.zeros((NV, len(gn)), np.float32)
for v in me.vertices:
    for gg in v.groups: Wt[v.index, gg.group] = gg.weight
DOM = np.array(gn)[Wt.argmax(1)]

# ---- every rendered body-bound strand's rest root (live ones) for the density
roots = []
for o in s.objects:
    if o.type != 'CURVES' or o.hide_render or o.data.surface is None or o.data.surface.name != body.name or 'bind_ia' not in o.data.attributes: continue
    d = o.data; ia = arr(d.attributes['bind_ia'].data, 'value', 1, np.int32); ib = arr(d.attributes['bind_ib'].data, 'value', 1, np.int32); ic = arr(d.attributes['bind_ic'].data, 'value', 1, np.int32)
    bw = np.stack([arr(d.attributes['bind_' + k].data, 'value', 1) for k in 'abc'], 1); offs = arr(d.curves, 'first_point_index', 1, np.int32)
    rad = arr(d.attributes['radius'].data, 'value', 1); live = rad[offs] > 0
    roots.append((VW[ia] * bw[:, :1] + VW[ib] * bw[:, 1:2] + VW[ic] * bw[:, 2:3])[live])
roots = np.concatenate(roots)
# candidate zone
y0 = g('y_front_m', -0.19); zmin = g('z_min_m', 0.50)
zone = (VW[:, 1] > y0) & (VW[:, 2] > zmin) & (np.abs(VW[:, 0]) < g('x_max_m', 0.085)) & np.isin(DOM, g('groups', ['head_01', 'neck_01', 'neck_02']))
zone &= VW[:, 1] < g('y_back_m', 0.0)
# horn clearance: distance to the horn surfaces at rest
hb = []
for hn in ('horn_l', 'horn_r'):
    ho = s.objects.get(hn)
    if ho is None: continue
    eh = ho.evaluated_get(dg); mh = eh.to_mesh(); Mh = np.array(eh.matrix_world)
    Vh = arr(mh.vertices, 'co').astype(np.float64) @ Mh[:3, :3].T + Mh[:3, 3]; hb.append(BVHTree.FromPolygons([Vector(x) for x in Vh.tolist()], [list(p.vertices) for p in mh.polygons])); eh.to_mesh_clear()
zi = np.where(zone)[0]; dh = np.full(NV, 9.0)
for i in zi:
    for b_ in hb:
        r_ = b_.find_nearest(Vector(VW[i].tolist()))
        if r_[0] is not None: dh[i] = min(dh[i], r_[3])
zone &= dh > g('horn_clear_m', 0.004)
# density (8 mm disc) on the zone and a ring round it
kr = KDTree(len(roots))
for j, p in enumerate(roots): kr.insert(p.tolist(), j)
kr.balance()
kv = KDTree(NV)
for j, p in enumerate(VW): kv.insert(p.tolist(), j)
kv.balance()
TA = np.linalg.norm(np.cross(VW[LT[:, 1]] - VW[LT[:, 0]], VW[LT[:, 2]] - VW[LT[:, 0]]), axis=1) / 2
VA = np.bincount(LT.ravel(), weights=np.repeat(TA / 3, 3), minlength=NV)
R8 = 0.008; dens = np.full(NV, np.nan)
for i in np.where(zone)[0]:
    n_r = len(kr.find_range(VW[i].tolist(), R8)); a_ = sum(VA[x[1]] for x in kv.find_range(VW[i].tolist(), R8)); dens[i] = n_r / max(a_ * 1e4, 1e-9)
tgt = g('target_density_per_cm2', 55.0)
reg = zone & (dens < g('sparse_hi', 30.0))      # only the sparse skin and its edge get roots; the top-up fades out by sparse_hi
LOG['zone_vertices'] = int(zone.sum()); LOG['region_vertices'] = int(reg.sum())
LOG['zone_density_per_cm2_p10_50_90'] = [round(float(x), 1) for x in np.nanpercentile(dens[zone], [10, 50, 90])]
# triangles: all three vertices in the zone, at least one under target; top up to the target
tri = np.where(zone[LT].all(1) & reg[LT].any(1))[0]
dtri = np.nanmean(dens[LT[tri]], 1); need = np.clip(tgt - dtri, 0, None) * (1 - sst(g('sparse_lo', 15.0), g('sparse_hi', 30.0), dtri))
rng = np.random.default_rng(int(g('seed', 11)))
nfur = rng.poisson(TA[tri] * 1e4 * need)
tri_rep = np.repeat(tri, nfur); n_new = len(tri_rep)
r1 = np.sqrt(rng.random(n_new)); r2 = rng.random(n_new); ba = np.c_[1 - r1, r1 * (1 - r2), r1 * r2]
ids = LT[tri_rep].copy()
nchk, _, _ = tri_frame(VW[ids[:, 0]], VW[ids[:, 1]], VW[ids[:, 2]]); vn = VN[ids].sum(1)
sw = np.einsum('ij,ij->i', nchk, vn) < 0; ids[sw] = ids[sw][:, [0, 2, 1]]; ba[sw] = ba[sw][:, [0, 2, 1]]
rootW = (VW[ids] * ba[:, :, None]).sum(1)
nW, tW, bW = tri_frame(VW[ids[:, 0]], VW[ids[:, 1]], VW[ids[:, 2]])
LOG['region_area_cm2'] = round(float(TA[tri].sum()) * 1e4, 2); LOG['new_strands'] = int(n_new); LOG['region_triangles'] = int(len(tri))
LOG['region_area_cm2_under_10'] = round(float(TA[np.where(zone[LT].all(1) & (np.nanmax(dens[LT], 1) < 10))[0]].sum()) * 1e4, 2)

# ---- donors: live coat strands, 9 points, rooted in the zone's neighbourhood but outside the region
cd = coat.data
cia = arr(cd.attributes['bind_ia'].data, 'value', 1, np.int32); cib = arr(cd.attributes['bind_ib'].data, 'value', 1, np.int32); cic = arr(cd.attributes['bind_ic'].data, 'value', 1, np.int32)
cba = np.stack([arr(cd.attributes['bind_' + k].data, 'value', 1) for k in 'abc'], 1)
croot = (VW[np.stack([cia, cib, cic], 1)] * cba[:, :, None]).sum(1)
coffs = arr(cd.curves, 'first_point_index', 1, np.int32); ccnt = arr(cd.curves, 'points_length', 1, np.int32)
crad = arr(cd.attributes['radius'].data, 'value', 1)
CH = arr(cd.attributes['bind_height'].data, 'value', 1); CX = arr(cd.attributes['bind_offset_x'].data, 'value', 1); CY = arr(cd.attributes['bind_offset_y'].data, 'value', 1)
ccol = arr(cd.attributes['coat_color'].data, 'color', 4); clum = ccol[:, :3] @ np.array([0.2126, 0.7152, 0.0722])
cen_ = rootW.mean(0) if n_new else VW[zone].mean(0)
near = np.linalg.norm(croot - cen_, axis=1) < g('donor_reach_m', 0.11)
donor = np.where(near & (crad[coffs] > 0) & (ccnt == 9) & ~(reg[cia] | reg[cib] | reg[cic]))[0]
# donor directions (world, root to tip, skin plane of its own triangle) and lengths on the current rest surface
dn, dt_, db_ = tri_frame(VW[cia[donor]], VW[cib[donor]], VW[cic[donor]])
last = coffs[donor] + ccnt[donor] - 1
ddir = CX[last][:, None] * dt_ + CY[last][:, None] * db_; ddir /= np.maximum(np.linalg.norm(ddir, axis=1, keepdims=True), 1e-9)
dlen = np.array([float(np.linalg.norm(np.diff(np.c_[CH[a:a + n], CX[a:a + n], CY[a:a + n]], axis=0), axis=1).sum()) for a, n in zip(coffs[donor], ccnt[donor])])
kd = KDTree(len(donor))
for j, i in enumerate(donor): kd.insert(croot[i].tolist(), j)
kd.balance()
# grey donors for the colour (the white blaze strands are excluded: no new stripe)
gl = g('grey_lum_max', None)
if gl is None: gl = float(np.percentile(clum[donor], 70))
grey = donor[clum[donor] <= gl]
kg = KDTree(len(grey))
for j, i in enumerate(grey): kg.insert(croot[i].tolist(), j)
kg.balance()
LOG['donors'] = int(len(donor)); LOG['grey_donors'] = int(len(grey)); LOG['grey_lum_max'] = round(gl, 4)
LOG['donor_len_mm_p10_50_90'] = [round(float(x) * 1000, 1) for x in np.percentile(dlen, [10, 50, 90])]

flow_w = g('flow_bias', 0.5); fb = np.array(g('flow_vec', [0.0, 1.0, -0.6]), float)
NPT = 9; POS = np.zeros((n_new * NPT, 3), np.float32); BH = np.zeros(n_new * NPT, np.float32); BX = np.zeros_like(BH); BY = np.zeros_like(BH); RAD = np.zeros_like(BH)
SRCK = []; lens = []; Mi = np.linalg.inv(Mw[:3, :3])
for k in range(n_new):
    nb = kd.find_n(rootW[k].tolist(), int(g('dir_k', 12)))
    js = np.array([x[1] for x in nb]); ds = np.array([max(x[2], 1e-4) for x in nb]); w_ = 1 / ds ** 2; w_ /= w_.sum()
    dd = (ddir[js] * w_[:, None]).sum(0); dd = dd - nW[k] * (dd @ nW[k]); dd /= max(np.linalg.norm(dd), 1e-9)
    bias = fb - nW[k] * (fb @ nW[k]); bias /= max(np.linalg.norm(bias), 1e-9)
    dw = (1 - flow_w) * dd + flow_w * bias; dw /= max(np.linalg.norm(dw), 1e-9)
    L = max(float((dlen[js] * w_).sum()) * g('len_k', 1.1), g('len_min_m', 0.0))
    di = donor[js[0]]; a0, n_ = coffs[di], ccnt[di]; sl = slice(a0, a0 + n_)
    Pd = np.c_[CH[sl], CX[sl], CY[sl]]; Ld = float(np.linalg.norm(np.diff(Pd, axis=0), axis=1).sum()); ad = math.atan2(Pd[-1, 2], Pd[-1, 1])
    ids_ = ids[k]; nL, tL, bL = tri_frame(VL[ids_[0]], VL[ids_[1]], VL[ids_[2]])
    dl_ = Mi @ dw; ang = math.atan2(dl_ @ bL, dl_ @ tL); rot = ang - ad; cs, sn = math.cos(rot), math.sin(rot); sc = L / max(Ld, 1e-9)
    Pn = np.c_[Pd[:, 0] * sc * g('lie_k', 1.0), (Pd[:, 1] * cs - Pd[:, 2] * sn) * sc, (Pd[:, 1] * sn + Pd[:, 2] * cs) * sc]
    rootL = (VL[ids_] * ba[k][:, None]).sum(0); pts = rootL + Pn[:, 0:1] * nL + Pn[:, 1:2] * tL + Pn[:, 2:3] * bL
    sl2 = slice(k * NPT, (k + 1) * NPT); POS[sl2] = pts; BH[sl2] = Pn[:, 0]; BX[sl2] = Pn[:, 1]; BY[sl2] = Pn[:, 2]; RAD[sl2] = crad[sl]
    SRCK.append([grey[x[1]] for x in kg.find_n(rootW[k].tolist(), int(g('colour_k', 16)))]); lens.append(L)
LOG['new_strand_len_mm_p5_50_95'] = [round(float(np.percentile(lens, p)) * 1000, 1) for p in (5, 50, 95)] if lens else None

hc = bpy.data.hair_curves.new('Nape coat'); hc.add_curves([NPT] * n_new)
hc.attributes['position'].data.foreach_set('vector', POS.ravel())
def add_attr(name, dom, typ, vals):
    at = hc.attributes.get(name) or hc.attributes.new(name, typ, dom)
    key = {'FLOAT_COLOR': 'color', 'FLOAT_VECTOR': 'vector'}.get(typ, 'value'); at.data.foreach_set(key, np.ascontiguousarray(vals).ravel())
add_attr('radius', 'POINT', 'FLOAT', RAD)
for nm, v in (('bind_height', BH), ('bind_offset_x', BX), ('bind_offset_y', BY)): add_attr(nm, 'POINT', 'FLOAT', v)
add_attr('bind_ia', 'CURVE', 'INT', ids[:, 0].astype(np.int32)); add_attr('bind_ib', 'CURVE', 'INT', ids[:, 1].astype(np.int32)); add_attr('bind_ic', 'CURVE', 'INT', ids[:, 2].astype(np.int32))
for nm, j in (('bind_a', 0), ('bind_b', 1), ('bind_c', 2)): add_attr(nm, 'CURVE', 'FLOAT', ba[:, j].astype(np.float32))
for a_ in cd.attributes:
    if a_.name.startswith(('.', 'bind_')) or a_.domain != 'CURVE' or a_.data_type not in ('FLOAT', 'FLOAT_COLOR', 'FLOAT_VECTOR'): continue
    key = {'FLOAT_COLOR': 'color', 'FLOAT_VECTOR': 'vector'}.get(a_.data_type, 'value'); w_ = {'FLOAT_COLOR': 4, 'FLOAT_VECTOR': 3}.get(a_.data_type, 1)
    av_ = arr(a_.data, key, w_); vv_ = np.array([av_[x].mean(0) for x in SRCK], np.float32).reshape(n_new, -1) if w_ > 1 else np.array([av_[x].mean() for x in SRCK], np.float32)
    add_attr(a_.name, 'CURVE', a_.data_type, vv_)
LOG['new_coat_color_lum_p10_50_90'] = [round(float(x), 4) for x in np.percentile(np.array([ccol[x, :3].mean(0) for x in SRCK]) @ np.array([0.2126, 0.7152, 0.0722]), [10, 50, 90])] if n_new else None
LOG['donor_coat_color_lum_p10_50_90'] = [round(float(x), 4) for x in np.percentile(clum[donor], [10, 50, 90])]
for m_ in cd.materials: hc.materials.append(m_)
hc.surface = body
ob = coat.copy(); ob.data = hc; ob.name = 'Nape coat'
for m in list(ob.modifiers):
    if not m.name.startswith('Follow'): ob.modifiers.remove(m)
(coat.users_collection[0] if coat.users_collection else s.collection).objects.link(ob)
np.save(str(REP.with_suffix('.region.npy')), np.where(reg)[0])
np.save(str(REP.with_suffix('.zone.npy')), np.where(zone)[0])
np.save(str(REP.with_suffix('.bare.npy')), np.where(zone & (dens < g('bare_lt', 15.0)))[0])
np.save(str(REP.with_suffix('.dens.npy')), np.c_[np.where(zone)[0], dens[zone]])
rig.data.pose_position = 'POSE'; bpy.context.view_layer.update()
REP.write_text(json.dumps(LOG, indent=1)); bpy.ops.wm.save_as_mainfile(filepath=OUTB, compress=True); print('NAPE saved', OUTB, json.dumps({k: v for k, v in LOG.items() if k != 'params'}), flush=True)
