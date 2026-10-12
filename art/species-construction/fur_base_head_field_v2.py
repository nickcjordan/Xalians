"""Fur base head v2: authored ear shells (Nick 2026-10-09, after fur on v1 read as "a weird poorly molded piece of play-doh").

Run with Blender (through loop_tools.py blender or a recipe step):
  --python fur_base_head_field_v2.py -- --scene <head.blend> --out <new-dir> --spec <json> --envelope <r03_envelope.npz>

v1 (fur_base_head_field.py) smoothed the old fan and kept its blobby volume, so the ear had no designed shape. v2 runs the
same v1 pipeline on the skull (wings, back of skull, crown, eyes; v1 notes below), then cuts the old fan off and authors
each ear as a deliberately shaped thin shell, unioned to the skull with a fillet:

- Outline: the first sheet's front fan outline (specs/r03_envelope.npz, the closed sheet outline), mapped into head-local
  x, z as fan_clumps_front.py does (x = S (x_fit - CX), z = Z0 - S y_fit), blurred by `earOutlineSmooth` so it is one clean
  curve that keeps the sheet's gentle tuft scallops, inset by `earOutlineInset` so the rolled rim lands on it.
- Profile: a mid-surface y_m(u, z), u = |x|, quadratic in u and z, least-squares fitted to the old fan's mid-surface over
  both wings at once (symmetric; `earMidCoef` overrides): the old V sweep with a gentle forward curve toward the tips.
- Thickness: `earThick` everywhere, a rolled rim (`earRimRoll` over `earRollW` inside the outline), and a root flare front
  (`earRootFlare` over `earRootU`) and back (`earRootFlareBack` over `earRootUBack`), so the ear grows out of the head
  side and its back is one convex surface into the back of the skull.
- Cup: the R03 cup polygons (fan_clumps_front.CUPS) blurred by `earCupBlur` push the mid-surface back by `earCupDepth`; a
  raised front rim (`earCupRim`) runs around the cup edge (a ring from an `earRingBlur` blur). The pale slot fills the cup.
- Lower edge: below |x| `earRootFloorU` the ear does not reach below z `earRootFloor` (the sheet keeps a notch between
  the ear bottom and the jaw; the loop's back-view rows .18 and .20 read it).
- Inner edge: the ear's front half starts at |x| `earStart`, its back half at `earStartBack` (blended over `earSideBlend`
  across the mid-surface, and only below `earStartBackZ`), the corner with the outline rounded by `earCornerRound`.
- Temple: before the ears, the field is blurred (`templeBlur`) in a box at each forehead top corner (`templeBox`, |x|,
  y, z ranges, ramp `templeRamp`), where the old fan met the forehead and left a knob.
- Polish: a light field blur (`polishBlur`) over the back of the skull (`polishBox` = |x| max, y min, z range, ramp) after
  the ears, for hairline shading creases left at the v1 back-op edges.
- Join: the old fan is cut away outside a superellipse skull section (`earSkull` = half width, half depth, centre y,
  exponent; above `earCutZ`, beyond |x| .28), and the ears are smooth-unioned to the skull with `earFillet`.

v1 notes:
Fur base head: smooth shells for render-time fur (Nick 2026-10-08, after the fur pass on assembled-2999).

Run with Blender (through loop_tools.py blender or a recipe step):
  --python fur_base_head_field.py -- --scene <head.blend> --out <new-dir> [--spec <json>] [--voxel .0025]

The fur pass grows strands on the clay. Sculpted coat detail underneath fights it: on assembled-2999 the ear fans carry
lock plates with ledges, rear ridges, rim needles and dark grooves; pins and tufts stand on the crown between the ears;
and the skin around each eye outline sits in a shallow gutter. This stage keeps the outline and lets the fur do the
detail. It works on the skin's level set (head-local units, the same field space as the other *_field.py stages) and
leaves the face, the eye globes, irises, nose and mouth objects alone.

1. Wings (|x| beyond the skull side). Each wing is rebuilt as one shell from heightfields over the front projection
   (x, z), taken from cells deeper than `rimBand` inside the outline so needle roots do not rib the rim: its front surface y_front, back surface y_back and front-view outline. The outline is opened (drops rim
   needles thinner than about twice `needle`), closed (`notch`), blurred (`outlineSmooth`) and inset (`outlineInset`); both surfaces get a masked blur (`surf`, `back`), so plate
   ledges, ridges and grooves become gentle slopes while the inner cup stays; the rim is rounded with an elliptical
   profile `rim` wide, on a rim distance blurred by `rimSmooth` (no erosion staircase); the
   shell field gets a light 3D blur (`shellBlur`) because the rim profile magnifies any ripple left in that distance. Gaps between stacked plates are filled first with the raw column hull, so the blend toward the
   shell never mixes two layers. Weight: smoothstep over |x| from `wingX`, zero in the face box.
2. Back of the skull (|x| under `backX`): the back surface y_back(x, z) gets a masked blur `back2` (removes the seam
   ledges of the rear plate), applied within `backDepth` of the surface and between heights `backZ`.
3. Crown: the top surface z_top(x, y) is opened with a disk of `pinSmall` (removes pins); a second opening with `pin`
   gives the dome trend without knobs or tufts, lifted back by the median offset between the two, and anything above
   the trend plus `humpTol` is cut to it; then closed with `dip` and blurred (`crownSmooth`), and within `crownEdge` of the top outline never
   above the original or closed top (the blur must not push the top edge past the rear wall), so the skull runs from the forehead over the crown into the
   ear roots without a ledge. Applied within `crownDepth` of the top, behind `crownY`, above `crownZ`, and only where the
   smoothed top faces up (slope factor under `crownSlope`), so it never claims the steep rear wall (no lip).
4. Eyes: in a ring outside each eye globe's outline (radius ratio `eyeRing` of the outline, measured per angle about the
   globe's own axis), the skin is united with a blurred copy of itself (`eyeFill`), which fills the recessed gutter and
   leaves convex skin alone. Inside the outline nothing moves, so the skin cannot cover the globe or its outline band.

Materials: every polygon takes the material of the nearest polygon of the input skin (slot list unchanged). The pale
inner-ear slot is then redrawn: the input's pale area is projected onto the front view (x, z), closed (`paleClose`) and
smoothed (`paleProject`), and given to the new shell's faces that face forward (`paleFacing`) beyond |x| `paleMinX`;
`paleSmooth` majority passes tidy the edge. Writes head.blend, shape.glb, fur-base.json.
"""
import argparse
import json
from pathlib import Path
import sys

