"""Smooth face (Nick 2026-10-09: the face looks lumpy under fur; fix the model before more texture work).

Run with Blender (through loop_tools.py blender or a recipe step), on the fur base v2 head (H36):
  --python smooth_face_field.py -- --scene <head.blend> --out <new-dir> --spec <json> --envelope <r03_envelope.npz>

A bare-skin render of assembled-3023 at the fur cameras showed six faults in the model itself: a horizontal ridge across
the forehead above the eyes; bulges under and beside the eyes with creases running down toward the mouth; a lumpy, pinched
muzzle; an angular, faceted jaw edge with corners at the jaw hinge; a diagonal fold on the throat below the jaw; and wavy
edges on the ear shells. The sheet shows a soft rounded face: a round forehead into the crown, full smooth cheeks, a small
round muzzle with a clean nose pad and mouth line, a rounded jaw tapering to a small round chin and a smooth throat.

1. Face (head-local units, the same field space as the other *_field.py stages). The face is written as a radial height
   r(theta, phi) about `faceCenter` (theta elevation, phi azimuth from the front, -y, toward +x), sampled on `faceGrid`
   (degrees) by ray casts against the input skin. Every face direction is star shaped from the centre; directions where a
   ray crosses the skin more than once (ear undersides, the cheek ruff) are left out, grown by `multiGrow` degrees.
   - Authored mass: a smooth union of ellipsoids (`mass`: cranium, cheeks mirrored, muzzle, chin, throat; each part a
     centre, radii and blend radius k), fitted once to the face outside the lumps with the eye rings, nose and mouth weighted
     up. Its radial height r_M is the face's designed form.
   - Faired surface: r minimises  sum a (r - r_T)^2 + lam |L r|^2  (L the Laplace-Beltrami operator on the sphere, so a thin
     plate), where r_T mixes the input height (weight `data`, reweighted `irls` times by 1/(1+(dr/sigma)^2), floor
     `irlsMin`, so lumps count as outliers) with the mass (weight `massWeight`). The surface is pinned to the input on the
     eye globes and `eyeKeep` degrees around them (the eye outline zone and the lids do not move), on the nose and mouth
     footprints (the nose pad and mouth line stay where they are) and outside the face region; within `edge` degrees of the
     region edge the data weight returns to 1 so the face meets the unchanged head without a step. Solved by conjugate
     gradients, coarse to fine over three levels. The change is clamped to `maxDelta`.
   - Face region (on the input surface point): in front of `faceYBack`, away from the ears (|x| `faceEarX` above z
     `faceEarZ`), inside |x| `faceSideX`, above z `faceZMin` and below the crown (`faceZMax`; v1 and v2 already smoothed
     it). The mass weight fades out below the chin (`massZ`), so the throat follows the input's own fullness.
   - Field: f moves toward G = (rho - r) / sqrt(1 + |grad r|^2 / r^2) with the region weight; inside the eye globes plus
     `eyeHold` degrees the weight is 0. Where r equals the input height G and f have the same sign along each ray, so the
     surface there does not move.
2. Crown dome: across the crown the top dips at |x| about .2 between the centre and the ear roots, so the front outline
   reads as two hollows. Per row of the top heightfield (columns at y), a target runs from the centre top to the top at
   |x| `crownDomeX` along a smoothstep; where the top sits below it, it is raised by at most `crownLift`, faded out toward
   the ear roots (`crownDomeBlend`), on rows whose centre top is above `crownDomeRowZ` (the crown, not the forehead
   slope), only where the top faces up (slope under `crownDomeSlope`, as a tangent) and away from the footprint edge,
   blurred by `crownDomeBlur`, and added as a slab (top at the raised height, bottom `crownDomeDepth` under the old top)
   unioned with the field. It only adds material.
3. Ears: the v2 authored shells (fur_base_head_field_v2.py section 5) on a smoother outline. The shell is built twice onto
   the same cut skull, with v2's profile (the v2 record's mid-surface coefficients, `earMidCoef`), thickness, rim roll,
   cup and fillet: once on v2's outline (`earOutlineSmoothFrom`, `earTopCapFrom`, `earOutlineInsetFrom`) and once on the
   new one, the sheet outline blurred by `earOutlineSmooth` (v2's .02 kept the small waves of the sheet's tuft scallops),
   held below the frame top `earTopCap` (the sheet outline is clipped at the crown row, and the blur pushed it upward)
   and inset by `earOutlineInset` (a little less than v2, because the wider blur rounds the tips inward). Only the
   difference of the two is added to the field, so nothing moves where the outlines agree (re-cutting the skull left a
   flat panel at the back of each ear root). The rim waves go; the outline otherwise keeps its course.

Materials: every polygon takes the material of the nearest polygon of the input skin; the pale inner-ear slot is redrawn on
the authored cup as in v2. Writes head.blend, shape.glb, smooth-face.json.
"""
import argparse
import json
from pathlib import Path
import sys

import bpy
import bmesh
import numpy as np
import openvdb as vdb
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, remove_voxel_specks, require_single_closed_mesh, sha
from study_provenance import snapshot
from fan_clumps_front import CUPS, CX as FIT_CX, S as FIT_S, Z0 as FIT_Z0

