"""B-exrv: Luceras paws as authored parts (plain numpy + scipy, no Blender).

Each paw is a signed distance field built from swept forms, meshed with surface nets (quads) and projected onto the surface:
  * leg stub: the approved sculpt's own leg surface (signed distance to its triangles) above the join plane, handing over
    below it to an elliptic tube fitted to the leg section, which runs on down to the ground as the heel;
  * foot body: an ellipse swept along the paw axis (low, nearly flat top behind the knuckles);
  * four digits: a variable-radius tube swept along a hook curve (rises from the foot to the knuckle dome, then curls
    forward and down to the ground), plus a toe pad under the arch; digits meet each other with a tight blend (clefts)
    and the foot with a wider one;
  * a flat sole at the ground.
The part is cut at the join plane (perpendicular to the leg axis) and capped, so it is closed; its section at the plane is
the sculpt leg's section. Left paws are built in world space; right paws are the mirror (x -> -x).
Claws: the sculpt's claw mesh (a clean one per paw type), rigidly moved so its base sits inside the toe tip and it points
down and forward, size unchanged.

Usage: python paw_part_build.py BASE.npz PARAMS.json OUT.npz
"""
import sys, json, numpy as np
from scipy.spatial import cKDTree

MM = 0.001


def smin(a, b, k):
    if k <= 0: return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def sstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)


def catmull(P, n=10):
    P = np.asarray(P, float); P = np.vstack([2 * P[0] - P[1], P, 2 * P[-1] - P[-2]]); out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for t in np.linspace(0, 1, n, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-2]); return np.array(out)


def tube(p, C, R):
    """Union of linearly tapered capsules along polyline C (k,3) with radii R (k,)."""
    d = np.full(len(p), 1e9)
    for a, b, ra, rb in zip(C[:-1], C[1:], R[:-1], R[1:]):
        ba = b - a; L2 = ba @ ba; pa = p - a; h = np.clip(pa @ ba / L2, 0, 1)
        d = np.minimum(d, np.linalg.norm(pa - h[:, None] * ba, axis=1) - (ra + (rb - ra) * h))
    return d


def ellipse_d(x, y, a, b):
    """Approximate signed distance to an ellipse with half axes a, b (scaled-radius form, gradient-normalised)."""
    r = np.sqrt((x / a) ** 2 + (y / b) ** 2) + 1e-12
    g = np.sqrt((x / a ** 2) ** 2 + (y / b ** 2) ** 2) + 1e-12
    return (r - 1) * r / g


