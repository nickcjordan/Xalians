"""B-4cj4: sculpt the Luceras paw profile (vertex moves only) in plain numpy.

Steps per paw, computed on the left paws and applied to the right paws through the mirror (x -> -x), so left and right match:
  A (hind only) rotate the paw about the ankle pivot so it points forward (weight 1 below z_rot[0], 0 above z_rot[1]).
  B (hind only) narrow each row across the paw about its own centre to the target width (full at the toes, none at the heel).
  C (both) column remap of the top surface: behind the knuckle row, cap the top at a low, nearly flat foot-top line that rises
    gently and then blends back into the leg; grooves between the toes; a small knuckle lift. Points scale within their column
    above the sole band (z < z_sole stays), so the sole and toe pads stay on the ground.
Claws get a rigid move: rotation about z through their base (to follow the toe direction) plus the field displacement of the base.
Usage: python pawprofile_build.py BASE.npz PARAMS.json OUT.npz
"""
import sys, json, numpy as np
from scipy.ndimage import gaussian_filter, maximum_filter, map_coordinates


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)


def rot(a):
    c, s = np.cos(a), np.sin(a); return np.array([[c, -s], [s, c]])


class Paw:
    def __init__(s, kind, P, w_left, claws_left):
        s.kind, s.P = kind, P[kind]; p = s.P; s.piv = np.array(p['pivot'])
        cur = np.array(p['axis'], float); cur = cur / np.linalg.norm(cur)
        s.theta = (np.arctan2(-1, 0) - np.arctan2(cur[1], cur[0])) * p.get('rotate_fraction', 0.0)
        s.axis_after = rot(s.theta) @ cur
        s.perp = np.array([-s.axis_after[1], s.axis_after[0]])
        if s.perp[0] < 0: s.perp = -s.perp
        s.z_end = p['zone_end']; s.R = p['radius']
        sel = s.mask(w_left)
        q = s.stepA(w_left[sel]); s.fitB(q); q = s.stepB(q); s.fitS(claws_left); q = s.stepS(q); s.fitC(q, claws_left)

    def fitS(s, claws_left):
        """Toe set-back: move the named toes forward along the paw axis (a smooth bump around each toe's centreline that
        is full from the toe tip back to the knuckles and fades out behind them), so outer toes sit just behind the middle ones."""
        s.shifts = []
        for i, sh in enumerate(s.P.get('toe_forward', [0, 0, 0, 0])):
            if sh == 0: continue
            c = s.stepB(s.stepA(claws_left[i][2].mean(0)[None]))[0]; cu, cv = s.uv(c[None]); s.shifts.append((cu[0], cv[0], sh))

    def stepS(s, q):
        if not getattr(s, 'shifts', None): return q
        u, v = s.uv(q); du = np.zeros(len(q)); p = s.P
        for cu, cv, sh in s.shifts:
            du += sh * np.exp(-((v - cv) / p['toe_forward_sigma_v']) ** 2) * smooth(cu - p['toe_forward_reach'], cu - p['toe_forward_full'], u) * (1 - smooth(p['width_z'][0], p['width_z'][1], q[:, 2]))
        out = q.copy(); out[:, :2] += du[:, None] * s.axis_after; return out

    def pre(s, q):
        return s.stepS(s.stepB(s.stepA(q)))

    def mask(s, w):
        return (w[:, 0] > 0.004) & (w[:, 2] < s.z_end) & (np.linalg.norm(w[:, :2] - s.piv, axis=1) < s.R) & ((w[:, 1] > 0) if s.kind == 'hind' else (w[:, 1] < 0))

    def uv(s, q):
        r = q[:, :2] - s.piv; return r @ s.axis_after, r @ s.perp

    def stepA(s, w):
        if s.theta == 0: return w.copy()
        z0, z1 = s.P['z_rot']; f = 1 - smooth(z0, z1, w[:, 2]); out = w.copy(); r = w[:, :2] - s.piv
        a = s.theta * f; c, sn = np.cos(a), np.sin(a)
        out[:, 0] = s.piv[0] + c * r[:, 0] - sn * r[:, 1]; out[:, 1] = s.piv[1] + sn * r[:, 0] + c * r[:, 1]; return out

    def fitB(s, q):
        s.has_B = 'width_target' in s.P
        if not s.has_B: return
        u, v = s.uv(q); low = q[:, 2] < s.P['width_z'][0]
        s.ub = np.arange(-0.03, 0.16, 0.001); c = np.full(len(s.ub), np.nan); W = np.full(len(s.ub), np.nan)
        for i, uu in enumerate(s.ub):
            m = low & (np.abs(u - uu) < 0.0015)
            if m.sum() > 6: W[i] = v[m].max() - v[m].min(); c[i] = 0.5 * (v[m].max() + v[m].min())
        ok = ~np.isnan(W); W = np.interp(s.ub, s.ub[ok], W[ok]); c = np.interp(s.ub, s.ub[ok], c[ok])
        W = maximum_filter(W, 9)
        k = np.clip(s.P['width_target'] / W, s.P.get('k_min', 0.5), 1.0)
        u0, u1 = s.P['width_u']; k = 1 + (k - 1) * smooth(u0, u1, s.ub)
        s.kB = gaussian_filter(k, 4); s.cB = gaussian_filter(c, 6); s.WB = W

    def stepB(s, q):
        if not s.has_B: return q.copy()
        u, v = s.uv(q); k = np.interp(u, s.ub, s.kB); c = np.interp(u, s.ub, s.cB)
        z0, z1 = s.P['width_z']; f = 1 - smooth(z0, z1, q[:, 2]); k = 1 + (k - 1) * f
        v2 = c + (v - c) * k; out = q.copy(); out[:, :2] = s.piv + u[:, None] * s.axis_after + v2[:, None] * s.perp; return out

    def fitC(s, q, claws_left):
        p = s.P; res = 0.0005; s.res = res
        u, v = s.uv(q)
        tips = []
        for tip, base, cv in claws_left:
            t2 = s.pre(np.array([tip]))[0]; b2 = s.pre(np.array([base]))[0]
            c2 = s.pre(cv.mean(0)[None])[0]; cu, cvv = s.uv(c2[None])
            tu, tv = s.uv(t2[None]); bu, bv = s.uv(b2[None]); tips.append((tu[0], tv[0], bu[0], bv[0], cu[0], cvv[0]))
        tips = np.array(sorted(tips, key=lambda t: t[1])); s.tips = tips
        s.u0, s.v0 = -0.04, -0.07; nu, nv = int(0.22 / res), int(0.14 / res)
        T = np.full((nu, nv), -1.0); m = q[:, 2] < p['top_cap']
        iu = np.clip(((u[m] - s.u0) / res).astype(int), 0, nu - 1); iv = np.clip(((v[m] - s.v0) / res).astype(int), 0, nv - 1)
        np.maximum.at(T, (iu, iv), q[m, 2]); s.Traw = maximum_filter(T, p.get('traw_filter', 3))
        for _ in range(6):
            e = T < 0; mf = maximum_filter(T, 3); T[e] = mf[e]
        T[T < 0] = 0; s.Tfill = T.copy(); s.T = gaussian_filter(T, p.get('top_sigma_cells', 6.0))
        U = s.u0 + (np.arange(nu) + 0.5) * res; V = s.v0 + (np.arange(nv) + 0.5) * res; UU, VV = np.meshgrid(U, V, indexing='ij')
        utip = np.interp(VV, tips[:, 1], tips[:, 0]); S = utip - UU
        sk = p['knuckle_s']; slg = p['leg_s']
        ceil = p['flat_z'] + p['flat_slope'] * np.clip(S - sk - p['dip_len'], 0, None)
        wdip = smooth(sk + p['dip_start'], sk + p['dip_len'], S) * (1 - smooth(slg - p['leg_blend'], slg, S))
        D = np.clip(s.T - ceil, 0, None) * wdip
        G = np.zeros_like(D)
        for a, b in zip(tips[:-1], tips[1:]):
            vg = 0.5 * (a[1] + b[1]); sg = p['groove_sigma']
            G += p['groove_depth'] * np.exp(-((VV - vg) / sg) ** 2) * smooth(-0.004, 0.003, S) * (1 - smooth(sk + p['groove_reach'] - 0.004, sk + p['groove_reach'], S))
        K = np.zeros_like(D)
        for t in tips:
            K += p['knuckle_lift'] * np.exp(-((VV - t[1]) / p['knuckle_sigma_v']) ** 2 - ((S - sk) / p['knuckle_sigma_s']) ** 2)
        # toe curl: the toe top falls from the knuckle forward and down to the toe tip
        Cd = p.get('curl_depth', 0.0) * (1 - smooth(p.get('s_nose', 0.008), sk, S)) * smooth(-0.006, 0.0, S)
        s.D = gaussian_filter(D + Cd, p.get('d_sigma_cells', 4.0)) + G - K; s.S = S; s.UU, s.VV = UU, VV
        if p.get('mode') == 'anatomy': s.fit_anatomy(UU, VV, tips)

    def fit_anatomy(s, UU, VV, tips):
        """Explicit target top surface. Per toe (centre = claw centroid): a toe that curls up from its tip to a raised, rounded
        knuckle and falls back down behind it; elliptical cross-section, so neighbouring toes meet in grooves. Behind the toes:
        a low, nearly flat foot top that rises gently, then blends back into the leg. D = T - target (lowers or raises)."""
        p = s.P; sk, Lb, zn, zk, zf = p['knuckle_s'], p['back_len'], p['nose_z'], p['knuckle_z'], p['flat_z']
        nose_u = tips[:, 4] + p['nose_off']; vc = tips[:, 5]
        gaps = np.diff(vc); hw = np.r_[gaps[0], np.minimum(gaps[:-1], gaps[1:]), gaps[-1]] * 0.5 * p['toe_hw_scale']
        toe = np.full(UU.shape, -1.0); side = np.full(UU.shape, -1.0)
        for i in range(len(vc)):
            si = nose_u[i] - UU
            rise = zn + (zk - zn) * np.sin(0.5 * np.pi * np.clip(si / sk, 0, 1))
            fall = zk - (zk - zf) * smooth(sk, sk + Lb, si)
            h = np.where(si < sk, rise, fall)
            x = (VV - vc[i]) / hw[i]; zg = h - p['groove_drop'] * smooth(0.0, sk, si) - p['groove_drop_nose'] * (1 - smooth(0.0, sk, si))
            prof = zg + (h - zg) * np.sqrt(np.clip(1 - x ** 2, 0, 1))
            inside = (np.abs(x) <= 1) & (si >= -0.003) & (si <= sk + Lb + 0.004)
            toe = np.where(inside, np.maximum(toe, prof), toe)
            near = (np.abs(x) > 1) & (np.abs(x) < 2.2) & (si >= -0.003) & (si <= sk + Lb + 0.004)
            side = np.where(near, np.maximum(side, zg - p['side_drop'] * (np.abs(x) - 1)), side)
        S = s.S  # distance behind the interpolated tip line (claw tips)
        snose = np.interp(VV, vc, nose_u) - UU
        ceil = zf + p['flat_slope'] * np.clip(snose - sk - Lb, 0, None)
        behind = snose > sk + 0.5 * Lb
        target = np.where(toe > 0, toe, np.where(side > 0, np.minimum(side, s.T), s.T))
        target = np.where(behind, np.maximum(np.minimum(s.T, ceil), np.where(toe > 0, toe, -1)), target)
        slg = p['leg_s']; w = (1 - smooth(slg - p['leg_blend'], slg, snose)) * smooth(-0.006, -0.001, snose)
        lateral = smooth(vc[0] - hw[0] * 2.4, vc[0] - hw[0] * 1.2, VV) * (1 - smooth(vc[-1] + hw[-1] * 1.2, vc[-1] + hw[-1] * 2.4, VV))
        D = (s.T - target) * w * np.maximum(lateral, behind * 1.0)
        s.D = gaussian_filter(D, p.get('d_sigma_cells', 3.0)); s.hw = hw
        s.Tt = gaussian_filter(target, 1.0); s.Wt = gaussian_filter(w * np.maximum(lateral, behind * 1.0), 2.0)

    def grid(s, G, q):
        u, v = s.uv(q); return map_coordinates(G, [(u - s.u0) / s.res - 0.5, (v - s.v0) / s.res - 0.5], order=1, mode='nearest')

    def solve_mesh(s, q, nrm_z, nbr):
        """Displacement in z for the left paw vertices q (after steps A and B): top-surface vertices go to the target
        (weighted), sole vertices stay, every other vertex follows by Laplacian diffusion over the mesh, so the move is smooth."""
        p = s.P; z = q[:, 2]; tgt = s.grid(s.Tt, q); wt = s.grid(s.Wt, q); traw = s.grid(s.Traw, q)
        top = (nrm_z > p.get('top_nz', 0.3)) & (z > traw - p.get('top_band', 0.0015)) & (z < p['top_cap'])
        fixed0 = (z < p['z_sole']) | (z > p['top_cap']) | (wt < 1e-3) & ~top
        d = np.zeros(len(q)); dt = wt * (tgt - z)
        if p.get('preserve_relief'):
            # move by target minus the smoothed top, so small skin relief rides along and nothing folds; the low-frequency
            # part of the relief (crests sit above a smoothed top) is averaged over the top vertices and removed, so the
            # surface still lands on the target on average
            tsm = s.grid(gaussian_filter(s.Tfill, p.get('relief_sigma_cells', 4.0)), q); r = np.where(top, z - tsm, 0.0); m = top.astype(float); b = r.copy()
            for _ in range(p.get('relief_bias_iters', 25)):
                num = nbr @ (b * m); den = nbr @ m; b = np.where(den > 1e-6, num / np.maximum(den, 1e-6), 0.0); b = np.where(top, 0.5 * b + 0.5 * r, b)
            for _ in range(p.get('relief_bias_iters', 25)):
                num = nbr @ (b * m); den = nbr @ m; b = np.where(top & (den > 1e-6), num / np.maximum(den, 1e-6), b)
            dt = wt * (tgt - tsm - b)
        d[top] = dt[top]
        free = ~top & ~fixed0
        for _ in range(p.get('lap_iters', 300)):
            d2 = nbr @ d; d[free] = d2[free]
        # relax once more including the top band, to remove vertex-level noise
        for _ in range(p.get('relax_iters', 8)):
            d2 = nbr @ d; m = ~fixed0; d[m] = 0.5 * d[m] + 0.5 * d2[m]
        s.ntop = int(top.sum()); return d

    def stepC(s, q):
        u, v = s.uv(q); iu = (u - s.u0) / s.res - 0.5; iv = (v - s.v0) / s.res - 0.5
        D = map_coordinates(s.D, [iu, iv], order=1, mode='nearest'); T = map_coordinates(s.T, [iu, iv], order=1, mode='nearest')
        # smooth column scale: z' = zs + (z - zs) * (T - D - zs) / (T - zs); a smooth ratio, so neighbours never cross
        zs = s.P['z_sole']; r = np.clip((T - D - zs) / np.maximum(T - zs, 0.004), 0.15, 1.6)
        fz = 1 - smooth(s.P['top_cap'] - 0.012, s.P['top_cap'], q[:, 2])
        z = q[:, 2]; z2 = np.where(z > zs, zs + (z - zs) * r, z)
        out = q.copy(); out[:, 2] = z + (z2 - z) * fz; return out

    def field(s, w):
        return s.stepC(s.pre(w))


