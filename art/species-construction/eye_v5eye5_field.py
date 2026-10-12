"""Eyes v5 (Nick 2026-10-12, on v5eye4): v5eye4 plus `innerSoft`: on the nose side of each eye the
edge of the free socket region was a hard hold, which left a narrow convex ridge that read as a faint shading line down
the inner side of the eye. With `innerSoft` = {"width": w, "weight": k} the cells up to w beyond that edge (toward the
nose) are also solved, pulled toward the face by a data weight rising from 0 to k across them, so the socket fill
meets the bridge without a curvature step. Everything else is v5eye4.

Eyes v4 (Nick 2026-10-12, on v5eye3): finishing pass on the approved v5eye3 eyes; v5eye3 with three additions.

The ball, its axis and the opening are built exactly as in v5eye3 (same keys, same values). Added: `lidEdgeBottom`
(the lid roll width eases from it at the bottom of the rim to `lidEdge` at the top, like the thickness), `irisDome`
(scales the iris and pupil height above the globe front, 1 = v5eye3) and `irisMaterial` (Principled BSDF inputs set
on the iris material, for example a softer clear coat). Below is the v5eye3 description.

Eyes v3 (Nick 2026-10-12, on v5eye2): regular eyeballs in a socket shaped to cradle them.

Run with Blender (through loop_tools.py blender or a recipe step), on the v5eye2 head (H49 output):
  --python eye_v5eye4_field.py -- --scene <head.blend> --out <new-dir> --spec <spec json> [--debug <npz>]

Nick on v5eye2: "much better ... but it still seems to be causing the eyeball shape to warp into this odd organic shape
that looks like Salvador Dali's melting clocks". v5eye2 traced the v5m2 front-view outline angle by angle onto a curved
face and built the eye as an offset of that face, so from three-quarter, side and top the eye was a warped leaf. Here
the eye is built the way a character modeler would:

1. Eyeball: one regular ellipsoid per eye, exact mirror left to right. Frame: axis n (outward `axis` [degrees outward
   from straight ahead, degrees up]), u horizontal in the rim plane pointing outward, v = n x u. The opening is the
   cut of the ball by a plane normal to its axis (polar angle `theta0` on the unit-sphere parametrization), so the rim
   is a planar ellipse with semi-axes a sin(theta0), b sin(theta0). The rim's front projection is a regular ellipse
   fitted (second moments) to the v5eye2 opening, mirrored and averaged over both eyes (`opening` overrides it:
   [centre x, centre z, half width, half height]). The rim plane sits where it clears the v5eye2 face along the
   whole rim (`rimLift` more). Semi-axes: a = rim half width / sin(theta0), b likewise, c = `depth`; centre on the
   axis c cos(theta0) behind the rim plane.
2. Lids and socket: per eye, a spherical grid of directions from `centre`. Where a direction meets the ball within
   `lidZone` of the rim (measured on the ball, negative inside the opening), the skin radius is the ball's plus
   `lidThickness` tanh(d / `lidEdge`) (with `lidThicknessBottom`, the thickness eases from that at the bottom of the rim
   to `lidThickness` at the top, so the lower lid lies flatter into the cheek): an even lid that hugs the ball and rolls in over the rim, and skin that dives
   under the ball inside the opening. Every other cell inside the eye mask (v5eye2's: within `margin` of the old
   opening outline, `marginInner` toward the nose) is free; a thin plate fills it between the lids and the held face,
   with the ball as an obstacle (cells where the fill would come within `lidThickness` of the covered ball are held
   there and the plate re-solved), so the brow, lower lid fold and temple cradle the ball. Skin vertices keep their
   direction; their radius is the analytic lid within the lid zone and the filled radius beyond, blended back to the
   face over `band`. Nothing outside the mask moves.
3. Band: the dark outline ('Upper emphasized eyelid') is a band on the ball just inside the lid edge, width
   `bandBottom` + (`bandTop` - `bandBottom`) ((1 + sin psi) / 2)^`bandPow` (psi the angle round the rim from the outer
   corner), heaviest along the top lid. Iris and pupil keep their front-view place and their depth offset from the
   globe front.

Writes head.blend, shape.glb, eye-v5eye3.json.
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
    'margin': .06, 'marginInner': .025, 'band': .035, 'bandInner': .02, 'rMin': .12, 'iters': 30000,
    'frontStep': .001, 'nTheta': 256, 'outlineSmooth': 7, 'bandSmooth': 17, 'bandMin': .0008, 'distance3d': True,
    'opening': None, 'axis': [21.5, -6.], 'theta0': 50., 'depth': .08, 'rimLift': 0.,
    'lidThickness': .004, 'lidEdge': .0015, 'lidZone': .010, 'obstacleRounds': 12,
    'bandTop': .010, 'bandBottom': .0015, 'bandPow': 1.5, 'nPsi': 256, 'refine': 0, 'refineBand': [-.006, .012], 'lidEdgeBottom': None, 'irisDome': 1., 'irisMaterial': None, 'innerSoft': None,
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



# ---------------------------------------------------------------- 2. the eyeball: regular, exact mirror
def polygon_moments(Q):
    x, y = Q[:, 0], Q[:, 1]
    x1, y1 = np.roll(x, -1), np.roll(y, -1)
    cr = x*y1-x1*y
    area = cr.sum()/2
    mx = ((x+x1)*cr).sum()/(6*area)
    my = ((y+y1)*cr).sum()/(6*area)
    ixx = ((x*x+x*x1+x1*x1)*cr).sum()/(12*area)-mx*mx
    iyy = ((y*y+y*y1+y1*y1)*cr).sum()/(12*area)-my*my
    return np.array([mx, my]), ixx, iyy


if P['opening']:
    CX, CZ, A_, B_ = P['opening']
else:
    mom = {}
    for s in SIDES:
        e = eye[s]
        mom[s] = polygon_moments(np.c_[e['e0'][0]+e['Ro']*np.cos(ANG), e['e0'][1]+e['Ro']*np.sin(ANG)])
    CX = (mom['1'][0][0]-mom['-1'][0][0])/2
    CZ = (mom['1'][0][1]+mom['-1'][0][1])/2
    A_ = 2*math.sqrt((mom['1'][1]+mom['-1'][1])/2)
    B_ = 2*math.sqrt((mom['1'][2]+mom['-1'][2])/2)
al, be = math.radians(P['axis'][0]), math.radians(P['axis'][1])
n_ = np.array([math.sin(al)*math.cos(be), -math.cos(al)*math.cos(be), math.sin(be)])
u_ = np.cross([0., 0., 1.], n_)
u_ /= np.linalg.norm(u_)
v_ = np.cross(n_, u_)
tt_ = np.linspace(0, 2*math.pi, 361)[:-1]
rim_face = []
for s in SIDES:
    sg = float(s)
    for t_ in tt_:
        h = front_hit(skin_tree, sg*(CX+A_*math.cos(t_)), CZ+B_*math.sin(t_))
        if h:
            q = np.array(h[0])
            q[0] *= sg   # both sides mirrored onto the right eye
            rim_face.append(q)
rim_face = np.array(rim_face)
c0_ = rim_face.mean(0)
off_ = ((rim_face-c0_)@n_).max()+P['rimLift']
p0_ = c0_+off_*n_


def lift(x, z):
    return np.array([x, p0_[1]-((x-p0_[0])*n_[0]+(z-p0_[2])*n_[2])/n_[1], z])


ctr_ = lift(CX, CZ)
a_r, b_r = A_/abs(u_[0]), B_/abs(v_[2])
TH0 = math.radians(P['theta0'])
BA, BB, BC = a_r/math.sin(TH0), b_r/math.sin(TH0), P['depth']
O_ = ctr_-n_*BC*math.cos(TH0)
MIR = np.array([-1., 1., 1.])
BALL = {'1': (O_, u_, v_, n_), '-1': (O_*MIR, u_*MIR, v_*MIR, n_*MIR)}
lift_face = np.array([lift(q[0], q[2]) for q in rim_face])
record['ball'] = {
    'semiAxes': [round(BA, 4), round(BB, 4), round(BC, 4)], 'centreRight': O_.round(4).tolist(), 'axisRight': n_.round(4).tolist(),
    'axisDegrees': {'outward': P['axis'][0], 'up': P['axis'][1]}, 'theta0': P['theta0'],
    'rimSemiAxes': [round(a_r, 4), round(b_r, 4)], 'rimCentreRight': ctr_.round(4).tolist(),
    'capHeight': round(BC*(1-math.cos(TH0)), 4), 'frontOpening': [round(CX, 4), round(CZ, 4), round(A_, 4), round(B_, 4)],
    'rimAboveFace': {'max': round(float(((lift_face-rim_face)@n_).max()), 4), 'min': round(float(((lift_face-rim_face)@n_).min()), 4)},
}


def ball_local(s, Q):
    O, u, v, n = BALL[s]
    d = Q-O
    return np.stack([d@u/BA, d@v/BB, d@n/BC], -1)


def ray_ball_exit(s, Or, D):
    O, u, v, n = BALL[s]
    d0 = Or-O
    pl = np.stack([d0@u/BA, d0@v/BB, d0@n/BC], -1)
    dl_ = np.stack([D@u/BA, D@v/BB, D@n/BC], -1)
    qa = (dl_*dl_).sum(-1)
    qb = 2*(pl*dl_).sum(-1)
    qc = (pl*pl).sum(-1)-1
    disc = qb*qb-4*qa*qc
    t = (-qb+np.sqrt(np.maximum(disc, 0)))/(2*qa)
    return np.where(disc > 0, t, np.nan)


def rim_dist(Pl):
    th_ = np.arccos(np.clip(Pl[..., 2], -1, 1))
    psi = np.arctan2(Pl[..., 1], Pl[..., 0])
    L = np.sqrt((BA*math.cos(TH0)*np.cos(psi))**2+(BB*math.cos(TH0)*np.sin(psi))**2+(BC*math.sin(TH0))**2)
    return (th_-TH0)*L, psi


def lid_t(psi):
    tb_ = P.get('lidThicknessBottom')
    if tb_ is None:
        return np.full(np.shape(psi), P['lidThickness'])
    return tb_+(P['lidThickness']-tb_)*((1+np.sin(psi))/2)


def lid_e(psi):
    eb = P.get('lidEdgeBottom')
    if eb is None:
        return np.full(np.shape(psi), P['lidEdge'])
    return eb+(P['lidEdge']-eb)*((1+np.sin(psi))/2)


def lidprof(ds, psi):
    return lid_t(psi)*np.tanh(ds/lid_e(psi))


# ---------------------------------------------------------------- 3. lids and socket on the spherical grid
th = np.radians(np.arange(P['theta'][0], P['theta'][1]+1e-9, P['step']))
ph = np.radians(np.arange(P['phi'][0], P['phi'][1]+1e-9, P['step']))
NT, NP = len(th), len(ph)
TH, PH = np.meshgrid(th, ph, indexing='ij')
C = np.array(P['centre'], float)
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


T_ = P['lidThickness']
LZ = P['lidZone']
for s in SIDES:
    D = dirs(s, TH, PH).reshape(-1, 3)
    R0, Hp = ray_r(skin_tree, D)
    tb = ray_ball_exit(s, C[None, :], D)
    R0 = R0.reshape(NT, NP)
    Hp = Hp.reshape(NT, NP, 3)
    rb = tb.reshape(NT, NP)
    dsb, psib = rim_dist(ball_local(s, C+D*np.nan_to_num(tb)[:, None]))
    dsb = np.where(np.isfinite(tb), dsb, 9.).reshape(NT, NP)
    psib = psib.reshape(NT, NP)
    dl, a = outline_at(s, Hp[..., 0], Hp[..., 2], Hp)
    m = margin_of(s, a, 'margin')
    valid = np.isfinite(R0)
    h0 = np.where(valid, R0, np.nanmean(R0))
    dl = np.where(valid, dl, 9.)
    hasb = np.isfinite(rb)
    lid = hasb & (dsb <= LZ)
    if (lid & (dl >= m)).any():
        raise ValueError('lid zone reaches outside the eye mask; widen margin')
    free = valid & (dl < m) & (R0 > P['rMin']) & ~lid
    fixed = np.where(lid, np.nan_to_num(rb)+lidprof(dsb, psib), h0)
    held_obst = 0
    for rnd in range(int(P['obstacleRounds'])):
        base = np.where(free, 0., fixed)
        bvec = -lap(lap(base))[free]

        def Aop(x):
            z = np.zeros_like(h0)
            z[free] = x
            return lap(lap(z))[free]
        sol, its = cg(Aop, bvec, fixed[free].copy(), int(P['iters']))
        Rf = fixed.copy()
        Rf[free] = sol
        viol = free & hasb & (Rf < np.nan_to_num(rb)+lid_t(psib))
        if not viol.any():
            break
        held_obst += int(viol.sum())
        free &= ~viol
        fixed[viol] = rb[viol]+lid_t(psib)[viol]
    if P['innerSoft']:
        # soft edge on the nose side: the plate is solved again with the cells just beyond the free region's inner
        # edge also free but pulled toward the face by a data weight that rises from 0 at the edge to `weight` at
        # `width` beyond it (hard hold past that), so the socket meets the bridge without a curvature step
        IS = P['innerSoft']
        inner_ = np.clip(-float(s)*np.cos(a), 0, 1)
        ramp = ss2(dl, m, m+IS['width'])
        soft = valid & ~lid & (dl >= m) & (dl < m+IS['width']) & (inner_ > IS.get('innerMin', .3)) & (R0 > P['rMin'])
        free2 = free | soft
        Wd = np.where(soft, IS['weight']*ramp/np.maximum(inner_, 1e-3), 0.)
        base = np.where(free2, 0., Rf)
        bvec = -lap(lap(base))[free2]+(Wd*h0)[free2]
        Wf = Wd[free2]

        def Aop2(x):
            z = np.zeros_like(h0)
            z[free2] = x
            return lap(lap(z))[free2]+Wf*x
        sol2, its2 = cg(Aop2, bvec, Rf[free2].copy(), int(P['iters']), tol=1e-20)
        Rf0 = Rf.copy()
        Rf = Rf.copy()
        Rf[free2] = sol2
        DBG[f'soft{s}'] = soft
        record.setdefault('innerSoft', {})[s] = {'cells': int(soft.sum()), 'iterations': its2,
                                                 'maxChange': round(float(np.abs(Rf-Rf0).max()), 5),
                                                 'ballClearanceMin': round(float(np.nanmin(np.where(hasb & free2, Rf-np.nan_to_num(rb), np.inf))), 5)}
    FILL[s] = {'Rf': Rf, 'dl': dl, 'm': m}
    rise = (Rf-h0)[valid & (dl < m)]
    record['eyes'][s] = {'fillIterations': its, 'obstacleRounds': rnd+1, 'obstacleCells': held_obst, 'lidCells': int(lid.sum()),
                         'skinRaisedMax': round(float(rise.max()), 4), 'skinLoweredMax': round(float(-rise.min()), 4)}
    DBG[f'R0{s}'] = R0
    DBG[f'Rf{s}'] = Rf
    DBG[f'rb{s}'] = rb
    DBG[f'dsb{s}'] = dsb
    DBG[f'free{s}'] = free

# ---------------------------------------------------------------- 4. skin laid onto lids and socket
def lid_band_vertices(Q):
    sel = np.zeros(len(Q), bool)
    for s in SIDES:
        rel_ = Q-C
        r_ = np.linalg.norm(rel_, axis=1)
        D_ = rel_/np.maximum(r_, 1e-9)[:, None]
        tb_ = ray_ball_exit(s, C[None, :], D_)
        ok = np.isfinite(tb_)
        ds_, _ = rim_dist(ball_local(s, C+D_*np.nan_to_num(tb_)[:, None]))
        sel |= ok & (ds_ > P['refineBand'][0]) & (ds_ < P['refineBand'][1]) & (np.abs(r_-np.nan_to_num(tb_)) < .03)
    return sel


nverts0 = len(pts)
if P['refine']:
    # the lid edge is where the skin crosses the ball; at the skin's own vertex spacing (about .002) that line is a
    # sawtooth, so the skin faces along it are split (grid fill) before they are moved; new vertices are appended, so
    # every original vertex keeps its index
    bm = bmesh.new()
    bm.from_mesh(head.data)
    Mw = np.array(head.matrix_world)
    for _ in range(int(P['refine'])):
        bm.verts.ensure_lookup_table()
        co = np.array([v.co[:] for v in bm.verts])
        sel = lid_band_vertices(co@Mw[:3, :3].T+Mw[:3, 3])
        faces_ = [f for f in bm.faces if any(sel[v.index] for v in f.verts)]
        edges_ = list({e for f in faces_ for e in f.edges})
        bmesh.ops.subdivide_edges(bm, edges=edges_, cuts=1, use_grid_fill=True)
    bm.to_mesh(head.data)
    bm.free()
    head.data.update()
    pts = world_points(head)
    T, _ = tris_of(head)
    record['refine'] = {'verticesBefore': nverts0, 'verticesAfter': len(pts)}
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
    ids = cand[dlv < mv+bandv]
    if moved_any[ids].any():
        raise ValueError('eye regions overlap')
    Dv = rel[ids]/rv[ids, None]
    rfill = bspline_lookup(F['Rf'], fi[ids], fj[ids])
    tbv = ray_ball_exit(s, C[None, :], Dv)
    dsv, psiv = rim_dist(ball_local(s, C+Dv*np.nan_to_num(tbv)[:, None]))
    hasv = np.isfinite(tbv)
    wl = np.where(hasv, 1-ss2(np.where(hasv, dsv, 9.), LZ-.004, LZ), 0.)
    r_an = np.where(hasv, np.nan_to_num(tbv)+lidprof(np.where(hasv, dsv, 0.), psiv), rfill)
    r1 = wl*r_an+(1-wl)*rfill
    _, ar = outline_at(s, pts[ids, 0], pts[ids, 2])
    br = margin_of(s, ar, 'band')
    fw = 1-ss2(bilinear(F['dl'], fi[ids], fj[ids]), bilinear(F['m'], fi[ids], fj[ids]), bilinear(F['m'], fi[ids], fj[ids])+br)
    r = fw*r1+(1-fw)*rv[ids]
    mv_ = fw > 0
    new[ids[mv_]] = (C+Dv*r[:, None])[mv_]
    moved_any[ids[mv_]] = True
    record['eyes'][s].update({'regionVertices': int(len(ids)), 'moved': int(mv_.sum()), 'lidVertices': int((wl > 0).sum())})

disp = np.linalg.norm(new-pts, axis=1)
set_world_points(head, new)
record['skinDisplacement'] = {'moved': int((disp > 0).sum()), 'max': round(float(disp.max()), 5), 'originalVerticesMoved': int((disp[:nverts0] > 0).sum())}
skin_tree = tree_from(new, T)
require_single_closed_mesh(head, args.out, 'Head skin eyes v3')


# ---------------------------------------------------------------- 5. eyeball meshes, band, iris
def front_y(tree, x, z):
    h = front_hit(tree, x, z)
    return (np.nan, None) if h is None else (h[0].y, h)


NPS = int(P['nPsi'])
PSI = np.arange(NPS)*2*math.pi/NPS
Lpsi = np.sqrt((BA*math.cos(TH0)*np.cos(PSI))**2+(BB*math.cos(TH0)*np.sin(PSI))**2+(BC*math.sin(TH0))**2)
wband = P['bandBottom']+(P['bandTop']-P['bandBottom'])*((1+np.sin(PSI))/2)**P['bandPow']
thb = TH0-wband/Lpsi
rings = [thb*(k/24) for k in range(1, 25)]                                   # 0..23, ring 23 is the band's inner edge
rings += [thb+(TH0-thb)*k/6 for k in range(1, 7)]                            # 24..29, ring 29 is the rim
rings += [np.full(NPS, TH0+.3*k/6) for k in range(1, 7)]                     # 30..35
rings += [np.full(NPS, TH0+.3+(math.pi-TH0-.3)*k/24) for k in range(1, 24)]  # 36..58
rings = np.array(rings)
NR = len(rings)
for s in SIDES:
    O, u, v, n = BALL[s]
    Vr = (O[None, None, :]+BA*np.sin(rings)[..., None]*np.cos(PSI)[None, :, None]*u
          + BB*np.sin(rings)[..., None]*np.sin(PSI)[None, :, None]*v+BC*np.cos(rings)[..., None]*n)
    V = [O+BC*n]+list(Vr.reshape(-1, 3))+[O-BC*n]
    last = len(V)-1

    def rid(k, j):
        return 1+k*NPS+(j % NPS)
    faces, mats = [], []
    for j in range(NPS):
        faces.append((0, rid(0, j), rid(0, j+1)))
        mats.append(0)
    for k in range(NR-1):
        for j in range(NPS):
            faces.append((rid(k, j), rid(k+1, j), rid(k+1, j+1), rid(k, j+1)))
            mats.append(1 if 23 <= k < 35 else 0)
    for j in range(NPS):
        faces.append((last, rid(NR-1, j+1), rid(NR-1, j)))
        mats.append(0)
    g = globes[s]
    Mi = np.linalg.inv(np.array(g.matrix_world))
    Vl = np.array(V)@Mi[:3, :3].T+Mi[:3, 3]
    me = bpy.data.meshes.new(f'eye_globe_{s}_v3')
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
    require_single_closed_mesh(g, args.out, f'eye globe {s} v3')
    ntree = tree_from(world_points(g), tris_of(g)[0])
    IV = world_points(irises[s])
    IVn = IV.copy()
    miss = 0
    for k, q in enumerate(IV):
        yo, _ = front_y(old_g[s][0], q[0], q[2])
        yn, _ = front_y(ntree, q[0], q[2])
        if np.isfinite(yo) and np.isfinite(yn):
            IVn[k, 1] = yn+(q[1]-yo)*P['irisDome']
        else:
            miss += 1
    set_world_points(irises[s], IVn)
    # covered ball (beyond the rim) must stay under the skin
    cov = Vr[30:].reshape(-1, 3)
    dirc = cov-C
    rc = np.linalg.norm(dirc, axis=1)
    dirc /= rc[:, None]
    rs, _ = ray_r(skin_tree, dirc)
    through = int((np.isfinite(rs) & (rc > rs+1e-5)).sum())
    record['eyes'][s].update({'globeVertices': len(V), 'globeFaces': len(faces), 'irisMissed': miss,
                              'irisShiftMax': round(float(np.abs(IVn[:, 1]-IV[:, 1]).max()), 5),
                              'coveredBallThroughSkin': through})

if P['irisMaterial']:
    mat = bpy.data.materials['Charcoal iris and black pupil']
    bsdf = [n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'][0]
    record['irisMaterialBefore'] = {k: float(bsdf.inputs[k].default_value) for k in P['irisMaterial']}
    for k, val in P['irisMaterial'].items():
        bsdf.inputs[k].default_value = val
if args.debug:
    np.savez_compressed(args.debug, **DBG)
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'eye-v5eye5.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Eyes v5 (Nick 2026-10-12): v5eye4 plus a fairing of the inner socket edge; a regular ellipsoid eyeball per eye (exact mirror) with a planar elliptical '
             'opening, even lids that hug it, and the socket skin filled to cradle it; nothing outside the eye mask moves',
    'parameters': P, 'parts': record, 'skinBefore': before, 'skinAfter': mesh_stats(head),
    'outputs': {q.name: sha(q) for q in args.out.iterdir() if q.suffix in ['.glb', '.blend']},
}, indent=2, default=float)+'\n')
print('eyes v5 ok', json.dumps(record, default=float), flush=True)