class Paw:
    def __init__(s, kind, P, base):
        s.kind = kind; p = P[kind]; s.p = p
        w = base['world']; tris = base['tris']
        # leg axis from two measured leg-section centres (mm)
        c_hi = np.array(p['leg_hi']) * MM; c_lo = np.array(p['leg_lo']) * MM
        a = c_lo - c_hi; s.a = a / np.linalg.norm(a)          # points down the leg
        s.cut = c_hi + (c_lo - c_hi) * ((p['cut_z'] * MM - c_hi[2]) / (c_lo[2] - c_hi[2]))
        # paw frame: forward f (horizontal), lateral l (outward, +x for the left paw), up z
        ang = np.radians(p['heading_deg']); s.f = np.array([np.sin(ang), -np.cos(ang), 0.0])
        s.l = np.array([-s.f[1], s.f[0], 0.0]);
        if s.l[0] < 0: s.l = -s.l
        # where the leg axis meets the ground: the heel; paw origin O = toe tip line on the ground
        tg = -s.cut[2] / s.a[2]; s.heel = s.cut + tg * s.a; s.heel[2] = 0
        s.O = s.heel + s.f * (p['heel_to_tip'] * MM) + s.l * (p['lateral_shift'] * MM)
        # leg surface samples (sculpt) near the join for the signed distance, and the fitted section ellipse
        near = np.linalg.norm(w - s.cut, axis=1) < p['leg_sample_r'] * MM
        T = tris[near[tris].all(1)]; s.leg_samples(w, T)
        s.fit_section(w, T)
        s.digits = s.make_digits()

    # ---------- leg ----------
    def leg_samples(s, w, T):
        A, B, C = w[T[:, 0]], w[T[:, 1]], w[T[:, 2]]; n = np.cross(B - A, C - A); area = np.linalg.norm(n, axis=1)
        n = n / np.maximum(area[:, None], 1e-15)
        k = np.maximum(1, (area / 2 / (0.25 * MM) ** 2).astype(int))
        idx = np.repeat(np.arange(len(T)), k); r1 = np.random.default_rng(0).random(len(idx)); r2 = np.random.default_rng(1).random(len(idx))
        sq = np.sqrt(r1); pts = A[idx] * (1 - sq)[:, None] + B[idx] * (sq * (1 - r2))[:, None] + C[idx] * (sq * r2)[:, None]
        pts = np.vstack([pts, A, B, C]); nn = np.vstack([n[idx], n, n, n])
        s.ltree = cKDTree(pts); s.lpts = pts; s.lnrm = nn

    def leg_mesh_d(s, q):
        d, i = s.ltree.query(q, k=1); sg = np.sign(((q - s.lpts[i]) * s.lnrm[i]).sum(1)); return d * np.where(sg == 0, 1, sg)

    def fit_section(s, w, T):
        """Section of the sculpt leg in the join plane: centre and half axes along e1 (lateral in plane) and e2."""
        e1 = np.cross(s.a, [0, 0, 1.0]); e1 /= np.linalg.norm(e1); e2 = np.cross(s.a, e1); s.e1, s.e2 = e1, e2
        rows = []
        for dt in (0.0,):
            p0 = s.cut + s.a * dt; sd = (w - p0) @ s.a; t = T[(np.sign(sd[T]).min(1) < 0) & (np.sign(sd[T]).max(1) > 0)]
            pts = []
            for i0, i1 in ((0, 1), (1, 2), (2, 0)):
                A, B = w[t[:, i0]], w[t[:, i1]]; sa, sb = sd[t[:, i0]], sd[t[:, i1]]; m = sa * sb < 0
                f = sa[m] / (sa[m] - sb[m]); pts.append(A[m] + (B[m] - A[m]) * f[:, None])
            pts = np.vstack(pts); pts = pts[(np.linalg.norm(pts - p0, axis=1) < s.p.get('sec_r', 40) * MM) & (pts[:, 0] > 0)]
            x, y = (pts - p0) @ e1, (pts - p0) @ e2; rows.append((x, y, pts))
        x, y, pts = rows[0]; cx, cy = 0.5 * (x.max() + x.min()), 0.5 * (y.max() + y.min())
        s.sec_c = s.cut + cx * e1 + cy * e2; s.sec_a = 0.5 * (x.max() - x.min()); s.sec_b = 0.5 * (y.max() - y.min()); s.sec_pts = pts

    def leg_d(s, q):
        p = s.p; t = (q - s.cut) @ s.a  # >0 below the plane
        r = q - s.sec_c; x, y = r @ s.e1, r @ s.e2
        k = 1 + p['leg_flare'] * sstep(p['leg_flare_t'][0] * MM, p['leg_flare_t'][1] * MM, t)  # widen towards the heel
        dt = ellipse_d(x, y, s.sec_a * k, s.sec_b * k * p.get('leg_depth_scale', 1.0))
        out = dt.copy(); band = t < p['mesh_hand_t'][1] * MM
        if band.any():
            dm = s.leg_mesh_d(q[band]); wgt = sstep(p['mesh_hand_t'][0] * MM, p['mesh_hand_t'][1] * MM, t[band])
            out[band] = dm * (1 - wgt) + dt[band] * wgt
        return out

    # ---------- foot ----------
    def local(s, q):
        r = q - s.O; return r @ s.f, r @ s.l, q[:, 2]

    def foot_d(s, q):
        p = s.p['foot']; u, v, z = s.local(q); u_mm = u / MM
        U = np.array(p['u'], float); o = np.argsort(U); U = U[o]; uc = np.clip(u_mm, U[0], U[-1])
        g = lambda k, dflt=0.0: np.interp(uc, U, np.array(p.get(k, [dflt] * len(U)), float)[o])
        hw = g('half_width') * MM; top = g('top') * MM; vc = g('v_center') * MM
        bot = -p['below'] * MM; zc = 0.5 * (top + bot); hh = 0.5 * (top - bot)
        e = ellipse_d(v - vc, z - zc, hw, hh); du = (u_mm - uc) * MM
        return np.where(np.abs(du) > 0, np.sqrt(np.maximum(e, 0) ** 2 + du ** 2) + np.minimum(e, 0), e)

    # ---------- digits ----------
    def make_digits(s):
        p = s.p; dg = p['digits']; out = []
        for i in range(4):
            v0 = dg['v'][i] * MM; u0 = dg['tip_u'][i] * MM; spl = np.radians(dg['splay_deg'][i]); sc = dg['scale'][i]
            f2 = s.f * np.cos(spl) + s.l * np.sin(spl)
            tipxy = s.O + s.l * v0 + s.f * u0
            def W(uu, zz):
                return tipxy + f2 * (uu * sc * MM) + np.array([0, 0, 1.0]) * (zz * sc * MM)
            C = catmull([W(u, z) for u, z, r in dg['curve']], 8); R = np.interp(np.linspace(0, len(dg['curve']) - 1, len(C)), np.arange(len(dg['curve'])), [r * sc * MM for u, z, r in dg['curve']])
            pad = [W(u, z) for u, z, r in dg['pad']]; padR = [r * sc * MM for u, z, r in dg['pad']]
            out.append(dict(C=C, R=R, pad=np.array(pad), padR=np.array(padR), f=f2, tip=tipxy, sc=sc, v=v0))
        return out

    def digit_d(s, q, D):
        d = tube(q, D['C'], D['R']); dp = tube(q, D['pad'], D['padR']); return smin(d, dp, s.p['k_pad'] * MM)

    # ---------- whole ----------
    def bbox(s):
        pts = [s.O + s.l * (x * MM) + s.f * (y * MM) for x in (-40, 40) for y in (-15, 28)]
        pts += [s.heel + s.l * (x * MM) + s.f * (y * MM) for x in (-45, 45) for y in (-45, 30)]
        pts += [s.cut + np.array(d) * MM for d in ([45, 45, 0], [-45, -45, 0])]
        pts = np.array(pts); lo = np.r_[pts[:, :2].min(0), -0.004]; hi = np.r_[pts[:, :2].max(0), s.cut[2] + 0.035]
        return lo, hi

    def sdf(s, q):
        p = s.p; out = np.empty(len(q))
        for i0 in range(0, len(q), 400000):
            x = q[i0:i0 + 400000]
            body = smin(s.leg_d(x), s.foot_d(x), p['k_leg_foot'] * MM)
            dig = None
            for D in s.digits:
                dd = s.digit_d(x, D); dig = dd if dig is None else smin(dig, dd, p['k_digit_digit'] * MM)
            f = smin(body, dig, p['k_digit_foot'] * MM)
            # knuckle-to-foot crease: subtract a soft groove just behind the knuckle row is avoided; the dip comes from the forms
            f = smax(f, -x[:, 2], p['k_sole'] * MM)                     # flat sole on the ground
            t = (x - s.cut) @ s.a; f = np.maximum(f, -t)                   # cut at the join plane (cap)
            out[i0:i0 + 400000] = f
        return out


