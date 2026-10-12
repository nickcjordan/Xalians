"""Nose v3 (Nick 2026-10-12, on nose-mouth-v2): the nose leather as a soft rounded shield, with nostrils and a groove.

Run with Blender (through loop_tools.py blender or a recipe step), on the v5eye5 head (H52 output):
  --python nose_v3_field.py -- --scene <head.blend> --out <new-dir> --spec <spec json> [--debug <npz>]

Nick on v2: "the result of the nose is sort of a perfect triangle now ... it should look a little bit more closer to a
nose rather than a cartoon abstraction of a nose"; he approved a sketch ("ok yeah do that"). v2 with three changes:

1. Outline `shape` = {"segments": [[x0, y0, x1, y1, x2, y2, x3, y3], ...] (closed chain of cubic Beziers in sketch
   units, y down), "centre": [sketch x of the midline, sketch y of the top], "scale": [head units per sketch unit in
   x, in z], "top": head z of the sketch top}: the sketch's shield (wide rounded top, sides curving in, a blunt
   rounded bottom) replaces the rounded triangle for the mound, the leather shell and the seat.
2. Nostrils `nostrils` = {"curves": [[x0, y0, ...x3, y3], ...] (right side, sketch units; mirrored), "depth": d,
   "width": w, "taper": t}: the leather shell is pressed in by d exp(-(dist / w)^2 / 2) along each curve (dist in the
   front view), faded to 0 over the last t of each end, so two soft shallow slits curve along the lower sides. d is
   kept under the shell's offset, so the skin never shows through.
3. Groove `groove2` = {"depth": d, "width": w, "z": [z0, z1], "fade": f}: a soft midline groove in the muzzle target
   from the bottom of the nose (z0) to the mouth's centre (z1), Gaussian across x, faded in and out over f.

4. Build changes found while making it clean (all inferred): `mound.mask` (cells) builds the mound from a blurred
   inside mask instead of the distance field, with `mound.dome` as a Gaussian of `mound.domeR` at the centroid (the
   distance field left a ridge and spots on its medial axis); `mound.seatSmooth` = {"sigma", "out", "blend"} blurs the
   muzzle target under the leather (the form's upper-lip V ran up under the nose bottom); `shell.switch` stops the
   inset rings at that fraction of the inradius and scales the last ring toward the centroid (deeper insets folded the
   shell into a Y); `shell.smooth` (passes) smooths the leather's inner part over its ring grid before the nostrils go
   in (skin ripples at the mound's roll printed through as a mark at the bottom).

Below is the v2 description.

Nose and mouth v2 (2026-10-12, on v1): the nose leather is part of the snout, not a plate on it.

Run with Blender (through loop_tools.py blender or a recipe step), on the v5eye5 head (H52 output):
  --python nose_mouth_v2_field.py -- --scene <head.blend> --out <new-dir> --spec <spec json> [--debug <npz>]

Review of v1: its nose pad (a separate rounded slab with a quarter-circle roll) read as a hard beveled plastic plate
lying on the snout, with an inner bevel line and sharp glossy streaks, and as a flat dark band along the slope in
profile. Here the muzzle step of v1 is unchanged (authored form, chin, mouth line), and the nose is built as part of
the snout:

1. Mound: the snout tip itself rises into the nose leather. Before the muzzle solve, the target radius gets a soft
   rounded-triangle mound `mound` = {"height": h, "edge": e, "out": o, "dome": d}: h ss(-sd; -o, e) plus a dome d
   ss(-sd; e, inradius), with sd the signed front-view distance to the outline `nose` (negative inside), so its sides
   are a smooth slope about o + e wide and its top is gently domed; with "top" (and "tiltPow") the height grows from
   that fraction at the outline's top edge to full at its tip, so the mound is fullest at the front of the snout; "blur" (grid cells) rounds the creases the distance field
   leaves on its medial axis; the outline's tip reaches over the front of the
   snout tip, so in profile the mound is the rounded end of the nose.
2. Leather: the dark material is a thin shell (`nose_finish`, the old material) that hugs the mound: each inset ring
   lies on the new skin and is offset along the smoothed skin normal by `shell.offset` tanh(s / `shell.edge`) (s the
   inset distance, negative outside the outline), so it stands `shell.offset` above the skin inside, crosses the skin
   exactly on the outline at a shallow angle (one clean soft edge, no bevel, no gap) and dives under it outside, closed
   by a back sheet `shell.sink` under the skin. The shading is the mound's own shape. `noseMaterial` sets Principled
   inputs on the nose material (a rougher satin leather; the surface build reads `noseMaterial` from its settings).

Below is the v1 description (muzzle and mouth unchanged; its nose pad item 2 is replaced by the above).

Nose and mouth v1 (Nick 2026-10-12): the muzzle, nose pad, mouth line and chin rebuilt as one functional unit.

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

Writes head.blend, shape.glb, nose-mouth-v2.json.
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
    'mound': {'height': .004, 'edge': .006, 'out': .003, 'dome': .002},
    'shell': {'offset': .0004, 'edge': .0015, 'sink': .003, 'rings': 24}, 'noseMaterial': None, 'shape': None, 'nostrils': None, 'groove2': None,
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
require_single_closed_mesh(head, args.out, 'Head skin before nose and mouth v2')
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


def bezier_chain(segs, n=40):
    pts_ = []
    for sg in segs:
        p0, p1, p2, p3 = (np.array(sg[k:k+2], float) for k in (0, 2, 4, 6))
        t = np.linspace(0, 1, n, endpoint=False)[:, None]
        pts_.append((1-t)**3*p0+3*(1-t)**2*t*p1+3*(1-t)*t*t*p2+t**3*p3)
    return np.concatenate(pts_)


def sketch_to_head(Q):
    SHp = P['shape']
    return np.stack([(Q[:, 0]-SHp['centre'][0])*SHp['scale'][0], SHp['top']-(Q[:, 1]-SHp['centre'][1])*SHp['scale'][1]], -1)


if P['shape']:
    POLY = sketch_to_head(bezier_chain(P['shape']['segments']))
    _pa, _pb = POLY, np.roll(POLY, -1, 0)
    _cr = _pa[:, 0]*_pb[:, 1]-_pb[:, 0]*_pa[:, 1]
    _A = _cr.sum()/2
    POLY_C = np.array([((_pa[:, 0]+_pb[:, 0])*_cr).sum()/(6*_A), ((_pa[:, 1]+_pb[:, 1])*_cr).sum()/(6*_A)])

    def tri_sd(px, pz):
        """Signed distance (negative inside) to the sketch's shield outline in the front view (shape mode)."""
        Pq = np.stack([np.ravel(px), np.ravel(pz)], -1)
        dmin = np.full(len(Pq), np.inf)
        inside = np.zeros(len(Pq), bool)
        d_ = _pb-_pa
        for c0 in range(0, len(Pq), 4096):
            Qc = Pq[c0:c0+4096]
            t = np.clip(((Qc[:, None, :]-_pa[None])*d_[None]).sum(-1)/(d_*d_).sum(-1)[None], 0, 1)
            pr = _pa[None]+t[..., None]*d_[None]
            dmin[c0:c0+4096] = np.linalg.norm(Qc[:, None, :]-pr, axis=2).min(1)
            yi, yj = _pa[None, :, 1], _pb[None, :, 1]
            cond = (yi > Qc[:, None, 1]) != (yj > Qc[:, None, 1])
            xint = _pa[None, :, 0]+(Qc[:, None, 1]-yi)/(yj-yi+1e-30)*d_[None, :, 0]
            inside[c0:c0+4096] = (cond & (Qc[:, None, 0] < xint)).sum(1) % 2 == 1
        sd = np.where(inside, -dmin, dmin)
        return sd.reshape(np.shape(px)), POLY_C
    record['shape'] = {'zRange': [round(float(POLY[:, 1].min()), 4), round(float(POLY[:, 1].max()), 4)],
                       'halfWidth': round(float(np.abs(POLY[:, 0]).max()), 4), 'centroid': POLY_C.round(4).tolist()}