import bpy
import bmesh
import numpy as np
import openvdb as vdb
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, remove_voxel_specks, require_single_closed_mesh, sha
from study_provenance import snapshot
from fan_clumps_front import CUPS, CX as FIT_CX, S as FIT_S, Z0 as FIT_Z0

DEFAULTS = {
    'needle': .028, 'notch': .025, 'outlineSmooth': .02, 'outlineInset': .005, 'surf': .035, 'back': .03, 'rim': .04, 'rimSmooth': .015, 'rimBand': .03,
    'wingX': [.28, .38], 'fillX': [.29, .31],
    'faceY': [-.2, -.12], 'faceZ': [.20, .28], 'faceX': [.30, .36],
    'backX': [.40, .48], 'backZ': [-.15, -.05, .28, .38], 'backDepth': .08, 'back2': .06, 'backY': [0., .06],
    'pinSmall': .06, 'pin': .06, 'humpTol': .006, 'dip': .04, 'crownSmooth': .025, 'crownX': [.45, .58], 'crownY': [-.30, -.22], 'crownZ': [.30, .36],
    'crownDepth': .08, 'crownSlope': [50., 60.], 'crownEdge': .04, 'crownEdgeSmooth': .01, 'rimRound': .01, 'shellBlur': .005,
    'eyeFill': .015, 'eyeRing': [1.0, 1.08, 1.35, 1.6], 'eyeAxial': [-.05, .04], 'eyeBins': 90,
    'paleSmooth': 4, 'paleProject': .015, 'paleClose': .012, 'paleFacing': .2, 'paleMinX': .28, 'paleFrom': 'cup',
    'earOutlineSmooth': .02, 'earOutlineInset': .008, 'earThick': .03, 'earRootFlare': .20, 'earRootU': [.30, .62], 'earRootFlareBack': .34,
    'earRootUBack': [.24, .70], 'earRimRoll': .008, 'earRollW': .025, 'earCupDepth': .045, 'earCupBlur': .04,
    'earRingBlur': .02, 'earCupRim': .01, 'earStart': .36, 'earStartBack': .26, 'earStartBackZ': [.28, .36], 'earSideBlend': .03, 'earCornerRound': .06, 'earZmin': -.30, 'earRootFloor': -.06, 'earRootFloorU': [.40, .55], 'earEdgeRound': 1.0,
    'earSkull': [.44, .32, 0., 3.5], 'earCutZ': [-.34, -.28], 'earCutRound': .03, 'earFillet': .08, 'earMidCoef': None,
    'earFitU': .5, 'earFitZ': -.2,
    'templeBlur': .02, 'templeBox': [.29, .42, -.26, .02, .26, .48], 'templeRamp': .03,
    'polishBlur': .005, 'polishBox': [.46, .12, -.15, .46, .04],
}

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--spec', type=Path, default=None, help='JSON object overriding DEFAULTS keys')
parser.add_argument('--voxel', type=float, default=.0025)
parser.add_argument('--bandwidth', type=int, default=40)
parser.add_argument('--slab', type=int, default=48, help='x-slab thickness in voxels (memory bound)')
parser.add_argument('--skip', default='', help='comma list of parts to skip: wings,back,crown,eyes,ears')
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


def blur3(a, r, passes=3):
    for _ in range(passes):
        a = box_nd(a, r, (0, 1, 2))
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


