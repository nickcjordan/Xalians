"""Luceras eye-region rebuild (stage 07 surface, appeal): rebuild the skin, lids and face fur round each eye as one
anatomical part on a saved scene of record, then save a new scene.

Spec: C:/dev/art-data/pipeline/codex-stream/luceras-eyeregion/pass1/spec.md. Base: appeal build b5 scene.blend.

What it does, per eye, in the rest pose (rig pose position REST):
  1. eye frame: eyeball centre c and radius r (eye mesh), iris axis z and up y (the ap_eye_frame empty the iris
     material is mapped in), the current skin opening TB(phi) round z found by ray casting the body;
  2. an almond margin curve theta_m(phi) on the eyeball, sized from the iris covers (upper and lower lid share of the
     iris diameter) and the iris angular radius;
  3. an angle remap of every vertex near the eye along its own meridian, so the old skin edge lands on the margin and
     vertex order is kept (no fold-overs); inside the margin the skin tucks under the eyeball surface, on the lid
     bands it lies on the eyeball at the lid thickness (the lid fold);
  4. a biharmonic fill of the radial height (distance from the eyeball centre along each vertex's fixed direction)
     between the lid bands and the untouched head outside the region (two rings fixed), then the brow line, the lid
     crease and the cheek rise as soft radial offsets. Vertex moves only: topology and every groom binding outside
     the region are unchanged;
  5. the region's old strands (coat, Eyelid rings) get radius 0; new coat strands are grown on the region's
     triangles with the groom's own frame binding (bind_ia/ib/ic, bind_a/b/c, bind_height, bind_offset_x/y), density
     matched to the cheek, length from the lid value at the margin to the neighbouring coat at the region edge, combed
     away from the eye along the tracts, curve attributes copied from the nearest coat strand just outside the region;
  6. a thin dark margin tube on the margin curve (b5's lid rim and lid band tubes are removed), and the iris radius
     set in the round-eye material so the lids cover the asked share of the iris.

Usage: blender -b BASE.blend --python eyeregion_build.py -- PARAMS.json OUT.blend REPORT.json
"""
import bpy, sys, json, math
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

A = sys.argv[sys.argv.index('--') + 1:]
P = json.loads(Path(A[0]).read_text()); OUTB = A[1]; REP = Path(A[2])
def g(k, d): return P.get(k, d)
s = bpy.context.scene
body = bpy.data.objects['luceras_blockout']; rig = bpy.data.objects['luceras_rig']
LOG = {'params': P}


def arr(items, key, n=3, dt=np.float32):
    a = np.empty(len(items) * n, dt); items.foreach_get(key, a)
    return a.reshape(-1, n) if n > 1 else a


def sst(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)


# ---- rest pose: armature at rest so mesh coordinates, bone-parented objects and the eye frames agree
rig.animation_data.action = None
for pb_ in rig.pose.bones:
    pb_.rotation_mode = 'QUATERNION'; pb_.rotation_quaternion = (1, 0, 0, 0); pb_.location = (0, 0, 0); pb_.scale = (1, 1, 1)
rig.location = (0, 0, 0); rig.rotation_euler = (0, 0, 0); rig.data.pose_position = 'REST'; bpy.context.view_layer.update()

me = body.data; Mw = np.array(body.matrix_world); Mi = np.linalg.inv(Mw)
V0 = arr(me.vertices, 'co').astype(np.float64); VW = V0 @ Mw[:3, :3].T + Mw[:3, 3]; NV = len(VW)
E = arr(me.edges, 'vertices', 2, np.int32)
gn_ = [x.name for x in body.vertex_groups]; Wt = np.zeros((NV, len(gn_)), np.float32)
for v in me.vertices:
    for gg in v.groups: Wt[v.index, gg.group] = gg.weight
DOM = np.array(gn_)[Wt.argmax(1)]; HEADM = np.isin(DOM, ['head_01', 'jaw_01'])
me.calc_loop_triangles(); LT = arr(me.loop_triangles, 'vertices', 3, np.int32)
BVH0 = BVHTree.FromPolygons([Vector(v) for v in VW.tolist()], [list(p.vertices) for p in me.polygons])
adj_cnt = np.bincount(E.ravel(), minlength=NV)


def covered(bvh, p, d):
    """A point on the eye lies under the skin when the outward ray leaves the body (exit normal along d)."""
    h_, n_, i_, dd = bvh.ray_cast(Vector(p.tolist()), Vector(d.tolist()), 0.3)
    return h_ is not None and float(np.array(n_[:]) @ d) > 0


NPH = 180; PH = np.linspace(0, 2 * math.pi, NPH, endpoint=False)


def interp_phi(F, ph):
    PHx = np.r_[PH - 2 * math.pi, PH, PH + 2 * math.pi]; return np.interp(np.mod(ph, 2 * math.pi), PHx, np.r_[F, F, F])


def eye_frame(side):
    eo = bpy.data.objects['eye_' + side]; Me = np.array(eo.matrix_world)
    EV = np.array([v.co[:] for v in eo.data.vertices]) @ Me[:3, :3].T + Me[:3, 3]; c = EV.mean(0); r = float(np.linalg.norm(EV - c, axis=1).mean())
    em = bpy.data.objects['ap_eye_frame_' + side]; M4 = np.array(em.matrix_world)
    z = M4[:3, 2] / np.linalg.norm(M4[:3, 2]); y = M4[:3, 1] - z * (M4[:3, 1] @ z); y /= np.linalg.norm(y); x = np.cross(y, z)
    # medial sign: +1 when the frame's +x points toward the head midline
    med = -np.sign(c[0]) * np.sign(x[0])
    co = bpy.data.objects.get('surface_cornea_eye_' + side); CV = None
    if co is not None:
        Mc = np.array(co.matrix_world); CV = np.array([v.co[:] for v in co.data.vertices]) @ Mc[:3, :3].T + Mc[:3, 3]
    return dict(c=c, r=r, x=x, y=y, z=z, med=float(med), CV=CV, em_origin=M4[:3, 3])


def dirs(F, th, ph):
    return (np.outer(np.cos(th), F['z']) + (np.outer(np.cos(ph), F['x']) + np.outer(np.sin(ph), F['y'])) * np.sin(th)[:, None])


def old_opening(F):
    """TB(phi): first angle from the iris axis at which the eyeball surface is covered by skin."""
    TB = np.zeros(NPH)
    for i, ph in enumerate(PH):
        tb = math.radians(100)
        for tdeg in np.arange(0, 100, 0.25):
            t = math.radians(tdeg); d = dirs(F, np.array([t]), np.array([ph]))[0]
            if covered(BVH0, F['c'] + d * F['r'] * 1.01, d): tb = t; break
        TB[i] = tb
    k = 3; return np.array([np.mean(TB[[(i + j) % NPH for j in range(-k, k + 1)]]) for i in range(NPH)])


def almond(F):
    """Margin curve: radius rho_m(phi) (projected, in eyeball radii) of an almond round the iris centre, and the
    curve itself as points in the projected plane. x is toward the outer corner here (sign fixed per eye)."""
    ti = math.radians(g('iris_deg', 42.0)); Ri = math.sin(ti)
    yu = Ri * (1 - 2 * g('upper_cover', 0.15)); yl = -Ri * (1 - 2 * g('lower_cover', 0.08))
    hw = g('aspect', 1.45) * (yu - yl) / 2
    yin, yout = g('inner_canthus_y', -0.10) * Ri, g('outer_canthus_y', 0.02) * Ri
    xs = np.linspace(-1, 1, 401)                     # -1 inner corner, +1 outer corner
    base = yin + (yout - yin) * (xs + 1) / 2
    pk_u = g('upper_peak_x', -0.08); pk_l = g('lower_peak_x', 0.12)
    def bell(xs_, pk, pw):
        # 1 at the peak, 0 at both corners, skewed so the maximum sits at pk
        t = np.where(xs_ < pk, (xs_ - pk) / (1 + pk), (xs_ - pk) / (1 - pk)); return np.clip(1 - t * t, 0, 1) ** pw
    up = base + (yu - (yin + (yout - yin) * (pk_u + 1) / 2)) * bell(xs, pk_u, g('upper_pow', 0.75))
    lo = base + (yl - (yin + (yout - yin) * (pk_l + 1) / 2)) * bell(xs, pk_l, g('lower_pow', 0.85))
    X = xs * hw; poly = np.r_[np.c_[X, up], np.c_[X[::-1], lo[::-1]]]
    return poly, dict(Ri=Ri, yu=yu, yl=yl, hw=hw, ti=ti)


