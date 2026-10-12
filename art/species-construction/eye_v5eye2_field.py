"""Eyes v2 (Nick 2026-10-11, on v5m2): face surface first, then the eyes fitted to it.

Run with Blender (through loop_tools.py blender or a recipe step), on the v5m2 head (H44 output):
  --python eye_v5eye2_field.py -- --scene <head.blend> --out <new-dir> --spec <spec json> [--debug <npz>]

Nick: "I don't want there to be any weird divot around the eye socket. If you're trying to keep the eyeballs in place,
maybe that's the problem ... you can adjust the eyeballs, I don't care." Every earlier pass (v5e, v5t, v5t2, v5t3) held the
eye globes fixed and moved skin round them. The globes are thin curved lenses that wrap back onto the side of the head,
so the skin had to sink into pockets and folds round them. This step inverts that order.

1. Face surface. Per eye, a spherical grid of directions from a centre inside the head (`centre`, degrees `theta`, `phi`,
   step `step`). Each cell's radius is the first skin hit from outside. Cells whose hit lies within `margin` (front view)
   of the old opening outline are free; every other cell is held data. The radius is refit as a thin plate (data plus
   `alpha` times the squared Laplacian, conjugate gradients), so the whole eye region, sockets, pockets, rims and folds
   included, becomes the smoothest surface that continues the held face, forehead, cheek, temple and head side.
   Skin vertices whose direction falls within `margin` + `band` of the outline (one connected disc on the skin mesh) are
   laid back onto that surface: their directions are re-spread by a Tutte map (uniform weights, region edge fixed),
   blended back to their own directions across the outer `band`, so folded layers unfold; their radius is the filled
   radius inside `margin` and the original surface (ray cast) across the band. Region edge vertices do not move, and no
   vertex outside the region moves (exactly 0).
2. Eyes. The opening outline of each v5m2 eye in the front view (where globe or iris is hit before skin) and its visible
   dark band (opening outline minus the white and iris region) are measured in polar form round the opening centre.
   `trimOuter` pulls the outline in at the outer end (cosine bump of half width `trimWidth` degrees). Each eye globe is
   rebuilt as a closed lens on the new skin S: rings in the front view at fraction rho of the outline; the front sheet is
   S + n h(rho), h = `lensHeight` (1 - rho^2), so it stands proud inside the outline, meets the skin exactly on it, and
   runs under the skin out to `rhoMax`; the back sheet is S - n `backDepth`; a rim closes them. n is the normal of the
   front-view height field of S (central differences, `normalStep`). A ring lies exactly on the band's inner edge, so
   the dark band ('Upper emphasized eyelid') keeps v5m2's front-view width per angle, heavier on top. The iris and
   pupil keep their front-view position; each vertex keeps its depth offset from the globe front.

Writes head.blend, shape.glb, eye-v5eye2.json.
"""
import argparse
import json
import math
from pathlib import Path
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, require_single_closed_mesh, sha
from study_provenance import snapshot

DEFAULTS = {
    'centre': [0., 0., .03], 'theta': [-8., 88.], 'phi': [-52., 58.], 'step': .35,
    'margin': .045, 'band': .03, 'rMin': .12, 'alpha': 1., 'iters': 30000, 'tutteIters': 20000,
    'frontStep': .001, 'nTheta': 256, 'ringsIn': 28, 'ringsBand': 6, 'ringsOut': 6, 'rhoMax': 1.14,
    'lensHeight': .010, 'backDepth': .010, 'normalStep': .004, 'bandScale': 1., 'bandMin': .0008,
    'trimOuter': 0., 'trimWidth': 50., 'tutte': False, 'distance3d': True, 'bandSmooth': 9, 'outlineSmooth': 5,
}

argv = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--spec', type=Path, required=True)
parser.add_argument('--debug', type=Path, default=None)
args = parser.parse_args(argv)
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene, args.spec])
P = dict(DEFAULTS)
P.update({k: v for k, v in json.loads(args.spec.read_text()).items() if k != 'note'})
DBG = {}


def ss2(t, a, b):
    t = np.clip((t-a)/(b-a), 0, 1)
    return t*t*t*(t*(6*t-15)+10)