def masked_blur2(val, valid, r, passes=3):
    num = np.where(valid, val, 0.).astype(np.float64)
    den = valid.astype(np.float64)
    for _ in range(passes):
        for ax in (0, 1):
            outs = []
            for a in (num, den):
                n = a.shape[ax]
                pad = [(r+1, r) if i == ax else (0, 0) for i in range(2)]
                c = np.cumsum(np.pad(a, pad, mode='constant'), axis=ax)
                outs.append(np.take(c, np.arange(2*r+1, n+2*r+1), axis=ax)-np.take(c, np.arange(0, n), axis=ax))
            num, den = outs
    return np.where(den > 1e-9, num/np.maximum(den, 1e-9), np.nan)


def disk(r):
    return [(i, j) for i in range(-r, r+1) for j in range(-r, r+1) if i*i+j*j <= r*r+r*.5]


def shift(a, i, j, fill):
    out = np.full_like(a, fill)
    H, W = a.shape
    out[max(i, 0):H+min(i, 0), max(j, 0):W+min(j, 0)] = a[max(-i, 0):H+min(-i, 0), max(-j, 0):W+min(-j, 0)]
    return out


def grey_dilate(a, r, fill=-np.inf):
    out = np.full_like(a, -np.inf)
    for i, j in disk(r):
        out = np.maximum(out, shift(a, i, j, fill))
    return out


def grey_erode(a, r, fill=np.inf):
    out = np.full_like(a, np.inf)
    for i, j in disk(r):
        out = np.minimum(out, shift(a, i, j, fill))
    return out


def bin_open(m, r):
    return grey_dilate(grey_erode(m.astype(np.float32), r, 0.), r, 0.) > .5


def bin_close(m, r):
    return grey_erode(grey_dilate(m.astype(np.float32), r, 0.), r, 1.) > .5