def poly_rho(poly, ph_local):
    """Radius of the polygon (star-shaped about the origin) along direction ph (projected plane)."""
    ang = np.arctan2(poly[:, 1], poly[:, 0]); rad = np.linalg.norm(poly, axis=1); o = np.argsort(ang)
    ax = np.r_[ang[o] - 2 * math.pi, ang[o], ang[o] + 2 * math.pi]; rx = np.r_[rad[o], rad[o], rad[o]]
    return np.interp(np.mod(ph_local + math.pi, 2 * math.pi) - math.pi, ax, rx)


# ---- per eye geometry
EYES = {}
for side in ('l', 'r'):
    F = eye_frame(side); F['TB'] = old_opening(F)
    poly, info = almond(F)
    # frame x toward the outer corner: flip the polygon's x when +x points medially
    poly_f = poly.copy(); poly_f[:, 0] *= -F['med']
    rho = poly_rho(poly_f, PH); F['TM'] = np.arcsin(np.clip(rho, 0, 0.995)); F['poly'] = poly_f; F['info'] = info
    EYES[side] = F
    LOG['eye_' + side] = dict(c=F['c'].round(4).tolist(), r_mm=round(F['r'] * 1000, 2), iris_axis=F['z'].round(3).tolist(), medial_sign=F['med'],
                              old_edge_deg=[round(math.degrees(F['TB'].min()), 1), round(math.degrees(F['TB'].max()), 1)],
                              margin_deg=[round(math.degrees(F['TM'].min()), 1), round(math.degrees(F['TM'].max()), 1)],
                              almond=dict(iris_deg=g('iris_deg', 42.0), half_width_r=round(info['hw'], 3), upper_r=round(info['yu'], 3), lower_r=round(info['yl'], 3)))

# ---- shared helpers: scalar biharmonic fill on the mesh graph (uniform Laplacian, CG on the normal equations)
def biharmonic(vals, free, rings=3, iters=6000):
    """vals: per-vertex scalar (known everywhere it is fixed); free: mask of unknowns. Returns the filled field."""
    S = free.copy()
    for _ in range(rings):
        m = S[E[:, 0]] | S[E[:, 1]]; S[E[m].ravel()] = True
    sid = np.where(S)[0]; loc = -np.ones(NV, np.int64); loc[sid] = np.arange(len(sid))
    Es = E[S[E[:, 0]] & S[E[:, 1]]]; a_, b_ = loc[Es[:, 0]], loc[Es[:, 1]]; deg = np.bincount(np.r_[a_, b_], minlength=len(sid)).astype(float)
    def Lap(x):
        return deg * x - (np.bincount(a_, weights=x[b_], minlength=len(sid)) + np.bincount(b_, weights=x[a_], minlength=len(sid)))
    v = vals[sid].astype(float); fm = free[sid]
    xk = np.where(fm, 0.0, v); bvec = -Lap(Lap(xk))[fm]
    def Mv(xf):
        z_ = np.zeros(len(sid)); z_[fm] = xf; return Lap(Lap(z_))[fm]
    x = v[fm].copy(); rres = bvec - Mv(x); pdir = rres.copy(); rs = rres @ rres; b2 = bvec @ bvec; it = 0; rn = rs
    for it in range(iters):
        Ap = Mv(pdir); al = rs / (pdir @ Ap); x += al * pdir; rres -= al * Ap; rn = rres @ rres
        if rn < 1e-24 * max(b2, 1e-30): break
        pdir = rres + (rn / rs) * pdir; rs = rn
    out = vals.astype(float).copy(); out[sid[fm]] = x
    return out, it