def world_points(o):
    n = len(o.data.vertices)
    c = np.empty(n*3)
    o.data.vertices.foreach_get('co', c)
    M = np.array(o.matrix_world)
    return c.reshape(-1, 3)@M[:3, :3].T+M[:3, 3]


def set_world_points(o, W):
    M = np.array(o.matrix_world)
    Mi = np.linalg.inv(M)
    o.data.vertices.foreach_set('co', (W@Mi[:3, :3].T+Mi[:3, 3]).ravel())
    o.data.update()




def tris_of(o):
    o.data.calc_loop_triangles()
    t = np.empty(len(o.data.loop_triangles)*3, dtype=np.int32)
    o.data.loop_triangles.foreach_get('vertices', t)
    pi = np.empty(len(o.data.loop_triangles), dtype=np.int32)
    o.data.loop_triangles.foreach_get('polygon_index', pi)
    return t.reshape(-1, 3), pi


def tree_from(V, T):
    return BVHTree.FromPolygons(V.tolist(), T.tolist())


def front_hit(tree, x, z):
    h = tree.ray_cast(Vector((x, -2., z)), Vector((0., 1., 0.)), 4.)
    return None if h[0] is None else h


def circ_smooth(a, k):
    if k <= 1:
        return a
    w = np.hanning(k+2)[1:-1]
    w /= w.sum()
    n = len(a)
    ap = np.concatenate([a[-k:], a, a[:k]])
    return np.convolve(ap, w, mode='same')[k:k+n]


def cg(Aop, b, x0, iters, tol=1e-14, Minv=None):
    x = x0.copy()
    r = b-Aop(x)
    z = r*Minv if Minv is not None else r
    p = z.copy()
    rz = (r*z).sum()
    b2 = max((b*b).sum(), 1e-30)
    it = 0
    for it in range(iters):
        Ap = Aop(p)
        st = rz/(p*Ap).sum()
        x += st*p
        r -= st*Ap
        if (r*r).sum() < tol*b2:
            break
        z = r*Minv if Minv is not None else r
        rz2 = (r*z).sum()
        p = z+(rz2/rz)*p
        rz = rz2
    return x, it+1


def bspline_lookup(grid, fi, fj):
    """Cubic B-spline (C2) lookup of a grid at fractional indices."""
    N0, N1 = grid.shape
    i0 = np.floor(fi).astype(int)
    j0 = np.floor(fj).astype(int)
    ti, tj = fi-i0, fj-j0

    def w(t):
        return [(1-t)**3/6, (3*t**3-6*t**2+4)/6, (-3*t**3+3*t**2+3*t+1)/6, t**3/6]
    wi, wj = w(ti), w(tj)
    out = np.zeros(len(fi))
    for p in range(4):
        ip = np.clip(i0-1+p, 0, N0-1)
        for q in range(4):
            jq = np.clip(j0-1+q, 0, N1-1)
            out += wi[p]*wj[q]*grid[ip, jq]
    return out


def bilinear(grid, fi, fj):
    N0, N1 = grid.shape
    i0 = np.clip(np.floor(fi).astype(int), 0, N0-2)
    j0 = np.clip(np.floor(fj).astype(int), 0, N1-2)
    ti, tj = np.clip(fi-i0, 0, 1), np.clip(fj-j0, 0, 1)
    return (grid[i0, j0]*(1-ti)*(1-tj)+grid[i0+1, j0]*ti*(1-tj)+grid[i0, j0+1]*(1-ti)*tj+grid[i0+1, j0+1]*ti*tj)


bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
head = bpy.data.objects['cleaned_head_with_openings']
require_single_closed_mesh(head, args.out, 'Head skin before eyes v2')
before = mesh_stats(head)
pts = world_points(head)
T, _ = tris_of(head)
skin_tree = tree_from(pts, T)
C = np.array(P['centre'], float)
record = {'eyes': {}}
SIDES = ('1', '-1')
globes = {s: bpy.data.objects[f'eye_globe_{s}'] for s in SIDES}
irises = {s: bpy.data.objects[f'iris_and_pupil_{s}'] for s in SIDES}
old_g = {}
for s in SIDES:
    gt, gp = tris_of(globes[s])
    pm = np.array([p.material_index for p in globes[s].data.polygons])
    old_g[s] = (tree_from(world_points(globes[s]), gt), pm[gp])