if P['nostrils']:
    NOS = []
    for cv in P['nostrils']['curves']:
        Cq = sketch_to_head(bezier_chain([cv], 60))
        NOS.append(Cq)
        NOS.append(Cq*np.array([-1., 1.]))


def nostril_depth(x, z):
    if not P['nostrils']:
        return 0.
    NP_ = P['nostrils']
    out = 0.
    for Cq in NOS:
        d = np.hypot(Cq[:, 0]-x, Cq[:, 1]-z)
        k = int(np.argmin(d))
        u = k/(len(Cq)-1)
        taper = ss2(min(u, 1-u), 0., NP_['taper'])
        out = max(out, NP_['depth']*math.exp(-.5*(d[k]/NP_['width'])**2)*taper)
    return out


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
MD = P['mound']
inr0 = -tri_sd(np.array([nose_c[0]]), np.array([nose_c[1]]))[0][0]
tz = np.clip((P['nose']['top']-Hp[..., 2])/(P['nose']['top']-P['nose']['tip']), 0, 1)
tilt = MD.get('top', 1.)+(1-MD.get('top', 1.))*tz**MD.get('tiltPow', 1.)   # height grows from `top` x at the top edge to full at the tip
if MD.get('mask'):
    # v3: the mound is a blurred inside mask (no distance-field medial creases): the region inside the outline grown by
    # `out`, blurred `mask` grid cells, times the tilt, plus a dome as a Gaussian of `domeSigma` cells at the centroid
    ins = (sdn < MD['out']).astype(float)*front
    MOUND = MD['height']*tilt*np.clip(gauss(ins, MD['mask']), 0, 1)
    if MD.get('dome'):
        DMk = np.exp(-.5*((Hp[..., 0]-nose_c[0])**2+(Hp[..., 2]-nose_c[1]-MD.get('domeDz', 0.))**2)/MD['domeR']**2)
        MOUND = MOUND+MD['dome']*DMk*front
    MOUND = MOUND*(1-band)