NEW = VW.copy(); SVAL = np.full(NV, np.nan); PHV = np.zeros(NV)
for side, F in EYES.items():
    c, r, z = F['c'], F['r'], F['z']
    q = VW - c; rho0 = np.linalg.norm(q, axis=1); u0 = q / np.maximum(rho0[:, None], 1e-12)
    th0 = np.arccos(np.clip(u0 @ z, -1, 1)); ph0 = np.mod(np.arctan2(u0 @ F['y'], u0 @ F['x']), 2 * math.pi)
    P0 = c + z * r
    sideok = HEADM & (np.sign(VW[:, 0]) == np.sign(c[0])) & (np.abs(VW[:, 0]) > g('midline_keep_m', 0.008))
    reg = sideok & (np.linalg.norm(VW - P0, axis=1) < g('region_m', 0.040)) & (rho0 < r * g('region_rho', 1.9)) & (rho0 > r * 0.5)
    inside_old = reg & (th0 < interp_phi(F['TB'], ph0))
    # 1. skull: the head surface with no eye, a biharmonic fill of the radial height (from the old eye centre, along
    #    each vertex's own direction) over the whole region, the outer rings fixed
    rho_s, it_s = biharmonic(rho0, reg)
    SK = c + u0 * rho_s[:, None]
    # 2. seat: the eye moves in along its axis until the cornea apex stands proud_m above the skull surface
    axis_n = reg & (th0 < math.radians(8)); rho_axis = float(np.median(rho_s[axis_n])) if axis_n.any() else r
    d_seat = max(float(np.clip(r - rho_axis - g('proud_m', 0.0015), 0.0, g('seat_max_m', 0.006))) * g('seat_k', 1.0), g('seat_min_m', 0.0))
    c2 = c - z * d_seat
    for on in ('eye_' + side, 'surface_cornea_eye_' + side, 'ap_eye_frame_' + side):
        ob = bpy.data.objects[on]
        if ob.type == 'MESH':
            Mo = np.array(ob.matrix_world); dlo = np.linalg.inv(Mo[:3, :3]) @ (-z * d_seat)
            for vv in ob.data.vertices: vv.co = (np.array(vv.co[:]) + dlo).tolist()
        else:
            mw_ = ob.matrix_world.copy(); mw_.translation = Vector((np.array(mw_.translation[:]) - z * d_seat).tolist()); ob.matrix_world = mw_
    if F['CV'] is not None: F['CV'] = F['CV'] - z * d_seat
    LOG['eye_' + side].update(skull_axis_height_mm=round((rho_axis - r) * 1000, 2), seat_in_mm=round(d_seat * 1000, 2), skull_cg_iterations=it_s)
    # 3. parameters about the seated eye: every region vertex's skull point seen from c2
    qs = SK - c2; rs_ = np.linalg.norm(qs, axis=1); us = qs / np.maximum(rs_[:, None], 1e-12)
    th1 = np.arccos(np.clip(us @ z, -1, 1)); ph1 = np.mod(np.arctan2(us @ F['y'], us @ F['x']), 2 * math.pi)
    # old opening edge in these parameters: between the inside-cap vertices and the rest, per angle bin
    nb = 72; bins = (ph1 / (2 * math.pi) * nb).astype(int) % nb; TB1 = np.zeros(nb)
    for k in range(nb):
        mi = inside_old & (bins == k); mo = reg & ~inside_old & (bins == k)
        a_ = np.percentile(th1[mi], 95) if mi.sum() > 3 else np.nan; b_ = np.percentile(th1[mo], 2) if mo.sum() > 3 else np.nan
        TB1[k] = np.nanmean([a_, b_])
    TB1 = np.where(np.isnan(TB1), np.nanmean(TB1), TB1); TB1 = np.array([np.mean(TB1[[(i + j) % nb for j in range(-2, 3)]]) for i in range(nb)])
    PHb = (np.arange(nb) + 0.5) / nb * 2 * math.pi
    TBv = np.interp(ph1, np.r_[PHb - 2 * math.pi, PHb, PHb + 2 * math.pi], np.r_[TB1, TB1, TB1])
    TMv = interp_phi(F['TM'], ph1)
    Tmap = np.maximum(TBv, TMv) + math.radians(g('remap_span_deg', 28))
    # the remap must end inside the region: clamp Tmap per angle bin below the nearest fixed (non-region) vertex
    qo = VW - c2; ro_ = np.linalg.norm(qo, axis=1); uo = qo / np.maximum(ro_[:, None], 1e-12)
    tho = np.arccos(np.clip(uo @ z, -1, 1)); pho = np.mod(np.arctan2(uo @ F['y'], uo @ F['x']), 2 * math.pi)
    outside = ~reg & (ro_ < r * 1.6) & (ro_ > r * 1.0) & (tho < math.radians(100)) & (np.sign(VW[:, 0]) == np.sign(c[0]))
    ob_ = (pho[outside] / (2 * math.pi) * nb).astype(int) % nb; TE = np.full(nb, math.radians(100))
    np.minimum.at(TE, ob_, tho[outside])
    TE = np.array([np.min(TE[[(i + j) % nb for j in range(-2, 3)]]) for i in range(nb)])
    TEv = np.interp(ph1, np.r_[PHb - 2 * math.pi, PHb, PHb + 2 * math.pi], np.r_[TE, TE, TE])
    Tmap = np.maximum(np.minimum(Tmap, TEv - math.radians(g('edge_keep_deg', 3.0))), np.maximum(TBv, TMv) + math.radians(2.0))
    LOG['eye_' + side]['remap_end_deg'] = [round(float(np.degrees(np.min(Tmap[reg]))), 1), round(float(np.degrees(np.max(Tmap[reg]))), 1)]
    zone = reg & (th1 < Tmap)
    # separate edges for the two sides of the old opening, so neither side collapses onto the margin: the outermost
    # inside vertex lands just inside the margin, the innermost outside vertex on it (that row becomes the margin ring)
    TI = np.full(nb, np.nan); TO = np.full(nb, np.nan)
    for k in range(nb):
        mi = inside_old & (bins == k); mo = reg & ~inside_old & (bins == k)
        if mi.any(): TI[k] = th1[mi].max()
        if mo.any(): TO[k] = th1[mo].min()
    TI = np.where(np.isnan(TI), np.nanmedian(TI), TI); TO = np.where(np.isnan(TO), np.nanmedian(TO), TO)
    TI = np.array([np.max(TI[[(i + j) % nb for j in (-1, 0, 1)]]) for i in range(nb)]); TO = np.array([np.min(TO[[(i + j) % nb for j in (-1, 0, 1)]]) for i in range(nb)])
    TIv = np.interp(ph1, np.r_[PHb - 2 * math.pi, PHb, PHb + 2 * math.pi], np.r_[TI, TI, TI]); TOv = np.interp(ph1, np.r_[PHb - 2 * math.pi, PHb, PHb + 2 * math.pi], np.r_[TO, TO, TO])
    Tmap = np.maximum(Tmap, TOv + math.radians(2.0))
    snap_a = g('snap_m', 0.0007) / r
    th2 = np.where(inside_old, np.minimum(th1, TIv) * (TMv - snap_a) / np.maximum(TIv, 1e-6),
                   TMv + np.clip(th1 - TOv, 0, None) * (Tmap - TMv) / np.maximum(Tmap - TOv, 1e-6))
    th2 = np.where(zone, th2, th1)
    # 4. relax the zone's parameters (azimuthal-equidistant plane round the iris axis): even spacing, no crumples;
    #    inside vertices stay inside, outside vertices outside, the nearest row snaps onto the margin
    Pp = np.c_[th2 * np.cos(ph1), th2 * np.sin(ph1)]
    zid = np.where(zone)[0]; inn = inside_old[zid]
    snap_m = g('snap_m', 0.0007) / r
    sarc0 = th2[zid] - TMv[zid]; snap = np.abs(sarc0) < snap_m
    Ez = E[zone[E[:, 0]] | zone[E[:, 1]]]; cntv = np.bincount(Ez.ravel(), minlength=NV).astype(float)
    for itr in range(int(g('relax_iters', 60))):
        sm = np.zeros((NV, 2)); np.add.at(sm, Ez[:, 0], Pp[Ez[:, 1]]); np.add.at(sm, Ez[:, 1], Pp[Ez[:, 0]])
        avg = sm[zid] / np.maximum(cntv[zid, None], 1); Pz = Pp[zid] * 0.5 + avg * 0.5
        tz = np.linalg.norm(Pz, axis=1); pz = np.arctan2(Pz[:, 1], Pz[:, 0]); tmz = interp_phi(F['TM'], pz)
        tz = np.where(snap, tmz, np.where(inn, np.minimum(tz, tmz - snap_m), np.maximum(tz, tmz + snap_m)))
        Pp[zid] = np.c_[tz * np.cos(pz), tz * np.sin(pz)]
    th3 = np.where(zone, np.linalg.norm(Pp, axis=1), th1); ph3 = np.where(zone, np.mod(np.arctan2(Pp[:, 1], Pp[:, 0]), 2 * math.pi), ph1)
    TM3 = interp_phi(F['TM'], ph3); sarc = (th3 - TM3) * r
    # 5. heights: inside the margin the skin tucks under the eyeball; the lid lies on the eyeball at its thickness;
    #    past the lid band the skin blends to the skull surface (seen along the same direction from c2)
    sp = np.sin(ph3); up_w = np.clip(sp, 0, 1); lo_w = np.clip(-sp, 0, 1)
    band = g('band_up_m', 0.0040) * up_w ** 0.7 + g('band_lo_m', 0.0030) * lo_w ** 0.7 + g('band_corner_m', 0.0018) * (1 - np.maximum(up_w, lo_w) ** 0.7)
    tmax = g('lid_t_up_m', 0.0014) * up_w + g('lid_t_lo_m', 0.0011) * lo_w + g('lid_t_corner_m', 0.0008) * (1 - up_w - lo_w).clip(0, 1)
    gap = g('margin_gap_m', 0.00025); rr = g('margin_round_m', 0.0009)
    t_lid = gap + (tmax - gap) * (1 - (1 - np.clip(sarc / rr, 0, 1)) ** 2)
    rho_in = r + gap - g('tuck_m', 0.0022) * sst(0, g('tuck_len_m', 0.0012), -sarc)
    dn = dirs(F, th3, ph3)
    # skull height along the new directions: ray cast from c2 against the skull-filled body
    SKB = VW.copy(); SKB[reg] = SK[reg]
    bvh_s = BVHTree.FromPolygons([Vector(v) for v in SKB.tolist()], [list(pp.vertices) for pp in me.polygons])
    rho_sk = np.full(NV, np.nan)
    for i in np.where(zone)[0]:
        h_, n_, fi_, dd_ = bvh_s.ray_cast(Vector(c2.tolist()), Vector(dn[i].tolist()), r * 2.0)
        rho_sk[i] = dd_ if h_ is not None else rs_[i]
    blend = g('blend_m', 0.006)
    w = sst(0.0, blend, sarc - band)
    rho_out = (r + tmax) * (1 - w) + np.nan_to_num(rho_sk, nan=r) * w
    newrho = np.where(sarc < 0, rho_in, np.where(sarc <= band, r + t_lid, rho_out))
    Pz = c2 + dn * newrho[:, None]
    NEW[zone] = Pz[zone]
    outer = reg & ~zone
    NEW[outer] = SK[outer]
    # 6. anatomy: brow line, upper lid crease, cheek rise (radial from c2), fading to nothing at the region edge
    ids = np.where(reg)[0]; q2 = NEW[ids] - c2; n2 = np.linalg.norm(q2, axis=1); u2 = q2 / n2[:, None]
    sa_ = sarc[ids].copy(); up_ = up_w[ids].copy(); lo_ = lo_w[ids].copy()
    o_ = ~zone[ids]
    if o_.any():
        t_o = np.arccos(np.clip(u2[o_] @ z, -1, 1)); p_o = np.mod(np.arctan2(u2[o_] @ F['y'], u2[o_] @ F['x']), 2 * math.pi)
        sa_[o_] = (t_o - interp_phi(F['TM'], p_o)) * r; up_[o_] = np.clip(np.sin(p_o), 0, 1); lo_[o_] = np.clip(-np.sin(p_o), 0, 1)
    bnd_up = g('band_up_m', 0.0040)
    brow = g('brow_m', 0.0012) * np.exp(-((sa_ - g('brow_at_m', 0.013)) / g('brow_w_m', 0.007)) ** 2) * up_ ** 1.5
    crease = -g('crease_m', 0.0007) * np.exp(-((sa_ - bnd_up - g('crease_at_m', 0.0015)) / g('crease_w_m', 0.0016)) ** 2) * up_ ** 2
    cheek = g('cheek_m', 0.0008) * np.exp(-((sa_ - g('cheek_at_m', 0.010)) / g('cheek_w_m', 0.007)) ** 2) * lo_ ** 1.5
    dPv = np.linalg.norm(VW[ids] - P0, axis=1); fade = 1 - sst(g('region_m', 0.040) * 0.6, g('region_m', 0.040) * 0.92, dPv)
    fade = fade * (sa_ > 0)
    NEW[ids] = c2 + u2 * (n2 + (brow + crease + cheek) * fade)[:, None]
    SVAL[ids] = sa_; PHV[ids] = ph3[ids]
    con = zone & (sarc <= band)
    F['c_old'] = c; F['c'] = c2; F['P0'] = P0; F['con'] = con; F['free'] = reg & ~con; F['reg'] = reg
    LOG['eye_' + side].update(region_vertices=int(reg.sum()), zone_vertices=int(zone.sum()), lid_band_vertices=int(con.sum()), snapped=int(snap.sum()))

