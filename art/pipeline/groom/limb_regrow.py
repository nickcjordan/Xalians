"""Luceras limbs (B-7fmf, D-933s): top up the coat on the forearms, hind shanks and lower hind legs.

Diagnosis (see luceras-limbs/spec.md): the forearm (36.7 roots per cm2) and the hind shank (30.3) are sparse against
their far controls on the same limb (upper arm 53.6, thigh 116.6); the lower hind leg is mostly flat, short paw-fur
strands (about 9 mm at about 10 degrees) with a sparse coat. Skin and its specular show through.

This adds one new curves object, 'Limb coat', bound with the groom's own frame binding on those regions; nothing that
exists is edited (every curves object, the body mesh, skeleton and weights stay bit for bit). Per region:
  - roots: each triangle is topped up toward target_density_per_cm2 (existing live roots of every body-bound strand
    counted in an 8 mm disc), the top-up fading out between fade_lo and fade_hi of existing density; the distal end of a
    bone can be left out (from_frac / to_frac along the bone, the paw and toes stay as they are);
  - shape: the nearest live coat strand rooted on the limb (a 9-point donor), turned to the inverse-distance mean
    direction of the dir_k nearest donors, length the inverse-distance mean donor length x len_k (clamped to
    len_min_m..len_max_m), height x lie_k: lengths match the neighbours, so the outline only gains fuzz;
  - colour: every curve attribute of the single nearest live coat strand on the limb (no blend, so the grey outer and
    white inner pattern keeps its boundary and no new colour appears).
Usage: blender -b SCENE --python limb_regrow.py -- PARAMS.json OUT.blend REPORT.json
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
Mr = np.array(rig.matrix_world)


def bone_frac(bn, idx):
    b = rig.data.bones[bn]; h = (Mr @ np.r_[np.array(b.head_local[:]), 1])[:3]; t = (Mr @ np.r_[np.array(b.tail_local[:]), 1])[:3]
    ax = t - h; L = np.linalg.norm(ax); return ((VW[idx] - h) @ (ax / L)) / L


# every live body-bound root (rest) for the density
roots = []; root_obj = []
for o in s.objects:
    if o.type != 'CURVES' or o.hide_render or o.data.surface is None or o.data.surface.name != body.name or 'bind_ia' not in o.data.attributes: continue
    d = o.data; ia = arr(d.attributes['bind_ia'].data, 'value', 1, np.int32); ib = arr(d.attributes['bind_ib'].data, 'value', 1, np.int32); ic = arr(d.attributes['bind_ic'].data, 'value', 1, np.int32)
    bw = np.stack([arr(d.attributes['bind_' + k].data, 'value', 1) for k in 'abc'], 1); offs = arr(d.curves, 'first_point_index', 1, np.int32)
    rad = arr(d.attributes['radius'].data, 'value', 1); live = rad[offs] > 0
    roots.append((VW[ia] * bw[:, :1] + VW[ib] * bw[:, 1:2] + VW[ic] * bw[:, 2:3])[live]); root_obj += [o.name] * int(live.sum())
roots = np.concatenate(roots); root_obj = np.array(root_obj)
KR = {}
def root_tree(excl):
    key = tuple(sorted(excl))
    if key not in KR:
        sel = np.where(~np.isin(root_obj, list(excl)))[0]; t_ = KDTree(len(sel))
        for j, i in enumerate(sel): t_.insert(roots[i].tolist(), j)
        t_.balance(); KR[key] = t_
    return KR[key]
kv = KDTree(NV)
for j, p in enumerate(VW): kv.insert(p.tolist(), j)
kv.balance()
TA = np.linalg.norm(np.cross(VW[LT[:, 1]] - VW[LT[:, 0]], VW[LT[:, 2]] - VW[LT[:, 0]]), axis=1) / 2
VA = np.bincount(LT.ravel(), weights=np.repeat(TA / 3, 3), minlength=NV)

# coat donors on the limbs (live, 9 points)
cd = coat.data
cia = arr(cd.attributes['bind_ia'].data, 'value', 1, np.int32); cib = arr(cd.attributes['bind_ib'].data, 'value', 1, np.int32); cic = arr(cd.attributes['bind_ic'].data, 'value', 1, np.int32)
cba = np.stack([arr(cd.attributes['bind_' + k].data, 'value', 1) for k in 'abc'], 1)
croot = (VW[np.stack([cia, cib, cic], 1)] * cba[:, :, None]).sum(1)
coffs = arr(cd.curves, 'first_point_index', 1, np.int32); ccnt = arr(cd.curves, 'points_length', 1, np.int32); crad = arr(cd.attributes['radius'].data, 'value', 1)
CH = arr(cd.attributes['bind_height'].data, 'value', 1); CX = arr(cd.attributes['bind_offset_x'].data, 'value', 1); CY = arr(cd.attributes['bind_offset_y'].data, 'value', 1)
ccol = arr(cd.attributes['coat_color'].data, 'color', 4); clum = ccol[:, :3] @ np.array([0.2126, 0.7152, 0.0722])

rng = np.random.default_rng(int(g('seed', 31)))
NPT = 9; ALL = dict(ids=[], ba=[], POS=[], BH=[], BX=[], BY=[], RAD=[], SRC=[])
for R in g('regions', []):
    rn = R['name']; bones = R['bones']; zone = np.isin(DOM, bones)
    if R.get('from_frac') is not None or R.get('to_frac') is not None:
        for bn in bones:
            idx = np.where(DOM == bn)[0]; f = bone_frac(bn, idx)
            bad = (f < R.get('from_frac', -9)) | (f > R.get('to_frac', 9)); zone[idx[bad]] = False
    if R.get('z_min_m') is not None: zone &= VW[:, 2] > R['z_min_m']
    zi = np.where(zone)[0]; dens = np.full(NV, np.nan); r8 = g('disc_m', 0.008); kr = root_tree(R.get('density_exclude', []))
    for i in zi:
        n_r = len(kr.find_range(VW[i].tolist(), r8)); a_ = sum(VA[x[1]] for x in kv.find_range(VW[i].tolist(), r8)); dens[i] = n_r / max(a_ * 1e4, 1e-9)
    tgt = R['target_density_per_cm2']
    tri = np.where(zone[LT].all(1))[0]; dtri = np.nanmean(dens[LT[tri]], 1)
    need = np.clip(tgt - dtri, 0, None) * (1 - sst(R.get('fade_lo', tgt * 0.8), R.get('fade_hi', tgt), dtri))
    nfur = rng.poisson(TA[tri] * 1e4 * need); tri_rep = np.repeat(tri, nfur); n_new = len(tri_rep)
    r1 = np.sqrt(rng.random(n_new)); r2 = rng.random(n_new); ba = np.c_[1 - r1, r1 * (1 - r2), r1 * r2]
    ids = LT[tri_rep].copy()
    nchk, _, _ = tri_frame(VW[ids[:, 0]], VW[ids[:, 1]], VW[ids[:, 2]]); vn = VN[ids].sum(1)
    sw = np.einsum('ij,ij->i', nchk, vn) < 0; ids[sw] = ids[sw][:, [0, 2, 1]]; ba[sw] = ba[sw][:, [0, 2, 1]]
    rootW = (VW[ids] * ba[:, :, None]).sum(1); nW, tW, bW = tri_frame(VW[ids[:, 0]], VW[ids[:, 1]], VW[ids[:, 2]])
    # donors: live 9-point coat strands rooted on the donor bones
    dz = np.isin(DOM, R.get('donor_bones', bones))
    don = np.where(dz[cia] & dz[cib] & dz[cic] & (crad[coffs] > 0) & (ccnt == NPT))[0]
    dn_, dt_, db_ = tri_frame(VW[cia[don]], VW[cib[don]], VW[cic[don]]); last = coffs[don] + ccnt[don] - 1
    ddir = CX[last][:, None] * dt_ + CY[last][:, None] * db_; ddir /= np.maximum(np.linalg.norm(ddir, axis=1, keepdims=True), 1e-9)
    dlen = np.array([float(np.linalg.norm(np.diff(np.c_[CH[a:a + n], CX[a:a + n], CY[a:a + n]], axis=0), axis=1).sum()) for a, n in zip(coffs[don], ccnt[don])])
    kd = KDTree(len(don))
    for j, i in enumerate(don): kd.insert(croot[i].tolist(), j)
    kd.balance()
    Mi = np.linalg.inv(Mw[:3, :3]); lens = []
    # optional length taper along the bone toward to_frac (strands shorten into the paw edge instead of stopping in a ring)
    tk = np.ones(n_new)
    if R.get('taper_from_frac') is not None and n_new:
        frr = np.zeros(n_new); bdom = DOM[ids[:, 0]]
        for bn in bones:
            mk = bdom == bn
            if not mk.any(): continue
            b_ = rig.data.bones[bn]; h_ = (Mr @ np.r_[np.array(b_.head_local[:]), 1])[:3]; t_ = (Mr @ np.r_[np.array(b_.tail_local[:]), 1])[:3]
            ax_ = t_ - h_; L_ = np.linalg.norm(ax_); frr[mk] = ((rootW[mk] - h_) @ (ax_ / L_)) / L_
        u_t = np.clip((frr - R['taper_from_frac']) / max(R.get('to_frac', 1.0) - R['taper_from_frac'], 1e-6), 0, 1)
        tk = 1 - (1 - R.get('taper_end_k', 0.6)) * u_t
    POS = np.zeros((n_new * NPT, 3), np.float32); BH = np.zeros(n_new * NPT, np.float32); BX = np.zeros_like(BH); BY = np.zeros_like(BH); RAD = np.zeros_like(BH); SRC = np.zeros(n_new, np.int64)
    for k in range(n_new):
        nb = kd.find_n(rootW[k].tolist(), int(g('dir_k', 12)))
        js = np.array([x[1] for x in nb]); ds = np.array([max(x[2], 1e-4) for x in nb]); w_ = 1 / ds ** 2; w_ /= w_.sum()
        dd = (ddir[js] * w_[:, None]).sum(0); dd = dd - nW[k] * (dd @ nW[k]); nd = np.linalg.norm(dd)
        dd = dd / nd if nd > 1e-9 else tW[k]
        L = float(np.clip(float((dlen[js] * w_).sum()) * R.get('len_k', 1.0), R.get('len_min_m', 0.0), R.get('len_max_m', 1.0))) * float(np.exp(rng.normal(0, R.get('len_jitter', 0.1)))) * float(tk[k])
        di = don[js[0]]; a0, n_ = coffs[di], ccnt[di]; sl = slice(a0, a0 + n_)
        Pd = np.c_[CH[sl], CX[sl], CY[sl]]; Ld = float(np.linalg.norm(np.diff(Pd, axis=0), axis=1).sum()); ad = math.atan2(Pd[-1, 2], Pd[-1, 1])
        ids_ = ids[k]; nL, tL, bL = tri_frame(VL[ids_[0]], VL[ids_[1]], VL[ids_[2]])
        dl_ = Mi @ dd; ang = math.atan2(dl_ @ bL, dl_ @ tL) + rng.normal(0, math.radians(R.get('angle_jitter_deg', 6.0)))
        rot = ang - ad; cs, sn = math.cos(rot), math.sin(rot); sc = L / max(Ld, 1e-9)
        hk = R.get('lie_k', 1.0)
        if R.get('min_lift_deg'):
            # a donor lying flatter than min_lift is lifted to it (heights scaled), so flat paw-like shapes stand off the skin
            tl = math.atan2(Pd[-1, 0] * hk, max(math.hypot(Pd[-1, 1], Pd[-1, 2]), 1e-9)); ml = math.radians(R['min_lift_deg'] + rng.normal(0, R.get('lift_jitter_deg', 0.0)))
            if tl < ml and Pd[-1, 0] > 1e-6: hk *= math.tan(ml) / max(math.tan(max(tl, 1e-3)), 1e-3)
            elif Pd[-1, 0] <= 1e-6:
                Pd = Pd.copy(); Pd[:, 0] = np.linspace(0, 1, len(Pd)) ** 0.8 * math.tan(ml) * math.hypot(Pd[-1, 1], Pd[-1, 2])
        Pn = np.c_[Pd[:, 0] * sc * hk, (Pd[:, 1] * cs - Pd[:, 2] * sn) * sc, (Pd[:, 1] * sn + Pd[:, 2] * cs) * sc]
        if R.get('shape') == 'synthetic':
            # a plain strand lying along the flow at lift_deg from the skin, curving down toward its tip (no donor shape)
            lk_ = math.radians(R.get('lift_deg', 30.0) + rng.normal(0, R.get('lift_jitter_deg', 0.0))); u_ = np.linspace(0, 1, NPT)
            an_ = lk_ * (1 - R.get('tip_droop', 0.6) * u_); st_ = L / (NPT - 1)
            hh_ = np.r_[0, np.cumsum(np.sin(an_[1:]) * st_)]; ss_ = np.r_[0, np.cumsum(np.cos(an_[1:]) * st_)]
            ca_ = math.cos(ang); sa_ = math.sin(ang); Pn = np.c_[hh_, ss_ * ca_, ss_ * sa_]
        rootL = (VL[ids_] * ba[k][:, None]).sum(0); pts = rootL + Pn[:, 0:1] * nL + Pn[:, 1:2] * tL + Pn[:, 2:3] * bL
        s2 = slice(k * NPT, (k + 1) * NPT); POS[s2] = pts; BH[s2] = Pn[:, 0]; BX[s2] = Pn[:, 1]; BY[s2] = Pn[:, 2]; RAD[s2] = crad[sl]
        SRC[k] = di if R.get('colour', 'nearest') == 'shape_donor' else don[kd.find(rootW[k].tolist())[1]]; lens.append(L)
    for kk, vv in (('ids', ids), ('ba', ba), ('POS', POS), ('BH', BH), ('BX', BX), ('BY', BY), ('RAD', RAD), ('SRC', SRC)): ALL[kk].append(vv)
    LOG[rn] = dict(zone_vertices=int(zone.sum()), zone_area_cm2=round(float(TA[tri].sum()) * 1e4, 1), existing_density_p10_50_90=[round(float(x), 1) for x in np.nanpercentile(dens[zone], [10, 50, 90])],
                   new_strands=int(n_new), donors=int(len(don)), donor_len_mm_p10_50_90=[round(float(x) * 1000, 1) for x in np.percentile(dlen, [10, 50, 90])],
                   new_len_mm_p10_50_90=[round(float(np.percentile(lens, p)) * 1000, 1) for p in (10, 50, 90)] if lens else None,
                   new_lum_p10_50_90=[round(float(x), 3) for x in np.percentile(clum[SRC], [10, 50, 90])] if n_new else None)
    np.save(str(REP.with_suffix(f'.{rn}.zone.npy')), zi)
    print('REGION', rn, json.dumps(LOG[rn]), flush=True)

ids = np.concatenate(ALL['ids']); ba = np.concatenate(ALL['ba']); POS = np.concatenate(ALL['POS']); BH = np.concatenate(ALL['BH']); BX = np.concatenate(ALL['BX']); BY = np.concatenate(ALL['BY']); RAD = np.concatenate(ALL['RAD']); SRC = np.concatenate(ALL['SRC'])
n_new = len(ids); hc = bpy.data.hair_curves.new(g('object_name', 'Limb coat')); hc.add_curves([NPT] * n_new)
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
    av_ = arr(a_.data, key, w_); add_attr(a_.name, 'CURVE', a_.data_type, av_[SRC])      # one existing strand's values, exactly
for m_ in cd.materials: hc.materials.append(m_)
hc.surface = body
ob = coat.copy(); ob.data = hc; ob.name = g('object_name', 'Limb coat')
for m in list(ob.modifiers):
    if not m.name.startswith('Follow'): ob.modifiers.remove(m)
(coat.users_collection[0] if coat.users_collection else s.collection).objects.link(ob)
LOG['new_strands_total'] = int(n_new)
rig.data.pose_position = 'POSE'; bpy.context.view_layer.update()
REP.write_text(json.dumps(LOG, indent=1)); bpy.ops.wm.save_as_mainfile(filepath=OUTB, compress=True); print('LIMB saved', OUTB, n_new, flush=True)