old_i = {s: tree_from(world_points(o), tris_of(o)[0]) for s, o in irises.items()}
E = np.sort(np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]]), 1)
E = np.unique(E, axis=0)
NA = int(P['nTheta'])
ANG = np.arange(NA)*2*math.pi/NA

# ---------------------------------------------------------------- 1. old openings in the front view, polar form
eye = {}
for s in SIDES:
    G = world_points(globes[s])
    lo, hi = G.min(0)-.004, G.max(0)+.004
    xs = np.arange(lo[0], hi[0], P['frontStep'])
    zs = np.arange(lo[2], hi[2], P['frontStep'])
    opn = np.zeros((len(xs), len(zs)), bool)
    wht = np.zeros_like(opn)
    gtree, gmat = old_g[s]
    for i, x in enumerate(xs):
        for j, z in enumerate(zs):
            hs = front_hit(skin_tree, x, z)
            hg = front_hit(gtree, x, z)
            hi_ = front_hit(old_i[s], x, z)
            ds = hs[3] if hs else 9.
            dg = hg[3] if hg else 9.
            di = hi_[3] if hi_ else 9.
            if min(dg, di) < ds:
                opn[i, j] = True
                wht[i, j] = di <= dg or gmat[hg[2]] == 0
    I_, J_ = np.nonzero(opn)
    e0 = np.array([xs[I_].mean(), zs[J_].mean()])

    def march(mask):
        R = np.zeros(NA)
        for k, a in enumerate(ANG):
            last = 0.
            for r in np.arange(.0, .25, .0004):
                x, z = e0[0]+r*math.cos(a), e0[1]+r*math.sin(a)
                i, j = int(round((x-xs[0])/P['frontStep'])), int(round((z-zs[0])/P['frontStep']))
                inside = 0 <= i < len(xs) and 0 <= j < len(zs) and mask[i, j]
                if inside:
                    last = r
                elif r > last+.006 and last > .02:
                    break
            R[k] = last
        return R
    Ro = circ_smooth(march(opn), int(P['outlineSmooth']))
    Rw = circ_smooth(march(wht), int(P['outlineSmooth']))
    wb = circ_smooth(np.maximum(Ro-Rw, P['bandMin']), int(P['bandSmooth']))
    o3 = []
    for k, a in enumerate(ANG):
        h = front_hit(skin_tree, e0[0]+Ro[k]*math.cos(a), e0[1]+Ro[k]*math.sin(a))
        o3.append(np.array(h[0]) if h else np.full(3, np.nan))
    eye[s] = {'e0': e0, 'Ro': Ro, 'Rw': Rw, 'wb': wb, 'sg': float(s), 'o3': np.array(o3)}
    DBG[f'opn{s}'] = opn
    DBG[f'wht{s}'] = wht
    DBG[f'Ro{s}'] = Ro
    DBG[f'Rw{s}'] = Rw
    DBG[f'e0{s}'] = e0


def outline_at(s, x, z, p3=None):
    """Distance beyond the old opening outline (negative inside) and the front-view angle. With `p3` (the points
    themselves) and `distance3d`, outside the outline the distance is the 3D distance to the outline curve on the
    old skin, so the margin does not run far back along the side of the head where the front view is grazing."""
    e = eye[s]
    dx, dz = x-e['e0'][0], z-e['e0'][1]
    a = np.mod(np.arctan2(dz, dx), 2*math.pi)
    fa = a/(2*math.pi)*NA
    k0 = np.floor(fa).astype(int) % NA
    t = fa-np.floor(fa)
    R = e['Ro'][k0]*(1-t)+e['Ro'][(k0+1) % NA]*t
    d2 = np.hypot(dx, dz)-R
    if p3 is not None and P['distance3d']:
        Q = p3.reshape(-1, 3)
        o3 = e['o3']
        dm = np.full(len(Q), np.inf)
        for c0 in range(0, len(o3), 32):
            dd = np.linalg.norm(Q[:, None, :]-o3[None, c0:c0+32, :], axis=2)
            dm = np.minimum(dm, np.nanmin(dd, axis=1))
        dm = dm.reshape(np.shape(x))
        d2 = np.where(d2 > 0, dm, d2)
    return d2, a