def surface_nets(F, X0, h):
    nx, ny, nz = F.shape; inside = F < 0
    cell_sum = np.zeros((nx - 1, ny - 1, nz - 1, 3)); cell_cnt = np.zeros((nx - 1, ny - 1, nz - 1))
    I, J, K = np.meshgrid(np.arange(nx), np.arange(ny), np.arange(nz), indexing='ij')
    quads = []
    for ax in range(3):
        sl0 = [slice(None)] * 3; sl1 = [slice(None)] * 3; sl0[ax] = slice(0, -1); sl1[ax] = slice(1, None)
        a, b = F[tuple(sl0)], F[tuple(sl1)]; ch = (a < 0) != (b < 0)
        idx = np.argwhere(ch); fa, fb = a[ch], b[ch]; t = fa / (fa - fb)
        pos = idx.astype(float); pos[:, ax] += t
        # each edge touches up to 4 cells: the other two axes at offsets 0 / -1
        o = [x for x in range(3) if x != ax]
        for d1 in (0, -1):
            for d2 in (0, -1):
                c = idx.copy(); c[:, o[0]] += d1; c[:, o[1]] += d2
                ok = (c >= 0).all(1) & (c[:, 0] < nx - 1) & (c[:, 1] < ny - 1) & (c[:, 2] < nz - 1)
                np.add.at(cell_sum, (c[ok, 0], c[ok, 1], c[ok, 2]), pos[ok]); np.add.at(cell_cnt, (c[ok, 0], c[ok, 1], c[ok, 2]), 1)
        # quads: interior edges only (all four cells exist)
        ok = np.ones(len(idx), bool)
        for x in o: ok &= (idx[:, x] >= 1) & (idx[:, x] < F.shape[x] - 1)
        e = idx[ok]; inn = (a[ch] < 0)[ok]
        def cid(d1, d2):
            c = e.copy(); c[:, o[0]] += d1; c[:, o[1]] += d2; return c
        q = np.stack([cid(-1, -1), cid(0, -1), cid(0, 0), cid(-1, 0)], 1)  # (m,4,3)
        # orientation so normals point outward (from inside to outside along +ax when a is inside)
        flip = ~inn if ax != 1 else inn
        q[flip] = q[flip][:, ::-1]
        quads.append(q)
    act = cell_cnt > 0; vid = -np.ones(act.shape, np.int64); vid[act] = np.arange(act.sum())
    V = X0 + (cell_sum[act] / cell_cnt[act][:, None]) * h
    Q = np.vstack(quads); Qi = vid[Q[..., 0], Q[..., 1], Q[..., 2]]
    return V, Qi