else:
    MOUND = (MD['height']*tilt*ss2(-sdn, -MD['out'], MD['edge'])+MD['dome']*ss2(-sdn, MD['edge'], inr0))*front*(1-band)
if MD.get('blur'):
    # the distance field has creases on its medial axis (a ridge down the middle and spots at the corners); a Gaussian
    # of `blur` grid cells rounds them, so the mound is one soft form
    MOUND = gauss(MOUND, MD['blur'])
if MD.get('seatSmooth'):
    # v3: the muzzle form's upper-lip V runs up under the nose bottom; under the leather (outline grown by `out`) the
    # target is replaced by its own Gaussian blur of `sigma` cells before the mound goes on, so the leather sits on
    # one smooth form
    SS = MD['seatSmooth']
    wS = np.clip(gauss((sdn < SS['out']).astype(float)*front, SS['blend']), 0, 1)*(1-band)
    target = target*(1-wS)+gauss(target, SS['sigma'])*wS
target = target+MOUND
if P['groove2']:
    G2 = P['groove2']
    gz = ss2(Hp[..., 2], G2['z'][1], G2['z'][1]+G2['fade'])*(1-ss2(Hp[..., 2], G2['z'][0]-G2['fade'], G2['z'][0]))
    GROOVE = G2['depth']*np.exp(-.5*(Hp[..., 0]/G2['width'])**2)*gz*front*(1-band)
    target = target-GROOVE
    record['groove2'] = {'max': round(float(GROOVE.max()), 5)}
record['mound'] = {'max': round(float(MOUND.max()), 5), 'cells': int((MOUND > 1e-6).sum()), 'inradius': round(float(inr0), 4)}
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
require_single_closed_mesh(head, args.out, 'Head skin nose and mouth v2')
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
SH = P['shell']
d0, we, SINK = SH['offset'], SH['edge'], SH['sink']
svals = [-3*we, -2.2*we, -1.6*we, -1.1*we, -.7*we, -.35*we, 0., .35*we, .7*we, 1.1*we, 1.6*we, 2.2*we, 3*we]
smax = inr*.92
NRg = int(SH['rings'])
sw_ = SH.get('switch')
if sw_:
    # v3: inset rings only out to `switch` x the inradius (deeper insets collapse onto the outline's medial axis and
    # fold the shell); inside that the ring at the switch is scaled toward the centroid
    s_sw = inr*sw_
    NRa = NRg//2
    svals += [3*we+(s_sw-3*we)*k/NRa for k in range(1, NRa+1)]
else:
    svals += [3*we+(smax-3*we)*k/NRg for k in range(1, NRg+1)]
