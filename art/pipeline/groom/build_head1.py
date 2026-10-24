"""Luceras head detail pass 1, groom side: whiskers to about the head's length, and the nose skin darkened to the pad value.

blender -b --python build_head1.py -- GROOM_IN.blend OUT_GROOM.blend REPORT.json PARAMS.json
The input (luceras-surface/furpass2/j4/groom.blend) is never written. Topology is unchanged.
"""
import bpy, sys, json, math
import numpy as np
from pathlib import Path

A = sys.argv[sys.argv.index('--') + 1:]
GIN, GOUT, REP, PARP = A[:4]
P = json.load(open(PARP)); rep = dict(input=GIN, output=GOUT, params=P)
bpy.ops.wm.open_mainfile(filepath=GIN)
def arr(items, key, n, dt=np.float32):
    x = np.empty(len(items) * n, dt); items.foreach_get(key, x); return x.reshape(-1, n) if n > 1 else x
body = bpy.data.objects['luceras_blockout']; Mb = np.array(body.matrix_world)
V = arr(body.data.vertices, 'co', 3) @ Mb[:3, :3].T + Mb[:3, 3]
rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and o.name.startswith('luceras_rig'))
Rw = np.array(rig.matrix_world); hb = rig.data.bones['head_01']
hh = (Rw @ np.r_[hb.head_local, 1])[:3]; ht = (Rw @ np.r_[hb.tail_local, 1])[:3]
ax = ht - hh; u = np.clip(((V - hh) @ ax) / (ax @ ax), 0, 1); dh = np.linalg.norm(V - (hh + u[:, None] * ax), axis=1)
head = dh < 0.07; HV = V[head]
nose = HV[np.argmin(HV[:, 1])]; rep['nose_tip'] = nose.round(4).tolist()
head_len = float(HV[:, 1].max() - HV[:, 1].min()); rep['head_length_m'] = round(head_len, 4)

# whiskers: lengths scaled so the median reaches P['whisker_head_frac'] of the head length; root radius set
wk = bpy.data.objects['Luceras white whiskers']; wd = wk.data
offs = arr(wd.curves, 'first_point_index', 1, np.int32); cnt = arr(wd.curves, 'points_length', 1, np.int32)
pos = arr(wd.attributes['position'].data, 'vector', 3); root = np.repeat(pos[offs], cnt, axis=0)
seg = np.linalg.norm(np.diff(pos, axis=0), axis=1); L = np.array([seg[o:o + c - 1].sum() for o, c in zip(offs, cnt)])
scale = P['whisker_head_frac'] * head_len / max(float(np.median(L)), 1e-6)
wd.attributes['position'].data.foreach_set('vector', (root + (pos - root) * scale).astype(np.float32).ravel())
k = np.concatenate([np.linspace(0, 1, c) for c in cnt]); r = P['whisker_root_radius_m'] * (1 - 0.8 * k)
wd.attributes['radius'].data.foreach_set('value', r.astype(np.float32))
rep['whiskers'] = dict(count=int(len(offs)), length_median_before_m=round(float(np.median(L)), 4), scale=round(scale, 3), length_median_after_m=round(float(np.median(L) * scale), 4), root_radius_mm=P['whisker_root_radius_m'] * 1000)

# nose skin: the vertices of the pad region take the pad colour (the attached pad part covers the front)
ca = body.data.attributes.get('coat_color')
if ca is not None and ca.domain == 'POINT':
    col = arr(ca.data, 'color', 4); d = np.linalg.norm(V - nose, axis=1)
    # the bare front of the muzzle block takes the white muzzle colour; the dark pad is a separate part over its centre
    sel = (d < P['nose_skin_radius_m']) & (V[:, 1] < nose[1] + P.get('block_front_m', 0.008))
    w = np.clip(1 - d / P['nose_skin_radius_m'], 0, 1) ** 0.3
    lumc = col[:, :3] @ np.array([0.2126, 0.7152, 0.0722])
    pad = np.array(P.get('block_rgb_linear') or np.median(col[lumc > np.percentile(lumc, 90), :3], axis=0), np.float32)
    col[sel, :3] = col[sel, :3] * (1 - w[sel, None]) + pad[None, :] * w[sel, None]
    ca.data.foreach_set('color', col.astype(np.float32).ravel()); rep['nose_skin_vertices'] = int(sel.sum())