def margin_of(s, a, key):
    """Margin (or band) by direction from the eye centre: `key`, `key`Inner toward the nose, `key`Lower below."""
    inner = np.clip(-eye[s]['sg']*np.cos(a), 0, 1)
    lower = np.clip(-np.sin(a), 0, 1)
    m = P[key]*(1-inner)+P.get(key+'Inner', P[key])*inner
    if key+'Lower' in P:
        m = m*(1-lower)+P[key+'Lower']*lower
    return m


# ---------------------------------------------------------------- 2. filled face surface per eye
th = np.radians(np.arange(P['theta'][0], P['theta'][1]+1e-9, P['step']))
ph = np.radians(np.arange(P['phi'][0], P['phi'][1]+1e-9, P['step']))
NT, NP = len(th), len(ph)
TH, PH = np.meshgrid(th, ph, indexing='ij')
FILL = {}


def dirs(s, TH_, PH_):
    sg = float(s)
    return np.stack([sg*np.sin(TH_)*np.cos(PH_), -np.cos(TH_)*np.cos(PH_), np.sin(PH_)], -1)


def ray_r(tree, D):
    R = np.full(len(D), np.nan)
    Hp = np.full((len(D), 3), np.nan)
    for k, d in enumerate(D):
        h = tree.ray_cast(Vector(C+1.5*d), Vector(-d), 1.5)
        if h[0] is not None:
            R[k] = 1.5-h[3]
            Hp[k] = h[0]
    return R, Hp


def lap(z):
    zp = np.pad(z, 1, mode='edge')
    return zp[2:, 1:-1]+zp[:-2, 1:-1]+zp[1:-1, 2:]+zp[1:-1, :-2]-4*z


for s in SIDES:
    D = dirs(s, TH, PH).reshape(-1, 3)
    R0, Hp = ray_r(skin_tree, D)
    R0 = R0.reshape(NT, NP)
    Hp = Hp.reshape(NT, NP, 3)
    dl, a = outline_at(s, Hp[..., 0], Hp[..., 2], Hp)
    m = margin_of(s, a, 'margin')
    valid = np.isfinite(R0)
    free = valid & (dl < m) & (R0 > P['rMin'])
    h0 = np.where(valid, R0, np.nanmean(R0))
    dl = np.where(valid, dl, 9.)
    base = np.where(free, 0., h0)
    b = -lap(lap(base))[free]

    def Aop(x):
        z = np.zeros_like(h0)
        z[free] = x
        return lap(lap(z))[free]
    sol, its = cg(Aop, b, h0[free].copy(), int(P['iters']))
    Rf = h0.copy()
    Rf[free] = sol
    FILL[s] = {'R0': R0, 'Rf': Rf, 'dl': dl, 'free': free, 'm': m}
    record['eyes'][s] = {'fillIterations': its, 'freeCells': int(free.sum()),
                         'outwardFill': round(float((Rf-h0)[free].max()), 5), 'inwardFill': round(float((Rf-h0)[free].min()), 5)}
    DBG[f'R0{s}'] = R0
    DBG[f'Rf{s}'] = Rf
    DBG[f'free{s}'] = free
    DBG[f'dl{s}'] = dl
    DBG[f'Hp{s}'] = Hp

