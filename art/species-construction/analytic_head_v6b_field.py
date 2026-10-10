"""Analytic head v6b (2026-10-09): as analytic_head_v6_field.py (v6), with v5's round head kept and the face lift a warp.

v6 refit the head mass for the raised mouth and chin, and the refit lost v5's roundness (a squarer skull, flat cheeks with
a corner at each lower ear root, a square jaw). v6b keeps v5's mass and raises the lower face by a smooth warp instead
(`faceLift`): the mass is sampled at z - L(y, z), L = lift times a profile in z (0 above the first height, full between
the second and third, 0 again below the fourth, smoothsteps) times a front weight in y (`faceLiftY`, full in front, none
behind), so the mouth, muzzle and upper chin rise by the lift while the chin's underside, the throat and the back of the
head stay; the mouth line objects follow the same L per vertex; `faceLiftNose` [cx, cy, cz, rx, ry, rz, fade] holds the warp at 0
inside an ellipsoid round the nose; `noseSeat` [shrink, behind] cuts the skin in front of the nose object's back surface (less behind) inside its front-view
footprint shrunk by shrink, so the skin passes behind the nose; `featFine` measures the nose keep on a voxel-step grid (the coarse .01 grid
smoothed a keep of .002 to .008 away, so the skin showed through the tip of the nose) (fading out to fade times its radii), so the raised muzzle does not run into the nose; `mouthSink` {object: depth} sets a piece that sat in the old
pit (closed_mouth_2, the short stroke under the nose) that far under the new skin, so it does not stand out of it. With `eyeFairTargetFace` the eye-surround plate follows the kept
face (the input skin by ray) inside the face zone instead of the mass, whose ellipsoid unions read as bumps there,
fading in between `eyeFairTargetFaceFrom` of the globes (closer in, the kept face carries the old socket rims);
`eyeFairTargetFaceX` (default `faceX`) limits that to the face centre (the kept face's old temples are bulky);
`skinFair` {x, zLow, zHigh, eyeHold, featHold, earU, iters, lambda, mu}: after meshing, a Taubin smoothing of the skin
masked to the head (|x| fade x, between zLow and zHigh) and held near the eye globes, the nose and mouth objects
(eyeHold, featHold distances) and on the ears beyond |x| earU, so the soft lumps left by the mass unions and the kept
face go;
`faceFair`: the plate covers the whole grid (face front, temples, cheeks, jaw) and fairs the composite head itself
(the kept face, the mass, the lift; radial heights by bisection), data weight `faceFairData`, pinned at the lid rings, a
`faceFairBorder`-degree border and at the nose (`faceFairNose`), so the soft lumps of the unions and blends go while
the round outline stays;
`eyeFairMass` (default the head mass) is the mass the plate follows near the eyes (v6b: the v6 refit, which has no
brow lobes; v5's mass bulges above the brows). The kept input is warped the same way. With `faceKeep` (v5's
face-front zone), `mouthWindow` [cx, cy, cz, rx, ry, rz] leaves the muzzle and mouth to the mass (the kept face had the
pit there), fading out over a band past the ellipsoid. The eye opening's outline lies `openFrac` of the way into
the dark outline band at the bottom and `openFracTop` at the top (blended by the sine of the angle above the horizontal,
to the power `openTopPow`), so the upper outline shows heavier, as on the sheet and r01.

Analytic head v6 (Nick 2026-10-09): as analytic_head_field.py (v5), with eye sockets, muzzle and mouth rebuilt.

Nick on v5 (assembled-3071): "much better ... still not what I want"; "weird artifacts ... leftover eye sockets that got
moved outward ... almost on the outside of the eyeballs", and "a weird divot in the middle of the mouth". v5 kept the H37
skin around each eye (its old socket rims now sat outside the new head's eyes) and around the mouth (its pit). v6 keeps
neither (`eyeKeep` and the face-front zone are off, only the nose pad is kept, `featObjects`):
  - Eye openings (`eyeAperture`): per eye globe a frame from its vertices (centre, forward normal = the axis of least
    spread, in-plane axes). The opening outline, in polar form over the globe's plane, lies `openFrac` of the way from the
    edge of the white to the outer edge of the dark outline band (the globe's own two materials), low-passed over
    `openSmooth` degrees, so the dark outline zone shows. Inside that outline everything in front of the globe's front
    surface (a height field from its vertices, less `cutUnder`) is cut from the mass (rounded by `apertureRound`), so the
    skin meets the globe along the outline. The lid (`lidMode` 'hug'): a thin skin `lidThick` on the globe itself (its
    distance on a `globeStep` grid), outside the outline only, smooth-unioned on over `lidBlend`, so the head's
    surface runs down onto the globe and ends in an even, slightly raised edge at the outline all the way round, with no
    wall, rim or hollow beside the eye ('tube' is a bead `lidR` outside the outline, `lidDepth` under the mass surface,
    tried first and dropped: it read as a ring around the eye). Nothing of the old socket is used.
  - Eye surround (`eyeFair`, used by v6): the head's surface around each eye is a radial thin plate (as in
    smooth_face_field.py) about `eyeFairCenter` on `eyeFairGrid`: pinned to the globe plus `lidThick` in a ring
    `eyeFairRing` wide just outside the opening (the lid edge on the globe; pinning the whole covered rim pulled the skin
    into a deep socket), pinned to the mass where the mass surface is more than `eyeFairReach`[1] from
    the globes, and free in between (data weight `eyeFairData` toward the mass), so the skin runs from the lid to the
    head in the smoothest surface the two allow, with no rim, cushion or hollow. It replaces the mass within
    `eyeFairReach` of the globes (C2 weight, box-blurred over `eyeFairWeightBlur` degrees: the nearest-globe
    distance has a kink at the midline that left a line between the eyes); the opening is then cut as above and `lidMode` 'none' adds nothing more.
  - Mouth (`mouthLift`): the mouth line objects (closed_mouth_*) are moved up by mouthLift and keep their depth relative to
    the skin (each vertex keeps its offset from the skin front, read by rays along +y on the input and on the new skin), so
    the existing curves sit on the new, smooth muzzle. The mass behind them (fit_head_mass.py on head-targets-v6.json)
    has the mouth, muzzle and chin raised by the same amount and no pit.
  - Ears: the back flare is off and the fillets wider (spec), for the line at the back of each ear root and the crown step.

v5 description follows.

Analytic head (Nick 2026-10-09): the whole skull authored as one smooth mass, with the analytic ears joined to it.

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
Writes head.blend, shape.glb, analytic-head.json (v6 records eyeOpenings and mouth).
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
    'eyeRingBlur': 0., 'eyeRing': [.015, .03, .07, .11],
    'featObjects': ['nose'], 'faceKeep': False, 'eyeKeepOn': False,
    'eyeAperture': True, 'openFrac': .35, 'openSmooth': 20., 'cutUnder': .002, 'apertureRound': .004, 'lidR': .006, 'lidDepth': .002, 'lidBlend': .012,
    'lidMode': 'hug', 'lidThick': .004, 'lidInset': 0., 'globeStep': .004,
    'eyeFair': False, 'eyeFairCenter': [0., 0., -.04], 'eyeFairGrid': [-35., 70., -80., 80., .5], 'eyeFairReach': [.08, .13],
    'eyeFairEdge': .0, 'eyeFairRing': .008, 'eyeFairWeightBlur': 3., 'eyeFairTargetFace': False, 'eyeFairMass': None, 'eyeFairTargetFaceX': None, 'skinFair': None,
    'faceFair': False, 'faceFairData': .05, 'faceFairBorder': 8., 'faceFairNose': [.03, .06], 'eyeFairTargetFaceFrom': [.0, .0001], 'eyeFairData': .02, 'eyeFairLam': 3e-4,
    'mouthLift': .025, 'mouthSink': None, 'mouthWindow': None, 'mouthWindowBlend': [.0, .03], 'faceLift': 0., 'faceLiftZ': [-.12, -.20, -.24, -.30], 'faceLiftY': [-.15, .05], 'faceLiftNose': None, 'featFine': False, 'noseSeat': None,
    'openFracTop': None, 'openTopPow': 1.5,
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


def face_lift(y, z, x=None):
    """The face warp L(y, z): how far the lower face is raised at (y, z) (none round the nose with x and `faceLiftNose`)."""
    if not P['faceLift']:
        return 0.
    z0, z1, z2, z3 = P['faceLiftZ']
    prof = (1-ss2(z, z1, z0))*ss2(z, z3, z2)
    L = P['faceLift']*prof*(1-ss2(y, *P['faceLiftY']))
    if x is not None and P['faceLiftNose']:
        c_, r_ = P['faceLiftNose'][:3], P['faceLiftNose'][3:6]
        qn = np.sqrt(((x-c_[0])/r_[0])**2+((y-c_[1])/r_[1])**2+((z-c_[2])/r_[2])**2)
        L = L*ss2(qn, 1., P['faceLiftNose'][6])
    return L


def mass_field(x, y, z, mass=None):
    f = None
    for part in (mass or P['mass'])['parts']:
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
feat_objs = [o for o in meshes if any(o.name.startswith(k) for k in P['featObjects'])]
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
# a fine distance grid round the kept features (the nose pad): the coarse grid cannot resolve a keep of a few voxels
feat_fine = None
if P['featFine'] and feat_objs:
    trf = tree_of(feat_objs)
    fv_ = np.concatenate([np.array([tuple(o.matrix_world @ v.co) for v in o.data.vertices]) for o in feat_objs])
    f_lo = fv_.min(0)-P['featKeep'][1]-.01
    f_hi = fv_.max(0)+P['featKeep'][1]+.01
    fax = [np.arange(f_lo[i], f_hi[i]+VS/2, VS) for i in range(3)]
    FD = np.empty(tuple(len(a) for a in fax), np.float32)
    for i, xv in enumerate(fax[0]):
        for j, yv in enumerate(fax[1]):
            for k, zv in enumerate(fax[2]):
                FD[i, j, k] = trf.find_nearest(Vector((xv, yv, zv)))[3]
    feat_fine = (f_lo, FD)
    print('fine feature distances', FD.shape, flush=True)


# nose seat: the skin in front of the nose object's back surface, inside its front-view footprint, is cut away, so the
# skin passes behind the nose and never shows through it (`noseSeat`)
nose_seat = None
if P['noseSeat']:
    nv_ = np.concatenate([np.array([tuple(o.matrix_world @ v.co) for v in o.data.vertices]) for o in meshes if o.name.startswith('nose')])
    NS = .002
    n_lo = nv_[:, [0, 2]].min(0)-.01
    gxn = np.arange(n_lo[0], nv_[:, 0].max()+.01, NS)
    gzn = np.arange(n_lo[1], nv_[:, 2].max()+.01, NS)
    yb = np.full((len(gxn), len(gzn)), np.nan)
    ix = np.clip(((nv_[:, 0]-n_lo[0])/NS).round().astype(int), 0, len(gxn)-1)
    iz = np.clip(((nv_[:, 2]-n_lo[1])/NS).round().astype(int), 0, len(gzn)-1)
    for a_, b_, c_ in zip(ix, iz, nv_[:, 1]):
        if not (yb[a_, b_] >= c_):
            yb[a_, b_] = c_
    foot = ~np.isnan(yb)
    for _ in range(2):   # close small gaps between vertex cells
        pad = np.pad(foot, 1)
        foot = foot | (pad[:-2, 1:-1] & pad[2:, 1:-1]) | (pad[1:-1, :-2] & pad[1:-1, 2:])
    edge_ = foot & ~(np.pad(foot, 1)[:-2, 1:-1] & np.pad(foot, 1)[2:, 1:-1] & np.pad(foot, 1)[1:-1, :-2] & np.pad(foot, 1)[1:-1, 2:])
    ex, ez = np.nonzero(edge_)
    GX, GZ = np.meshgrid(gxn, gzn, indexing='ij')
    dd = np.sqrt((GX[..., None]-gxn[ex])**2+(GZ[..., None]-gzn[ez])**2).min(-1)
    sdf_foot = np.where(foot, -dd, dd)
    ybf = yb.copy()
    for _ in range(6):   # fill the back height into gap cells from neighbours
        pad = np.pad(ybf, 1, constant_values=np.nan)
        nb = np.stack([pad[1+di:1+di+ybf.shape[0], 1+dj:1+dj+ybf.shape[1]] for di in (-1, 0, 1) for dj in (-1, 0, 1)])
        best = np.where(np.isnan(nb), -np.inf, nb).max(0)
        ybf = np.where(np.isnan(ybf) & np.isfinite(best), best, ybf)
    ybf = np.nan_to_num(ybf, nan=-1.)
    nose_seat = (n_lo, NS, sdf_foot, ybf)
    print('nose seat', sdf_foot.shape, int(foot.sum()), flush=True)


def nose_cut(xs, ys, zs):
    """Negative inside the region to cut: inside the nose footprint (shrunk by noseSeat[0]) and in front of its back."""
    n_lo, NS, SD, YB = nose_seat
    fi = np.clip((xs-n_lo[0])/NS, 0, SD.shape[0]-1.001)
    fk = np.clip((zs-n_lo[1])/NS, 0, SD.shape[1]-1.001)
    i0, k0 = np.floor(fi).astype(int), np.floor(fk).astype(int)
    ti, tk = fi-i0, fk-k0
    def bl(A):
        return A[i0, k0]*(1-ti)*(1-tk)+A[i0+1, k0]*ti*(1-tk)+A[i0, k0+1]*(1-ti)*tk+A[i0+1, k0+1]*ti*tk
    outside = (xs < n_lo[0]) | (xs > n_lo[0]+NS*(SD.shape[0]-1)) | (zs < n_lo[1]) | (zs > n_lo[1]+NS*(SD.shape[1]-1))
    return np.where(outside, 1., np.maximum(bl(SD)+P['noseSeat'][0], ys-(bl(YB)-P['noseSeat'][1])))


def fine_feat(s):
    """Distance to the kept features on slab s from the fine grid (trilinear), 1 outside it."""
    f_lo, FD = feat_fine
    fi = (X[s][:, None, None]-f_lo[0])/VS
    fj = (Y[None, :, None]-f_lo[1])/VS
    fk = (Z[None, None, :]-f_lo[2])/VS
    out_ = (fi < 0) | (fi > FD.shape[0]-1) | (fj < 0) | (fj > FD.shape[1]-1) | (fk < 0) | (fk > FD.shape[2]-1)
    i0 = np.clip(np.floor(fi).astype(int), 0, FD.shape[0]-2)
    j0 = np.clip(np.floor(fj).astype(int), 0, FD.shape[1]-2)
    k0 = np.clip(np.floor(fk).astype(int), 0, FD.shape[2]-2)
    ti, tj, tk = np.clip(fi-i0, 0, 1), np.clip(fj-j0, 0, 1), np.clip(fk-k0, 0, 1)
    v = 0.
    for di in (0, 1):
        for dj in (0, 1):
            for dk in (0, 1):
                v = v+((ti if di else 1-ti)*(tj if dj else 1-tj)*(tk if dk else 1-tk))*FD[i0+di, j0+dj, k0+dk]
    return np.where(out_, 1., v)




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

# ---- eye openings: per globe frame and outline ---------------------------------------------------------------------------
eye_frames = []
NB = 72
for o in eye_objs:
    me_ = o.data
    me_.calc_loop_triangles()
    gv = np.array([tuple(o.matrix_world @ v.co) for v in me_.vertices], np.float64)
    gt = np.empty(len(me_.loop_triangles)*3, np.int32)
    me_.loop_triangles.foreach_get('vertices', gt)
    gt = gt.reshape(-1, 3)
    gtp = np.empty(len(me_.loop_triangles), np.int32)
    me_.loop_triangles.foreach_get('polygon_index', gtp)
    gpm = np.empty(len(me_.polygons), np.int32)
    me_.polygons.foreach_get('material_index', gpm)
    gm = gpm[gtp]
    gc = gv.mean(0)
    w_, V_ = np.linalg.eigh(np.cov((gv-gc).T))
    n_ = V_[:, 0] if V_[1, 0] < 0 else -V_[:, 0]
    e1 = np.cross(n_, [0., 0., 1.])
    e1 /= np.linalg.norm(e1)
    e2 = np.cross(e1, n_)
    tc = gv[gt].mean(1)
    tn = np.cross(gv[gt[:, 1]]-gv[gt[:, 0]], gv[gt[:, 2]]-gv[gt[:, 0]])
    tn /= np.linalg.norm(tn, axis=1, keepdims=True)+1e-12
    front_t = tn@n_ > .3
    pu, pw = (tc-gc)@e1, (tc-gc)@e2
    rho, ang = np.hypot(pu, pw), np.arctan2(pw, pu)
    bins = ((ang+np.pi)/(2*np.pi)*NB).astype(int) % NB
    white = np.array([rho[(bins == k) & (gm == 0)].max() for k in range(NB)])
    outer = np.array([rho[(bins == k) & front_t].max() for k in range(NB)])
    fr_open = np.full(NB, P['openFrac'])
    if P['openFracTop'] is not None:   # heavier upper outline: the opening reaches further into the band at the top
        ang_c = (np.arange(NB)+.5)/NB*2*np.pi-np.pi
        fr_open = P['openFrac']+(P['openFracTop']-P['openFrac'])*np.maximum(np.sin(ang_c), 0)**P['openTopPow']
    r_open = white+fr_open*(outer-white)
    sig = P['openSmooth']*NB/360.
    kk = np.arange(-3*int(sig+1), 3*int(sig+1)+1)
    ker = np.exp(-.5*(kk/max(sig, 1e-3))**2)
    ker /= ker.sum()
    r_open = np.array([np.sum(ker*r_open[(k+kk) % NB]) for k in range(NB)])
    # the front surface of the globe as a height field over its plane (for the cut)
    HS = .004
    gx = np.arange(-.22, .22+HS/2, HS)
    hd = np.full((len(gx), len(gx)), np.nan)
    vu, vw, vh = (gv-gc)@e1, (gv-gc)@e2, (gv-gc)@n_
    iu = np.clip(((vu+.22)/HS).round().astype(int), 0, len(gx)-1)
    iw = np.clip(((vw+.22)/HS).round().astype(int), 0, len(gx)-1)
    for a_, b_, c_ in zip(iu, iw, vh):
        if not (hd[a_, b_] >= c_):
            hd[a_, b_] = c_
    for _ in range(60):   # fill the empty cells from their neighbours
        miss = np.isnan(hd)
        if not miss.any():
            break
        pad = np.pad(hd, 1, constant_values=np.nan)
        nb = np.stack([pad[1+di:1+di+hd.shape[0], 1+dj:1+dj+hd.shape[1]] for di in (-1, 0, 1) for dj in (-1, 0, 1)])
        best = np.where(np.isnan(nb), -np.inf, nb).max(0)
        hd = np.where(miss & np.isfinite(best), best, hd)
    hd = np.nan_to_num(hd, nan=-.2)
    # distance to the globe on a fine box grid (unsigned: the globe mesh is not closed), for the lid that hugs it
    gtree = BVHTree.FromPolygons([tuple(v) for v in gv], [tuple(t) for t in gt])
    GS = P['globeStep']
    g_lo = gv.min(0)-.05
    g_hi = gv.max(0)+.05
    axes = [np.arange(g_lo[i], g_hi[i]+GS/2, GS) for i in range(3)]
    GD = np.empty(tuple(len(a) for a in axes), np.float32)
    for i, xv in enumerate(axes[0]):
        for j, yv in enumerate(axes[1]):
            for k, zv in enumerate(axes[2]):
                q = Vector((xv, yv, zv))
                loc, nrm, _, dd = gtree.find_nearest(q)
                GD[i, j, k] = dd
    eye_frames.append({'c': gc, 'n': n_, 'e1': e1, 'e2': e2, 'r_open': r_open, 'hd': hd, 'gx0': -.22, 'HS': HS,
                       'GD': GD, 'g_lo': g_lo, 'GS': GS})
    print('eye frame', o.name, gc.round(3), n_.round(3), 'open radius min/max', r_open.min().round(4), r_open.max().round(4), flush=True)


def eye_open(xs, ys, zs, skin):
    """Aperture field A (negative in front of the globe's front surface, inside the opening outline) and the lid bead
    field L (a tube lidR outside the outline, lidDepth under the skin, only near the front of each globe), both eyes."""
    A, L = None, None
    for fr in eye_frames:
        px, py, pz = xs-fr['c'][0], ys-fr['c'][1], zs-fr['c'][2]
        h = px*fr['n'][0]+py*fr['n'][1]+pz*fr['n'][2]
        u = px*fr['e1'][0]+py*fr['e1'][1]+pz*fr['e1'][2]
        w = px*fr['e2'][0]+py*fr['e2'][1]+pz*fr['e2'][2]
        rho = np.sqrt(u*u+w*w)
        t = (np.arctan2(w, u)+np.pi)/(2*np.pi)*NB-.5
        k0 = np.floor(t).astype(int)
        ft = t-k0
        ro = fr['r_open'][k0 % NB]*(1-ft)+fr['r_open'][(k0+1) % NB]*ft
        ell = rho-ro
        fi = np.clip((u-fr['gx0'])/fr['HS'], 0, fr['hd'].shape[0]-1.001)
        fj = np.clip((w-fr['gx0'])/fr['HS'], 0, fr['hd'].shape[1]-1.001)
        i0, j0 = np.floor(fi).astype(int), np.floor(fj).astype(int)
        ti, tj = fi-i0, fj-j0
        H = fr['hd']
        hs = H[i0, j0]*(1-ti)*(1-tj)+H[i0+1, j0]*ti*(1-tj)+H[i0, j0+1]*(1-ti)*tj+H[i0+1, j0+1]*ti*tj
        Ai = np.maximum(ell, hs-P['cutUnder']-h)
        if P['lidMode'] == 'hug':   # a thin skin on the globe, outside the outline only (the lid edge is the outline)
            G = fr['GD']
            fi_ = np.clip((xs-fr['g_lo'][0])/fr['GS'], 0, G.shape[0]-1.001)
            fj_ = np.clip((ys-fr['g_lo'][1])/fr['GS'], 0, G.shape[1]-1.001)
            fk_ = np.clip((zs-fr['g_lo'][2])/fr['GS'], 0, G.shape[2]-1.001)
            outside_box = ((xs-fr['g_lo'][0])/fr['GS'] < 0) | ((xs-fr['g_lo'][0])/fr['GS'] > G.shape[0]-1) | \
                          ((ys-fr['g_lo'][1])/fr['GS'] < 0) | ((ys-fr['g_lo'][1])/fr['GS'] > G.shape[1]-1) | \
                          ((zs-fr['g_lo'][2])/fr['GS'] < 0) | ((zs-fr['g_lo'][2])/fr['GS'] > G.shape[2]-1)
            i0_, j0_, k0_ = np.floor(fi_).astype(int), np.floor(fj_).astype(int), np.floor(fk_).astype(int)
            a_, b_, c_ = fi_-i0_, fj_-j0_, fk_-k0_
            gd = 0.
            for di in (0, 1):
                for dj in (0, 1):
                    for dk in (0, 1):
                        gd = gd+((a_ if di else 1-a_)*(b_ if dj else 1-b_)*(c_ if dk else 1-c_))*G[i0_+di, j0_+dj, k0_+dk]
            gd = np.where(outside_box, 1., gd)
            Li = np.maximum(np.abs(gd)-P['lidThick'], -(ell-P['lidInset']))   # unsigned: the globe mesh is open
            Li = smax(Li, -.04-h, .01)
        else:
            Li = np.maximum(np.sqrt((ell-P['lidR'])**2+(skin+P['lidDepth'])**2)-P['lidR'], -.06-h)
        A = Ai if A is None else np.minimum(A, Ai)
        L = Li if L is None else np.minimum(L, Li)
    return A, L


def smax(a, b, k):
    return -smin(-a, -b, k)


def bilinear(A, rr, cc):
    r0 = np.clip(np.floor(rr).astype(int), 0, A.shape[0]-2)
    c0 = np.clip(np.floor(cc).astype(int), 0, A.shape[1]-2)
    fr_ = np.clip(rr-r0, 0, 1)
    fc_ = np.clip(cc-c0, 0, 1)
    return A[r0, c0]*(1-fr_)*(1-fc_)+A[r0+1, c0]*fr_*(1-fc_)+A[r0, c0+1]*(1-fr_)*fc_+A[r0+1, c0+1]*fr_*fc_


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



# ---- eye surround: the skin around each eye faired as a thin plate between the lid and the mass ----------------------
def mass_radial(dirs, c, rmax=1.0, n=40, mass=None):
    lo_ = np.full(dirs.shape[:-1], .02)
    hi_ = np.full(dirs.shape[:-1], rmax)
    for _ in range(n):
        m_ = (lo_+hi_)/2
        q_ = c+dirs*m_[..., None]
        inside_ = mass_field(q_[..., 0], q_[..., 1], q_[..., 2], mass) < 0
        lo_ = np.where(inside_, m_, lo_)
        hi_ = np.where(inside_, hi_, m_)
    return (lo_+hi_)/2


eye_rad = None
if P['eyeFair']:
    fc = np.array(P['eyeFairCenter'], float)
    t0, t1, p0_, p1_, step = P['eyeFairGrid']
    th = np.radians(np.arange(t0, t1+1e-6, step))
    ph = np.radians(np.arange(p0_, p1_+1e-6, step))
    hstep = np.radians(step)
    T_, F_ = np.meshgrid(th, ph, indexing='ij')
    dirs = np.stack([np.cos(T_)*np.sin(F_), -np.cos(T_)*np.cos(F_), np.sin(T_)], -1)
    rM = mass_radial(dirs, fc, mass=P['eyeFairMass'])   # the plate's mass (v6b: the v6 mass, smooth round the eyes)
    gtree_all = tree_of(eye_objs)
    far = 1.6
    r_g = np.full(T_.shape, np.nan)
    for i in range(len(th)):
        for j in range(len(ph)):
            d = Vector(dirs[i, j].tolist())
            hit = gtree_all.ray_cast(Vector(fc.tolist())+d*far, -d, far)
            if hit[0] is not None:
                r_g[i, j] = far-hit[3]
    hitg = ~np.isnan(r_g)
    pm = fc+dirs*rM[..., None]                 # the mass surface point of each direction
    rel = np.zeros(T_.shape)                   # polar radius of the globe hit relative to the opening outline
    # distance from the mass surface point to the nearest globe vertex (subsample)
    gvs = np.concatenate([np.array([tuple(o.matrix_world @ v.co) for v in o.data.vertices]) for o in eye_objs])[::4]
    flat = pm.reshape(-1, 3)
    dg = np.empty(len(flat))
    for c0 in range(0, len(flat), 2000):
        dg[c0:c0+2000] = np.sqrt(((flat[c0:c0+2000, None, :]-gvs[None])**2).sum(2)).min(1)
    dg = dg.reshape(T_.shape)
    ph_g = fc+dirs*np.nan_to_num(r_g, nan=0.)[..., None]
    for fr in eye_frames:
        q = ph_g-fr['c']
        u = q@fr['e1']
        w = q@fr['e2']
        rho = np.sqrt(u*u+w*w)
        t = (np.arctan2(w, u)+np.pi)/(2*np.pi)*NB-.5
        k0 = np.floor(t).astype(int)
        ft = t-k0
        ro = fr['r_open'][k0 % NB]*(1-ft)+fr['r_open'][(k0+1) % NB]*ft
        near_this = np.abs(q@fr['n']) < .2
        rel = np.where(hitg & near_this & (np.sign(ph_g[..., 0]) == np.sign(fr['c'][0])), rho-ro, rel)
    covered = hitg & (rel > -P['eyeFairEdge']) & (rel < P['eyeFairRing'])   # a ring just outside the opening: the lid on the globe
    opening = hitg & (rel <= -P['eyeFairEdge'])
    farpin = dg > P['eyeFairReach'][1]
    pins = covered | farpin
    rTarget = rM
    if P['faceKeep'] and P['eyeFairTargetFace']:   # inside v5's face zone the plate follows the kept face, not the mass
        stree = BVHTree.FromPolygons(points.tolist(), tris.tolist())
        r_in = np.full(T_.shape, np.nan)
        for i in range(len(th)):
            for j in range(len(ph)):
                d = Vector(dirs[i, j].tolist())
                hit = stree.ray_cast(Vector(fc.tolist())+d*far, -d, far)
                if hit[0] is not None:
                    r_in[i, j] = far-hit[3]
        pin_ = fc+dirs*np.nan_to_num(r_in, nan=0.)[..., None]
        wz = (1-ss2(np.abs(pin_[..., 0]), *(P['eyeFairTargetFaceX'] or P['faceX'])))*(1-ss2(pin_[..., 1], *P['faceY']))*(1-ss2(pin_[..., 2], *P['faceZ']))
        wz = np.where(np.isnan(r_in) | (np.abs(np.nan_to_num(r_in)-rM) > .05), 0., wz)
        wz = wz*ss2(dg, *P['eyeFairTargetFaceFrom'])   # right around the eyes the kept face carries its old socket rims
        rTarget = rM+wz*(np.nan_to_num(r_in, nan=0.)-rM)
    if P['faceFair']:   # the whole face front and temples: the plate fairs the composite head itself
        def sample_f(q):
            fi = q[:, 0]/VS-lo[0]
            fj = q[:, 1]/VS-lo[1]
            fk = q[:, 2]/VS-lo[2]
            i0 = np.clip(np.floor(fi).astype(int), 0, nx-2)
            j0 = np.clip(np.floor(fj).astype(int), 0, ny-2)
            k0 = np.clip(np.floor(fk).astype(int), 0, nz-2)
            ti, tj, tk = np.clip(fi-i0, 0, 1), np.clip(fj-j0, 0, 1), np.clip(fk-k0, 0, 1)
            v = 0.
            for di in (0, 1):
                for dj in (0, 1):
                    for dk in (0, 1):
                        v = v+((ti if di else 1-ti)*(tj if dj else 1-tj)*(tk if dk else 1-tk))*f[i0+di, j0+dj, k0+dk]
            return v

        def composite(q):
            x_, y_, z_ = q[:, 0], q[:, 1], q[:, 2]
            L_ = face_lift(y_, z_, x_)
            zl = z_-L_
            fv = sample_f(np.stack([x_, y_, zl], 1)) if P['faceLift'] else sample_f(q)
            mv = np.clip(mass_field(x_, y_, zl), -BAND, BAND)
            wF_ = ((1-ss2(np.abs(x_), *P['faceX']))*(1-ss2(y_, *P['faceY']))*(1-ss2(z_, *P['faceZ']))) if P['faceKeep'] else 0*x_
            if P['faceKeep'] and P['mouthWindow']:
                mc, mr = P['mouthWindow'][:3], P['mouthWindow'][3:]
                qm = np.sqrt((x_/mr[0])**2+((y_-mc[1])/mr[1])**2+((zl-mc[2])/mr[2])**2)
                wF_ = wF_*ss2(qm, 1.+P['mouthWindowBlend'][0], 1.+P['mouthWindowBlend'][1]+.6)
            wK_ = np.maximum(wF_, 1-ss2(z_, *P['neckKeepZ']))
            return wK_*fv+(1-wK_)*mv
        flatd = dirs.reshape(-1, 3)
        lo_r = np.full(len(flatd), .02)
        hi_r = np.full(len(flatd), .9)
        for _ in range(36):
            m_ = (lo_r+hi_r)/2
            ins_ = composite(fc+flatd*m_[:, None]) < 0
            lo_r = np.where(ins_, m_, lo_r)
            hi_r = np.where(ins_, hi_r, m_)
        r_comp = ((lo_r+hi_r)/2).reshape(T_.shape)
        nose_v = np.concatenate([np.array([tuple(o.matrix_world @ v.co) for v in o.data.vertices]) for o in meshes if o.name.startswith('nose')])
        pc = (fc+dirs*r_comp[..., None]).reshape(-1, 3)
        dn = np.empty(len(pc))
        for c0 in range(0, len(pc), 2000):
            dn[c0:c0+2000] = np.sqrt(((pc[c0:c0+2000, None, :]-nose_v[None, ::2])**2).sum(2)).min(1)
        dn = dn.reshape(T_.shape)
        bcell = P['faceFairBorder']/step
        ii, jj = np.meshgrid(np.arange(len(th)), np.arange(len(ph)), indexing='ij')
        dborder = np.minimum(np.minimum(ii, len(th)-1-ii), np.minimum(jj, len(ph)-1-jj))
        border = dborder < bcell
        nosepin = dn < P['faceFairNose'][0]
        pins = covered | border | nosepin
        rT = np.where(covered, r_g+P['lidThick'], np.where(opening, r_g-.01, r_comp))
        a = np.full(T_.shape, P['faceFairData'])
        rM = r_comp
    else:
        rT = np.where(covered, r_g+P['lidThick'], np.where(opening, r_g-.01, rTarget))
        a = np.where(opening, P['eyeFairData'], np.where(farpin, 1., P['eyeFairData']))
    rs, iters_ = fair_ml(rT, pins, a, P['eyeFairLam'], th, hstep, 3, 1500)
    gt_ = np.gradient(rs, hstep, axis=0)
    gp_ = np.gradient(rs, hstep, axis=1)/np.cos(th)[:, None]
    nrm_r = np.sqrt(1+(gt_*gt_+gp_*gp_)/rs**2)
    wdir = 1-ss2(dg, *P['eyeFairReach'])                  # 1 near the eyes, 0 where the mass is pinned
    if P['faceFair']:   # everywhere in the grid, fading at its border and at the nose
        wdir = ss2(dborder.astype(float), 0., 2*bcell)*ss2(dn, *P['faceFairNose'])
    rb_w = max(1, int(round(P['eyeFairWeightBlur']/step)))  # the nearest-globe distance has a kink at the midline:
    for _ in range(3):                                      # blur the weight over the grid
        for ax_ in (0, 1):
            n_ = wdir.shape[ax_]
            pad_ = [(rb_w+1, rb_w) if i == ax_ else (0, 0) for i in range(2)]
            cs_ = np.cumsum(np.pad(wdir, pad_, mode='edge'), axis=ax_)
            wdir = (np.take(cs_, np.arange(2*rb_w+1, n_+2*rb_w+1), axis=ax_)-np.take(cs_, np.arange(0, n_), axis=ax_))/(2*rb_w+1)
    eye_rad = {'c': fc, 'th0': t0, 'ph0': p0_, 'step': step, 'nth': len(th), 'nph': len(ph), 'rs': rs, 'nrm': nrm_r, 'w': wdir}
    dl_ = np.where(~pins & ~opening, rs-rM, 0)
    im_ = np.unravel_index(np.argmax(np.abs(dl_)*wdir), dl_.shape)
    print('eye fair largest weighted change', round(float(dl_[im_]), 4), 'at elevation', round(float(np.degrees(th[im_[0]])), 1),
          'azimuth', round(float(np.degrees(ph[im_[1]])), 1), 'weight', round(float(wdir[im_]), 3), flush=True)
    print('eye fair', {'covered': int(covered.sum()), 'opening': int(opening.sum()), 'free': int((~pins).sum()),
                       'cg': int(iters_), 'maxLift': round(float(np.max(np.where(~pins, rs-rM, 0))), 4),
                       'minLift': round(float(np.min(np.where(~pins & ~opening, rs-rM, 0))), 4)}, flush=True)


def eye_fair_field(xs, ys, zs):
    """The faired eye surround as a field, and its weight, at the voxels (0 weight outside the faired directions)."""
    e = eye_rad
    qx, qy, qz = xs-e['c'][0], ys-e['c'][1], zs-e['c'][2]
    rho = np.sqrt(qx*qx+qy*qy+qz*qz)+1e-9
    ti = (np.degrees(np.arcsin(np.clip(qz/rho, -1, 1)))-e['th0'])/e['step']
    pj = (np.degrees(np.arctan2(qx, -qy))-e['ph0'])/e['step']
    ins = (ti >= 0) & (ti <= e['nth']-1) & (pj >= 0) & (pj <= e['nph']-1)
    w = bilinear(e['w'], ti, pj)*ins*ss2(rho, .10, .14)
    G = (rho-bilinear(e['rs'], ti, pj))/bilinear(e['nrm'], ti, pj)
    return G, w


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
    Lf = face_lift(Yb.astype(np.float64)+0*xs, Zb.astype(np.float64)+0*xs, xs+0*Yb)
    Zl = Zb.astype(np.float64)-Lf
    if P['faceLift']:   # the kept input raised by the same warp (sampled along z)
        kz = np.arange(nz)[None, None, :]-np.asarray(Lf)/VS
        k0 = np.clip(np.floor(kz).astype(int), 0, nz-2)
        tk = np.clip(kz-k0, 0, 1)
        fs = (np.take_along_axis(fs, k0, 2)*(1-tk)+np.take_along_axis(fs, k0+1, 2)*tk).astype(np.float32)
    Mf = mass_field(xs, Yb.astype(np.float64), Zl)
    dE = coarse(dist['eye'], s)
    dF = fine_feat(s) if feat_fine is not None else coarse(dist['feat'], s)
    wE = (1-ss2(dE, k_e0, k_e1)) if P['eyeKeepOn'] else 0*dE
    wF = 1-ss2(dF, k_f0, k_f1)
    wN = 1-ss2(Zb+0*xs, nz0, nz1)
    wFace = ((1-ss2(ax, *P['faceX']))*(1-ss2(Yb+0*xs, *P['faceY']))*(1-ss2(Zb+0*xs, *P['faceZ']))) if P['faceKeep'] else 0*dE
    if P['faceKeep'] and P['mouthWindow']:   # the muzzle and mouth come from the mass (the kept face had a pit there)
        mc, mr = P['mouthWindow'][:3], P['mouthWindow'][3:]
        qm = np.sqrt((xs/mr[0])**2+((Yb-mc[1])/mr[1])**2+((Zl-mc[2])/mr[2])**2)
        wFace = wFace*ss2(qm, 1.+P['mouthWindowBlend'][0], 1.+P['mouthWindowBlend'][1]+.6)
    wK = np.maximum(np.maximum(np.maximum(wE, wF)*(1-ss2(ax, kx0, kx1)), wN), wFace)
    keep_stats['eyeExactVoxels'] += int((dE < k_e0).sum())
    keep_stats['featExactVoxels'] += int((dF < k_f0).sum())
    sk = wK*fs+(1-wK)*np.clip(Mf, -BAND, BAND)
    if nose_seat is not None:   # the skin passes behind the nose
        sk = smax(sk, -nose_cut(xs+0*Yb, Yb+0*xs, Zb+0*xs), .002)
    if eye_rad is not None:   # the thin-plate eye surround replaces the mass near the eyes
        Gf, wf_ = eye_fair_field(xs, Yb.astype(np.float64), Zb.astype(np.float64))
        sk = sk*(1-wf_)+np.clip(Gf, -BAND, BAND)*wf_
    if P['eyeAperture']:   # the opening cut from the mass, then the lid along its rim
        Aop, lid = eye_open(xs, Yb.astype(np.float64), Zb.astype(np.float64), sk)
        sk = smax(sk, -Aop, P['apertureRound'])
        if P['lidMode'] != 'none':
            sk = smin(sk, lid, P['lidBlend'])
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

# skin fairing: a masked Taubin smoothing of the head's skin (v6b): the soft lumps the mass unions and the kept face
# leave on the forehead, temples and cheeks go; the eye lids, nose, mouth line and ears are held
fair_rec = None
if P['skinFair']:
    me_f = head.data
    nvf = len(me_f.vertices)
    cof = np.empty(nvf*3)
    me_f.vertices.foreach_get('co', cof)
    cof = cof.reshape(-1, 3)
    ed = np.empty(len(me_f.edges)*2, np.int32)
    me_f.edges.foreach_get('vertices', ed)
    ed = ed.reshape(-1, 2)
    deg = np.bincount(ed.ravel(), minlength=nvf).astype(np.float64)
    wv = cof@Mn[:3, :3].T+Mn[:3, 3]
    xa, ya, za = np.abs(wv[:, 0]), wv[:, 1], wv[:, 2]
    SF = P['skinFair']
    mask = (1-ss2(xa, *SF['x']))*ss2(za, *SF['zLow'])*(1-ss2(za, *SF['zHigh']))
    # held: near the eye globes, the nose and the mouth line (distance by BVH)
    for objs_, (d0, d1) in ((eye_objs, SF['eyeHold']), ([o for o in meshes if o.name.startswith('nose') or o.name.startswith('closed_mouth')], SF['featHold'])):
        if not objs_:
            continue
        tr_ = tree_of(objs_)
        dd_ = np.array([tr_.find_nearest(Vector(tuple(p_)))[3] if mask[i_] > 0 else 1. for i_, p_ in enumerate(wv)])
        mask = mask*ss2(dd_, d0, d1)
    # held: the ears (outside the skull side, by the ear outline in u = |x|)
    d2v = np.ones(nvf)
    sel_e = xa > SF['earU']
    d2v[sel_e] = polygon_sdf(curve, xa[sel_e], za[sel_e])
    mask = mask*np.where(xa > SF['earU'], ss2(d2v, 0., .04), 1.)
    pos = cof.copy()
    for it in range(int(SF['iters'])):
        for lam in (SF['lambda'], SF['mu']):
            acc = np.stack([np.bincount(ed[:, 0], weights=pos[ed[:, 1], c_], minlength=nvf)
                            + np.bincount(ed[:, 1], weights=pos[ed[:, 0], c_], minlength=nvf) for c_ in range(3)], 1)
            lap = acc/np.maximum(deg, 1)[:, None]-pos
            pos = pos+lam*mask[:, None]*lap
    move = np.linalg.norm(pos-cof, axis=1)
    me_f.vertices.foreach_set('co', pos.ravel())
    me_f.update()
    fair_rec = {'vertices': int((mask > 0).sum()), 'moveMax': round(float(move.max()), 4), 'moveP95': round(float(np.percentile(move[mask > 0], 95)), 4)}
    print('skin fair', fair_rec, flush=True)

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
# mouth line: the closed_mouth objects lifted by mouthLift, each vertex keeping its offset from the skin front
if P['mouthLift']:
    old_tree = BVHTree.FromPolygons(points.tolist(), tris.tolist())
    new_tree = BVHTree.FromPolygons([tuple(v) for v in vco], [tuple(lv[a:a+n]) for a, n in zip(ls_ if pale_slots else np.r_[0, np.cumsum(lt)[:-1]], lt)])

    def front_y(tree, x, z):
        hit = tree.ray_cast(Vector((x, -2., z)), Vector((0., 1., 0.)), 4.)
        return None if hit[0] is None else hit[0][1]
    moved = {}
    for o in meshes:
        if not o.name.startswith('closed_mouth'):
            continue
        Mo = o.matrix_world
        Mi = Mo.inverted()
        offs = []
        for v in o.data.vertices:
            pw = Mo @ v.co
            y0 = front_y(old_tree, pw.x, pw.z)
            dz_ = float(face_lift(pw.y, pw.z, pw.x)) if P['faceLift'] else P['mouthLift']
            y1 = front_y(new_tree, pw.x, pw.z+dz_)
            dy = (y1-y0) if (y0 is not None and y1 is not None) else 0.
            sink_ = (P['mouthSink'] or {}).get(o.name)
            if sink_ is not None and y0 is not None and y1 is not None:   # this piece sat in the old pit: set it just under the new skin
                dy = y1+max(pw.y-y0, 0.)+sink_-pw.y
            offs.append(dy)
            v.co = Mi @ Vector((pw.x, pw.y+dy, pw.z+dz_))
        o.data.update()
        moved[o.name] = {'lift': P['mouthLift'], 'dyMin': round(min(offs), 4), 'dyMax': round(max(offs), 4)}
    record['mouth'] = moved
record['skinFair'] = fair_rec
record['eyeOpenings'] = [{'centre': [round(float(v), 4) for v in fr['c']], 'normal': [round(float(v), 4) for v in fr['n']],
                          'openRadius': [round(float(fr['r_open'].min()), 4), round(float(fr['r_open'].max()), 4)]} for fr in eye_frames]
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