# ---- region edge: past the lid bands the rebuilt skin eases back onto the untouched head over edge_blend_m, so the
#      region's border (the medial strip by the blaze above all) has no crease
if g('edge_blend_m', 0.0) > 0:
    regall = np.zeros(NV, bool); bandall = np.zeros(NV, bool)
    for F in EYES.values(): regall |= F['reg']; bandall |= F['con']
    ring2 = np.zeros(NV, bool); me2 = regall[E[:, 0]] != regall[E[:, 1]]; ring2[E[me2].ravel()] = True; ring2 &= ~regall
    rid2 = np.where(ring2)[0]; kd2 = KDTree(len(rid2))
    for j, i in enumerate(rid2): kd2.insert(VW[i].tolist(), j)
    kd2.balance(); ids2 = np.where(regall & ~bandall)[0]
    de2 = np.array([kd2.find(VW[i].tolist())[2] for i in ids2]); w2_ = sst(0.0, g('edge_blend_m', 0.006), de2)
    NEW[ids2] = VW[ids2] + (NEW[ids2] - VW[ids2]) * w2_[:, None]
    LOG['edge_blend_vertices'] = int((w2_ < 0.99).sum())

# ---- Taubin smoothing of the free skin (past the lid bands): even triangles, no streaks or creases; the lid bands,
#      the margin ring and everything outside the region stay fixed
fr_all = np.zeros(NV, bool)
for F in EYES.values():
    fr_all |= F['free']
    # the lid bands are smoothed too, all but the margin ring and the first lid row (sarc under band_keep_m)
    fr_all |= F['con'] & (np.nan_to_num(SVAL, nan=-1.0) > g('band_keep_m', 0.0012))
Ef = E[fr_all[E[:, 0]] | fr_all[E[:, 1]]]; cf = np.bincount(Ef.ravel(), minlength=NV).astype(float); fid = np.where(fr_all)[0]
# tangential relax first: each free vertex slides along the skin toward its neighbours' centre (the normal part of
# the move is dropped), which evens out the sliver triangles the corner remap leaves without changing the shape
for it_ in range(int(g('tang_iters', 0))):
    Tn_ = NEW[LT]; fn_ = np.cross(Tn_[:, 1] - Tn_[:, 0], Tn_[:, 2] - Tn_[:, 0]); vn_ = np.zeros((NV, 3))
    for j_ in range(3): np.add.at(vn_, LT[:, j_], fn_)
    vn_ = vn_[fid] / np.maximum(np.linalg.norm(vn_[fid], axis=1, keepdims=True), 1e-15)
    sm = np.zeros((NV, 3)); np.add.at(sm, Ef[:, 0], NEW[Ef[:, 1]]); np.add.at(sm, Ef[:, 1], NEW[Ef[:, 0]])
    mv_ = sm[fid] / np.maximum(cf[fid, None], 1) - NEW[fid]; mv_ = mv_ - vn_ * np.einsum('ij,ij->i', mv_, vn_)[:, None]
    NEW[fid] = NEW[fid] + g('tang_step', 0.5) * mv_
for it_ in range(int(g('taubin_iters', 30))):
    for lam in (0.5, -0.53):
        sm = np.zeros((NV, 3)); np.add.at(sm, Ef[:, 0], NEW[Ef[:, 1]]); np.add.at(sm, Ef[:, 1], NEW[Ef[:, 0]])
        avg = sm[fid] / np.maximum(cf[fid, None], 1); NEW[fid] = NEW[fid] + lam * (avg - NEW[fid])
LOG['taubin_vertices'] = int(len(fid))

# ---- write the body (vertex moves only)
dl = (NEW - VW) @ np.linalg.inv(Mw[:3, :3]).T
for v_, c_ in zip(me.vertices, V0 + dl): v_.co = c_.tolist()
me.update(); bpy.context.view_layer.update()
moved = np.linalg.norm(NEW - VW, axis=1) > 1e-6
VN = arr(me.vertices, 'normal').astype(np.float64) @ Mw[:3, :3].T
LOG['moved_vertices'] = int(moved.sum())
# fold check: region triangles whose normal turned more than 90 (fold) or 60 degrees (steep) from the b5 normal, by
# sector round each eye (sector 0 = toward +x of the eye frame, counted anticlockwise in eighths) and margin distance
def _tn(P_):
    T_ = P_[LT]; n_ = np.cross(T_[:, 1] - T_[:, 0], T_[:, 2] - T_[:, 0]); return n_ / np.maximum(np.linalg.norm(n_, axis=1, keepdims=True), 1e-15)
_d = np.einsum('ij,ij->i', _tn(VW), _tn(NEW)); FOLD = {}
for side, F in EYES.items():
    tm = F['reg'][LT].all(1); ph_t = PHV[LT[:, 0]]; sa_t = SVAL[LT[:, 0]]; out_ = {}
    for sct in range(8):
        m_ = tm & (((ph_t / (2 * math.pi) * 8).astype(int) % 8) == sct)
        out_[sct] = dict(tris=int(m_.sum()), folded=int((m_ & (_d < 0)).sum()), steep=int((m_ & (_d < 0.5)).sum()),
                         folded_s_mm=[round(float(x) * 1000, 1) for x in np.percentile(sa_t[m_ & (_d < 0)], [10, 50, 90])] if (m_ & (_d < 0)).sum() > 2 else None)
    FOLD[side] = out_; F['medial_sectors'] = [k_ for k_ in range(8) if F['med'] * math.cos((k_ + 0.5) * math.pi / 4) > 0.3]
LOG['fold_check'] = FOLD

# ---- lid margin tube (thin, dark), replaces b5's lid rim and lid band tubes
for nm in ('head_lid_rim_l', 'head_lid_rim_r', 'head_lid_band_l', 'head_lid_band_r', 'head_upper_lid_l', 'head_upper_lid_r'):
    o_ = bpy.data.objects.get(nm)
    if o_ is not None: bpy.data.objects.remove(o_)
lidm = bpy.data.materials.get('Head p1 dark lid rim')
if lidm is None:
    lidm = bpy.data.materials.new('Head p1 dark lid rim'); lidm.use_nodes = True
bs_ = lidm.node_tree.nodes.get('Principled BSDF'); bs_.inputs['Base Color'].default_value = list(g('margin_rgb', [0.018, 0.016, 0.015])) + [1]
bs_.inputs['Roughness'].default_value = 0.55


