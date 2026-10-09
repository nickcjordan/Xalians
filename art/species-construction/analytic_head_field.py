"""Analytic head (Nick 2026-10-09): the whole skull authored as one smooth mass, with the analytic ears joined to it.

Run with Blender (through loop_tools.py blender or a recipe step), on the smooth face head (H37):
  --python analytic_head_field.py -- --scene <head.blend> --out <new-dir> --ears <ears spec json> --spec <head spec json>

Nick on the H38 ears A to E: "it looks like you added some bulk to the head ... take the new version between A and E of the
ears, and then completely rethink the head shape and how it should be as the ears attach to it." H38 kept H37's skull
(built when the old fan ears covered the head sides) and grew an end cap beyond |x| .24 from its section, so the head had
straight parallel sides at |x| about .41 from the eyes to the crown, a flat back with corners and wide temples where the
old fan used to sit (head-redesign section of furbase-notes.md). The first sheet and Nick's silhouette show a small round
head: about .35 head units half wide at the eyes, narrowing to a small chin, with the ears leaving its upper sides from just
outside the outer eye corner up to the crown.

1. Head mass: a smooth union of ellipsoids (`mass`: cranium, a mirrored jaw pair, muzzle, chin, throat; each a centre,
   radii and blend radius k), fitted by fit_head_mass.py to the sheet's front half widths, the back of the head and the
   crown height, and to the H37 face around the eyes, nose and mouth. Its approximate distance replaces the whole skin of
   the input except where the input is kept (2). Nothing of the old skull sides, temples, crown or back remains.
2. Kept from the input (H37), blended in field space by a smooth weight:
   - the eye outline zone: within `eyeKeep` of the eye globes (exact up to the first value, fading out by the second),
     so the lid band and the skin the globes sit in do not move;
   - the nose pad and the mouth line: within `featKeep` of the nose and mouth objects;
   - the neck stub below the jaw (`neckKeepZ`: kept below the first height, the mass above the second), so the assembly
     join meets the same neck.
   Then the skin in a ring around each eye (`eyeRing`: fading in from the first two distances to the globe, out between
   the last two) is blended toward a box blur of the field (`eyeRingBlur`), so the seam where the kept lid band meets
   the mass leaves no ridge or fold beside the eye; the lid band itself is not blurred.
   The keep weight is cut beyond |x| `keepMaxX` (no old ear root can enter). Distances are taken on a coarse grid
   (`distStep`) by nearest-point queries and resampled by a tensor cubic B-spline, so the weight has no cell kinks
   (trilinear interpolation left a fine dimpled pattern on the face).
3. Ears: as analytic_ears_field.py (H38) sections 1 to 4 and 7: one ear in u = |x|, a closed uniform cubic B-spline outline
   (`earControls`), an analytic mid-surface with backward sweep, funnel and elliptic cup, an even shell with a rolled rim,
   a raised cup rim and a back root flare, a rounded edge, and a start inside the skull (`earMinU`, further in above
   `earMinUTop`, rounded by `earStartRound`). The ears spec (`--ears`, an ears-analytic-*.json) gives the outline and the
   cup; the head spec gives where the ear sits on the new skull (`earVisibleU`, `earRootU`, `earY0`, `earMinU`,
   `earMinUTop`, `earFlareU`). New against H38: inside the root (u < `earRootU`) the sweep term uses a smooth max of
   (u - earRootU) with 0 (radius `earInnerFlat`), so the buried inner part of the ear does not swing forward out of the
   forehead (with the root moved in to the new skull, H38's sweep put it in front of the brow). The ears are smooth-unioned to the head with a fillet `earFillet` behind the mid-surface
   and `earFilletFront` in front of it, so the skull surface runs into each ear root without a ring or crease.

Materials: everything is `Head clay` (slot 0) except the pale inner-ear slot (`Pale inner-ear coat.001`), drawn from the
analytic cup as in H38: faces whose centre lies inside the cup ellipse (q < `paleQ`), within `paleNear` of the ear's front
surface, facing forward (`paleFacing`) and beyond |x| `paleMinX`; one majority pass (`paleSmooth`).
Writes head.blend, shape.glb, analytic-head.json.
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

DEFAULTS = {
    # ears (H38 keys; the ears spec gives the outline and cup, the head spec the placement on the skull)
    'earControls': [[.12, .26], [.30, -.10], [.56, -.02], [.84, .17], [1.02, .38], [1.04, .53], [.62, .55], [.24, .42]],
    'earVisibleU': .34, 'earSamples': 1200,
    'earY0': .05, 'earRootU': .36, 'earSweep': .61, 'earBend': .69,
    'earFunnel': .5, 'earFunnelBase': 1.0,
    'earCupDepth': .04, 'earCupScale': .62, 'earCupShift': [0., 0.], 'earCupTaper': 0.,
    'earThick': .03, 'earRimRoll': .006, 'earRollW': .02,
    'earCupRim': .003, 'earCupRimAt': 1.15, 'earCupRimW': .22,
    'earEdgeRound': 1.0, 'earMinU': .27, 'earMinUTop': [.10, .24, .36], 'earStartRound': .08,
    'earFillet': .10, 'earFilletFront': .05, 'earFilletSide': .03,
    'earFlareU': [.28, .44], 'earInnerFlat': .08, 'earFlareFront': 0., 'earFlareBack': .08,
    'paleQ': 1.0, 'paleNear': .06, 'paleFacing': .2, 'paleMinX': .3, 'paleSmooth': 1,
    # head
    'mass': None,
    'faceX': [.30, .42], 'faceY': [-.20, -.10], 'faceZ': [.18, .32],
    'eyeKeep': [.02, .06], 'featKeep': [.02, .07], 'neckKeepZ': [-.36, -.30], 'keepMaxX': [.36, .42], 'distStep': .01,
    'eyeRingBlur': .02, 'eyeRing': [.015, .03, .07, .11],
}

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--ears', type=Path, required=True, help='ears spec (outline and cup keys)')
parser.add_argument('--spec', type=Path, required=True, help='head spec (mass, keep zones, ear placement)')
parser.add_argument('--voxel', type=float, default=.0025)
parser.add_argument('--bandwidth', type=int, default=40)
parser.add_argument('--slab', type=int, default=32, help='x-slab thickness in voxels (memory bound)')
parser.add_argument('--max-island', type=int, default=5000)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene, args.ears, args.spec])
P = dict(DEFAULTS)
for path in (args.ears, args.spec):
    extra = json.loads(path.read_text())
    unknown = sorted(set(extra) - set(DEFAULTS) - {'note'})
    if unknown:
        raise SystemExit(f'unknown spec keys {unknown} in {path}')
    P.update({k: v for k, v in extra.items() if k != 'note'})
if not P['mass']:
    raise SystemExit('head spec needs the authored mass ("mass": {"parts": [...]}, from fit_head_mass.py)')


def ss(t, a, b):
    t = np.clip((t-a)/(b-a), 0, 1)
    return t*t*(3-2*t)


def ss2(t, a, b):
    """C2 smootherstep, for the blend weights between the mass and the kept input (a C1 weight leaves a shading line)."""
    t = np.clip((t-a)/(b-a), 0, 1)
    return t*t*t*(t*(6*t-15)+10)


# ---- the analytic outline (as H38) ---------------------------------------------------------------------------------
def bspline(cp, n):
    """Closed uniform cubic B-spline through control points cp (k x 2), n samples."""
    cp = np.asarray(cp, float)
    k = len(cp)
    t = np.linspace(0, k, n, endpoint=False)
    i = np.floor(t).astype(int)
    s = t-i
    b0, b1 = (1-s)**3/6, (3*s**3-6*s**2+4)/6
    b2, b3 = (-3*s**3+3*s**2+3*s+1)/6, s**3/6
    return b0[:, None]*cp[(i-1) % k]+b1[:, None]*cp[i % k]+b2[:, None]*cp[(i+1) % k]+b3[:, None]*cp[(i+2) % k]


def polygon_sdf(curve, pu, pz, chunk=20000):
    """Signed distance (negative inside) from points (pu, pz) to the closed polyline curve."""
    a = curve
    b = np.roll(curve, -1, 0)
    ab = b-a
    L2 = (ab*ab).sum(1)
    out = np.empty(pu.size)
    fu, fz = pu.ravel(), pz.ravel()
    for s in range(0, fu.size, chunk):
        qu, qz = fu[s:s+chunk, None], fz[s:s+chunk, None]
        t = np.clip(((qu-a[:, 0])*ab[:, 0]+(qz-a[:, 1])*ab[:, 1])/L2, 0, 1)
        du, dz = qu-(a[:, 0]+t*ab[:, 0]), qz-(a[:, 1]+t*ab[:, 1])
        d = np.sqrt((du*du+dz*dz).min(1))
        y1, y2 = a[:, 1], b[:, 1]
        x1, x2 = a[:, 0], b[:, 0]
        ins = (((y1 > qz) != (y2 > qz)) & (qu < (x2-x1)*(qz-y1)/((y2-y1)+1e-12)+x1)).sum(1) % 2 == 1
        out[s:s+chunk] = np.where(ins, -d, d)
    return out.reshape(pu.shape)


curve = bspline(P['earControls'], P['earSamples'])
gs = .002
gu = np.arange(P['earVisibleU'], curve[:, 0].max()+gs, gs)
gz = np.arange(curve[:, 1].min()-gs, curve[:, 1].max()+gs, gs)
GU, GZ = np.meshgrid(gu, gz, indexing='ij')
vis = polygon_sdf(curve, GU, GZ) < 0
pu_, pz_ = GU[vis], GZ[vis]
C = np.array([pu_.mean(), pz_.mean()])
cov = np.cov(np.stack([pu_-C[0], pz_-C[1]]))
ev, V = np.linalg.eigh(cov)
e_long, e_across = V[:, 1], V[:, 0]
if e_long[0] < 0:
    e_long = -e_long
if e_across[1] < 0:
    e_across = -e_across
semi_long, semi_across = 2*np.sqrt(ev[1]), 2*np.sqrt(ev[0])
along_vis = (pu_-C[0])*e_long[0]+(pz_-C[1])*e_long[1]
a_lo, a_hi = float(along_vis.min()), float(along_vis.max())
Cc = C+P['earCupShift'][0]*semi_long*e_long+P['earCupShift'][1]*semi_across*e_across
cs_l, cs_a = (P['earCupScale'], P['earCupScale']) if np.isscalar(P['earCupScale']) else P['earCupScale']
cup_long, cup_across = cs_l*semi_long, cs_a*semi_across


def ear_frame(U, Zv):
    du, dz = U-C[0], Zv-C[1]
    al = du*e_long[0]+dz*e_long[1]
    b = du*e_across[0]+dz*e_across[1]
    a = np.clip((al-a_lo)/(a_hi-a_lo), 0, 1)
    cu, cz = U-Cc[0], Zv-Cc[1]
    q = np.sqrt(((cu*e_long[0]+cz*e_long[1])/cup_long)**2+((cu*e_across[0]+cz*e_across[1])/cup_across)**2)
    return a, b, q


def mid_surface(U, Zv):
    a, b, q = ear_frame(U, Zv)
    s = U-P['earRootU']
    if P['earInnerFlat'] > 0:   # inside the root the sweep does not swing forward (smooth max with 0), so the buried
        r0 = P['earInnerFlat']   # inner part of the ear stays behind the forehead
        s = .5*(s+np.sqrt(s*s+r0*r0))-.5*r0
    bowl = np.where(q < 1, (1-np.minimum(q, 1)**2)**2, 0.)
    if P['earCupTaper'] > 0:
        cu, cz = U-Cc[0], Zv-Cc[1]
        t = np.clip((cu*e_long[0]+cz*e_long[1])/cup_long, -1, 1)
        bowl = bowl*(1-P['earCupTaper']*(t+1)/2)
    return (P['earY0']+P['earSweep']*s-P['earBend']*s*s-P['earFunnel']*(1+P['earFunnelBase']*(1-a)**2)*b*b
            + P['earCupDepth']*bowl), q


# ---- the authored mass ---------------------------------------------------------------------------------------------
def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def ellipsoid_xyz(x, y, z, cen, rad):
    return (np.sqrt(((x-cen[0])/rad[0])**2+((y-cen[1])/rad[1])**2+((z-cen[2])/rad[2])**2)-1)*min(rad)


def mass_field(x, y, z):
    f = None
    for part in P['mass']['parts']:
        g = ellipsoid_xyz(x, y, z, part['c'], part['r'])
        if part.get('mirror'):
            g = smin(g, ellipsoid_xyz(x, y, z, [-part['c'][0], part['c'][1], part['c'][2]], part['r']), part['k'])
        f = g if f is None else smin(f, g, part['k'])
    return f


# ---- input --------------------------------------------------------------------------------------------------------
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
head = max(meshes, key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before analytic head')
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
poly_mat = np.empty(len(head.data.polygons), dtype=np.int32)
head.data.polygons.foreach_get('material_index', poly_mat)
mat_counts_before = {(m.name if m else str(i)): int((poly_mat == i).sum()) for i, m in enumerate(head.data.materials)}

HALF = args.bandwidth
BAND = HALF*VS
reach = curve[:, 0].max()+.08
lo_pts = np.minimum(points.min(axis=0), [-reach, np.inf, np.inf])
hi_pts = np.maximum(points.max(axis=0), [reach, -np.inf, curve[:, 1].max()+.08])
grid = vdb.FloatGrid.createLevelSetFromPolygons(points, triangles=tris, transform=vdb.createLinearTransform(voxelSize=VS), halfWidth=HALF)
lo = np.floor(lo_pts/VS).astype(int)-12
hi = np.ceil(hi_pts/VS).astype(int)+12
shape = tuple(int(v) for v in hi-lo+1)
f = np.empty(shape, dtype=np.float32)
grid.copyToArray(f, ijk=tuple(int(v) for v in lo))
del grid
nx, ny, nz = shape
X = ((lo[0]+np.arange(nx))*VS).astype(np.float32)
Y = ((lo[1]+np.arange(ny))*VS).astype(np.float32)
Z = ((lo[2]+np.arange(nz))*VS).astype(np.float32)
print('grid', shape, 'band', BAND, flush=True)
Yb = Y[None, :, None]
Zb = Z[None, None, :]


def slabs():
    for a in range(0, nx, args.slab):
        yield slice(a, min(nx, a+args.slab))


# ---- keep distances on a coarse grid ----------------------------------------------------------------------------------
def tree_of(objs):
    Vt, Ft = [], []
    for o in objs:
        Mo = o.matrix_world
        base = len(Vt)
        Vt += [tuple(Mo @ v.co) for v in o.data.vertices]
        Ft += [tuple(base+i for i in p.vertices) for p in o.data.polygons]
    return BVHTree.FromPolygons(Vt, Ft)


eye_objs = [o for o in meshes if o.name.startswith('eye_globe')]
feat_objs = [o for o in meshes if o.name.startswith('nose') or o.name.startswith('closed_mouth')]
DS = P['distStep']
c_lo = np.array([-.48, -.50, -.40])
c_hi = np.array([.48, .05, .32])
cx_, cy_, cz_ = (np.arange(c_lo[i], c_hi[i]+DS/2, DS) for i in range(3))
dist = {}
for name, objs in (('eye', eye_objs), ('feat', feat_objs)):
    tr = tree_of(objs)
    D = np.empty((len(cx_), len(cy_), len(cz_)), np.float32)
    for i, xv in enumerate(cx_):
        for j, yv in enumerate(cy_):
            for k, zv in enumerate(cz_):
                hit = tr.find_nearest(Vector((xv, yv, zv)))
                D[i, j, k] = hit[3] if hit[0] is not None else 1.
    dist[name] = D
print('keep distances', {k: v.shape for k, v in dist.items()}, flush=True)


def bspline_weights(fine, c0, n):
    """Uniform cubic B-spline weights (fine samples x coarse nodes) of the coarse axis c0 + DS*i, i < n; C2 smooth."""
    t = (np.asarray(fine, np.float64)-c0)/DS
    i0 = np.floor(t).astype(int)
    s = t-i0
    w = [(1-s)**3/6, (3*s**3-6*s**2+4)/6, (-3*s**3+3*s**2+3*s+1)/6, s**3/6]
    W = np.zeros((len(t), n))
    for k, wk in enumerate(w):
        idx = np.clip(i0-1+k, 0, n-1)
        np.add.at(W, (np.arange(len(t)), idx), wk)
    return W


WY = {k: bspline_weights(Y, c_lo[1], len(cy_)) for k in ('y',)}['y']
WZ = bspline_weights(Z, c_lo[2], len(cz_))
inside_y = ((Y >= c_lo[1]) & (Y <= c_hi[1]))[None, :, None]
inside_z = ((Z >= c_lo[2]) & (Z <= c_hi[2]))[None, None, :]


def coarse(D, s):
    """The coarse distance grid D at the voxels of x slab s by tensor cubic B-spline smoothing (C2, so the keep weight
    has no cell kinks); 1 outside the box."""
    xs = X[s]
    WX = bspline_weights(xs, c_lo[0], len(cx_))
    v = np.tensordot(WX, D.astype(np.float64), axes=(1, 0))
    v = np.tensordot(v, WY, axes=(1, 1))
    v = np.tensordot(v, WZ, axes=(1, 1))
    ins = ((xs >= c_lo[0]) & (xs <= c_hi[0]))[:, None, None] & inside_y & inside_z
    return np.where(ins, v, 1.)


# ---- ears (as H38) ------------------------------------------------------------------------------------------------
U2 = (np.abs(X)[:, None]+0*Z[None, :]).astype(np.float64)
Z2 = (0*X[:, None]+Z[None, :]).astype(np.float64)
u_top, z_a, z_b = P['earMinUTop']
min_u = P['earMinU']+(u_top-P['earMinU'])*ss(Z2, z_a, z_b)
work_cols = np.abs(X) > min(P['earMinU'], u_top)-.01
d2 = np.full(U2.shape, 1.)
d2[work_cols] = polygon_sdf(curve, U2[work_cols], Z2[work_cols])
kr = P['earStartRound']
h_ = np.clip(.5+.5*((min_u-U2)-d2)/kr, 0, 1)
d2 = (min_u-U2)*h_+d2*(1-h_)+kr*h_*(1-h_)
ym, q2 = mid_surface(U2, Z2)
gx_, gz_ = np.gradient(ym, VS, VS)
nrm2 = np.sqrt(1+gx_**2+gz_**2)
roll = P['earRimRoll']*np.exp(-((d2+P['earRollW'])/P['earRollW'])**2)
ring = P['earCupRim']*np.exp(-((q2-P['earCupRimAt'])/P['earCupRimW'])**2)
flare = (1-ss(U2, *P['earFlareU']))**2
hf = P['earThick']/2+roll+ring+P['earFlareFront']*flare
hb = P['earThick']/2+roll+P['earFlareBack']*flare
kf = P['earFillet']

# ---- head: mass with the kept face features, ears unioned -------------------------------------------------------------
k_e0, k_e1 = P['eyeKeep']
k_f0, k_f1 = P['featKeep']
nz0, nz1 = P['neckKeepZ']
kx0, kx1 = P['keepMaxX']
changed = 0
keep_stats = {'eyeExactVoxels': 0, 'featExactVoxels': 0}
for s in slabs():
    xs = X[s][:, None, None].astype(np.float64)
    ax = np.abs(xs)
    fs = f[s]
    Mf = mass_field(xs, Yb.astype(np.float64), Zb.astype(np.float64))
    dE = coarse(dist['eye'], s)
    dF = coarse(dist['feat'], s)
    wE = 1-ss2(dE, k_e0, k_e1)
    wF = 1-ss2(dF, k_f0, k_f1)
    wN = 1-ss2(Zb+0*xs, nz0, nz1)
    wFace = (1-ss2(ax, *P['faceX']))*(1-ss2(Yb+0*xs, *P['faceY']))*(1-ss2(Zb+0*xs, *P['faceZ']))
    wK = np.maximum(np.maximum(np.maximum(wE, wF)*(1-ss2(ax, kx0, kx1)), wN), wFace)
    keep_stats['eyeExactVoxels'] += int((dE < k_e0).sum())
    keep_stats['featExactVoxels'] += int((dF < k_f0).sum())
    sk = wK*fs+(1-wK)*np.clip(Mf, -BAND, BAND)
    # ears
    t_ = Yb-ym[s][:, None, :]
    hf_s, hb_s = hf[s][:, None, :], hb[s][:, None, :]
    a_ = np.maximum(-(t_+hf_s), t_-hb_s)/nrm2[s][:, None, :]
    r_ = np.minimum(hf_s, hb_s)*P['earEdgeRound']
    b_s = d2[s][:, None, :]
    qa, qb = np.maximum(a_+r_, 0), np.maximum(b_s+r_, 0)
    G = np.sqrt(qa*qa+qb*qb)+np.minimum(np.maximum(a_+r_, b_s+r_), 0)-r_
    kfs = P['earFilletFront']+(kf-P['earFilletFront'])*ss(t_, -P['earFilletSide'], P['earFilletSide'])
    h2 = np.clip(.5+.5*(G-sk)/kfs, 0, 1)
    new = G*(1-h2)+sk*h2-kfs*h2*(1-h2)
    # the eye zone and the nose and mouth stay the input's (an ear never reaches there; this only guards it)
    wX = np.maximum(wE, wF)*(1-ss2(ax, kx0, kx1))
    new = np.clip(new*(1-wX)+sk*wX, -BAND, BAND)
    changed += int(((fs < 0) != (new < 0)).sum())
    f[s] = new.astype(np.float32)
print('head done', changed, keep_stats, flush=True)

# ---- eye ring: the skin just outside the kept lid band, blurred (the seam between the kept input and the mass) ------
ring_rec = None
if P['eyeRingBlur'] > 0:
    rb = max(1, int(round(P['eyeRingBlur']/VS)))
    r0_, r1_, r2_, r3_ = P['eyeRing']
    eyes_v = np.concatenate([np.array([tuple(o.matrix_world @ v.co) for v in o.data.vertices]) for o in eye_objs])
    moved_r = 0
    for ev_s in (eyes_v,):   # one box over both eyes: its faces are clear of both rings (no edge-padding seam)
        blo = np.maximum(np.floor((ev_s.min(0)-r3_-3*rb*VS)/VS).astype(int)-lo, 0)
        bhi = np.minimum(np.ceil((ev_s.max(0)+r3_+3*rb*VS)/VS).astype(int)-lo+1, np.array(shape))
        sx, sy, sz = slice(blo[0], bhi[0]), slice(blo[1], bhi[1]), slice(blo[2], bhi[2])
        box = f[sx, sy, sz].astype(np.float64)
        bl = box.copy()
        for _ in range(3):
            for axis_ in (0, 1, 2):
                n_ = bl.shape[axis_]
                pad_ = [(rb+1, rb) if i == axis_ else (0, 0) for i in range(3)]
                cs_ = np.cumsum(np.pad(bl, pad_, mode='edge'), axis=axis_)
                bl = (np.take(cs_, np.arange(2*rb+1, n_+2*rb+1), axis=axis_)-np.take(cs_, np.arange(0, n_), axis=axis_))/(2*rb+1)
        dE_box = coarse(dist['eye'], sx)[:, sy, sz]
        wR = ss2(dE_box, r0_, r1_)*(1-ss2(dE_box, r2_, r3_))
        new_b = box*(1-wR)+bl*wR
        moved_r += int(((box < 0) != (new_b < 0)).sum())
        f[sx, sy, sz] = new_b.astype(np.float32)
    ring_rec = {'voxelsChangedSign': moved_r}
    print('eye ring done', ring_rec, flush=True)

vis_curve = curve[curve[:, 0] > P['earVisibleU']]
record = {'head': {'voxelsChangedSign': changed, **keep_stats}, 'eyeRing': ring_rec, 'ears': {
    'controls': P['earControls'],
    'outlineHalfSpan': round(float(curve[:, 0].max()), 4), 'outlineTop': round(float(curve[:, 1].max()), 4),
    'outlineBottomVisible': round(float(vis_curve[:, 1].min()), 4),
    'visibleCentroid': [round(float(v), 4) for v in C], 'longAxis': [round(float(v), 4) for v in e_long],
    'semiAxes': [round(float(semi_long), 4), round(float(semi_across), 4)],
    'cupCentre': [round(float(v), 4) for v in Cc], 'cupSemiAxes': [round(float(cup_long), 4), round(float(cup_across), 4)],
    'visibleArea': round(float(vis.sum()*gs*gs), 4),
    'outline': [[round(float(a), 4), round(float(b), 4)] for a, b in curve[::10]],
}}

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
mesh = bpy.data.meshes.new('Head skin analytic head')
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

# materials: head clay everywhere, the pale slot on the analytic cup
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
pale_slots = [i for i, m in enumerate(materials) if m and m.name.startswith('Pale')]
if pale_slots:
    pale_index = next((i for i in pale_slots if materials[i].name == 'Pale inner-ear coat.001'), pale_slots[-1])
    nxt = np.arange(len(lv))+1
    ls_ = np.empty(count_p, dtype=np.int32)
    me.polygons.foreach_get('loop_start', ls_)
    nxt[ls_+lt-1] = ls_
    fn = np.zeros((count_p, 3))
    np.add.at(fn, owner, np.cross(vco[lv], vco[lv[nxt]]))
    fn /= np.linalg.norm(fn, axis=1, keepdims=True)+1e-12
    cu_ = np.abs(centers[:, 0])
    ymc, qc = mid_surface(cu_, centers[:, 2])
    front = ymc-(P['earThick']/2+P['earCupRim']*np.exp(-((qc-P['earCupRimAt'])/P['earCupRimW'])**2))
    marked = ((qc < P['paleQ']) & (np.abs(centers[:, 1]-front) < P['paleNear']) & (fn[:, 1] < -P['paleFacing'])
              & (cu_ > P['paleMinX']))
    if P['paleSmooth'] > 0:
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
    mats = np.where(marked, pale_index, 0).astype(np.int32)
    record['paleFaces'] = int(marked.sum())
    record['paleFacesBySide'] = [int((marked & (centers[:, 0] > 0)).sum()), int((marked & (centers[:, 0] < 0)).sum())]
me.polygons.foreach_set('material_index', mats)
for polygon in me.polygons:
    polygon.use_smooth = True
me.update()
mat_counts_after = {(m.name if m else str(i)): int((mats == i).sum()) for i, m in enumerate(materials)}
require_single_closed_mesh(head, args.out, 'Head skin analytic head')
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'analytic-head.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Analytic head (Nick 2026-10-09): the whole skull authored as one smooth mass fitted to the first sheet, '
             'with the H37 eye outline zone, nose pad, mouth line and neck stub kept, and the analytic ears joined to it '
             'with a fillet (one ear the exact mirror of the other); pale slot on the analytic cup',
    'parameters': P, 'voxel': VS, 'bandwidth': HALF, 'parts': record,
    'materialsBefore': mat_counts_before, 'materialsAfter': mat_counts_after,
    'removedFlecks': len(removed_flecks), 'removedIslands': removed_islands,
    'skinBefore': before, 'skinAfter': mesh_stats(head),
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']},
}, indent=2)+'\n')
print('analytic head ok', flush=True)