# ---- input --------------------------------------------------------------------------------------------------------
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
head = max(meshes, key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before fur base')
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
print('grid', shape, 'band', BAND, flush=True)


def R(d):
    return max(1, int(round(d/VS)))


def slabs():
    for a in range(0, nx, args.slab):
        yield slice(a, min(nx, a+args.slab))


def columns_y(field):
    """Per (x, z): any inside, first inside y, last inside y (world)."""
    anyy = np.zeros((nx, nz), bool)
    yf = np.zeros((nx, nz), np.float32)
    yb = np.zeros((nx, nz), np.float32)
    for s in slabs():
        ins = field[s] < 0
        anyy[s] = ins.any(1)
        yf[s] = Y[ins.argmax(1)]
        yb[s] = Y[ny-1-ins[:, ::-1, :].argmax(1)]
    return anyy, yf, yb


Yb = Y[None, :, None]
Zb = Z[None, None, :]


def face_box(xs):
    ax = np.abs(X[xs])[:, None, None]
    return (1-ss(Yb, *P['faceY']))*(1-ss(Zb, *P['faceZ']))*(1-ss(ax, *P['faceX']))


record = {}
fan0 = columns_y(f)   # the input fan's front and back faces, for the ear mid-surface fit

# ---- 1. wings -----------------------------------------------------------------------------------------------------
if 'wings' not in skip:
    Mw, yf, yb = columns_y(f)
    Mo = bin_close(bin_open(Mw, R(P['needle'])), R(P['notch']))
    if P['outlineSmooth'] > 0:
        Mo = blur2(Mo.astype(float), R(P['outlineSmooth'])) > .5
    valid = Mw & Mo & (grey_erode(Mo.astype(np.float32), R(P['rimBand']), 0.) > .5)
    yf2 = masked_blur2(yf, valid, R(P['surf']))
    yb2 = masked_blur2(yb, valid, R(P['back']))
    for _ in range(4):   # rim band cells beyond the blur's reach take a wider blur of the interior
        if not (np.isnan(yf2[Mo]).any() or np.isnan(yb2[Mo]).any()):
            break
        yf2 = np.where(np.isnan(yf2), masked_blur2(yf, valid, 3*R(P['surf'])), yf2)
        yb2 = np.where(np.isnan(yb2), masked_blur2(yb, valid, 3*R(P['back'])), yb2)
    yf2 = np.where(np.isnan(yf2), yf, yf2)
    yb2 = np.where(np.isnan(yb2), yb, yb2)
    din = np.zeros(Mw.shape, np.float32)
    cur = Mo.copy()
    for _ in range(R(P['rim'])+2):
        din += cur
        cur = grey_erode(cur.astype(np.float32), 1, 0.) > .5
    dout = np.zeros(Mw.shape, np.float32)
    cur = ~Mo
    for _ in range(6):
        dout += cur
        cur = grey_erode(cur.astype(np.float32), 1, 0.) > .5
    d = blur2(np.where(Mo, din-.5, -(dout-.5))*VS, R(P['rimSmooth']), 3)-P['outlineInset']   # inset: voxel-centre masks sit about half a voxel proud
    mid = ((yf2+yb2)/2).astype(np.float32)
    H = np.maximum((yb2-yf2)/2, .004)
    half = (H*np.sqrt(np.clip(1-(1-np.clip(d/P['rim'], 0, 1))**2, 0, 1))).astype(np.float32)
    outside = np.maximum(-d, 0).astype(np.float32)   # continuous across the outline (a step here draws contour lines)
    midr = ((yf+yb)/2).astype(np.float32)
    Hr = ((yb-yf)/2).astype(np.float32)
    hull_out = np.where(Mw, 0, 1.).astype(np.float32)
    rb = R(P['shellBlur']) if P['shellBlur'] > 0 else 0
    halo = 3*rb+1 if rb else 0
    for s in slabs():
        ax = np.abs(X[s])[:, None, None]
        e = slice(max(s.start-halo, 0), min(s.stop+halo, nx))
        t_ = Yb-mid[e][:, None, :]
        G = np.sqrt(t_*t_+P['rimRound']**2)-P['rimRound']-half[e][:, None, :]+outside[e][:, None, :]   # smooth |t|: no crease on the rim apex
        if rb:   # light 3D blur: the rim profile is a square root of the rim distance, so leftover ripple there shows
            G = blur3(G.astype(np.float32), rb, 2)
        G = G[s.start-e.start:s.start-e.start+(s.stop-s.start)]
        Gh = np.abs(Yb-midr[s][:, None, :])-Hr[s][:, None, :]+hull_out[s][:, None, :]
        wa = ss(ax, *P['fillX'])
        fa = f[s]+wa*(np.minimum(f[s], Gh)-f[s])
        w = ss(ax, *P['wingX'])*(1-face_box(s))
        f[s] = np.clip(fa+w*(G-fa), -BAND, BAND)
    record['wings'] = {'outlineCells': int(Mw.sum()), 'outlineCellsAfterOpenClose': int(Mo.sum())}
    del yf, yb, yf2, yb2, din, dout, d, mid, H, half, outside, midr, Hr, hull_out
    print('wings done', flush=True)

# ---- 2. back of the skull ------------------------------------------------------------------------------------------
if 'back' not in skip:
    M1, _, yb1 = columns_y(f)
    ybs = masked_blur2(yb1, M1, R(P['back2']))
    ybs = np.where(np.isnan(ybs), yb1, ybs).astype(np.float32)
    gx, gz = np.gradient(ybs, VS, VS)
    nrm = np.sqrt(1+gx**2+gz**2).astype(np.float32)
    occ = ss(blur2(M1.astype(float), 2, 2), .7, .95).astype(np.float32)
    bz = P['backZ']
    for s in slabs():
        ax = np.abs(X[s])[:, None, None]
        Gb = (Yb-ybs[s][:, None, :])/nrm[s][:, None, :]
        wb = ((1-ss(ax, *P['backX']))*ss(Zb, bz[0], bz[1])*(1-ss(Zb, bz[2], bz[3]))
              * ss(Yb-ybs[s][:, None, :], -P['backDepth'], -P['backDepth']*.5)*ss(Yb, *P['backY'])*occ[s][:, None, :])
        f[s] = np.clip(f[s]+wb*(Gb-f[s]), -BAND, BAND)
    del M1, yb1, ybs, gx, gz, nrm, occ
    print('back done', flush=True)

# ---- 3. crown -----------------------------------------------------------------------------------------------------
if 'crown' not in skip:
    T = np.zeros((nx, ny), bool)
    zt = np.zeros((nx, ny), np.float32)
    for s in slabs():
        ins = f[s] < 0
        T[s] = ins.any(2)
        zt[s] = Z[nz-1-ins[:, :, ::-1].argmax(2)]
    zt = np.where(T, zt, Z[0]).astype(np.float32)
    def opened(r):
        z_ = np.where(T, grey_erode(zt, R(r), fill=np.inf), Z[0])
        return np.minimum(grey_dilate(z_, R(r)), zt)
    zo1 = opened(P['pinSmall'])                       # pins gone
    trend = masked_blur2(opened(P['pin']), T, R(P['crownSmooth']))   # dome without knobs or tufts, a little low
    core = T & (np.abs(X)[:, None] < P['crownX'][0]) & (Y[None, :] > P['crownY'][1])
    lift = float(np.nanmedian((zo1-trend)[core]))
    trend = np.where(np.isnan(trend), zo1, trend+lift)
    zo = np.minimum(zo1, trend+P['humpTol'])          # humps above the dome trend cut back to it
    zc = np.maximum(grey_erode(grey_dilate(zo, R(P['dip'])), R(P['dip'])), zo)
    zs = masked_blur2(zc, T, R(P['crownSmooth']))
    zs = np.where(np.isnan(zs), Z[0], zs)
    # near the top outline the blur may not raise the top (it would push the edge out past the rear wall)
    edge = 1-ss(blur2(T.astype(float), R(P['crownEdge']), 3), .85, .99)
    cap = masked_blur2(np.maximum(zt, zc), T, R(P['crownEdgeSmooth']))   # raw column tops step from column to column
    cap = np.where(np.isnan(cap), np.maximum(zt, zc), cap)
    zs = (zs-edge*np.maximum(zs-cap, 0)).astype(np.float32)
    gx, gy = np.gradient(zs, VS, VS)
    nrm = np.sqrt(1+gx**2+gy**2).astype(np.float32)
    zmin = np.minimum(zs, zt)
    Tm = ss(blur2(T.astype(float), 2, 2), .6, .95).astype(np.float32)
    removed = float(((zt-zs) > .01).sum()*VS*VS)
    for s in slabs():
        ax = np.abs(X[s])[:, None, None]
        Gc = (Zb-zs[s][:, :, None])/nrm[s][:, :, None]
        wc = ((1-ss(ax, *P['crownX']))*ss(Yb, *P['crownY'])*ss(Zb-zmin[s][:, :, None], -P['crownDepth'], -P['crownDepth']*.5)
              * Tm[s][:, :, None]*ss(Zb, *P['crownZ'])*(1-ss(nrm[s], *P['crownSlope']))[:, :, None])   # top-facing only
        f[s] = np.clip(f[s]+wc*(Gc-f[s]), -BAND, BAND)
    record['crown'] = {'trendLift': round(lift, 4), 'topAreaLoweredOver01': round(removed, 5), 'maxLowered': round(float((zt-zs)[T].max()), 4)}
    del T, zt, zo, zc, zs, gx, gy, nrm, zmin, Tm
    print('crown done', flush=True)

# ---- 4. eyes ------------------------------------------------------------------------------------------------------
if 'eyes' not in skip:
    eyes = []
    for obj in meshes:
        if not obj.name.startswith('eye_globe'):
            continue
        n = len(obj.data.vertices)
        c = np.empty(n*3)
        obj.data.vertices.foreach_get('co', c)
        Mo_ = np.array(obj.matrix_world)
        gv = c.reshape(-1, 3)@Mo_[:3, :3].T+Mo_[:3, 3]
        cen = gv.mean(0)
        w_, V = np.linalg.eigh(np.cov((gv-cen).T))
        axis = V[:, 0]
        if axis[1] > 0:
            axis = -axis
        e1, e2 = V[:, 2], V[:, 1]
        u, v = (gv-cen)@e1, (gv-cen)@e2
        s_ = (gv-cen)@axis
        bins = P['eyeBins']
        th = ((np.arctan2(v, u)+np.pi)/(2*np.pi)*bins).astype(int) % bins
        rmax = np.zeros(bins)
        np.maximum.at(rmax, th, np.hypot(u, v))
        rmax = np.maximum(rmax, np.roll(rmax, 1)*.98)
        rmax = (np.roll(rmax, 1)+rmax+np.roll(rmax, -1))/3
        rim = np.hypot(u, v) > np.interp(np.arctan2(v, u), np.linspace(-np.pi, np.pi, bins, endpoint=False)+np.pi/bins, rmax, period=2*np.pi)*.92
        s_rim = float(s_[rim].mean())
        reach = float(rmax.max())*P['eyeRing'][3]+.02
        lo_i = np.maximum(np.floor((cen-reach-.06)/VS).astype(int)-lo, 0)
        hi_i = np.minimum(np.ceil((cen+reach+.06)/VS).astype(int)-lo+1, np.array(shape))
        sl = tuple(slice(int(a), int(b)) for a, b in zip(lo_i, hi_i))
        sub = f[sl]
        gx_, gy_, gz_ = np.meshgrid(X[sl[0]], Y[sl[1]], Z[sl[2]], indexing='ij')
        q = np.stack([gx_, gy_, gz_], -1)-cen
        qu, qv, qs = q@e1, q@e2, q@axis
        ang = np.arctan2(qv, qu)
        rr = np.interp(ang.ravel(), np.linspace(-np.pi, np.pi, bins, endpoint=False)+np.pi/bins, rmax, period=2*np.pi).reshape(ang.shape)
        rho = np.hypot(qu, qv)/rr
        ring = P['eyeRing']
        we = (ss(rho, ring[0], ring[1])*(1-ss(rho, ring[2], ring[3]))
              * ss(qs-s_rim, P['eyeAxial'][0], P['eyeAxial'][0]*.5)*(1-ss(qs-s_rim, P['eyeAxial'][1]*.5, P['eyeAxial'][1])))
        g = blur3(sub, R(P['eyeFill']))
        filled = np.minimum(sub, g)
        raised = (sub >= 0) & (sub+we*(filled-sub) < 0)
        f[sl] = sub+we*(filled-sub)
        eyes.append({'object': obj.name, 'center': [round(float(x), 4) for x in cen], 'axis': [round(float(x), 4) for x in axis],
                     'outlineRadius': [round(float(rmax.min()), 4), round(float(rmax.max()), 4)], 'rimOffset': round(s_rim, 4),
                     'voxelsFilled': int(raised.sum())})
    record['eyes'] = eyes
    print('eyes done', eyes, flush=True)

# ---- 4b. temple corner: the knob where the forehead's top corner met the old fan, blurred away --------------------------
if 'temple' not in skip and P['templeBlur'] > 0:
    x0_, x1_, y0_, y1_, z0_, z1_ = P['templeBox']
    rw = P['templeRamp']
    rb_ = R(P['templeBlur'])
    lo_i = np.maximum(np.floor(np.array([x0_-rw, y0_-rw, z0_-rw])/VS).astype(int)-lo-3*rb_, 0)
    hi_i = np.minimum(np.ceil(np.array([x1_+rw, y1_+rw, z1_+rw])/VS).astype(int)-lo+3*rb_+1, np.array(shape))
    for sgn in (1, -1):
        xa, xb = (lo_i[0], hi_i[0]) if sgn > 0 else (max(nx-1-hi_i[0], 0)+0, nx)
        if sgn < 0:   # mirrored box on the -x side
            ia = int(np.floor((-x1_-rw)/VS))-lo[0]-3*rb_
            ib = int(np.ceil((-x0_+rw)/VS))-lo[0]+3*rb_+1
            xa, xb = max(ia, 0), min(ib, nx)
        sl_ = (slice(int(xa), int(xb)), slice(int(lo_i[1]), int(hi_i[1])), slice(int(lo_i[2]), int(hi_i[2])))
        sub = f[sl_]
        gb = blur3(sub, rb_)
        axs = np.abs(X[sl_[0]])[:, None, None]
        ys_ = Y[sl_[1]][None, :, None]
        zs_ = Z[sl_[2]][None, None, :]
        wt = (ss(axs, x0_-rw, x0_)*(1-ss(axs, x1_, x1_+rw))*ss(ys_, y0_-rw, y0_)*(1-ss(ys_, y1_, y1_+rw))
              * ss(zs_, z0_-rw, z0_)*(1-ss(zs_, z1_, z1_+rw)))
        f[sl_] = sub+wt*(gb-sub)
    print('temple done', flush=True)

# ---- 5. ears: authored thin shells ----------------------------------------------------------------------------------
cup2 = None
if 'ears' not in skip:
    E = np.load(str(args.envelope))
    NE = int(E['grid'][0])

    def bilinear(A, rr, cc):
        r0 = np.clip(np.floor(rr).astype(int), 0, A.shape[0]-2)
        c0 = np.clip(np.floor(cc).astype(int), 0, A.shape[1]-2)
        fr = np.clip(rr-r0, 0, 1)
        fc = np.clip(cc-c0, 0, 1)
        return A[r0, c0]*(1-fr)*(1-fc)+A[r0+1, c0]*fr*(1-fc)+A[r0, c0+1]*(1-fr)*fc+A[r0+1, c0+1]*fr*fc

    U2 = np.abs(X)[:, None]+0*Z[None, :]
    Z2 = 0*X[:, None]+Z[None, :]
    cc_ = (X/FIT_S+FIT_CX)[:, None]*NE+NE/2+0*Z[None, :]
    rr_ = ((FIT_Z0-Z)/FIT_S)[None, :]*NE+0*X[:, None]
    d2 = (bilinear(E['sdf_closed'], rr_, cc_)*FIT_S).astype(np.float64)        # head units, negative inside the sheet
    if P['earOutlineSmooth'] > 0:
        d2 = blur2(d2, R(P['earOutlineSmooth']), 3)
    d2 = d2+P['earOutlineInset']        # the rolled rim sits on the outline: inset it so the span matches the sheet
    M0, yf0, yb0 = fan0
    sel = M0 & (U2 > P['earFitU']) & (Z2 > P['earFitZ']) & (d2 < -.02)
    co_ = P['earMidCoef']
    if co_ is None:
        u_, z_ = U2[sel], Z2[sel]
        A_ = np.stack([np.ones_like(u_), u_, z_, u_*u_, u_*z_, z_*z_], 1)
        co_ = np.linalg.lstsq(A_, ((yf0+yb0)/2)[sel], rcond=None)[0].tolist()
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
    cup2 = cs > .5       # the pale slot fills the cup at the floor's own (rounder) blur
    ring = np.clip(4*cn*(1-cn), 0, 1)
    ym = ym+P['earCupDepth']*cs
    gx_, gz_ = np.gradient(ym, VS, VS)
    nrm2 = np.sqrt(1+gx_**2+gz_**2)
    roll = P['earRimRoll']*np.exp(-((d2+P['earRollW'])/P['earRollW'])**2)
    hf = P['earThick']/2+P['earRootFlare']*(1-ss(U2, *P['earRootU']))+roll+P['earCupRim']*ring
    hb = P['earThick']/2+P['earRootFlareBack']*(1-ss(U2, *P['earRootUBack']))+roll
    ka = P['earCornerRound']

    def inner_edge(start):
        b2 = start-U2
        h_ = np.clip(.5+.5*(b2-d2)/ka, 0, 1)
        floor = P['earZmin']+(P['earRootFloor']-P['earZmin'])*(1-ss(U2, *P['earRootFloorU']))   # the ear's lower edge rises near the root
        return np.maximum(b2*h_+d2*(1-h_)+ka*h_*(1-h_), floor-Z2)   # corner with the outline rounded
    bnd = inner_edge(P['earStart'])            # front half: starts clear of the face side
    bndb = inner_edge(P['earStartBack'])       # back half: starts further in, so the back flare covers the skull corner
    wtop = ss(Z2, *P['earStartBackZ'])
    bndb = bndb*(1-wtop)+bnd*wtop               # not above the crown: there it would stand up beside the skull top
    sx_, sy_, yc_, pe_ = P['earSkull']
    kc, kf = P['earCutRound'], P['earFillet']
    for s in slabs():
        ym_s, hf_s, hb_s = ym[s][:, None, :], hf[s][:, None, :], hb[s][:, None, :]
        n_s = nrm2[s][:, None, :]
        t_ = Yb-ym_s
        wbk = ss(t_, -P['earSideBlend'], P['earSideBlend'])
        b_s = bnd[s][:, None, :]*(1-wbk)+bndb[s][:, None, :]*wbk
        a_ = np.maximum(-(t_+hf_s), t_-hb_s)/n_s
        r_ = np.minimum(hf_s, hb_s)*P['earEdgeRound']
        qa, qb = np.maximum(a_+r_, 0), np.maximum(b_s+r_, 0)
        G = np.sqrt(qa*qa+qb*qb)+np.minimum(np.maximum(a_+r_, b_s+r_), 0)-r_
        ax = np.abs(X[s])[:, None, None]
        g = (((ax/sx_)**pe_+(np.abs(Yb-yc_)/sy_)**pe_)**(1/pe_)-1)*min(sx_, sy_)
        g = g-(1-ss(Zb, *P['earCutZ']))-(1-ss(ax, .26, .30))
        fs = f[s]
        h_ = np.clip(.5+.5*(g-fs)/kc, 0, 1)
        fs = g*h_+fs*(1-h_)+kc*h_*(1-h_)                     # skull without the old fan (smooth max)
        h_ = np.clip(.5+.5*(G-fs)/kf, 0, 1)
        f[s] = np.clip(G*(1-h_)+fs*h_-kf*h_*(1-h_), -BAND, BAND)   # ears smooth-unioned to it
    record['ears'] = {'midCoef': [round(float(c), 5) for c in co_], 'cupCells': int(cup2.sum()),
                      'envelopeSha256': sha(args.envelope)}
    del d2, ym, hf, hb, bnd, bndb, nrm2, cs, cn, ring
    print('ears done', record['ears'], flush=True)

# ---- 6. back polish: a light blur over the back of the skull (hairline shading creases at the v1 back-op edges) -----
if 'polish' not in skip and P['polishBlur'] > 0:
    xm, y0_, z0_, z1_, rw = P['polishBox']
    rb_ = R(P['polishBlur'])
    ia = max(int(np.floor(-(xm+rw)/VS))-lo[0]-3*rb_, 0)
    ib = min(int(np.ceil((xm+rw)/VS))-lo[0]+3*rb_+1, nx)
    ja = max(int(np.floor((y0_-rw)/VS))-lo[1]-3*rb_, 0)
    ka_ = max(int(np.floor((z0_-rw)/VS))-lo[2]-3*rb_, 0)
    kb_ = min(int(np.ceil((z1_+rw)/VS))-lo[2]+3*rb_+1, nz)
    sl_ = (slice(ia, ib), slice(ja, ny), slice(ka_, kb_))
    sub = f[sl_]
    gb = blur3(sub, rb_, 2)
    axs = np.abs(X[sl_[0]])[:, None, None]
    wt = ((1-ss(axs, xm, xm+rw))*ss(Y[sl_[1]][None, :, None], y0_-rw, y0_)
          * ss(Z[sl_[2]][None, None, :], z0_-rw, z0_)*(1-ss(Z[sl_[2]][None, None, :], z1_, z1_+rw)))
    f[sl_] = sub+wt*(gb-sub)
    del sub, gb, wt
    print('polish done', flush=True)

# ---- mesh -----------------------------------------------------------------------------------------------------------
out_grid = vdb.FloatGrid()
out_grid.background = BAND
out_grid.copyFromArray(f, ijk=tuple(int(v) for v in lo))
del f
vertices, tri_out, quads = out_grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
del out_grid
vertices = vertices.astype(np.float64)*VS   # the grid carries the default (unit) transform: index space, lo included
faces = [tuple(t) for t in tri_out.tolist()]+[tuple(q) for q in quads.tolist()]
materials = list(head.data.materials)
mesh = bpy.data.meshes.new('Head skin fur base')
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

# materials: nearest input polygon, then majority passes on the pale boundary
me = head.data
count = len(me.polygons)
# polygon centres from the vertices (the polygon centre cache of a mesh just built is not current)
vco = np.empty(len(me.vertices)*3)
me.vertices.foreach_get('co', vco)
vco = vco.reshape(-1, 3)@Mn[:3, :3].T+Mn[:3, 3]
lv = np.empty(len(me.loops), dtype=np.int32)
me.loops.foreach_get('vertex_index', lv)
lt = np.empty(count, dtype=np.int32)
me.polygons.foreach_get('loop_total', lt)
owner = np.repeat(np.arange(count), lt)
centers = np.zeros((count, 3))
np.add.at(centers, owner, vco[lv])
centers /= lt[:, None]
mats = np.zeros(count, dtype=np.int32)
misses = 0
for i, c in enumerate(centers):
    hit = src_tree.find_nearest(tuple(float(x) for x in c))
    if hit[2] is None:
        misses += 1
        continue
    mats[i] = src_tri_mat[hit[2]]
record['carryMisses'] = misses
pale_slots = [i for i, m in enumerate(materials) if m and m.name.startswith('Pale')]
carried = {int(i): int((mats == i).sum()) for i in np.unique(mats)}
print('carried', carried, 'pale slots', pale_slots, flush=True)
record['materialsCarried'] = carried
if P['paleSmooth'] > 0 and pale_slots:
    pale_index = max(pale_slots, key=lambda i: int((mats == i).sum()))
    marked = np.isin(mats, pale_slots)
    if P['paleFrom'] == 'cup' and cup2 is not None:
        # the pale slot fills the authored cup: front-facing faces inside the cup outline
        nxt = np.arange(len(lv))+1
        ls_ = np.empty(count, dtype=np.int32)
        me.polygons.foreach_get('loop_start', ls_)
        nxt[ls_+lt-1] = ls_
        fn = np.zeros((count, 3))
        np.add.at(fn, owner, np.cross(vco[lv], vco[lv[nxt]]))
        fn /= np.linalg.norm(fn, axis=1, keepdims=True)+1e-12
        ix = np.clip(np.round(centers[:, 0]/VS).astype(int)-lo[0], 0, nx-1)
        iz = np.clip(np.round(centers[:, 2]/VS).astype(int)-lo[2], 0, nz-1)
        marked = cup2[ix, iz] & (fn[:, 1] < -P['paleFacing']) & (np.abs(centers[:, 0]) > P['paleMinX'])
    elif P['paleProject'] > 0:
        # the carried boundary keeps the old tuft outlines; project the input's pale area onto the front view, smooth it
        # there, and give it to the front-facing faces of the new shell
        g = 2*VS
        src_pale = points[tris[np.isin(src_tri_mat, pale_slots)]].mean(1)
        x0, z0 = float(points[:, 0].min())-.05, float(points[:, 2].min())-.05
        gw = int((points[:, 0].max()-x0+.05)/g)+2
        gh = int((points[:, 2].max()-z0+.05)/g)+2
        occ = np.zeros((gw, gh), bool)
        occ[((src_pale[:, 0]-x0)/g).astype(int), ((src_pale[:, 2]-z0)/g).astype(int)] = True
        occ = bin_close(occ, max(1, int(round(P['paleClose']/g))))
        pmask = blur2(occ.astype(float), max(1, int(round(P['paleProject']/g)))) > .5
        nxt = np.arange(len(lv))+1
        ls_ = np.empty(count, dtype=np.int32)
        me.polygons.foreach_get('loop_start', ls_)
        last = ls_+lt-1
        nxt[last] = ls_
        va, vb = vco[lv], vco[lv[nxt]]
        fn = np.zeros((count, 3))
        np.add.at(fn, owner, np.cross(va, vb))
        fn /= np.linalg.norm(fn, axis=1, keepdims=True)+1e-12
        ix = np.clip(((centers[:, 0]-x0)/g).astype(int), 0, gw-1)
        iz = np.clip(((centers[:, 2]-z0)/g).astype(int), 0, gh-1)
        marked = pmask[ix, iz] & (fn[:, 1] < -P['paleFacing']) & (np.abs(centers[:, 0]) > P['paleMinX'])
    loop_total = np.empty(count, dtype=np.int32)
    me.polygons.foreach_get('loop_total', loop_total)
    edge_index = np.empty(len(me.loops), dtype=np.int32)
    me.loops.foreach_get('edge_index', edge_index)
    face_of = np.repeat(np.arange(count), loop_total)
    order = np.argsort(edge_index, kind='stable')
    ei_s, fl_s = edge_index[order], face_of[order]
    same = ei_s[1:] == ei_s[:-1]
    fa_, fb_ = fl_s[:-1][same], fl_s[1:][same]
    deg = np.bincount(fa_, minlength=count)+np.bincount(fb_, minlength=count)
    for _ in range(P['paleSmooth']):
        nearc = np.bincount(fa_, weights=marked[fb_], minlength=count)+np.bincount(fb_, weights=marked[fa_], minlength=count)
        marked = np.where(nearc*2 > deg, True, np.where(nearc*2 < deg, False, marked))
    mats = np.where(marked, pale_index, np.where(np.isin(mats, pale_slots), 0, mats)).astype(np.int32)
me.polygons.foreach_set('material_index', mats)
for polygon in me.polygons:
    polygon.use_smooth = True
me.update()
mat_counts_after = {(m.name if m else str(i)): int((mats == i).sum()) for i, m in enumerate(materials)}
require_single_closed_mesh(head, args.out, 'Head skin fur base')
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'fur-base-v2.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Fur base head v2 (Nick 2026-10-09): ears authored as thin shells on the sheet outline with a cup, rolled rim '
             'and filleted root; v1 crown, back of skull and eye fill kept; face, eye globes, nose and mouth untouched',
    'parameters': P, 'voxel': VS, 'bandwidth': HALF, 'skip': sorted(skip), 'parts': record,
    'materialsBefore': mat_counts_before, 'materialsAfter': mat_counts_after,
    'removedFlecks': len(removed_flecks), 'removedIslands': removed_islands,
    'skinBefore': before, 'skinAfter': mesh_stats(head),
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']},
}, indent=2)+'\n')
print('fur base v2 ok', flush=True)