# ---------------------------------------------------------------- 3. skin laid onto the filled surface
nbr_rows = np.concatenate([E[:, 0], E[:, 1]])
nbr_cols = np.concatenate([E[:, 1], E[:, 0]])
new = pts.copy()
moved_any = np.zeros(len(pts), bool)
for s in SIDES:
    F = FILL[s]
    sg = float(s)
    rel = pts-C
    rv = np.linalg.norm(rel, axis=1)
    phv = np.arcsin(np.clip(rel[:, 2]/np.maximum(rv, 1e-9), -1, 1))
    thv = np.arctan2(sg*rel[:, 0], -rel[:, 1])
    fi = (thv-th[0])/(th[1]-th[0])
    fj = (phv-ph[0])/(ph[1]-ph[0])
    ing = (fi > 2) & (fi < NT-3) & (fj > 2) & (fj < NP-3) & (rv > P['rMin'])
    cand = np.where(ing)[0]
    dlv = bilinear(F['dl'], fi[cand], fj[cand])
    mv = bilinear(F['m'], fi[cand], fj[cand])
    _, av = outline_at(s, pts[cand, 0], pts[cand, 2])
    bandv = margin_of(s, av, 'band')
    reg = cand[dlv < mv+bandv]
    isreg = np.zeros(len(pts), bool)
    isreg[reg] = True
    ee = E[isreg[E[:, 0]] & isreg[E[:, 1]]]
    parent = np.arange(len(pts))

    def find(a_):
        root = a_
        while parent[root] != root:
            root = parent[root]
        while parent[a_] != root:
            parent[a_], a_ = root, parent[a_]
        return root
    for a_, b_ in ee:
        ra, rb = find(a_), find(b_)
        if ra != rb:
            parent[ra] = rb
    roots = np.array([find(v) for v in reg])
    ur, cnt = np.unique(roots, return_counts=True)
    keep = reg[roots == ur[cnt.argmax()]]
    isreg[:] = False
    isreg[keep] = True
    if moved_any[keep].any():
        raise ValueError('eye regions overlap')
    outside_nb = np.zeros(len(pts), bool)
    m_ = isreg[nbr_rows] & ~isreg[nbr_cols]
    outside_nb[nbr_rows[m_]] = True
    bnd = isreg & outside_nb
    interior = isreg & ~bnd
    loc = -np.ones(len(pts), int)
    ids = np.where(isreg)[0]
    loc[ids] = np.arange(len(ids))
    U0 = np.stack([thv[ids]*np.cos(phv[ids]), phv[ids]], 1)   # equal-area-ish: theta scaled by cos(phi)
    er = isreg[nbr_rows] & isreg[nbr_cols]
    rr, cc = loc[nbr_rows[er]], loc[nbr_cols[er]]
    deg = np.bincount(rr, minlength=len(ids)).astype(float)
    intl = interior[ids]

    def Lap(x):
        return deg*x-np.bincount(rr, weights=x[cc], minlength=len(ids))
    UT = U0.copy()
    its = 0
    for c_ in (range(2) if P['tutte'] else []):
        fixed = np.where(intl, 0., U0[:, c_])
        bb = -Lap(fixed)[intl]

        def Aop(x):
            z = np.zeros(len(ids))
            z[intl] = x
            return Lap(z)[intl]
        sol, its = cg(Aop, bb, U0[intl, c_], int(P['tutteIters']), tol=1e-18, Minv=1/deg[intl])
        UT[intl, c_] = sol
    dlr = bilinear(F['dl'], fi[ids], fj[ids])
    mr = bilinear(F['m'], fi[ids], fj[ids])
    _, ar = outline_at(s, pts[ids, 0], pts[ids, 2])
    br = margin_of(s, ar, 'band')
    bw = 1-ss2(dlr, mr, mr+br)
    bw[~intl] = 0.
    Un = U0+bw[:, None]*(UT-U0)
    phn = Un[:, 1]
    thn = Un[:, 0]/np.cos(phn)
    D = dirs(s, thn, phn)
    fi2 = (thn-th[0])/(th[1]-th[0])
    fj2 = (phn-ph[0])/(ph[1]-ph[0])
    rfill = bspline_lookup(F['Rf'], fi2, fj2)
    rexact, _ = ray_r(skin_tree, D)
    dl2 = bilinear(F['dl'], fi2, fj2)
    m2 = bilinear(F['m'], fi2, fj2)
    fw = 1-ss2(dl2, m2, m2+br)
    rexact = np.where(np.isfinite(rexact), rexact, rfill)
    rn = fw*rfill+(1-fw)*rexact
    P_new = C+D*rn[:, None]
    mv_ = bw > 0
    new[ids[mv_]] = P_new[mv_]
    moved_any[ids[mv_]] = True
    record['eyes'][s].update({'regionVertices': int(len(ids)), 'boundary': int(bnd.sum()), 'tutteIterations': its,
                              'moved': int(mv_.sum())})
    DBG[f'reg{s}'] = ids
    DBG[f'U0{s}'] = U0
    DBG[f'Un{s}'] = Un