def add_tube(name, path, wa, wb, sa, sb, m_, nseg=10):
    Vt, Ft = [], []; n_ = len(path)
    for i in range(n_):
        for j in range(nseg):
            ps = 2 * math.pi * j / nseg; Vt.append(path[i] + sa[i] * math.cos(ps) * wa + sb[i] * math.sin(ps) * wb)
    for i in range(n_):
        for j in range(nseg):
            i2 = (i + 1) % n_; Ft.append([i * nseg + j, i * nseg + (j + 1) % nseg, i2 * nseg + (j + 1) % nseg, i2 * nseg + j])
    mt = bpy.data.meshes.new(name); mt.from_pydata([[float(x) for x in v] for v in Vt], [], Ft); mt.update()
    for p_ in mt.polygons: p_.use_smooth = True
    o_ = bpy.data.objects.new(name, mt); s.collection.objects.link(o_); mt.materials.append(m_)
    o_.parent = rig; o_.parent_type = 'BONE'; o_.parent_bone = 'head_01'; bpy.context.view_layer.update()
    o_.matrix_world = Matrix.Identity(4); return o_


for side, F in EYES.items():
    c, r = F['c'], F['r']; TM = F['TM']; path, sa, sb = [], [], []
    for i, ph in enumerate(PH):
        d = dirs(F, np.array([TM[i]]), np.array([ph]))[0]; d2 = dirs(F, np.array([TM[i] + 0.01]), np.array([ph]))[0]
        tn = d2 - d; tn /= np.linalg.norm(tn)
        path.append(c + d * (r + g('margin_gap_m', 0.00025) + g('margin_h_m', 0.0003) * 0.5)); sa.append(tn); sb.append(d)
    add_tube('eyeregion_lid_margin_' + side, path, g('margin_w_m', 0.0007) / 2, g('margin_h_m', 0.0003), sa, sb, lidm)
    F['margin_path'] = np.array(path)

# ---- iris radius: the round-eye material's map ranges are rebuilt for the new iris angle
ti_old = math.radians(g('iris_deg_old', 34.0)); tp_old = ti_old * g('pupil_frac_old', 0.5)
ti = math.radians(g('iris_deg', 42.0)); tp = ti * g('pupil_frac', 0.5); nmr = 0
for side in ('l', 'r'):
    m_ = bpy.data.materials.get('Appeal round eye ' + side)
    if m_ is None: continue
    for n_ in m_.node_tree.nodes:
        if n_.bl_idname != 'ShaderNodeMapRange': continue
        a0, a1 = n_.inputs['From Min'].default_value, n_.inputs['From Max'].default_value
        for (o0, o1), (n0, n1) in (((tp_old - 0.015, tp_old + 0.015), (tp - 0.015, tp + 0.015)), ((tp_old, ti_old), (tp, ti)), ((ti_old - 0.09, ti_old - 0.01), (ti - 0.09, ti - 0.01))):
            if abs(a0 - o0) < 1e-4 and abs(a1 - o1) < 1e-4:
                n_.inputs['From Min'].default_value = n0; n_.inputs['From Max'].default_value = n1; nmr += 1
LOG['iris_map_ranges_updated'] = nmr

# ---- fur: switch off the region's old strands, grow new coat strands bound to the region's triangles
regv = np.zeros(NV, bool)
for F in EYES.values(): regv |= F['con'] | F['free']
regv_tri = regv[LT].any(1)
# region edge: head vertices just outside the region (one ring), for donor choice, edge blends and the skin colour
ring = np.zeros(NV, bool); me_e = regv[E[:, 0]] != regv[E[:, 1]]; ring[E[me_e].ravel()] = True; ring &= ~regv
ring_ids = np.where(ring)[0]; kdr = KDTree(len(ring_ids))
for j, i in enumerate(ring_ids): kdr.insert(VW[i].tolist(), j)
kdr.balance()
# skin under the region's fur takes the colour of the nearest skin just outside the region (no darker ring)
sca = body.data.attributes.get('coat_color')
if sca is not None and sca.domain == 'POINT' and g('skin_match', 0) == 1:
    scol = arr(sca.data, 'color', 4)
    for i in np.where(regv)[0]: scol[i] = scol[ring_ids[kdr.find(NEW[i].tolist())[1]]]
    sca.data.foreach_set('color', scol.astype(np.float32).ravel()); LOG['skin_colour_matched_vertices'] = int(regv.sum())
coat = bpy.data.objects['Luceras interpolated coat']
off = {}
for o_ in [o for o in s.objects if o.type == 'CURVES' and (o.name.startswith('Luceras interpolated') or o.name.startswith('Eyelid'))]:
    d_ = o_.data; ia = arr(d_.attributes['bind_ia'].data, 'value', 1, np.int32); ib = arr(d_.attributes['bind_ib'].data, 'value', 1, np.int32); ic = arr(d_.attributes['bind_ic'].data, 'value', 1, np.int32)
    hit = regv[ia] | regv[ib] | regv[ic]
    if not hit.any(): continue
    offs = arr(d_.curves, 'first_point_index', 1, np.int32); cnt = arr(d_.curves, 'points_length', 1, np.int32)
    cid = np.repeat(np.arange(len(offs)), cnt); rad = arr(d_.attributes['radius'].data, 'value', 1)
    rad[hit[cid]] = 0.0; d_.attributes['radius'].data.foreach_set('value', rad.astype(np.float32)); off[o_.name] = int(hit.sum())
# the groom's Eyelid ring strands belong to the old eye opening: with the region regrown they are all switched off
if g('hide_eyelid_rings', 1):
    for o_ in [o for o in s.objects if o.type == 'CURVES' and o.name.startswith('Eyelid')]:
        if not o_.hide_render: off[o_.name + ' (whole object hidden)'] = len(o_.data.curves)
        o_.hide_render = True
LOG['strands_switched_off'] = off

# donors: visible coat strands rooted just outside the region (old rest positions; outside the region nothing moved)
cd = coat.data
cia = arr(cd.attributes['bind_ia'].data, 'value', 1, np.int32); cib = arr(cd.attributes['bind_ib'].data, 'value', 1, np.int32); cic = arr(cd.attributes['bind_ic'].data, 'value', 1, np.int32)
cba = np.stack([arr(cd.attributes['bind_' + k].data, 'value', 1) for k in 'abc'], 1)
croot = (VW[np.stack([cia, cib, cic], 1)] * cba[:, :, None]).sum(1)
coffs = arr(cd.curves, 'first_point_index', 1, np.int32); ccnt = arr(cd.curves, 'points_length', 1, np.int32)
crad = arr(cd.attributes['radius'].data, 'value', 1)
CH = arr(cd.attributes['bind_height'].data, 'value', 1); CX = arr(cd.attributes['bind_offset_x'].data, 'value', 1); CY = arr(cd.attributes['bind_offset_y'].data, 'value', 1)
near_any = np.zeros(len(croot), bool)
for F in EYES.values(): near_any |= np.linalg.norm(croot - F['P0'], axis=1) < g('region_m', 0.040) + 0.02
cvis = crad[coffs] > 0
donor = np.where(near_any & cvis & ~(regv[cia] | regv[cib] | regv[cic]) & (ccnt == 9))[0]
kd = KDTree(len(donor))
for j, i in enumerate(donor): kd.insert(croot[i].tolist(), j)
kd.balance()
LOG['donor_pool'] = int(len(donor))
# pattern donors: every coat strand (switched-off ones included) at its old root on the old surface; a new strand
# takes the colour attributes of the old strand nearest its own root mapped back onto the old surface (same triangle,
# same barycentric weights), so the coat pattern (blaze edge, brow) stays where the groom put it on the skin
pat = np.where(near_any & (ccnt == 9))[0]
kdp = KDTree(len(pat))
for j, i in enumerate(pat): kdp.insert(croot[i].tolist(), j)
kdp.balance()
if sca is not None and sca.domain == 'POINT' and g('skin_match', 0) == 2:
    # skin under the region's fur takes the colour of the coat strand nearest it on the old surface
    scol = arr(sca.data, 'color', 4); ccol = arr(cd.attributes['coat_color'].data, 'color', 4)
    for i in np.where(regv)[0]: scol[i, :3] = ccol[pat[kdp.find(VW[i].tolist())[1]], :3] * g('skin_k', 1.0)
    if g('skin_k', 1.0) and g('skin_smooth', 0):
        # smoothed: the mean of the colour_k nearest coat strands, the cheek grey floor, then a few neighbour passes
        ridx = np.where(regv)[0]; kk = int(g('colour_k', 16))
        for i in ridx: scol[i, :3] = ccol[pat[[x_[1] for x_ in kdp.find_n(VW[i].tolist(), kk)]], :3].mean(0)
        lumd = ccol[donor, :3] @ np.array([0.2126, 0.7152, 0.0722]); gref = float(np.median(lumd[lumd < np.percentile(lumd, 60)]))
        lum_ = scol[ridx, :3] @ np.array([0.2126, 0.7152, 0.0722]); low = lum_ < gref
        scol[ridx[low], :3] *= (gref / np.maximum(lum_[low], 1e-6))[:, None]
        Er = E[regv[E[:, 0]] & regv[E[:, 1]]]; cr_ = np.bincount(Er.ravel(), minlength=NV).astype(float)
        for _ in range(int(g('skin_smooth', 0))):
            sm = np.zeros((NV, 4)); np.add.at(sm, Er[:, 0], scol[Er[:, 1]]); np.add.at(sm, Er[:, 1], scol[Er[:, 0]])
            m_ = cr_ > 0; scol[m_ & regv] = 0.5 * scol[m_ & regv] + 0.5 * sm[m_ & regv] / cr_[m_ & regv, None]
    sca.data.foreach_set('color', scol.astype(np.float32).ravel()); LOG['skin_colour_from_coat_vertices'] = int(regv.sum())