def check_manifold(Q, nv):
    e = np.r_[Q[:, [0, 1]], Q[:, [1, 2]], Q[:, [2, 3]], Q[:, [3, 0]]]; es = np.sort(e, 1)
    u, cnt = np.unique(es, axis=0, return_counts=True)
    # directed edge consistency: each directed edge once
    ud, cd = np.unique(e, axis=0, return_counts=True)
    used = np.zeros(nv, bool); used[Q.ravel()] = True
    return dict(edges=len(u), nonmanifold_edges=int((cnt != 2).sum()), dup_directed=int((cd > 1).sum()), unused_verts=int((~used).sum()))


def relax_project(V, Q, f, iters=4, step=0.5):
    nv = len(V); e = np.r_[Q[:, [0, 1]], Q[:, [1, 2]], Q[:, [2, 3]], Q[:, [3, 0]]]
    from scipy.sparse import coo_matrix, diags
    A = coo_matrix((np.ones(2 * len(e)), (np.r_[e[:, 0], e[:, 1]], np.r_[e[:, 1], e[:, 0]])), shape=(nv, nv)).tocsr(); A.data[:] = 1
    Nb = diags(1 / np.maximum(np.asarray(A.sum(1)).ravel(), 1)) @ A
    def grad(X, eps=0.15 * MM):
        g = np.zeros_like(X)
        for k in range(3):
            d = np.zeros(3); d[k] = eps; g[:, k] = (f(X + d) - f(X - d)) / (2 * eps)
        return g
    def project(X, n=3):
        for _ in range(n):
            val = f(X); g = grad(X); g2 = np.maximum((g * g).sum(1), 1e-6); X = X - (val / g2)[:, None] * g
        return X
    V = project(V)
    for _ in range(iters):
        g = grad(V); nrm = g / np.maximum(np.linalg.norm(g, axis=1, keepdims=True), 1e-9)
        L = Nb @ V - V; L -= (L * nrm).sum(1, keepdims=True) * nrm; V = V + step * L; V = project(V, 2)
    return V