DEFAULTS = {
    # face
    'faceCenter': [0., 0., -.12], 'faceGrid': [-85., 88., -100., 100., .5],
    'faceYBack': [-.06, .04], 'faceEarX': [.30, .36], 'faceEarZ': [-.12, -.04], 'faceSideX': [.34, .40], 'faceZMin': -.38, 'faceZMax': [.30, .38], 'massZ': [-.33, -.28],
    'eyeKeep': 4., 'eyeHold': 1., 'multiGrow': 3., 'edge': [2., 10.],
    'lam': 3e-4, 'data': 1., 'irls': 3, 'sigma': .005, 'irlsMin': .2, 'massWeight': .3, 'maxDelta': .04,
    'levels': 3, 'iters': 1500, 'mass': None,
    # crown dome
    'crownLift': .02, 'crownDomeX': .28, 'crownDomeBlend': [.20, .27], 'crownDomeRowZ': [.30, .36], 'crownDomeBlur': .03, 'crownDomeDepth': .06, 'crownDomeSlope': [.7, 1.2],
    # ears (v2 keys, v2 values unless noted)
    'earOutlineSmooth': .03, 'earOutlineSmoothFrom': .02, 'earOutlineInset': .006, 'earOutlineInsetFrom': .008, 'earTopCap': .537, 'earTopCapFrom': None, 'earTopCapRound': .02,
    'earThick': .03, 'earRootFlare': .20, 'earRootU': [.30, .62], 'earRootFlareBack': .34,
    'earRootUBack': [.24, .70], 'earRimRoll': .008, 'earRollW': .025, 'earCupDepth': .045, 'earCupBlur': .04,
    'earRingBlur': .02, 'earCupRim': .01, 'earStart': .36, 'earStartBack': .26, 'earStartBackZ': [.28, .36], 'earSideBlend': .03,
    'earCornerRound': .06, 'earZmin': -.30, 'earRootFloor': -.06, 'earRootFloorU': [.40, .55], 'earEdgeRound': 1.0,
    'earSkull': [.44, .32, 0., 3.5], 'earCutZ': [-.34, -.28], 'earCutRound': .03, 'earFillet': .08, 'earMidCoef': None,
    'paleSmooth': 4, 'paleFacing': .2, 'paleMinX': .28,
}

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--spec', type=Path, default=None, help='JSON object overriding DEFAULTS keys')
parser.add_argument('--voxel', type=float, default=.0025)
parser.add_argument('--bandwidth', type=int, default=40)
parser.add_argument('--slab', type=int, default=48, help='x-slab thickness in voxels (memory bound)')
parser.add_argument('--skip', default='', help='comma list of parts to skip: face,crown,ears')
parser.add_argument('--envelope', type=Path, default=Path(__file__).resolve().parent/'specs/r03_envelope.npz')
parser.add_argument('--max-island', type=int, default=5000)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
inputs = [args.scene, args.envelope] + ([args.spec] if args.spec else [])
provenance = snapshot(args.out, __file__, inputs)
P = dict(DEFAULTS)
if args.spec:
    extra = json.loads(args.spec.read_text())
    unknown = sorted(set(extra) - set(DEFAULTS) - {'note'})
    if unknown:
        raise SystemExit(f'unknown spec keys {unknown}')
    P.update({k: v for k, v in extra.items() if k != 'note'})
skip = set(s.strip() for s in args.skip.split(',') if s.strip())
if 'face' not in skip and not P['mass']:
    raise SystemExit('spec needs the authored face mass ("mass": {"parts": [...]})')
if 'ears' not in skip and P['earMidCoef'] is None:
    raise SystemExit('spec needs earMidCoef (the v2 record parts.ears.midCoef) so the ear profile is unchanged')


# ---- helpers (numpy only) -----------------------------------------------------------------------------------------
def ss(t, a, b):
    t = np.clip((t-a)/(b-a), 0, 1)
    return t*t*(3-2*t)


def box_nd(a, r, axes):
    for ax in axes:
        n = a.shape[ax]
        pad = [(r+1, r) if i == ax else (0, 0) for i in range(a.ndim)]
        c = np.cumsum(np.pad(a, pad, mode='edge'), axis=ax, dtype=np.float64)
        a = ((np.take(c, np.arange(2*r+1, n+2*r+1), axis=ax)-np.take(c, np.arange(0, n), axis=ax))/(2*r+1)).astype(np.float32)
    return a


def blur2(a, r, passes=3):
    a = a.astype(np.float64)
    for _ in range(passes):
        for ax in (0, 1):
            n = a.shape[ax]
            pad = [(r+1, r) if i == ax else (0, 0) for i in range(2)]
            c = np.cumsum(np.pad(a, pad, mode='edge'), axis=ax)
            a = (np.take(c, np.arange(2*r+1, n+2*r+1), axis=ax)-np.take(c, np.arange(0, n), axis=ax))/(2*r+1)
    return a


def shift(a, i, j, fill):
    out = np.full_like(a, fill)
    H, W = a.shape
    out[max(i, 0):H+min(i, 0), max(j, 0):W+min(j, 0)] = a[max(-i, 0):H+min(-i, 0), max(-j, 0):W+min(-j, 0)]
    return out