# muzzle fur: the muzzle block's front carries no coat strands (bare skin read as a square block). Fill the bare front
# with short white strands appended to the interpolated coat, bound with the same triangle frame as every coat strand
# (bind_i*, bind_a..c, per-point height and offsets). Strands radiate from the nose and comb back and down; the pad
# area is left bare (the scene attaches the pad part there). The body topology is unchanged.
if P.get('muzzle_fur', 0):
    from mathutils.kdtree import KDTree
    rng = np.random.default_rng(int(P.get('muzzle_seed', 7)))
    co = arr(body.data.vertices, 'co', 3); Mi_ = np.linalg.inv(Mb); tip_l = Mi_[:3, :3] @ nose + Mi_[:3, 3]
    body.data.calc_loop_triangles(); LT = arr(body.data.loop_triangles, 'vertices', 3, np.int32)
    T = co[LT]; e = T[:, 1] - T[:, 0]; f = T[:, 2] - T[:, 0]; cr = np.cross(e, f); area = np.linalg.norm(cr, axis=1) / 2
    nrm = cr / np.maximum(np.linalg.norm(cr, axis=1, keepdims=True), 1e-12); cen = T.mean(1)
    co_ = bpy.data.objects['Luceras interpolated coat']; cd = co_.data
    offs = arr(cd.curves, 'first_point_index', 1, np.int32); cnt = arr(cd.curves, 'points_length', 1, np.int32)
    Pc = arr(cd.attributes['position'].data, 'vector', 3); roots = Pc[offs]
    dr = np.linalg.norm(roots - tip_l, axis=1); near = np.where(dr < 0.045)[0]
    kd = KDTree(len(near))
    for j, i in enumerate(near): kd.insert(roots[i].tolist(), j)
    kd.balance()
    nn = np.array([kd.find_n(roots[i].tolist(), 2)[1][2] for i in near]); spacing = float(np.median(nn))
    blk = co[(np.linalg.norm(co - tip_l, axis=1) < 0.03) & (co[:, 1] < tip_l[1] + P.get('block_depth_m', 0.006))]
    ex = (blk[:, 0].max() - blk[:, 0].min()) / 2; ez = (blk[:, 2].max() - blk[:, 2].min()) / 2; cz = (blk[:, 2].max() + blk[:, 2].min()) / 2
    dt = np.linalg.norm(cen - tip_l, axis=1)
    band = (dt > 0.02) & (dt < 0.04); rho = int(((dr > 0.02) & (dr < 0.04)).sum()) / max(float(area[band].sum()), 1e-9)
    front = np.where((dt < P.get('muzzle_radius_m', 0.03)) & (cen[:, 1] < tip_l[1] + P.get('muzzle_depth_m', 0.014)))[0]
    ncand = int(rho * area[front].sum() * P.get('muzzle_density', 1.0))
    ti = rng.choice(front, ncand, p=area[front] / area[front].sum())
    u_ = rng.random(ncand); v_ = rng.random(ncand); flip = u_ + v_ > 1; u_[flip] = 1 - u_[flip]; v_[flip] = 1 - v_[flip]
    rp = T[ti, 0] + e[ti] * u_[:, None] + f[ti] * v_[:, None]
    gap = np.array([kd.find(p.tolist())[2] for p in rp])
    pr = P.get('muzzle_pad_excl', 0.62 * 1.1)
    inpad = (((rp[:, 0] - tip_l[0]) / (ex * pr)) ** 2 + ((rp[:, 2] - (cz + P.get('pad_up_m', 0.0))) / (ez * pr)) ** 2 < 1) & (rp[:, 1] < tip_l[1] + 0.006)
    keep = (gap > P.get('muzzle_gap_frac', 1.6) * spacing) & ~inpad
    ti, rp = ti[keep], rp[keep]; n_new = len(ti)
    hx = (Mi_[:3, :3] @ hh + Mi_[:3, 3]); hxt = (Mi_[:3, :3] @ ht + Mi_[:3, 3]); ax_ = hxt - hx
    footp = hx + np.clip(((rp - hx) @ ax_) / (ax_ @ ax_), 0, 1)[:, None] * ax_
    nb = nrm[ti] * np.sign(((rp - footp) * nrm[ti]).sum(1))[:, None]          # outward normal for the strand shape
    rad = np.c_[rp[:, 0] - tip_l[0], np.zeros(n_new), rp[:, 2] - cz]; rad /= np.maximum(np.linalg.norm(rad, axis=1, keepdims=True), 1e-6)
    want = rad + np.array([0.0, P.get('muzzle_back', 0.8), 0.0]) + np.array([0.0, 0.0, -P.get('muzzle_down', 0.35)])
    tdir = want - nb * (want * nb).sum(1, keepdims=True); tdir /= np.maximum(np.linalg.norm(tdir, axis=1, keepdims=True), 1e-9)
    # sources: the nearest white strand supplies every curve attribute and the radius profile
    lum = None
    if 'coat_color' in cd.attributes:
        cc_ = arr(cd.attributes['coat_color'].data, 'color', 4); lum = cc_[near, :3] @ np.array([0.2126, 0.7152, 0.0722])
    white = near[lum > np.percentile(lum, P.get('muzzle_white_pct', 75))] if lum is not None else near
    kw = KDTree(len(white))
    for j, i in enumerate(white): kw.insert(roots[i].tolist(), j)
    kw.balance()
    src = np.array([white[kw.find(p.tolist())[1]] for p in rp])
    npts = int(cnt[src[0]]); assert (cnt[src] == npts).all()
    L0 = np.array([np.linalg.norm(np.diff(Pc[offs[i]:offs[i] + npts], axis=0), axis=1).sum() for i in src])
    Ls = L0 * P.get('muzzle_len_frac', 0.7) * rng.uniform(0.8, 1.2, n_new)
    s_ = np.linspace(0, 1, npts); lift = math.radians(P.get('muzzle_lift_deg', 28))
    pts = rp[:, None, :] + Ls[:, None, None] * (tdir[:, None, :] * (s_[None, :, None] * math.cos(lift)) + nb[:, None, :] * (math.sin(lift) * (s_ - 0.6 * s_ ** 2))[None, :, None])
    # append and bind (same frame as make_curves in build_paws_pass7.py and the coat's GN deformation)
    n0 = len(offs); p0 = len(Pc)
    keys = [(a.name, a.domain, a.data_type) for a in cd.attributes if not a.name.startswith('.') and a.name != 'position']
    old = {}
    for nm_, dom, typ in keys:
        k_ = {'FLOAT_VECTOR': 'vector', 'FLOAT_COLOR': 'color', 'FLOAT2': 'vector'}.get(typ, 'value'); w_ = {'FLOAT_VECTOR': 3, 'FLOAT_COLOR': 4, 'FLOAT2': 2}.get(typ, 1)
        dt_ = np.int32 if typ in ('INT', 'BOOLEAN') else np.float32
        if typ == 'BOOLEAN': dt_ = bool
        old[nm_] = (k_, w_, arr(cd.attributes[nm_].data, k_, w_, dt_))
    cd.add_curves([npts] * n_new)
    allpos = np.r_[Pc, pts.reshape(-1, 3)].astype(np.float32); cd.attributes['position'].data.foreach_set('vector', allpos.ravel())
    tri = LT[ti]; a0 = co[tri[:, 0]]; e_ = co[tri[:, 1]] - a0; f_ = co[tri[:, 2]] - a0
    nrm_b = np.cross(e_, f_); nrm_b /= np.linalg.norm(nrm_b, axis=1, keepdims=True); tan_b = e_ / np.linalg.norm(e_, axis=1, keepdims=True); bit_b = np.cross(nrm_b, tan_b)
    rr_ = rp - a0; d00 = (e_ * e_).sum(1); d01 = (e_ * f_).sum(1); d11 = (f_ * f_).sum(1); den = np.maximum(d00 * d11 - d01 * d01, 1e-24)
    de = (rr_ * e_).sum(1); df = (rr_ * f_).sum(1); bb = (d11 * de - d01 * df) / den; cc = (d00 * df - d01 * de) / den
    rel = pts - rp[:, None, :]
    newv = {'bind_ia': tri[:, 0], 'bind_ib': tri[:, 1], 'bind_ic': tri[:, 2], 'bind_a': 1 - bb - cc, 'bind_b': bb, 'bind_c': cc,
            'bind_height': (rel * nrm_b[:, None, :]).sum(2).ravel(), 'bind_offset_x': (rel * tan_b[:, None, :]).sum(2).ravel(),
            'bind_offset_y': (rel * bit_b[:, None, :]).sum(2).ravel()}
    pidx = (offs[src][:, None] + np.arange(npts)[None, :]).ravel()
    for nm_, dom, typ in keys:
        k_, w_, ov = old[nm_]
        if nm_ in newv:
            nv = np.asarray(newv[nm_]).reshape(-1, w_) if w_ > 1 else np.asarray(newv[nm_])
        elif dom == 'CURVE':
            nv = ov[src]
        elif nm_ == 'radius':
            nv = ov[pidx]
        else:
            nv = ov[pidx]
        full = np.concatenate([ov, nv.astype(ov.dtype)]) if w_ == 1 else np.concatenate([ov, nv.astype(ov.dtype)], 0)
        cd.attributes[nm_].data.foreach_set(k_, full.ravel())
    rep['muzzle_fur'] = dict(added=int(n_new), candidates=int(ncand), spacing_mm=round(spacing * 1000, 2), density_per_cm2=round(rho / 1e4, 1),
                             length_median_mm=round(float(np.median(Ls)) * 1000, 2), source_white_strands=int(len(white)))
bpy.ops.wm.save_as_mainfile(filepath=GOUT)
for f in ('plume_spine.npz', 'plume_build.json'):
    Path(GOUT).parent.joinpath(f).write_bytes(Path(GIN).parent.joinpath(f).read_bytes())
Path(REP).write_text(json.dumps(rep, indent=1)); print('HEAD groom done', json.dumps(rep), flush=True)