def idw(tree, val, pts, k=6):
    dd, ii = tree.query(pts, k); wgt = 1 / np.maximum(dd, 1e-5) ** 2; return (val[ii] * wgt).sum(1) / wgt.sum(1)


def claw_tip_base(v):
    tip = v[np.argmin(v[:, 1])]; base = v[np.argmax(np.linalg.norm(v - tip, axis=1))]; return tip, base


UNTANGLE = {}


def main(base, params, outp):
    d = np.load(base); w = d['world']; P = json.loads(open(params).read())
    claws = {k[5:]: d[k] for k in d.files if k.startswith('claw_')}
    def cl(kind):
        return [(*claw_tip_base(claws[f'{kind}_claw_l_{i}']), claws[f'{kind}_claw_l_{i}']) for i in range(1, 5)]
    new = w.copy(); paws = {}
    tris = d['tris']
    from scipy.sparse import coo_matrix, diags
    from scipy.spatial import cKDTree
    e = np.r_[tris[:, [0, 1]], tris[:, [1, 2]], tris[:, [2, 0]]]; e = np.r_[e, e[:, ::-1]]
    def vnormals(x):
        fn = np.cross(x[tris[:, 1]] - x[tris[:, 0]], x[tris[:, 2]] - x[tris[:, 0]]); vn = np.zeros_like(x)
        for k in range(3): np.add.at(vn, tris[:, k], fn)
        return vn / np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-12)
    for kind in ('fore', 'hind'):
        pw = Paw(kind, P, w, cl(kind)); paws[kind] = pw
        mL = pw.mask(w); qL = pw.pre(w[mL])
        if pw.P.get('mode') == 'anatomy':
            ids = np.where(mL)[0]; loc = -np.ones(len(w), int); loc[ids] = np.arange(len(ids))
            ee = e[(loc[e[:, 0]] >= 0) & (loc[e[:, 1]] >= 0)]; n = len(ids)
            A = coo_matrix((np.ones(len(ee)), (loc[ee[:, 0]], loc[ee[:, 1]])), shape=(n, n)).tocsr(); A.data[:] = 1
            deg = np.asarray(A.sum(1)).ravel(); nbr = diags(1 / np.maximum(deg, 1)) @ A
            full = w.copy(); full[mL] = qL; nz = vnormals(full)[mL, 2]
            dz = pw.solve_mesh(qL, nz, nbr); qL2 = qL.copy(); qL2[:, 2] += dz; new[mL] = qL2
            tree = cKDTree(qL); pw.dz_at = lambda pts, tree=tree, dz=dz: idw(tree, dz, pts)
            wm = w * [-1, 1, 1]; mR = pw.mask(wm); qR = pw.pre(wm[mR]); qR[:, 2] += pw.dz_at(qR); new[mR] = qR * [-1, 1, 1]
            pw.field = lambda pts, pw=pw: (lambda q: np.c_[q[:, :2], q[:, 2] + pw.dz_at(q)])(pw.pre(pts))
        else:
            new[mL] = pw.field(w[mL])
            wm = w * [-1, 1, 1]; mR = pw.mask(wm); new[mR] = pw.field(wm[mR]) * [-1, 1, 1]
    # local untangle: where a triangle turned over (small skin wrinkles whose walls were steeper than the move), smooth z
    # of its vertices and their neighbours until nothing is turned over; touches only those few vertices
    A = coo_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(len(w), len(w))).tocsr(); A.data[:] = 1
    nb = diags(1 / np.maximum(np.asarray(A.sum(1)).ravel(), 1)) @ A
    def nrm(x): y = x[tris]; return np.cross(y[:, 1] - y[:, 0], y[:, 2] - y[:, 0])
    n0 = nrm(w); untangled = set()
    for it in range(P.get('untangle_rounds', 40)):
        n1 = nrm(new); bad = ((n0 * n1).sum(1) < 0)
        if not bad.any(): break
        V = np.zeros(len(w), bool); V[np.unique(tris[bad])] = True; V |= (A @ V.astype(float)) > 0
        untangled.update(np.where(V)[0].tolist())
        for _ in range(3):
            zz = nb @ new[:, 2]; new[V, 2] = 0.5 * new[V, 2] + 0.5 * zz[V]
    UNTANGLE.update(rounds=it, vertices=len(untangled), remaining=int(((n0 * nrm(new)).sum(1) < 0).sum()))
    M = {}
    for name, v in claws.items():
        kind = 'fore' if name.startswith('fore') else 'hind'; pw = paws[kind]; sgn = 1 if '_l' in name else -1
        tip, base = claw_tip_base(v)
        if 'dewclaw' in name: base = v.mean(0); tip = base + np.array([0, -0.005, 0])
        pts = np.array([base, tip]) * [sgn, 1, 1]; n = pw.field(pts) * [sgn, 1, 1]
        a0 = np.arctan2((tip - base)[1], (tip - base)[0]); a1 = np.arctan2((n[1] - n[0])[1], (n[1] - n[0])[0]); da = a1 - a0
        c, sn = np.cos(da), np.sin(da); Rz = np.array([[c, -sn, 0, 0], [sn, c, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]])
        T0 = np.eye(4); T0[:3, 3] = -base; T1 = np.eye(4); T1[:3, 3] = n[0]; M[name] = T1 @ Rz @ T0
    info = {'untangle': UNTANGLE}; info.update({k: {'theta_deg': float(np.degrees(p.theta)), 'tips_uv_mm': (p.tips * 1000).round(1).tolist(), 'max_D_mm': float(p.D.max() * 1000), 'top_vertices': getattr(p, 'ntop', 0)} for k, p in paws.items()})
    newclaws = {'claw_' + k: (np.c_[v, np.ones(len(v))] @ M[k].T)[:, :3] for k, v in claws.items()}
    np.savez_compressed(outp, new_world=new, tris=d['tris'], world=new, **{'clawM_' + k: m for k, m in M.items()}, **newclaws)
    print(json.dumps(info)); return new, M, paws


if __name__ == '__main__':
    main(*sys.argv[1:4])