def dilate1(m, eight):
    out = m.copy()
    nb = [(1, 0), (-1, 0), (0, 1), (0, -1)] + ([(1, 1), (1, -1), (-1, 1), (-1, -1)] if eight else [])
    for i, j in nb:
        out |= shift(m, i, j, False)
    return out


def dilate(m, n):
    for k in range(int(n)):
        m = dilate1(m, k % 2 == 1)
    return m


def distance_cells(m, limit):
    """Approximate (octagonal) distance in cells from the True cells of m, capped at limit."""
    d = np.where(m, 0., float(limit))
    cur = m.copy()
    for k in range(1, int(limit)+1):
        nxt = dilate1(cur, k % 2 == 0)
        d[nxt & ~cur] = k
        cur = nxt
    return d


def fill_holes(m):
    """Cells not reachable from the border through False cells become True."""
    outside = np.zeros_like(m)
    outside[0, :] = ~m[0, :]
    outside[-1, :] = ~m[-1, :]
    outside[:, 0] |= ~m[:, 0]
    outside[:, -1] |= ~m[:, -1]
    while True:
        nxt = dilate1(outside, False) & ~m
        if (nxt == outside).all():
            break
        outside = nxt
    return ~outside


def bilinear(A, rr, cc):
    r0 = np.clip(np.floor(rr).astype(int), 0, A.shape[0]-2)
    c0 = np.clip(np.floor(cc).astype(int), 0, A.shape[1]-2)
    fr = np.clip(rr-r0, 0, 1)
    fc = np.clip(cc-c0, 0, 1)
    return A[r0, c0]*(1-fr)*(1-fc)+A[r0+1, c0]*fr*(1-fc)+A[r0, c0+1]*(1-fr)*fc+A[r0+1, c0+1]*fr*fc


# ---- authored mass ------------------------------------------------------------------------------------------------
def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def ellipsoid(p, cen, rad):
    cen = np.asarray(cen, float)
    rad = np.asarray(rad, float)
    return (np.linalg.norm((p-cen)/rad, axis=-1)-1)*rad.min()


def mass_field(spec, p):
    f = None
    for part in spec['parts']:
        g = ellipsoid(p, part['c'], part['r'])
        if part.get('mirror'):
            g = smin(g, ellipsoid(p, [-part['c'][0], part['c'][1], part['c'][2]], part['r']), part['k'])
        f = g if f is None else smin(f, g, part['k'])
    return f


def mass_radial(spec, dirs, c, rmax=1.0, n=48):
    lo = np.full(dirs.shape[:-1], .02)
    hi = np.full(dirs.shape[:-1], rmax)
    for _ in range(n):
        m = (lo+hi)/2
        inside = mass_field(spec, c+dirs*m[..., None]) < 0
        lo = np.where(inside, m, lo)
        hi = np.where(inside, hi, m)
    return (lo+hi)/2


# ---- thin-plate fairing on the sphere -----------------------------------------------------------------------------
def fair(rT, pins, a, lam, th, h, iters, x0=None, tol=1e-10):
    ct = np.cos(th)[:, None]
    cp = np.cos(th+h/2)[:, None]

    def K(r):
        o = np.zeros_like(r)
        d = r[1:]-r[:-1]
        o[:-1] += cp[:-1]*d
        o[1:] -= cp[:-1]*d
        e = r[:, 1:]-r[:, :-1]
        o[:, :-1] += e/ct
        o[:, 1:] -= e/ct
        return o
    Minv = 1.0/(ct*h**4)
    free = ~pins
    rp = np.where(pins, rT, 0.)

    def A(x):
        x = np.where(free, x, 0.)
        return np.where(free, a*x+lam*K(Minv*K(x)), 0.)
    b = np.where(free, a*rT-lam*K(Minv*K(rp)), 0.)
    x = np.where(free, rT if x0 is None else x0, 0.)
    res = b-A(x)
    p = res.copy()
    rs = (res*res).sum()
    b2 = max((b*b).sum(), 1e-30)
    k = 0
    for k in range(iters):
        Ap = A(p)
        al = rs/(p*Ap).sum()
        x += al*p
        res -= al*Ap
        rn = (res*res).sum()
        if rn < tol*b2:
            break
        p = res+(rn/rs)*p
        rs = rn
    return np.where(free, x, rT), k