tri_m = moved_any[T].any(1)
Tm = T[tri_m]
n_new = np.cross(new[Tm[:, 1]]-new[Tm[:, 0]], new[Tm[:, 2]]-new[Tm[:, 0]])
cen = new[Tm].mean(1)-C
outward = (n_new*cen).sum(1)
record['skinFacesInRegion'] = int(len(Tm))
record['skinFacesFacingInward'] = int((outward < 0).sum())
DBG['inwardFaces'] = Tm[outward < 0]
disp = np.linalg.norm(new-pts, axis=1)
set_world_points(head, new)
record['skinDisplacement'] = {'moved': int((disp > 0).sum()), 'max': round(float(disp.max()), 5),
                              'median': round(float(np.median(disp[disp > 0])), 6) if (disp > 0).any() else 0.}
DBG['disp'] = disp
skin_tree = tree_from(new, T)


# ---------------------------------------------------------------- 4. eyes fitted to the new face
def front_y(tree, x, z):
    h = front_hit(tree, x, z)
    return (np.nan, None) if h is None else (h[0].y, h)


def surf(x, z):
    y, h = front_y(skin_tree, x, z)
    if h is None:
        raise ValueError(f'no skin under the eye at {x:.4f} {z:.4f}')
    st = P['normalStep']
    fx = (front_y(skin_tree, x+st, z)[0]-front_y(skin_tree, x-st, z)[0])/(2*st)
    fz = (front_y(skin_tree, x, z+st)[0]-front_y(skin_tree, x, z-st)[0])/(2*st)
    n = np.array([fx, -1., fz])
    return np.array(h[0]), n/np.linalg.norm(n)