prof = [(sv, d0*math.tanh(sv/we)) for sv in svals]
n_c = avg_normal(np.array([cx0, 0, cz0]), P['noseNormalSmooth'])
faces = []
cache = {round(sv, 7): ring_at(sv) for sv in svals}
if sw_:
    base_r = cache[round(svals[-1], 7)]
    for k in range(1, NRg-NRa+1):
        f = 1-k/(NRg-NRa+1)
        key = round(10+k, 7)          # a key outside the distance range marks a scaled ring
        cache[key] = np.c_[cx0+(base_r[:, 0]-cx0)*f, cz0+(base_r[:, 1]-cz0)*f]
        svals.append(10+k)
        prof.append((10+k, d0))
rings = []
NDV = []
for (sv, hh) in prof:
    ring = []
    for (x, z) in cache[round(sv, 7)]:
        q, _ = skin_front(x, z)
        n = avg_normal(q, P['noseNormalSmooth'])
        ring.append(q+n*hh)
        NDV.append(n*(nostril_depth(x, z) if sv > 0 else 0.))
    rings.append(np.array(ring))
qc, _ = skin_front(cx0, cz0)
apex = qc+avg_normal(qc, P['noseNormalSmooth'])*d0
if SH.get('smooth'):
    # v3: the leather's inner part (beyond 3 edge widths) is smoothed over its ring grid, so ripples of the skin under
    # it (the muzzle grid resolving the mound's roll at the bottom) do not print through; the edge rings stay exact
    R_ = np.array(rings)
    k0 = 13
    for _ in range(int(SH['smooth'])):
        Rn = R_.copy()
        inner_ = R_[k0:]
        up = np.concatenate([inner_[1:], np.repeat(apex[None, None, :], 1, 0).repeat(NS, 1)], 0)
        dn = R_[k0-1:-1]
        Rn[k0:] = inner_+.5*((np.roll(inner_, 1, 1)+np.roll(inner_, -1, 1)+up+dn)/4-inner_)
        R_ = Rn
    rings = [r_ for r_ in R_]
# nostrils pressed in after the smoothing, so they keep their shape
NDV = np.array(NDV).reshape(len(rings), NS, 3)
rings = [r_-NDV[k] for k, r_ in enumerate(rings)]
back = []
for f in np.linspace(.85, .0, 5)[:-1]:
    br = []
    for (x, z) in cache[round(svals[0], 7)]:
        xx, zz = cx0+(x-cx0)*f, cz0+(z-cz0)*f
        q, _ = skin_front(xx, zz)
        br.append(q-avg_normal(q, P['noseNormalSmooth'])*SINK)
    back.append(np.array(br))
qb, _ = skin_front(cx0, cz0)
back_apex = qb-n_c*SINK
# order: apex, rings from the middle out to the outermost (under the skin), back rings inward, back apex
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
me = bpy.data.meshes.new('nose_finish_v3')
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
require_single_closed_mesh(nose_obj, args.out, 'nose leather v2')
if P['noseMaterial']:
    for mat in nose_obj.data.materials:
        if mat.use_nodes:
            for nd in mat.node_tree.nodes:
                if nd.type == 'BSDF_PRINCIPLED':
                    for k, val in P['noseMaterial'].items():
                        nd.inputs[k].default_value = val
record['nose'] = {'outline': P['nose'], 'centre': [round(float(cx0), 4), round(float(cz0), 4)], 'inradius': round(float(inr), 4),
                  'normal': n_c.round(3).tolist(), 'vertices': len(V), 'faces': len(faces), 'shell': SH}

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
(args.out/'nose-v3.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Nose v3 (Nick 2026-10-12): the sketch shield outline with nostrils and a groove, on nose and mouth v2: the muzzle refit as one smooth form inside the nose and mouth region, the snout tip '
             'raised into a soft nose mound under a thin leather shell, one mouth line seated on the skin; nothing outside the region moves',
    'parameters': P, 'parts': record, 'skinBefore': before, 'skinAfter': mesh_stats(head),
    'outputs': {q.name: sha(q) for q in args.out.iterdir() if q.suffix in ['.glb', '.blend']},
}, indent=2, default=float)+'\n')
print('nose v3 ok', json.dumps(record, default=float), flush=True)