def down(a, mode):
    H, W = a.shape
    b = a[:H//2*2, :W//2*2].reshape(H//2, 2, W//2, 2)
    return b.any((1, 3)) if mode == 'any' else b.mean((1, 3))


def up(a, shape):
    H, W = shape
    yi = np.clip((np.arange(H)-.5)/2, 0, a.shape[0]-1)
    xi = np.clip((np.arange(W)-.5)/2, 0, a.shape[1]-1)
    return bilinear(a, yi[:, None]+0*xi[None], xi[None]+0*yi[:, None]) if min(a.shape) > 1 else np.full(shape, a.mean())


def fair_ml(rT, pins, a, lam, th, h, levels, iters):
    x0 = None
    if levels > 1 and min(rT.shape) > 40:
        thc = th[:len(th)//2*2].reshape(-1, 2).mean(1)
        rc, _ = fair_ml(down(rT, 'mean'), down(pins, 'any'), down(a, 'mean'), lam, thc, 2*h, levels-1, iters)
        x0 = up(rc, rT.shape)
    return fair(rT, pins, a, lam, th, h, iters, x0=x0)


# ---- input --------------------------------------------------------------------------------------------------------
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
head = max(meshes, key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before smooth face')
before = mesh_stats(head)
VS = args.voxel
M = head.matrix_world.copy()
nv = len(head.data.vertices)
co = np.empty(nv*3)
head.data.vertices.foreach_get('co', co)
Mn = np.array(M)
points = (co.reshape(-1, 3)@Mn[:3, :3].T+Mn[:3, 3]).astype(np.float32)
head.data.calc_loop_triangles()
tris = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
head.data.loop_triangles.foreach_get('vertices', tris)
tris = tris.reshape(-1, 3)
tri_poly = np.empty(len(head.data.loop_triangles), dtype=np.int32)
head.data.loop_triangles.foreach_get('polygon_index', tri_poly)
poly_mat = np.empty(len(head.data.polygons), dtype=np.int32)
head.data.polygons.foreach_get('material_index', poly_mat)
src_tree = BVHTree.FromPolygons(points.tolist(), tris.tolist())
src_tri_mat = poly_mat[tri_poly]
mat_counts_before = {(m.name if m else str(i)): int((poly_mat == i).sum()) for i, m in enumerate(head.data.materials)}


def tree_of(objs):
    V, F = [], []
    for o in objs:
        Mo = o.matrix_world
        base = len(V)
        V += [tuple(Mo @ v.co) for v in o.data.vertices]
        F += [tuple(base+i for i in p.vertices) for p in o.data.polygons]
    return BVHTree.FromPolygons(V, F) if F else None


HALF = args.bandwidth
BAND = HALF*VS
grid = vdb.FloatGrid.createLevelSetFromPolygons(points, triangles=tris, transform=vdb.createLinearTransform(voxelSize=VS), halfWidth=HALF)
lo = np.floor(points.min(axis=0)/VS).astype(int)-12
hi = np.ceil(points.max(axis=0)/VS).astype(int)+12
shape = tuple(int(v) for v in hi-lo+1)
f = np.empty(shape, dtype=np.float32)
grid.copyToArray(f, ijk=tuple(int(v) for v in lo))
del grid
nx, ny, nz = shape
X = ((lo[0]+np.arange(nx))*VS).astype(np.float32)
Y = ((lo[1]+np.arange(ny))*VS).astype(np.float32)
Z = ((lo[2]+np.arange(nz))*VS).astype(np.float32)
Yb = Y[None, :, None]
Zb = Z[None, None, :]
print('grid', shape, 'band', BAND, flush=True)


def R(d):
    return max(1, int(round(d/VS)))


def slabs():
    for a in range(0, nx, args.slab):
        yield slice(a, min(nx, a+args.slab))


record = {}

# ---- 1. face ------------------------------------------------------------------------------------------------------
if 'face' not in skip:
    c = np.array(P['faceCenter'], float)
    t0, t1, p0_, p1_, step = P['faceGrid']
    th = np.radians(np.arange(t0, t1+1e-6, step))
    ph = np.radians(np.arange(p0_, p1_+1e-6, step))
    h = np.radians(step)
    cells = 1/step          # grid cells per degree
    T_, F_ = np.meshgrid(th, ph, indexing='ij')
    dirs = np.stack([np.cos(T_)*np.sin(F_), -np.cos(T_)*np.cos(F_), np.sin(T_)], -1)
    trees = {'skin': src_tree, 'eye': tree_of([o for o in meshes if o.name.startswith('eye_globe')]),
             'feature': tree_of([o for o in meshes if o.name.startswith('nose') or o.name.startswith('closed_mouth')])}
    far = 1.6
    rad = {k: np.full(T_.shape, np.nan) for k in trees}
    count = np.zeros(T_.shape, np.int8)
    for i in range(len(th)):
        for j in range(len(ph)):
            d = Vector(dirs[i, j].tolist())
            o = Vector(c.tolist())+d*far
            for k, tr in trees.items():
                if tr is None:
                    continue
                hit = tr.ray_cast(o, -d, far)
                if hit[0] is None:
                    continue
                rad[k][i, j] = far-hit[3]
                if k == 'skin':
                    n, pos, left = 1, hit[0]-d*1e-4, far-hit[3]-1e-4
                    while n < 9:
                        h2 = tr.ray_cast(pos, -d, left)
                        if h2[0] is None:
                            break
                        n += 1
                        left -= h2[3]+1e-4
                        pos = h2[0]-d*1e-4
                    count[i, j] = n
    r0 = rad['skin']
    hitm = ~np.isnan(r0)
    r0f = np.where(hitm, r0, np.nanmean(r0))
    p0 = c+dirs*r0f[..., None]
    eye = ~np.isnan(rad['eye']) & (np.nan_to_num(rad['eye'], nan=-1) >= r0f-1e-4)
    eye = fill_holes(~dilate(~dilate(eye, 3), 3) | eye)      # closing, then holes filled
    feat = ~np.isnan(rad['feature'])
    xa, ya, za = np.abs(p0[..., 0]), p0[..., 1], p0[..., 2]
    wreg = ((1-ss(ya, *P['faceYBack']))*(1-ss(xa, *P['faceEarX'])*ss(za, *P['faceEarZ']))*(1-ss(xa, *P['faceSideX']))
            * ss(za, P['faceZMin'], P['faceZMin']+.02)*(1-ss(za, *P['faceZMax'])))
    multi = dilate(count > 1, P['multiGrow']*cells)
    region = (wreg > .5) & hitm & ~multi
    deye = distance_cells(eye, int(P['eyeKeep']*cells)+2)/cells
    pins = ~region | (deye < P['eyeKeep']) | feat
    din = distance_cells(~region, int(P['edge'][1]*cells)+2)/cells     # degrees inside the region from its edge
    wb = 1-ss(din, *P['edge'])
    rM = mass_radial(P['mass'], dirs, c)
    aM = P['massWeight']*(1-wb)*ss(za, *P['massZ'])     # the mass has no say on the throat (its throat part is only a guide)
    w_ir = np.ones(T_.shape)
    for it in range(int(P['irls'])+1):
        a0 = P['data']*(wb+(1-wb)*w_ir)
        rT = np.where(pins, r0f, (a0*r0f+aM*rM)/(a0+aM))
        rs, iters = fair_ml(rT, pins, a0+aM, P['lam'], th, h, int(P['levels']), int(P['iters']))
        w_ir = np.maximum(1/(1+((rs-r0f)/P['sigma'])**2), P['irlsMin'])
    rs = np.where(pins, r0f, r0f+np.clip(rs-r0f, -P['maxDelta'], P['maxDelta']))
    dr = rs-r0f
    # field weight: 0 on the globes (plus eyeHold) and on multi-crossing rays, 1 on the region and the pinned eye ring
    keep = (region | ((deye < P['eyeKeep']) & hitm & ~multi)) & ~(deye < P['eyeHold'])
    wf = blur2(keep.astype(float), 2, 2)*keep
    wf = np.where(multi | (deye < P['eyeHold']), 0., wf)
    gt = np.gradient(rs, h, axis=0)
    gp = np.gradient(rs, h, axis=1)/np.cos(th)[:, None]
    nrm = np.sqrt(1+(gt*gt+gp*gp)/rs**2)
    rmax_ = np.maximum(rs, r0f)
    # voxels in the face directions only: a box around the moved surface
    moved = keep
    pts_ = (c+dirs*rmax_[..., None])[moved]
    blo = np.maximum(np.floor((pts_.min(0)-.08)/VS).astype(int)-lo, 0)
    bhi = np.minimum(np.ceil((pts_.max(0)+.08)/VS).astype(int)-lo+1, np.array(shape))
    changed = 0
    for a_ in range(blo[0], bhi[0], args.slab):
        sx = slice(a_, min(bhi[0], a_+args.slab))
        sl = (sx, slice(blo[1], bhi[1]), slice(blo[2], bhi[2]))
        gx, gy, gz = np.meshgrid(X[sl[0]], Y[sl[1]], Z[sl[2]], indexing='ij')
        qx, qy, qz = gx-c[0], gy-c[1], gz-c[2]
        rho = np.sqrt(qx*qx+qy*qy+qz*qz)+1e-9
        ti = (np.degrees(np.arcsin(np.clip(qz/rho, -1, 1)))-t0)/step
        pj = (np.degrees(np.arctan2(qx, -qy))-p0_)/step
        inside = (ti >= 0) & (ti <= len(th)-1) & (pj >= 0) & (pj <= len(ph)-1)
        w = bilinear(wf, ti, pj)*inside*ss(rho, .08, .12)
        if not (w > 0).any():
            continue
        rr = bilinear(rs, ti, pj)
        nn = bilinear(nrm, ti, pj)
        G = np.clip((rho-rr)/nn, -BAND, BAND)
        sub = f[sl]
        new = sub+w*(G-sub)
        changed += int(((sub < 0) != (new < 0)).sum())
        f[sl] = np.clip(new, -BAND, BAND).astype(np.float32)
    record['face'] = {'center': c.tolist(), 'raysMultiCrossing': int((count > 1).sum()), 'regionRays': int(region.sum()),
                      'pinnedRays': int((pins & hitm).sum()), 'cgIterationsLast': int(iters),
                      'moveOut': round(float(dr[region].max()), 4), 'moveIn': round(float(dr[region].min()), 4),
                      'moveP95': round(float(np.percentile(np.abs(dr[region]), 95)), 4),
                      'voxelsChangedSign': changed}
    np.savez_compressed(args.out/'face-radial.npz', th=th, ph=ph, c=c, r0=r0f, rs=rs, rM=rM, region=region, pins=pins, eye=eye, feat=feat, multi=multi)
    print('face done', record['face'], flush=True)

# ---- 1b. crown dome: the two dips between the crown centre and the ear roots, filled --------------------------------------
if 'crown' not in skip and P['crownLift'] > 0:
    Tm = np.zeros((nx, ny), bool)
    zt = np.zeros((nx, ny), np.float32)
    for s in slabs():
        ins = f[s] < 0
        Tm[s] = ins.any(2)
        k = np.clip(nz-1-ins[:, :, ::-1].argmax(2), 0, nz-2)       # last inside voxel of each column
        fa = np.take_along_axis(f[s], k[:, :, None], 2)[:, :, 0]
        fb = np.take_along_axis(f[s], k[:, :, None]+1, 2)[:, :, 0]
        zt[s] = Z[k]+VS*np.clip(fa/np.minimum(fa-fb, -1e-6), 0, 1)  # sub-voxel crossing (no terraces)
    ua = np.abs(X)
    x_edge = P['crownDomeX']
    target = np.full((nx, ny), -np.inf, np.float32)
    rowc = np.full(ny, np.nan)
    for side in (1, -1):
        sel_c = ua < .015
        sel_e = (side*X > x_edge-.02) & (side*X <= x_edge)
        cz = np.where(Tm[sel_c].all(0), zt[sel_c].mean(0), np.nan)
        ez = np.where(Tm[sel_e].all(0), zt[sel_e].mean(0), np.nan)
        rowc = cz
        half = (side*X >= 0) & (ua <= x_edge)
        t = ss(ua[half], 0, x_edge)[:, None]
        target[half] = cz[None, :]+(ez-cz)[None, :]*t
    ok = np.isfinite(target) & Tm
    lift = np.where(ok, np.clip(target-zt, 0, P['crownLift']), 0.)
    wx = (1-ss(ua, *P['crownDomeBlend']))[:, None]
    wy = ss(np.nan_to_num(rowc, nan=-1.), *P['crownDomeRowZ'])[None, :]
    zb_ = blur2(np.where(Tm, zt, Z[0]), 2, 2)
    gx_, gy_ = np.gradient(zb_, VS, VS)
    flat = 1-ss(np.sqrt(gx_**2+gy_**2), *P['crownDomeSlope'])          # top-facing columns only (no sheets on the walls)
    lift = blur2(lift*wx*wy*flat, R(P['crownDomeBlur']), 3)*ss(blur2(Tm.astype(float), 3, 2), .9, .99)*blur2(flat, 2, 2)
    zs = (zt+lift).astype(np.float32)
    gx_, gy_ = np.gradient(zs, VS, VS)
    nrm_c = np.sqrt(1+gx_**2+gy_**2).astype(np.float32)
    raised = 0
    for s in slabs():
        lf = lift[s][:, :, None]
        if not (lf > 1e-5).any():
            continue
        slab = np.maximum((Zb-zs[s][:, :, None])/nrm_c[s][:, :, None], (zt[s][:, :, None]-P['crownDomeDepth'])-Zb)
        slab = np.where(lf > 1e-5, slab, BAND)
        fs = f[s]
        new = np.minimum(fs, slab)
        raised += int(((fs < 0) != (new < 0)).sum())
        f[s] = np.clip(new, -BAND, BAND)
    record['crown'] = {'maxLift': round(float(lift.max()), 4), 'voxelsRaised': raised}
    del Tm, zt, target, lift, zs
    print('crown done', record['crown'], flush=True)

# ---- 2. ears: the v2 shells on a smoother outline -------------------------------------------------------------------
cup2 = None
if 'ears' not in skip:
    E = np.load(str(args.envelope))
    NE = int(E['grid'][0])
    U2 = np.abs(X)[:, None]+0*Z[None, :]
    Z2 = 0*X[:, None]+Z[None, :]
    cc_ = (X/FIT_S+FIT_CX)[:, None]*NE+NE/2+0*Z[None, :]
    rr_ = ((FIT_Z0-Z)/FIT_S)[None, :]*NE+0*X[:, None]
    d2raw = (bilinear(E['sdf_closed'], rr_, cc_)*FIT_S).astype(np.float64)

    def outline(smooth, cap_z, inset):
        d2 = blur2(d2raw, R(smooth), 3) if smooth > 0 else d2raw
        if cap_z is not None:
            kt = P['earTopCapRound']
            cap = Z2-cap_z
            hh = np.clip(.5+.5*(cap-d2)/kt, 0, 1)
            d2 = cap*hh+d2*(1-hh)+kt*hh*(1-hh)          # smooth max: the outline stays below the frame top
        return d2+inset
    co_ = P['earMidCoef']
    ym = co_[0]+co_[1]*U2+co_[2]*Z2+co_[3]*U2**2+co_[4]*U2*Z2+co_[5]*Z2**2
    pts_ = np.stack([(X[:, None]/FIT_S+FIT_CX+0*Z[None, :]).ravel(), ((FIT_Z0-Z[None, :])/FIT_S+0*X[:, None]).ravel()], 1)
    cup = np.zeros((nx, nz), bool)
    for poly in CUPS.values():
        poly = np.asarray(poly)
        inside = np.zeros(len(pts_), bool)
        for (x1, y1), (x2, y2) in zip(poly, np.roll(poly, -1, 0)):
            inside ^= ((y1 > pts_[:, 1]) != (y2 > pts_[:, 1])) & (pts_[:, 0] < (x2-x1)*(pts_[:, 1]-y1)/((y2-y1)+1e-12)+x1)
        cup |= inside.reshape(nx, nz)
    cs = blur2(cup.astype(float), R(P['earCupBlur']), 3)
    cn = blur2(cup.astype(float), R(P['earRingBlur']), 3)
    cup2 = cs > .5
    ring = np.clip(4*cn*(1-cn), 0, 1)
    ym = ym+P['earCupDepth']*cs
    gx_, gz_ = np.gradient(ym, VS, VS)
    nrm2 = np.sqrt(1+gx_**2+gz_**2)
    ka = P['earCornerRound']
    wtop = ss(Z2, *P['earStartBackZ'])

    def shell_maps(d2):
        roll = P['earRimRoll']*np.exp(-((d2+P['earRollW'])/P['earRollW'])**2)
        hf = P['earThick']/2+P['earRootFlare']*(1-ss(U2, *P['earRootU']))+roll+P['earCupRim']*ring
        hb = P['earThick']/2+P['earRootFlareBack']*(1-ss(U2, *P['earRootUBack']))+roll

        def inner_edge(start):
            b2 = start-U2
            h_ = np.clip(.5+.5*(b2-d2)/ka, 0, 1)
            floor = P['earZmin']+(P['earRootFloor']-P['earZmin'])*(1-ss(U2, *P['earRootFloorU']))
            return np.maximum(b2*h_+d2*(1-h_)+ka*h_*(1-h_), floor-Z2)
        bnd = inner_edge(P['earStart'])
        bndb = inner_edge(P['earStartBack'])
        return hf, hb, bnd, bndb*(1-wtop)+bnd*wtop
    maps = {'from': shell_maps(outline(P['earOutlineSmoothFrom'], P['earTopCapFrom'], P['earOutlineInsetFrom'])),
            'to': shell_maps(outline(P['earOutlineSmooth'], P['earTopCap'], P['earOutlineInset']))}
    sx_, sy_, yc_, pe_ = P['earSkull']
    kc, kf = P['earCutRound'], P['earFillet']

    def shell(s, mp):
        hf, hb, bnd, bndb = mp
        ym_s, hf_s, hb_s = ym[s][:, None, :], hf[s][:, None, :], hb[s][:, None, :]
        t_ = Yb-ym_s
        wbk = ss(t_, -P['earSideBlend'], P['earSideBlend'])
        b_s = bnd[s][:, None, :]*(1-wbk)+bndb[s][:, None, :]*wbk
        a_ = np.maximum(-(t_+hf_s), t_-hb_s)/nrm2[s][:, None, :]
        r_ = np.minimum(hf_s, hb_s)*P['earEdgeRound']
        qa, qb = np.maximum(a_+r_, 0), np.maximum(b_s+r_, 0)
        return np.sqrt(qa*qa+qb*qb)+np.minimum(np.maximum(a_+r_, b_s+r_), 0)-r_
    moved_ear = 0
    for s in slabs():
        ax = np.abs(X[s])[:, None, None]
        g = (((ax/sx_)**pe_+(np.abs(Yb-yc_)/sy_)**pe_)**(1/pe_)-1)*min(sx_, sy_)
        g = g-(1-ss(Zb, *P['earCutZ']))-(1-ss(ax, .26, .30))
        fs = f[s]
        h_ = np.clip(.5+.5*(g-fs)/kc, 0, 1)
        sk = g*h_+fs*(1-h_)+kc*h_*(1-h_)                     # skull without the ears (smooth max), as v2 cut it
        U = []
        for key in ('from', 'to'):
            G = shell(s, maps[key])
            h_ = np.clip(.5+.5*(G-sk)/kf, 0, 1)
            U.append(G*(1-h_)+sk*h_-kf*h_*(1-h_))           # ears smooth-unioned to it, as v2 did
        new = fs+(U[1]-U[0])                                # only the change between the two outlines is applied
        moved_ear += int(((fs < 0) != (new < 0)).sum())
        f[s] = np.clip(new, -BAND, BAND)
    record['ears'] = {'midCoef': co_, 'cupCells': int(cup2.sum()), 'voxelsChangedSign': moved_ear, 'envelopeSha256': sha(args.envelope)}
    del d2raw, ym, maps, nrm2, cs, cn, ring
    print('ears done', record['ears'], flush=True)

# ---- mesh -----------------------------------------------------------------------------------------------------------
out_grid = vdb.FloatGrid()
out_grid.background = BAND
out_grid.copyFromArray(f, ijk=tuple(int(v) for v in lo))
del f
vertices, tri_out, quads = out_grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
del out_grid
vertices = vertices.astype(np.float64)*VS
faces = [tuple(t) for t in tri_out.tolist()]+[tuple(q) for q in quads.tolist()]
materials = list(head.data.materials)
mesh = bpy.data.meshes.new('Head skin smooth face')
mesh.from_pydata(vertices.tolist(), [], faces)
mesh.update()
bm = bmesh.new()
bm.from_mesh(mesh)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(mesh)
bm.free()
old = head.data
head.data = mesh
for material in materials:
    mesh.materials.append(material)
inverse = M.inverted()
for vertex in mesh.vertices:
    vertex.co = inverse @ vertex.co
bpy.data.meshes.remove(old)
removed_flecks = remove_voxel_specks(head, max_extent=6*VS)
removed_islands = []
if args.max_island:
    bmi = bmesh.new()
    bmi.from_mesh(head.data)
    unseen, groups = set(bmi.verts), []
    while unseen:
        queue = [unseen.pop()]
        group = set(queue)
        while queue:
            for edge in queue.pop().link_edges:
                for vertex in edge.verts:
                    if vertex in unseen:
                        unseen.remove(vertex)
                        group.add(vertex)
                        queue.append(vertex)
        groups.append(group)
    biggest = max(groups, key=len)
    for group in groups:
        if group is not biggest and len(group) <= args.max_island:
            removed_islands.append({'vertices': len(group)})
            bmesh.ops.delete(bmi, geom=list(group), context='VERTS')
    bmi.to_mesh(head.data)
    bmi.free()

# materials: nearest input polygon, then the pale slot on the authored cup (as v2)
me = head.data
count_p = len(me.polygons)
vco = np.empty(len(me.vertices)*3)
me.vertices.foreach_get('co', vco)
vco = vco.reshape(-1, 3)@Mn[:3, :3].T+Mn[:3, 3]
lv = np.empty(len(me.loops), dtype=np.int32)
me.loops.foreach_get('vertex_index', lv)
lt = np.empty(count_p, dtype=np.int32)
me.polygons.foreach_get('loop_total', lt)
owner = np.repeat(np.arange(count_p), lt)
centers = np.zeros((count_p, 3))
np.add.at(centers, owner, vco[lv])
centers /= lt[:, None]
mats = np.zeros(count_p, dtype=np.int32)
misses = 0
for i, cpt in enumerate(centers):
    hit = src_tree.find_nearest(tuple(float(x) for x in cpt))
    if hit[2] is None:
        misses += 1
        continue
    mats[i] = src_tri_mat[hit[2]]
record['carryMisses'] = misses
pale_slots = [i for i, m in enumerate(materials) if m and m.name.startswith('Pale')]
record['materialsCarried'] = {int(i): int((mats == i).sum()) for i in np.unique(mats)}
if P['paleSmooth'] > 0 and pale_slots and cup2 is not None:
    pale_index = max(pale_slots, key=lambda i: int((mats == i).sum()))
    nxt = np.arange(len(lv))+1
    ls_ = np.empty(count_p, dtype=np.int32)
    me.polygons.foreach_get('loop_start', ls_)
    nxt[ls_+lt-1] = ls_
    fn = np.zeros((count_p, 3))
    np.add.at(fn, owner, np.cross(vco[lv], vco[lv[nxt]]))
    fn /= np.linalg.norm(fn, axis=1, keepdims=True)+1e-12
    ix = np.clip(np.round(centers[:, 0]/VS).astype(int)-lo[0], 0, nx-1)
    iz = np.clip(np.round(centers[:, 2]/VS).astype(int)-lo[2], 0, nz-1)
    marked = cup2[ix, iz] & (fn[:, 1] < -P['paleFacing']) & (np.abs(centers[:, 0]) > P['paleMinX'])
    edge_index = np.empty(len(me.loops), dtype=np.int32)
    me.loops.foreach_get('edge_index', edge_index)
    order = np.argsort(edge_index, kind='stable')
    ei_s, fl_s = edge_index[order], owner[order]
    same = ei_s[1:] == ei_s[:-1]
    fa_, fb_ = fl_s[:-1][same], fl_s[1:][same]
    deg = np.bincount(fa_, minlength=count_p)+np.bincount(fb_, minlength=count_p)
    for _ in range(P['paleSmooth']):
        nearc = np.bincount(fa_, weights=marked[fb_], minlength=count_p)+np.bincount(fb_, weights=marked[fa_], minlength=count_p)
        marked = np.where(nearc*2 > deg, True, np.where(nearc*2 < deg, False, marked))
    mats = np.where(marked, pale_index, np.where(np.isin(mats, pale_slots), 0, mats)).astype(np.int32)
me.polygons.foreach_set('material_index', mats)
for polygon in me.polygons:
    polygon.use_smooth = True
me.update()
mat_counts_after = {(m.name if m else str(i)): int((mats == i).sum()) for i, m in enumerate(materials)}
require_single_closed_mesh(head, args.out, 'Head skin smooth face')
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'smooth-face.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Smooth face (Nick 2026-10-09): the face faired toward an authored ellipsoid mass with the eye zone, nose pad '
             'and mouth line pinned; crown dips raised toward a smooth arch; ear shells moved onto a smoother outline; '
             'eye globes, nose and mouth objects untouched',
    'parameters': P, 'voxel': VS, 'bandwidth': HALF, 'skip': sorted(skip), 'parts': record,
    'materialsBefore': mat_counts_before, 'materialsAfter': mat_counts_after,
    'removedFlecks': len(removed_flecks), 'removedIslands': removed_islands,
    'skinBefore': before, 'skinAfter': mesh_stats(head),
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']},
}, indent=2)+'\n')
print('smooth face ok', flush=True)