def claw_frame(v):
    c = v.mean(0); u, s_, vt = np.linalg.svd(v - c); e = vt[0]; t = (v - c) @ e
    ends = [v[np.abs(t - q) < 0.002] for q in (t.min(), t.max())]
    rad = [np.linalg.norm((x - x.mean(0)) - np.outer((x - x.mean(0)) @ e, e), axis=1).max() for x in ends]
    if rad[0] < rad[1]: e = -e; ends = ends[::-1]
    base = ends[0].mean(0); tip_end = ends[1].mean(0); return base, e, tip_end


def rot_between(a, b):
    a = a / np.linalg.norm(a); b = b / np.linalg.norm(b); v = np.cross(a, b); c = a @ b
    if np.linalg.norm(v) < 1e-9: return np.eye(3)
    K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]]); return np.eye(3) + K + K @ K * (1 / (1 + c))


def main(basep, paramsp, outp):
    base = dict(np.load(basep)); P = json.loads(open(paramsp).read()); out = {}; info = {}
    for kind in ('hind', 'fore'):
        pw = Paw(kind, P, base); lo, hi = pw.bbox(); h = P['grid_mm'] * MM
        n = np.ceil((hi - lo) / h).astype(int) + 3; X0 = lo - h
        gx = [X0[i] + h * np.arange(n[i]) for i in range(3)]
        G = np.stack(np.meshgrid(*gx, indexing='ij'), -1).reshape(-1, 3)
        F = pw.sdf(G).reshape(n)
        V, Q = surface_nets(F, X0, h)
        V = relax_project(V, Q, pw.sdf, iters=P.get('relax_iters', 4))
        chk = check_manifold(Q, len(V))
        # claws
        cv = base[P[kind]['claw_source']]; cb, ce, _ = claw_frame(cv); cl = []
        cpar = P[kind]['claw']
        for i, D in enumerate(pw.digits):
            pitch = np.radians(cpar['pitch_deg']); tgt = D['f'] * np.cos(pitch) - np.array([0, 0, 1.0]) * np.sin(pitch)
            Rm = rot_between(ce, tgt)
            seat = D['tip'] + D['f'] * (cpar['base_u'] * MM) + np.array([0, 0, cpar['base_z'] * MM])
            nvx = (cv - cb) @ Rm.T + seat
            if nvx[:, 2].min() < cpar['min_z'] * MM: nvx[:, 2] += cpar['min_z'] * MM - nvx[:, 2].min()
            M = np.eye(4); M[:3, :3] = Rm; M[:3, 3] = seat - Rm @ cb
            # verify rigid
            cl.append(M); out[f'{kind}_clawM_{i + 1}'] = M; out[f'{kind}_claw_{i + 1}'] = nvx
        out[f'{kind}_V'] = V; out[f'{kind}_Q'] = Q; out[f'{kind}_cut'] = pw.cut; out[f'{kind}_axis'] = pw.a; out[f'{kind}_O'] = pw.O
        out[f'{kind}_f'] = pw.f; out[f'{kind}_l'] = pw.l; out[f'{kind}_heel'] = pw.heel
        out[f'{kind}_tips'] = np.array([D['tip'] for D in pw.digits]); out[f'{kind}_secpts'] = pw.sec_pts
        e = np.r_[Q[:, [0, 1]], Q[:, [1, 2]]]; el = np.linalg.norm(V[e[:, 0]] - V[e[:, 1]], axis=1)
        info[kind] = dict(verts=len(V), quads=len(Q), manifold=chk, edge_mm=dict(mean=float(el.mean() / MM), p5=float(np.percentile(el, 5) / MM), p95=float(np.percentile(el, 95) / MM)),
                          cut_center_mm=(pw.cut / MM).round(1).tolist(), leg_axis=pw.a.round(4).tolist(), section_half_axes_mm=[pw.sec_a / MM, pw.sec_b / MM],
                          section_width_mm=float(2 * pw.sec_a / MM), heel_mm=(pw.heel / MM).round(1).tolist(), O_mm=(pw.O / MM).round(1).tolist())
        print(kind, json.dumps(info[kind]))
    np.savez_compressed(outp, **out); open(outp + '.json', 'w').write(json.dumps(info, indent=1))


if __name__ == '__main__':
    main(*sys.argv[1:4])