for s in SIDES:
    e = eye[s]
    sg = e['sg']
    ao = 0. if sg > 0 else math.pi
    da = np.angle(np.exp(1j*(ANG-ao)))
    tw = math.radians(P['trimWidth'])
    bump = np.where(np.abs(da) < tw, np.cos(np.clip(da/tw, -1, 1)*math.pi/2)**2, 0.)
    Rn = e['Ro']*(1-P['trimOuter']*bump)
    wb = e['wb']*P['bandScale']
    rho_b = 1-wb/Rn
    ni, nb, no = int(P['ringsIn']), int(P['ringsBand']), int(P['ringsOut'])
    rings = [rho_b*((k+1)/ni)**.85 for k in range(ni)]
    rings += [rho_b+(1-rho_b)*k/nb for k in range(1, nb+1)]
    rings += [np.full(NA, 1+(P['rhoMax']-1)*(k/no)**1.3) for k in range(1, no+1)]
    rings = np.array(rings)
    iband0 = ni-1
    NR = len(rings)
    front_pts = np.zeros((NR, NA, 3))
    back_pts = np.zeros((NR, NA, 3))
    SP = np.zeros((NR, NA, 3))
    SN = np.zeros((NR, NA, 3))
    for k in range(NR):
        for j, a in enumerate(ANG):
            SP[k, j], SN[k, j] = surf(e['e0'][0]+rings[k, j]*Rn[j]*math.cos(a), e['e0'][1]+rings[k, j]*Rn[j]*math.sin(a))
    p0, n0 = surf(*e['e0'])
    H = P['lensHeight']*(1-rings*rings)
    lift = np.zeros_like(rings)
    q0 = 0.
    if P.get('baseSmooth'):
        # the lens base inside the opening eased toward a quadratic fit of the face there (smooth iris and white),
        # back to the face itself at the outline; never more than half the bulge behind the face
        m = rings <= P['baseSmooth'][1]
        X_, Z_, Y_ = SP[m][:, 0], SP[m][:, 2], SP[m][:, 1]
        A_ = np.c_[np.ones(len(X_)), X_, Z_, X_*X_, X_*Z_, Z_*Z_]
        cq, *_ = np.linalg.lstsq(A_, Y_, rcond=None)

        def qy(x, z):
            return cq[0]+cq[1]*x+cq[2]*z+cq[3]*x*x+cq[4]*x*z+cq[5]*z*z
        w = 1-ss2(rings, *P['baseSmooth'])
        lift = w*np.maximum(SP[..., 1]-qy(SP[..., 0], SP[..., 2]), -.5*H)
        q0 = max(p0[1]-qy(p0[0], p0[2]), -.5*P['lensHeight'])
    front_pts = SP+SN*H[..., None]-lift[..., None]*np.array([0., 1., 0.])
    back_pts = SP-SN*P['backDepth']
    rho_of = rings
    V = [p0+n0*P['lensHeight']-np.array([0., q0, 0.])]+list(front_pts.reshape(-1, 3))+[p0-n0*P['backDepth']]+list(back_pts.reshape(-1, 3))
    off_b = 1+NR*NA+1

    def fid(k, j):
        return 1+k*NA+(j % NA)

    def bid(k, j):
        return off_b+k*NA+(j % NA)
    faces, mats = [], []
    for j in range(NA):
        faces.append((0, fid(0, j), fid(0, j+1)))
        mats.append(0)
    for k in range(NR-1):
        for j in range(NA):
            faces.append((fid(k, j), fid(k+1, j), fid(k+1, j+1), fid(k, j+1)))
            mats.append(1 if k >= iband0 else 0)
    for j in range(NA):
        faces.append((fid(NR-1, j), bid(NR-1, j), bid(NR-1, j+1), fid(NR-1, j+1)))
        mats.append(1)
    for k in range(NR-1):
        for j in range(NA):
            faces.append((bid(k, j), bid(k, j+1), bid(k+1, j+1), bid(k+1, j)))
            mats.append(0)
    for j in range(NA):
        faces.append((off_b-1, bid(0, j+1), bid(0, j)))
        mats.append(0)
    g = globes[s]
    Mi = np.linalg.inv(np.array(g.matrix_world))
    Vl = np.array(V)@Mi[:3, :3].T+Mi[:3, 3]
    me = bpy.data.meshes.new(f'eye_globe_{s}_v2')
    me.from_pydata(Vl.tolist(), [], faces)
    for mat in g.data.materials:
        me.materials.append(mat)
    me.polygons.foreach_set('material_index', np.array(mats, dtype=np.int32))
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
    old_me = g.data
    g.data = me
    bpy.data.meshes.remove(old_me)
    require_single_closed_mesh(g, args.out, f'eye globe {s} v2')
    ntree = tree_from(world_points(g), tris_of(g)[0])
    IV = world_points(irises[s])
    IVn = IV.copy()
    miss = 0
    for k, v in enumerate(IV):
        yo, _ = front_y(old_g[s][0], v[0], v[2])
        yn, _ = front_y(ntree, v[0], v[2])
        if np.isfinite(yo) and np.isfinite(yn):
            IVn[k, 1] = v[1]+(yn-yo)
        else:
            miss += 1
    set_world_points(irises[s], IVn)
    outside = front_pts[rings > 1.0001]
    ahead = 0
    for v in outside:
        yS, _ = front_y(skin_tree, v[0], v[2])
        if np.isfinite(yS) and v[1] < yS-1e-6:
            ahead += 1
    record['eyes'][s].update({
        'openingCentre': e['e0'].round(4).tolist(), 'outlineMaxRadius': round(float(e['Ro'].max()), 4),
        'globeVertices': len(V), 'globeFaces': len(faces), 'irisShiftMax': round(float(np.abs(IVn[:, 1]-IV[:, 1]).max()), 5),
        'irisMissed': miss, 'globeAheadOfSkinOutsideOpening': ahead,
        'bandWidthTopBottom': [round(float(wb[NA//4]), 4), round(float(wb[3*NA//4]), 4)],
    })
    DBG[f'Rn{s}'] = Rn
    DBG[f'wb{s}'] = wb

require_single_closed_mesh(head, args.out, 'Head skin eyes v2')
if args.debug:
    np.savez_compressed(args.debug, **DBG)
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'eye-v5eye2.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Eyes v2 (Nick 2026-10-11): the skin over each eye region refilled as the smooth continuation of the face, '
             'then each eye globe rebuilt as a lens on that surface with the v5m2 front-view opening and band',
    'parameters': P, 'parts': record, 'skinBefore': before, 'skinAfter': mesh_stats(head),
    'outputs': {q.name: sha(q) for q in args.out.iterdir() if q.suffix in ['.glb', '.blend']},
}, indent=2, default=float)+'\n')
print('eyes v2 ok', json.dumps(record, default=float), flush=True)