def tri_frame(Va, Vb, Vc):
    e_ = Vb - Va; f_ = Vc - Va; n_ = np.cross(e_, f_); n_ /= np.linalg.norm(n_, axis=-1, keepdims=True)
    t_ = e_ / np.linalg.norm(e_, axis=-1, keepdims=True); b_ = np.cross(n_, t_); return n_, t_, b_


# body-local coordinates (the follow node group samples the body in its own space)
NL = V0 + dl; VL_old = V0
rng = np.random.default_rng(int(g('seed', 7)))
new_curves = []
dens = g('density_per_cm2', 70.0)
for side, F in EYES.items():
    c, r = F['c'], F['r']
    tri = np.where((F['con'] | F['free'])[LT].any(1))[0]
    T = NEW[LT[tri]]; area = np.linalg.norm(np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]), axis=1) / 2
    cen = T.mean(1); qc = cen - c; uc = qc / np.linalg.norm(qc, axis=1, keepdims=True)
    thc = np.arccos(np.clip(uc @ F['z'], -1, 1)); phc = np.mod(np.arctan2(uc @ F['y'], uc @ F['x']), 2 * math.pi)
    sc_ = (thc - interp_phi(F['TM'], phc)) * r
    ok = sc_ > g('root_min_s_m', 0.0003)
    tri = tri[ok]; area = area[ok]; sc_ = sc_[ok]
    boost = 1 + g('lid_density_boost', 0.6) * (1 - sst(0.0, g('lid_boost_m', 0.004), sc_))
    nfur = rng.poisson(area * 1e4 * dens * boost)
    tri_rep = np.repeat(tri, nfur); n_new = len(tri_rep)
    r1 = np.sqrt(rng.random(n_new)); r2 = rng.random(n_new); ba = np.c_[1 - r1, r1 * (1 - r2), r1 * r2]
    ids = LT[tri_rep].copy()
    # wind every bound triangle so its frame normal points out of the skin (the node group grows strands along it)
    nchk, _, _ = tri_frame(NEW[ids[:, 0]], NEW[ids[:, 1]], NEW[ids[:, 2]]); vn = VN[ids].sum(1)
    sw = np.einsum('ij,ij->i', nchk, vn) < 0; ids[sw] = ids[sw][:, [0, 2, 1]]; ba[sw] = ba[sw][:, [0, 2, 1]]
    rootW = (NEW[ids] * ba[:, :, None]).sum(1)
    nW, tW, bW = tri_frame(NEW[ids[:, 0]], NEW[ids[:, 1]], NEW[ids[:, 2]])
    flip = (np.einsum('ij,ij->i', nW, rootW - c) < 0).mean()
    # flow: radially away from the opening centre in the skin plane, biased back (caudal = +Y) and, on the medial
    # side, down along the nose bridge; blended to the donor's own direction toward the region edge
    q = rootW - F['P0']; er = q - nW * np.einsum('ij,ij->i', q, nW)[:, None]; er /= np.maximum(np.linalg.norm(er, axis=1, keepdims=True), 1e-9)
    def tang(v):
        v = np.broadcast_to(np.array(v, float), nW.shape); t = v - nW * np.einsum('ij,ij->i', v, nW)[:, None]
        return t / np.maximum(np.linalg.norm(t, axis=1, keepdims=True), 1e-9)
    eback = tang([0.0, 1.0, 0.0]); edown = tang([0.0, 0.0, -1.0])
    medial = np.clip(-np.sign(c[0]) * er[:, 0], 0, 1)
    dflow = er + g('flow_back', 0.7) * eback + g('flow_medial_down', 0.8) * medial[:, None] * edown
    dflow /= np.maximum(np.linalg.norm(dflow, axis=1, keepdims=True), 1e-9)
    # region-edge parameter: radial projection to the region boundary picks the donor
    dP = np.linalg.norm(q, axis=1); Rm = g('region_m', 0.040)
    # nearest point of the region edge picks the donor; the edge distance drives the length and direction blends
    nr_ = [kdr.find(p_.tolist()) for p_ in rootW]; pb = np.array([VW[ring_ids[x[1]]] for x in nr_]); d_edge = np.array([x[2] for x in nr_])
    w_edge = 1 - sst(0.0, g('edge_dir_m', 0.010), d_edge)
    qq = rootW - c; uu = qq / np.linalg.norm(qq, axis=1, keepdims=True); thr = np.arccos(np.clip(uu @ F['z'], -1, 1)); phr = np.mod(np.arctan2(uu @ F['y'], uu @ F['x']), 2 * math.pi)
    sroot = (thr - interp_phi(F['TM'], phr)) * r
    rootOld = (VW[ids] * ba[:, :, None]).sum(1)
    for k in range(n_new):
        j = kd.find(pb[k].tolist())[1]; di = donor[j]; pi_ = pat[[x_[1] for x_ in kdp.find_n(rootOld[k].tolist(), int(g('colour_k', 1)))]]
        a0, n_ = coffs[di], ccnt[di]; sl = slice(a0, a0 + n_)
        Pd = np.c_[CH[sl], CX[sl], CY[sl]]                          # donor shape in its own frame (h, tangent, bitangent)
        Ld = float(np.linalg.norm(np.diff(Pd, axis=0), axis=1).sum()); hz = np.c_[CX[sl], CY[sl]]
        ad = math.atan2(hz[-1, 1], hz[-1, 0])
        # donor's world direction at its root, projected onto this root's skin plane
        new_curves.append((side, ids[k], ba[k], (di, pi_, phr[k], er[k]), Pd, Ld, ad, sroot[k], d_edge[k], w_edge[k], dflow[k], nW[k], tW[k], bW[k]))
    LOG['eye_' + side].update(new_strands=int(n_new), region_area_cm2=round(float(area.sum()) * 1e4, 2), rewound_triangles_share=round(float(sw.mean()), 3), inward_vs_eye_share=round(float(flip), 3))

# donor world directions (root to tip, skin plane) for the edge blend
def donor_dir_world(di):
    a0 = coffs[di]; n_ = ccnt[di]; ids_ = np.array([cia[di], cib[di], cic[di]])
    n0, t0, b0 = tri_frame(VW[ids_[0]], VW[ids_[1]], VW[ids_[2]]); Pt = np.array([CH[a0 + n_ - 1], CX[a0 + n_ - 1], CY[a0 + n_ - 1]])
    return Pt[1] * t0 + Pt[2] * b0


