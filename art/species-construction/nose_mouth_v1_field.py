"""Nose and mouth v1 (Nick 2026-10-12): the muzzle, nose pad, mouth line and chin rebuilt as one functional unit.

Run with Blender (through loop_tools.py blender or a recipe step), on the v5eye5 head (H52 output):
  --python nose_mouth_v1_field.py -- --scene <head.blend> --out <new-dir> --spec <spec json> [--debug <npz>]

Nick on v5eye4: "I think the nose and mouth probably have similar artifacts on them and issues with them related to
rules that you had put in place ... take a proper approach to fix it the right way". The earlier mouth steps (v5m,
v5m2) held the nose object fixed, kept the two mouth tubes as separate objects at their old depth and deformed the
muzzle in place between them, so the nose stayed a thin flat plate lying on the slope (a light sliver at its tip and a
crescent under it where the raised muzzle met it), and the mouth tubes stood about .002 proud of the skin (a wire in
side and lower views). Here the part is built in the order a character modeler would use:

1. Muzzle surface: a spherical grid of directions from `centre`; the radius of the outermost skin hit per cell. Inside
   the region (an ellipsoid `region` = [cx, cy, cz, ax, ay, az] on the hit point; e < `core` is the core, e from
   `core` to 1 the blend band, e >= 1 held) the radius is solved as a thin plate (biharmonic) pulled toward a target
   by a data weight: the target is the radius blurred by a Gaussian of `sigma` cells in the core and the radius itself
   at the band's outer edge; the weight is `dataCore` in the core, rising to `dataEdge` across the band, and zero
   inside the nose seat (the pad outline plus `noseClear`) and along the old mouth line (`mouthClear` either side),
   so the pits, shelves and crescents the old nose and mouth objects left are filled from the surrounding form instead
   of copied. Skin vertices keep their direction from `centre` and take the solved radius (cubic B-spline lookup);
   outside the region nothing moves (same vertices and faces).
2. Nose pad: a closed mesh replacing the old plate (`nose_finish`, same material). Front-view outline: the rounded
   triangle `nose` = {"top": z, "tip": z, "halfWidth": x, "round": r} (a triangle offset by r, so straight sides and
   round corners). Each inset ring at distance s inside the outline lies on the new skin (front-view projection) and
   is lifted along the skin normal by h(s): a quarter-circle roll of radius `roll` and height `height` from the
   skin at the outline (the pad meets the skin at a right angle, so the edge is one clean contact line), then a
   gentle dome `dome` toward the middle; below the outline a wall runs `sink` under the skin to a back sheet.
3. Mouth line: one tube (`closed_mouth_0`, the old material) on the old front-view mouth line (the two curves joined,
   ring centres sorted by x and smoothed, the centre V rounded over `vRound`), each point on the new skin, the tube
   centre `lineDepth` under it along the normal, radius `lineRadius` tapering to `lineEnd` at the ends; the skin
   along the line may carry a soft groove (`groove` = [depth, half width], Gaussian across the line) so the line
   sits in the surface. The old closed_mouth_1 and _2 are removed.

Writes head.blend, shape.glb, nose-mouth-v1.json.
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
    'centre': [0., -.05, -.12], 'theta': [-48., 48.], 'phi': [-72., 20.], 'step': .3, 'rMin': .08,
    'region': [0., -.33, -.20, .18, .12, .12], 'core': .7, 'sigma': 8., 'dataCore': .01, 'dataEdge': 5., 'iters': 40000,
    'nose': {'top': -.111, 'tip': -.147, 'halfWidth': .032, 'round': .006}, 'noseClear': .006,
    'roll': .004, 'height': .0035, 'dome': .002, 'sink': .005, 'noseRings': 28, 'noseSegments': 160, 'noseNormalSmooth': .012,
    'mouthClear': .006, 'mouthSmooth': 5, 'vRound': .006, 'lineDepth': .0005, 'lineRadius': .0016, 'lineEnd': .0006,
    'lineEndLength': .008, 'lineStep': .0008, 'lineSides': 12, 'groove': [0., .003],
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
for k, v in json.loads(args.spec.read_text()).items():
    if k == 'note':
        continue
    P[k] = dict(P[k], **v) if isinstance(v, dict) and isinstance(P.get(k), dict) else v
DBG = {}
record = {}


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
    return t.reshape(-1, 3)


def tree_from(V, T):
    return BVHTree.FromPolygons(V.tolist(), T.tolist())


def cg(Aop, b, x0, iters, tol=1e-16):
    x = x0.copy()
    r = b-Aop(x)
    p = r.copy()
    rz = (r*r).sum()
    b2 = max((b*b).sum(), 1e-30)
    it = 0
    for it in range(iters):
        Ap = Aop(p)
        st = rz/(p*Ap).sum()
        x += st*p
        r -= st*Ap
        rz2 = (r*r).sum()
        if rz2 < tol*b2:
            break
        p = r+(rz2/rz)*p
        rz = rz2
    return x, it+1


def bspline_lookup(grid, fi, fj):
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


def gauss(z, sg):
    k = np.arange(-int(3*sg), int(3*sg)+1)
    w = np.exp(-k*k/(2*sg*sg))
    w /= w.sum()
    r = len(k)//2
    zp = np.pad(z, ((r, r), (0, 0)), mode='edge')
    z = sum(w[i]*zp[i:i+z.shape[0]] for i in range(len(k)))
    zp = np.pad(z, ((0, 0), (r, r)), mode='edge')
    return sum(w[i]*zp[:, i:i+z.shape[1]] for i in range(len(k)))


def lap(z):
    zp = np.pad(z, 1, mode='edge')
    return zp[2:, 1:-1]+zp[:-2, 1:-1]+zp[1:-1, 2:]+zp[1:-1, :-2]-4*z


bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
head = bpy.data.objects['cleaned_head_with_openings']
require_single_closed_mesh(head, args.out, 'Head skin before nose and mouth v1')
before = mesh_stats(head)
pts = world_points(head)
T = tris_of(head)
skin_tree = tree_from(pts, T)
C = np.array(P['centre'], float)

# ---------------------------------------------------------------- old mouth line (front view), old nose
mouth_objs = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('closed_mouth')]
centres = []
for o in mouth_objs:
    V = world_points(o)
    if len(V) % 10 == 0 and len(V) >= 200:
        centres.append(V.reshape(-1, 10, 3).mean(1))
cen = np.concatenate(centres)
cen = cen[np.argsort(cen[:, 0])]
xl = np.arange(-np.abs(cen[:, 0]).max(), np.abs(cen[:, 0]).max()+1e-9, P['lineStep'])
# mirror-average for an exact left-right match, then smooth
zl = np.interp(np.abs(xl), np.abs(cen[:, 0])[np.argsort(np.abs(cen[:, 0]))], cen[np.argsort(np.abs(cen[:, 0])), 2])
k_ = int(P['mouthSmooth'])
if k_ > 1:
    w_ = np.hanning(k_+2)[1:-1]
    w_ /= w_.sum()
    zp_ = np.concatenate([zl[k_-1::-1], zl, zl[:-k_-1:-1]])
    zl = np.convolve(zp_, w_, mode='same')[k_:k_+len(zl)]
# the centre V: z(x) near 0 is blended with a parabola that has the same value and slope at |x| = vRound
vr = P['vRound']
if vr > 0:
    j1 = np.argmin(np.abs(xl-vr))
    z1 = zl[j1]
    sl = (zl[j1+1]-zl[j1-1])/(xl[j1+1]-xl[j1-1])
    a_ = sl/(2*vr)
    near = np.abs(xl) < vr
    zl[near] = z1+a_*(xl[near]**2-vr*vr)
record['mouthLine'] = {'xRange': [round(float(xl[0]), 4), round(float(xl[-1]), 4)], 'zCentre': round(float(zl[len(zl)//2]), 4),
                       'zMin': round(float(zl.min()), 4), 'zCorner': round(float(zl[0]), 4), 'points': len(xl)}

nose_obj = bpy.data.objects['nose_finish']


def tri_sd(px, pz):
    """Signed distance (negative inside) to the rounded-triangle nose outline in the front view."""
    N = P['nose']
    r = N['round']
    # core triangle: the outline's triangle shrunk by r (top edge down by r, sides in by r)
    A = np.array([-N['halfWidth'], N['top']])
    B = np.array([N['halfWidth'], N['top']])
    Cc = np.array([0., N['tip']])
    cx_ = (A+B+Cc)/3
    # inset the triangle by r: move each edge line inward by r
    def edge(p, q):
        d = q-p
        n = np.array([d[1], -d[0]])/np.linalg.norm(d)
        if (cx_-p)@n > 0:
            n = -n
        return p, n   # outward normal n
    lines = [edge(A, B), edge(B, Cc), edge(Cc, A)]
    # the core triangle vertices: intersections of inset lines
    def inter(l1, l2):
        (p1, n1), (p2, n2) = l1, l2
        M_ = np.array([n1, n2])
        b_ = np.array([n1@p1-r, n2@p2-r])
        return np.linalg.solve(M_, b_)
    core = [inter(lines[2], lines[0]), inter(lines[0], lines[1]), inter(lines[1], lines[2])]
    Pq = np.stack([np.ravel(px), np.ravel(pz)], -1)
    # distance to the core triangle (exact, signed)
    dmin = np.full(len(Pq), np.inf)
    inside = np.ones(len(Pq), bool)
    for i in range(3):
        p, q = core[i], core[(i+1) % 3]
        d = q-p
        t = np.clip(((Pq-p)@d)/(d@d), 0, 1)
        dmin = np.minimum(dmin, np.linalg.norm(Pq-(p+t[:, None]*d), axis=1))
        n = np.array([d[1], -d[0]])
        cc = (core[0]+core[1]+core[2])/3
        if (cc-p)@n < 0:
            n = -n
        inside &= (Pq-p)@n >= 0
    sd = np.where(inside, -dmin, dmin)-r
    return sd.reshape(np.shape(px)), (core[0]+core[1]+core[2])/3


# ---------------------------------------------------------------- 1. muzzle surface
th = np.radians(np.arange(P['theta'][0], P['theta'][1]+1e-9, P['step']))
ph = np.radians(np.arange(P['phi'][0], P['phi'][1]+1e-9, P['step']))
NT, NP = len(th), len(ph)
TH, PH = np.meshgrid(th, ph, indexing='ij')


def dirs(TH_, PH_):
    return np.stack([np.sin(TH_)*np.cos(PH_), -np.cos(TH_)*np.cos(PH_), np.sin(PH_)], -1)


D = dirs(TH, PH).reshape(-1, 3)
R0 = np.full(len(D), np.nan)
Hp = np.full((len(D), 3), np.nan)
for k, d in enumerate(D):
    h = skin_tree.ray_cast(Vector(C+1.5*d), Vector(-d), 1.5)
    if h[0] is not None:
        R0[k] = 1.5-h[3]
        Hp[k] = h[0]
R0 = R0.reshape(NT, NP)
Hp = Hp.reshape(NT, NP, 3)
valid = np.isfinite(R0) & (R0 > P['rMin'])
rg = P['region']
E = np.sqrt(((Hp[..., 0]-rg[0])/rg[3])**2+((Hp[..., 1]-rg[1])/rg[4])**2+((Hp[..., 2]-rg[2])/rg[5])**2)
E = np.where(valid, E, 9.)
free = valid & (E < 1)
h0 = np.where(valid, R0, np.nanmean(R0))
band = ss2(E, P['core'], 1.)          # 0 in the core, 1 at the region edge
if P.get('form'):
    # authored muzzle form: the face under the region as a thin plate from the region's edge (no data), plus the
    # muzzle as mirrored anisotropic Gaussians in (theta, phi) [amplitude, theta0, phi0, sigma theta, sigma phi,
    # rotation, 'pair' | 'mid'] (degrees), fitted once to this head by fitform.py and then edited as parameters
    base0 = np.where(free, 0., h0)
    bb = -lap(lap(base0))[free]

    def Aop0(x):
        z = np.zeros_like(h0)
        z[free] = x
        return lap(lap(z))[free]
    sol0, its0 = cg(Aop0, bb, h0[free].copy(), int(P['iters']))
    Rb = h0.copy()
    Rb[free] = sol0
    FORM = np.zeros_like(h0)
    for g in P['form']['gaussians']+P['form'].get('extra', []):
        a_, t0, p0, st, sp, rt, kind = g
        t0, p0, st, sp, rt = (math.radians(v) for v in (t0, p0, st, sp, rt))
        for sg in ((1,) if kind == 'mid' else (1, -1)):
            dt, dp = TH-(t0*sg if kind != 'mid' else 0.), PH-p0
            c_, s_ = math.cos(rt*sg), math.sin(rt*sg)
            uu, vv = c_*dt+s_*dp, -s_*dt+c_*dp
            FORM += a_*np.exp(-.5*((uu/st)**2+(vv/sp)**2))
    target = (Rb+FORM)*(1-band)+h0*band
    record['form'] = {'baseIterations': its0, 'formMax': round(float(FORM[free].max()), 5),
                      'targetMinusSkin': [round(float((target-h0)[free].min()), 5), round(float((target-h0)[free].max()), 5)]}
    DBG.update({'Rb': Rb, 'FORM': FORM})
else:
    Rs = gauss(h0, P['sigma'])
    target = Rs*(1-band)+h0*band
Wd = P['dataCore']*(1-band)+P['dataEdge']*band
sdn, nose_c = tri_sd(Hp[..., 0], Hp[..., 2])
front = Hp[..., 1] < -.2
clear = not P.get('form') or P['form'].get('clearZones', False)
Wd = np.where(front & (sdn < P['noseClear']) & clear, 0., Wd)
dz_line = np.abs(Hp[..., 2]-np.interp(Hp[..., 0], xl, zl))
on_line = front & (np.abs(Hp[..., 0]) <= xl[-1]+P['mouthClear']) & (dz_line < P['mouthClear'])
Wd = np.where(on_line & clear, 0., Wd)
Wf = Wd[free]
base = np.where(free, 0., h0)
bvec = -lap(lap(base))[free]+(Wd*target)[free]


def Aop(x):
    z = np.zeros_like(h0)
    z[free] = x
    return lap(lap(z))[free]+Wf*x


sol, its = cg(Aop, bvec, h0[free].copy(), int(P['iters']))
Rf = h0.copy()
Rf[free] = sol
record['muzzle'] = {'cells': int(free.sum()), 'iterations': its, 'noDataCells': int((free & (Wd == 0)).sum()),
                    'radiusRaisedMax': round(float((Rf-h0)[free].max()), 5), 'radiusLoweredMax': round(float(-(Rf-h0)[free].min()), 5)}
DBG.update({'R0': R0, 'Rf': Rf, 'E': E, 'Wd': Wd, 'free': free})

# groove along the mouth line (radius lowered by a Gaussian across the line)
gd, gw = P['groove']
if gd > 0:
    # distance to the line in the front view, approximated by the vertical offset scaled by the line's slope
    slope = np.gradient(zl, xl)
    sl_c = np.interp(Hp[..., 0], xl, slope)
    dperp = dz_line/np.sqrt(1+sl_c**2)
    endw = 1-ss2(np.abs(Hp[..., 0]), xl[-1]-P['lineEndLength'], xl[-1])
    gr = gd*np.exp(-0.5*(dperp/gw)**2)*endw*front*free
    Rf = Rf-gr
    record['groove'] = {'depth': gd, 'halfWidth': gw}

# skin vertices take the solved radius
rel = pts-C
rv = np.linalg.norm(rel, axis=1)
phv = np.arcsin(np.clip(rel[:, 2]/np.maximum(rv, 1e-9), -1, 1))
thv = np.arctan2(rel[:, 0], -rel[:, 1])
fi = (thv-th[0])/(th[1]-th[0])
fj = (phv-ph[0])/(ph[1]-ph[0])
ing = (fi > 2) & (fi < NT-3) & (fj > 2) & (fj < NP-3) & (rv > P['rMin'])
Ev = np.sqrt(((pts[:, 0]-rg[0])/rg[3])**2+((pts[:, 1]-rg[1])/rg[4])**2+((pts[:, 2]-rg[2])/rg[5])**2)
ids = np.where(ing & (Ev < 1.05))[0]
# only the outermost layer of skin along each direction is the face; the grid holds the outermost hit
rnew = bspline_lookup(Rf, fi[ids], fj[ids])
rold = bspline_lookup(h0, fi[ids], fj[ids])
outer = np.abs(rv[ids]-rold) < .01
ids, rnew, rold = ids[outer], rnew[outer], rold[outer]
new = pts.copy()
new[ids] = C+rel[ids]/rv[ids, None]*(rv[ids]+(rnew-rold))[:, None]
disp = np.linalg.norm(new-pts, axis=1)
set_world_points(head, new)
require_single_closed_mesh(head, args.out, 'Head skin nose and mouth v1')
record['skinDisplacement'] = {'moved': int((disp > 1e-9).sum()), 'max': round(float(disp.max()), 5),
                              'movedBounds': [new[disp > 1e-9].min(0).round(4).tolist(), new[disp > 1e-9].max(0).round(4).tolist()] if (disp > 1e-9).any() else None}
skin_tree = tree_from(new, T)


def skin_front(x, z):
    h = skin_tree.ray_cast(Vector((x, -2., z)), Vector((0., 1., 0.)), 4.)
    if h[0] is None:
        return None, None
    return np.array(h[0]), np.array(h[1])


def avg_normal(q, rad):
    # smooth skin normal: mean of the front-hit normals on a small disc (the pad and the line follow the form, not
    # the triangle facets)
    acc = np.zeros(3)
    for dx in np.linspace(-rad, rad, 5):
        for dz in np.linspace(-rad, rad, 5):
            if dx*dx+dz*dz > rad*rad:
                continue
            _, n = skin_front(q[0]+dx, q[2]+dz)
            if n is not None:
                acc += n
    acc /= np.linalg.norm(acc)
    return acc if acc[1] < 0 else -acc


# ---------------------------------------------------------------- 2. nose pad
NS = int(P['noseSegments'])
ang = np.arange(NS)*2*math.pi/NS
_, ctr2 = tri_sd(np.array([0.]), np.array([0.]))
cx0, cz0 = ctr2


def ring_at(s):
    """Front-view points at signed distance -s (s inside) on rays from the pad centre."""
    out = []
    for a in ang:
        lo, hi = 0., .08
        for _ in range(50):
            m = (lo+hi)/2
            v, _ = tri_sd(np.array([cx0+m*math.cos(a)]), np.array([cz0+m*math.sin(a)]))
            if v[0] < -s:
                lo = m
            else:
                hi = m
        out.append((cx0+lo*math.cos(a), cz0+lo*math.sin(a)))
    return np.array(out)


inr = -tri_sd(np.array([cx0]), np.array([cz0]))[0][0]
rollR, H, DOME, SINK = P['roll'], P['height'], P['dome'], P['sink']
prof = [(0., -SINK), (0., -SINK*.5), (0., 0.)]
for t in np.linspace(0, math.pi/2, 9)[1:]:
    prof.append((rollR*(1-math.cos(t)), H*math.sin(t)))
smax = inr*.92
NRg = int(P['noseRings'])
for k in range(1, NRg+1):
    s = rollR+(smax-rollR)*k/NRg
    u = (s-rollR)/(smax-rollR)
    prof.append((s, H+DOME*(1-(1-u)**2)))
n_c = avg_normal(np.array([cx0, 0, cz0]), P['noseNormalSmooth'])
faces = []
cache = {}
for (s_, hh) in prof:
    if round(s_, 7) not in cache:
        cache[round(s_, 7)] = ring_at(s_)
# avg_normal returns the outward normal (y < 0); each ring is lifted out of the face along it by h(s)
rings = []
for (s, hh) in prof:
    R2 = cache[round(s, 7)]
    ring = []
    for (x, z) in R2:
        q, _ = skin_front(x, z)
        n = avg_normal(q, P['noseNormalSmooth'])
        ring.append(q+n*hh)
    rings.append(np.array(ring))
qc, _ = skin_front(cx0, cz0)
apex = qc+avg_normal(qc, P['noseNormalSmooth'])*(H+DOME)
# back sheet: the wall's bottom ring, shrunk toward the centre at the sink depth
back = []
for f in np.linspace(.8, .0, 5)[:-1]:
    br = []
    for (x, z) in cache[round(0., 7)]:
        xx, zz = cx0+(x-cx0)*f, cz0+(z-cz0)*f
        q, _ = skin_front(xx, zz)
        br.append(q-n_c*SINK)
    back.append(np.array(br))
qb, _ = skin_front(cx0, cz0)
back_apex = qb-n_c*SINK
# order: apex, rings (inner to outer, then down the wall), back rings (outer to inner), back apex
seq = rings[::-1]+back
V = [apex]+[p for r_ in seq for p in r_]+[back_apex]
last = len(V)-1


def vid(k, j):
    return 1+k*NS+(j % NS)


for j in range(NS):
    faces.append((0, vid(0, j+1), vid(0, j)))
for k in range(len(seq)-1):
    for j in range(NS):
        faces.append((vid(k, j), vid(k, j+1), vid(k+1, j+1), vid(k+1, j)))
for j in range(NS):
    faces.append((last, vid(len(seq)-1, j), vid(len(seq)-1, j+1)))
Mi = np.linalg.inv(np.array(nose_obj.matrix_world))
Vl = np.array(V)@Mi[:3, :3].T+Mi[:3, 3]
me = bpy.data.meshes.new('nose_finish_v1')
me.from_pydata(Vl.tolist(), [], faces)
for mat in nose_obj.data.materials:
    me.materials.append(mat)
bm = bmesh.new()
bm.from_mesh(me)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(me)
bm.free()
me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
old_me = nose_obj.data
nose_obj.data = me
bpy.data.meshes.remove(old_me)
require_single_closed_mesh(nose_obj, args.out, 'nose pad v1')
record['nose'] = {'outline': P['nose'], 'centre': [round(float(cx0), 4), round(float(cz0), 4)], 'inradius': round(float(inr), 4),
                  'normal': n_c.round(3).tolist(), 'vertices': len(V), 'faces': len(faces)}

# ---------------------------------------------------------------- 3. mouth line
line_mat = mouth_objs[0].data.materials[0]
for o in mouth_objs:
    if o.name != 'closed_mouth_0':
        bpy.data.objects.remove(o, do_unlink=True)
lo_ = bpy.data.objects['closed_mouth_0']
cpts, cnrm = [], []
for x, z in zip(xl, zl):
    q, _ = skin_front(x, z)
    cpts.append(q)
    cnrm.append(avg_normal(q, .004))
cpts, cnrm = np.array(cpts), np.array(cnrm)
L_ = len(cpts)
tang = np.gradient(cpts, axis=0)
tang /= np.linalg.norm(tang, axis=1)[:, None]
side = np.cross(tang, cnrm)
side /= np.linalg.norm(side, axis=1)[:, None]
arc = np.concatenate([[0.], np.cumsum(np.linalg.norm(np.diff(cpts, axis=0), axis=1))])
arc_end = np.minimum(arc, arc[-1]-arc)
rad = P['lineEnd']+(P['lineRadius']-P['lineEnd'])*np.sqrt(np.clip(arc_end/P['lineEndLength'], 0, 1)*(2-np.clip(arc_end/P['lineEndLength'], 0, 1)))
NSd = int(P['lineSides'])
psi = np.arange(NSd)*2*math.pi/NSd
cent = cpts-cnrm*P['lineDepth']
LV = []
for i in range(L_):
    for p_ in psi:
        LV.append(cent[i]+rad[i]*(math.cos(p_)*side[i]+math.sin(p_)*cnrm[i]))
LV.append(cent[0]-tang[0]*P['lineEnd'])
LV.append(cent[-1]+tang[-1]*P['lineEnd'])
lf = []
for i in range(L_-1):
    for j in range(NSd):
        lf.append((i*NSd+j, i*NSd+(j+1) % NSd, (i+1)*NSd+(j+1) % NSd, (i+1)*NSd+j))
c0, c1 = L_*NSd, L_*NSd+1
for j in range(NSd):
    lf.append((c0, (j+1) % NSd, j))
    lf.append((c1, (L_-1)*NSd+j, (L_-1)*NSd+(j+1) % NSd))
Mi = np.linalg.inv(np.array(lo_.matrix_world))
LVl = np.array(LV)@Mi[:3, :3].T+Mi[:3, 3]
me = bpy.data.meshes.new('closed_mouth_v1')
me.from_pydata(LVl.tolist(), [], lf)
me.materials.append(line_mat)
bm = bmesh.new()
bm.from_mesh(me)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(me)
bm.free()
me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
old_me = lo_.data
lo_.data = me
bpy.data.meshes.remove(old_me)
require_single_closed_mesh(lo_, args.out, 'mouth line v1')
proud = []
for i in range(0, L_, 4):
    proud.append(float(rad[i]-P['lineDepth']))
record['mouth'] = {'points': L_, 'radius': P['lineRadius'], 'depth': P['lineDepth'], 'proudMax': round(max(proud), 5),
                   'visibleWidth': round(2*math.sqrt(max(P['lineRadius']**2-P['lineDepth']**2, 0)), 5)}

if args.debug:
    np.savez_compressed(args.debug, **DBG)
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'nose-mouth-v1.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Nose and mouth v1 (Nick 2026-10-12): the muzzle refit as one smooth form inside the nose and mouth region, a seated '
             'rounded-triangle nose pad, one mouth line seated on the skin; nothing outside the region moves',
    'parameters': P, 'parts': record, 'skinBefore': before, 'skinAfter': mesh_stats(head),
    'outputs': {q.name: sha(q) for q in args.out.iterdir() if q.suffix in ['.glb', '.blend']},
}, indent=2, default=float)+'\n')
print('nose and mouth v1 ok', json.dumps(record, default=float), flush=True)