NPT = 9; Ntot = len(new_curves)
POS = np.zeros((Ntot * NPT, 3), np.float32); BH = np.zeros(Ntot * NPT, np.float32); BX = np.zeros_like(BH); BY = np.zeros_like(BH); RAD = np.zeros_like(BH)
BIA = np.zeros(Ntot, np.int32); BIB = np.zeros_like(BIA); BIC = np.zeros_like(BIA); BA = np.zeros(Ntot, np.float32); BB = np.zeros_like(BA); BC = np.zeros_like(BA); SRC = np.zeros(Ntot, np.int64)
Llid = g('lid_fur_len_m', 0.0018); Slen = g('len_ramp_m', 0.011)
NLb = NL  # body-local new positions
lens = []; TINT = np.ones(Ntot, np.float32); OVER = np.zeros(Ntot, bool); SRCK = []
for k, (side, ti_, ba_, dpair, Pd, Ld, ad, sroot, dedge, we, dfl, nW, tW, bW) in enumerate(new_curves):
    di, pi_, phk, erk = dpair
    ids_ = ti_; BIA[k], BIB[k], BIC[k] = ids_; BA[k], BB[k], BC[k] = ba_; SRC[k] = pi_[0] if g('pattern_donor', 1) else di; SRCK.append(pi_)
    # frame in body-local space (what the node group uses)
    nL, tL, bL = tri_frame(NLb[ids_[0]], NLb[ids_[1]], NLb[ids_[2]])
    # target direction in world -> local frame components (body world matrix is a similarity; use its rotation)
    dw = dfl.copy()
    if we > 0:
        dd = donor_dir_world(di); dd = dd - nW * (dd @ nW); nd = np.linalg.norm(dd)
        if nd > 1e-9: dw = dw * (1 - we) + (dd / nd) * we; dw /= max(np.linalg.norm(dw), 1e-9)
    w_len = max(float(sst(0.0, Slen, np.array(sroot))), float(1 - sst(0.0, g('edge_len_m', 0.006), np.array(dedge))))
    L = Llid + (Ld - Llid) * w_len
    # upper lid: the short coat on the lid lies down over the lid edge by over_m (the sheet's soft lidded edge)
    if g('over_m', 0.0) > 0 and math.sin(phk) > g('over_sin', 0.35) and sroot < g('over_band_m', 0.0025):
        dw = -erk * g('over_down', 1.0) + dw * g('over_keep', 0.35); dw = dw - nW * (dw @ nW); dw /= max(np.linalg.norm(dw), 1e-9)
        L = sroot + g('over_m', 0.001); w_len = 0.0; OVER[k] = True
    dl_ = np.linalg.inv(Mw[:3, :3]) @ dw; ang = math.atan2(dl_ @ bL, dl_ @ tL)
    rot = ang - ad; cs, sn = math.cos(rot), math.sin(rot)
    sc = L / max(Ld, 1e-9)
    hflat = (g('over_flat', 0.15) if OVER[k] else g('lid_flat', 0.3)) + (1 - g('lid_flat', 0.3)) * w_len
    Pn = np.c_[Pd[:, 0] * sc * hflat, (Pd[:, 1] * cs - Pd[:, 2] * sn) * sc, (Pd[:, 1] * sn + Pd[:, 2] * cs) * sc]
    rootL = (NLb[ids_] * ba_[:, None]).sum(0)
    pts = rootL + Pn[:, 0:1] * nL + Pn[:, 1:2] * tL + Pn[:, 2:3] * bL
    sl = slice(k * NPT, (k + 1) * NPT); POS[sl] = pts; BH[sl] = Pn[:, 0]; BX[sl] = Pn[:, 1]; BY[sl] = Pn[:, 2]
    RAD[sl] = crad[coffs[di]:coffs[di] + NPT] * (g('lid_radius_k', 0.8) + (1 - g('lid_radius_k', 0.8)) * w_len); lens.append(L)
    TINT[k] = 1 + (g('lid_tint', 1.0) - 1) * (1 - float(sst(0.0, g('lid_tint_m', 0.005), np.array(sroot))))
LOG['new_strand_len_mm'] = [round(float(np.percentile(lens, p)) * 1000, 2) for p in (5, 50, 95)] if lens else None

# opening check: no new strand point may enter the eye opening
bad = np.zeros(Ntot, bool)
PW = POS.astype(np.float64) @ Mw[:3, :3].T + Mw[:3, 3]
for side, F in EYES.items():
    q = PW - F['c']; nq = np.linalg.norm(q, axis=1); u = q / nq[:, None]; th = np.arccos(np.clip(u @ F['z'], -1, 1)); ph = np.mod(np.arctan2(u @ F['y'], u @ F['x']), 2 * math.pi)
    inside = (th < interp_phi(F['TM'], ph) + g('fur_margin_m', 0.0004) / F['r']) & (nq < F['r'] + g('hover_m', 0.006))
    deep = (th < interp_phi(F['TM'], ph) - (g('over_m', 0.0) + 0.0005) / F['r']) & (nq < F['r'] + g('hover_m', 0.006))
    ins = inside.reshape(-1, NPT).any(1); dp_ = deep.reshape(-1, NPT).any(1)
    bad |= np.where(OVER, dp_, ins)
keep = np.where(~bad)[0]; LOG['new_strands_dropped_at_opening'] = int(bad.sum()); LOG['over_edge_strands'] = int((OVER & ~bad).sum())

# revive: coat strands just outside the region that b5's opening rule switched off (radius 0) are bald patches now
# that the Eyelid rings are gone; they get the radius profile of the nearest visible coat strand unless they would
# reach into the new opening
if g('revive', 1):
    crad2 = arr(cd.attributes['radius'].data, 'value', 1); dead_any = np.zeros(len(coffs), bool)
    ends = coffs + ccnt - 1; dead = (crad2[coffs] == 0) & (crad2[ends] == 0) & ~(regv[cia] | regv[cib] | regv[cic])
    near2 = np.zeros(len(coffs), bool)
    for F in EYES.values(): near2 |= np.linalg.norm(croot - F['P0'], axis=1) < g('region_m', 0.040) + g('revive_reach_m', 0.025)
    cand = np.where(dead & near2)[0]
    # their rest points on the current (rebuilt) surface: root plus the frame offsets (outside the region nothing moved)
    tri_ = np.stack([cia[cand], cib[cand], cic[cand]], 1); nF, tF, bF = tri_frame(NEW[tri_[:, 0]], NEW[tri_[:, 1]], NEW[tri_[:, 2]])
    rootF = (NEW[tri_] * cba[cand][:, :, None]).sum(1); revived = 0; blocked = 0
    for k_, ci in enumerate(cand):
        sl = slice(coffs[ci], coffs[ci] + ccnt[ci]); Pw_ = rootF[k_] + np.outer(CH[sl], nF[k_]) + np.outer(CX[sl], tF[k_]) + np.outer(CY[sl], bF[k_])
        bad_ = False
        for F in EYES.values():
            q_ = Pw_ - F['c']; nq_ = np.linalg.norm(q_, axis=1); u_ = q_ / nq_[:, None]; th_ = np.arccos(np.clip(u_ @ F['z'], -1, 1)); ph_ = np.mod(np.arctan2(u_ @ F['y'], u_ @ F['x']), 2 * math.pi)
            if ((th_ < interp_phi(F['TM'], ph_) + g('fur_margin_m', 0.0004) / F['r']) & (nq_ < F['r'] + g('hover_m', 0.006))).any(): bad_ = True
        if bad_: blocked += 1; continue
        dj = donor[kd.find(croot[ci].tolist())[1]]; crad2[sl] = crad[coffs[dj]:coffs[dj] + ccnt[dj]][:ccnt[ci]] if ccnt[dj] == ccnt[ci] else crad[coffs[dj]]; revived += 1
    cd.attributes['radius'].data.foreach_set('value', crad2.astype(np.float32)); LOG['revived_coat_strands'] = dict(revived=revived, blocked_at_opening=blocked)

hc = bpy.data.hair_curves.new('Eye region coat')
hc.add_curves([NPT] * len(keep))
pk = (keep[:, None] * NPT + np.arange(NPT)[None, :]).ravel()
hc.attributes['position'].data.foreach_set('vector', POS[pk].ravel())
def add_attr(name, dom, typ, vals):
    at = hc.attributes.get(name) or hc.attributes.new(name, typ, dom)
    key = {'FLOAT_COLOR': 'color', 'FLOAT_VECTOR': 'vector'}.get(typ, 'value'); at.data.foreach_set(key, np.ascontiguousarray(vals).ravel())
add_attr('radius', 'POINT', 'FLOAT', RAD[pk])
for nm, v in (('bind_height', BH), ('bind_offset_x', BX), ('bind_offset_y', BY)): add_attr(nm, 'POINT', 'FLOAT', v[pk])
for nm, v in (('bind_ia', BIA), ('bind_ib', BIB), ('bind_ic', BIC)): add_attr(nm, 'CURVE', 'INT', v[keep])
for nm, v in (('bind_a', BA), ('bind_b', BB), ('bind_c', BC)): add_attr(nm, 'CURVE', 'FLOAT', v[keep])
for a_ in cd.attributes:
    if a_.name.startswith(('.', 'bind_')) or a_.domain != 'CURVE' or a_.data_type not in ('FLOAT', 'FLOAT_COLOR', 'FLOAT_VECTOR'): continue
    key = {'FLOAT_COLOR': 'color', 'FLOAT_VECTOR': 'vector'}.get(a_.data_type, 'value'); w_ = {'FLOAT_COLOR': 4, 'FLOAT_VECTOR': 3}.get(a_.data_type, 1)
    av_ = arr(a_.data, key, w_)
    # colour attributes: the mean of the colour_k nearest original coat strands (no hard-edged islands of the old
    # pattern), with the grey kept at least at the cheek's value (no darker patch)
    vv_ = np.array([av_[SRCK[i]].mean(0) for i in keep], np.float32) if g('colour_k', 1) > 1 else av_[SRC[keep]].astype(np.float32)
    if a_.name == 'coat_color' and g('grey_floor', 0):
        lum_ = vv_[:, :3] @ np.array([0.2126, 0.7152, 0.0722]); ref_ = av_[donor, :3] @ np.array([0.2126, 0.7152, 0.0722])
        gref = float(np.median(ref_[ref_ < np.percentile(ref_, 60)])); low = lum_ < gref * g('grey_floor', 1.0)
        vv_[low, :3] *= (gref * g('grey_floor', 1.0) / np.maximum(lum_[low], 1e-6))[:, None]; LOG['grey_floor'] = dict(ref=round(gref, 4), lifted=int(low.sum()))
    if a_.name == 'coat_color': vv_[:, :3] *= TINT[keep, None]
    add_attr(a_.name, 'CURVE', a_.data_type, vv_)
for m_ in cd.materials: hc.materials.append(m_)
hc.surface = body
ob = coat.copy(); ob.data = hc; ob.name = 'Eye region coat'
for m in list(ob.modifiers):
    if not m.name.startswith('Follow'): ob.modifiers.remove(m)
s.collection.objects.link(ob)
LOG['eye_region_coat_strands'] = int(len(keep))

# ---- measures: opening height / head height (margin path z extent), iris covers, cornea vs margin
dg = bpy.context.evaluated_depsgraph_get()
H = NEW[HEADM]; crown, jaw = float(H[:, 2].max()), float(H[:, 2].min()); hh = crown - jaw
for side, F in EYES.items():
    mp = F['margin_path']; oh = float(mp[:, 2].max() - mp[:, 2].min())
    yproj = (mp - F['c']) @ F['y']; xproj = (mp - F['c']) @ F['x']; Ri = math.sin(math.radians(g('iris_deg', 42.0))) * F['r']
    up_cov = (Ri - yproj.max()) / (2 * Ri); lo_cov = (Ri + yproj.min()) / (2 * Ri)
    apex = float(((F['CV'] - F['c']) @ F['z']).max()) if F['CV'] is not None else F['r']
    LOG['eye_' + side].update(opening_height_mm=round(oh * 1000, 1), opening_pct_of_head=round(100 * oh / hh, 1), opening_width_mm=round(float(xproj.max() - xproj.min()) * 1000, 1),
                              aspect=round(float(xproj.max() - xproj.min()) / float(yproj.max() - yproj.min()), 2),
                              upper_cover_of_iris=round(float(up_cov), 3), lower_cover_of_iris=round(float(lo_cov), 3),
                              cornea_apex_above_margin_plane_mm=round((apex - float(np.median((mp - F['c']) @ F['z']))) * 1000, 2))
LOG['head_height_mm'] = round(hh * 1000, 1)
# side-view protrusion: in the side camera (looking along x), the visible cornea's front (most -y) against the skin
# silhouette front at the same heights; positive = the cornea stands ahead of the face profile (the bulge)
for side, F in EYES.items():
    if F['CV'] is None: continue
    q_ = F['CV'] - F['c']; u_ = q_ / np.linalg.norm(q_, axis=1, keepdims=True); th_ = np.arccos(np.clip(u_ @ F['z'], -1, 1)); ph_ = np.mod(np.arctan2(u_ @ F['y'], u_ @ F['x']), 2 * math.pi)
    vis = F['CV'][th_ < interp_phi(F['TM'], ph_)]
    sk = NEW[HEADM & (np.sign(NEW[:, 0]) == np.sign(F['c'][0]))]
    # the lid line: the eye's own lids and the skin round them (0 to 12 mm past the margin)
    # in the side view the lid line is the margin and the lid rim just past it (0 to 1.5 mm): the cornea's projected
    # outline must not run ahead of it
    lidsk = np.r_[F['margin_path'], NEW[F['reg'] & (np.nan_to_num(SVAL, nan=-1) >= 0) & (np.nan_to_num(SVAL, nan=-1) < 0.0015)]]
    w2 = -1e9
    for zc in np.linspace(vis[:, 2].min(), vis[:, 2].max(), 25):
        cv = vis[np.abs(vis[:, 2] - zc) < 0.0008]; ss = lidsk[np.abs(lidsk[:, 2] - zc) < 0.0008]
        if len(cv) and len(ss): w2 = max(w2, float(ss[:, 1].min() - cv[:, 1].min()))
    LOG['eye_' + side]['side_view_cornea_ahead_of_lid_line_mm'] = round(w2 * 1000, 2)
    # cornea apex against the lid rim (the lid skin 0.6 to 2 mm past the margin), heights along the iris axis
    rim_ = NEW[F['reg'] & (np.nan_to_num(SVAL, nan=-1) > 0.0006) & (np.nan_to_num(SVAL, nan=-1) < 0.002)]
    apex_ = float(((F['CV'] - F['c']) @ F['z']).max())
    LOG['eye_' + side]['cornea_apex_above_lid_rim_mm'] = round((apex_ - float(np.median((rim_ - F['c']) @ F['z']))) * 1000, 2)
    worst = -1e9
    for zc in np.linspace(vis[:, 2].min(), vis[:, 2].max(), 25):
        cv = vis[np.abs(vis[:, 2] - zc) < 0.0008]; ss = sk[np.abs(sk[:, 2] - zc) < 0.0008]
        if len(cv) and len(ss): worst = max(worst, float(ss[:, 1].min() - cv[:, 1].min()))
    LOG['eye_' + side]['side_view_cornea_ahead_of_profile_mm'] = round(worst * 1000, 2)

rig.data.pose_position = 'POSE'; bpy.context.view_layer.update()
REP.write_text(json.dumps(LOG, indent=1, default=lambda o: o.tolist() if hasattr(o, 'tolist') else str(o)))
bpy.ops.wm.save_as_mainfile(filepath=OUTB, compress=True); print('EYEREGION saved', OUTB, flush=True)
