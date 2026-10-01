"""Build the ear fan's rear, top and crown coat from the R04 lock table, in field space.

Run with Blender (through loop_tools.py blender):
  blender -b --factory-startup --python author_rear_lock_table_field.py --
    --scene <head.blend> --out <new-dir> [options]

Implements specs/R04.md (ear fan rear and profile) as one authored lock system:

  1. The head skin becomes an OpenVDB level set.
  2. Plate cut (--plate): the wing's rear face is cut back to the spec's rear depth plan minus the room for two lock layers
     (a heightfield cut, faded in from the ear-root crease), so the locks make the visible surface.
  3. Section dome cut (--dome-cut): above-the-dome material in each vertical section of the wing (the front lip and any rim)
     is removed, so the top is one dome whose crest sits at df .020 to .028.
  4. Locks: every row of the table (T top-edge row, B1 edge row, B2 middle row, B3 root row of each wing, D dome coat, C crown
     tuft) is a tapered half-lens swept along a cubic axis (root and tip tangents from the table), a flat inner face
     buried in the surface under it, an outer face that bulges half the thickness. Roots are buried, tips lift off the
     surface under them. All are smooth-unioned into the field once and the field is meshed once.

The table is read from art/species-construction/specs/r04_locks.json (made by loop/r04_table.py from the spec). Coordinates are the
spec's back-view fit units; the head is placed at scale .50 with offset (0, -.02, .635) so head-local = (-3.721 x, 3.721 df + .04,
.537 - 3.721 y). Eyes, nose and mouth are separate objects and do not move.
Akinza-specific. Every parameter is recorded in rear-lock-table.json.

The field is meshed once, so every polygon of the result sits on material slot 0 and a per-polygon material of the input head
(the pale inner-ear coat of the R03 tufts) is lost. Run carry_materials_field.py on the output (--scene <this output>
--source <the input head>) before assembling when the input head carries one.
"""
import argparse
import json
import math
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

S = 3.721           # figure units to head-local units
DF0 = .04           # head-local y of df 0
Z0 = .537           # head-local z of figure y 0

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--table', type=Path, default=Path(__file__).resolve().parent/'specs/r04_locks.json')
parser.add_argument('--voxel', type=float, default=.0025)
parser.add_argument('--blend', type=float, default=.0075, help='smooth union of the locks with the skin, head-local (.002 figure)')
parser.add_argument('--lock-blend', type=float, default=.003, help='smooth union between locks')
parser.add_argument('--rows', default='T,B1,B2,B3,D,C', help='which rows to build')
parser.add_argument('--plate', type=float, default=.016, help='depth the plate lies below the visible plan (figure units); 0 turns the plate cut off')
parser.add_argument('--plate-fade', type=float, nargs=2, default=[-.012, .018], help='plate weight ramp from the crease: u - crease at 0 and at 1')
parser.add_argument('--dome-cut', action='store_true', help='cut above the section dome of each wing (front lip, rear rim)')
parser.add_argument('--dome-k', type=float, nargs=2, default=[15., 4.5], help='dome curvature behind and in front of the crest')
parser.add_argument('--dome-slack', type=float, default=.003, help='allowed height above the dome curve before the cut, figure units')
parser.add_argument('--thick-scale', type=float, default=1., help='scale on lock thickness')
parser.add_argument('--width-scale', type=float, default=1., help='scale on lock width')
parser.add_argument('--d-lift', type=float, default=.003, help='dome-coat relief above the dome surface, figure units')
parser.add_argument('--c-lift', type=float, default=.0, help='crown tuft root raise above the dome surface, figure units')
parser.add_argument('--tip-min', type=float, nargs=2, default=[.002, .002], help='smallest half width and full thickness of a tip, figure units')
parser.add_argument('--cap', type=float, default=.012, help='how far a lock base reaches inward under its base plane at the lock middle; tapers to nothing at the tip (figure units)')
parser.add_argument('--only-side', default='', help='debug: build only L or R wing locks')
parser.add_argument('--bandwidth', type=int, default=12)
parser.add_argument('--max-island', type=int, default=0, help='remove closed islands of at most this many vertices before the single-solid gate (recorded); 0 = off')
parser.add_argument('--tip-taper', type=float, default=0., help='0 keeps the spec thickness curve; above 0 ties thickness to the width taper (thickness ~ width^this) so tips are not blades')
parser.add_argument('--d-thick', type=float, default=1., help='scale on dome-coat thickness')
parser.add_argument('--d-length', type=float, default=1., help='scale on dome-coat lock length (tip moves along the table chord)')
parser.add_argument('--front-margin', type=float, default=.012, help='wing locks stay this far behind the wall front surface (head-local); negative turns the clip off')
parser.add_argument('--taper-exp', type=float, default=1.4, help='exponent of the width fall from the widest point to the tip (spec 1.4; 1 is a straight blade)')
parser.add_argument('--cut-smooth', type=int, default=0, help='box-blur radius in voxels (3 passes) applied where the plate or dome cut changed the field; 0 = off')
parser.add_argument('--t-scale', type=float, default=1., help='extra scale on the top-edge row (T) width and thickness')
parser.add_argument('--samples', type=int, default=24, help='axis samples per lock')
# round 8 options (all default to the earlier behaviour)
parser.add_argument('--len-scale', default='', help='per-row lock length scale, e.g. B2=1.25,B3=1.35: the tip moves along the root-to-tip chord so tips cover the next row root')
parser.add_argument('--len-jitter', type=float, default=0., help='extra deterministic length jitter (fraction, plus or minus) on rows T,B2,B3 so rows do not end on one line')
parser.add_argument('--tip-sink', type=float, default=0., help='crest depth falls by this much (figure units) toward the tip of rows T,B2,B3, so tips dive into the surface instead of ending in a ledge')
parser.add_argument('--sink-rows', default='T,B2,B3', help='rows that take --tip-sink')
parser.add_argument('--tip-back', default='', help='per-row shift of the tip depth toward the rear (figure units), e.g. B1=.012,B2=.008; root-in is the matching shift of the root')
parser.add_argument('--root-in', default='', help='per-row shift of the root depth toward the front (figure units), e.g. B2=.008')
parser.add_argument('--tip-flat', type=float, default=0., help='B1 only: fraction of the spec tip-depth dive removed (1 keeps the tip at the root depth) so outer locks sweep rearward instead of pointing at a side camera')
parser.add_argument('--row-width', default='', help='extra per-row width scale, e.g. C=1.4,D=1.25')
parser.add_argument('--dome-setback', type=float, default=0., help='cut the head dome (|x| under --crown-width*1.4) back by this much at its rear (figure units) so dome-coat locks do not grow the profile rear')
parser.add_argument('--depth-jitter', type=float, default=0., help='deterministic forward-only depth shift of rows T,B2,B3 locks, 0 to 2x this (figure units), so crests do not line up in a column in profile')
parser.add_argument('--tip-point', type=float, default=0., help='fraction of the lock length over which the tip floor on half width decays to nothing, so tips end in a point instead of a rounded finger (0 = off)')
parser.add_argument('--crown-lower', type=float, default=0., help='lower the rear half of the crown dome by this much at the centerline (figure units) so the crown tuft clears it')
parser.add_argument('--crown-width', type=float, default=.06, help='half width of the crown lowering, figure units')
parser.add_argument('--crown-df', type=float, nargs=2, default=[-.02, .01], help='crown lowering weight ramp in depth: 0 at the first value, 1 at the second')
# round 9 options (all default to the earlier behaviour)
parser.add_argument('--shave-dome', type=int, default=0, help='remove old dome shards: the rear surface of the head dome is blurred (masked box blur, this radius in voxels, 2 passes) and anything proud of the blurred surface minus --shave-off is cut away; the D coat and the crown tuft then lie on the shaved surface')
parser.add_argument('--plate-outer', type=float, default=0., help='fraction by which the plate depth is reduced toward the wing tips (ramp u .17 to .24), so a deep plate does not pierce the thin outer wall')
parser.add_argument('--shave-ymax', type=float, default=.172, help='figure y where the dome shave has faded out toward the nape')
parser.add_argument('--shave-replace', action='store_true', help='with --shave-dome: the dome rear becomes the blurred surface everywhere (no min with the old surface), so no voxel terraces from the old rear survive; use with --shave-fill')
parser.add_argument('--shave-fill', action='store_true', help='with --shave-dome: also fill the valleys of the dome rear up to the blurred surface')
parser.add_argument('--shave-off', type=float, default=.002, help='figure units the shaved dome lies behind its blurred surface')
parser.add_argument('--d-ymax', type=float, default=9., help='drop dome-coat locks whose root is lower than this figure y (the nape)')
parser.add_argument('--d-skip', default='', help='comma list of dome-coat lock names to drop, e.g. D03,D07')
parser.add_argument('--c-tip-raise', type=float, default=0., help='figure units the crown tuft tips are raised (tip y smaller), so the tuft stands clear of the dome')
parser.add_argument('--thin', default='', help='keep every k-th lock of a row (per wing), e.g. B3=2 keeps half; pair with --row-width and --len-scale to widen the survivors')
parser.add_argument('--yaw', default='', help='per-row extra rearward lean: root depth moves forward by this much (figure units) and tip depth stays, so each lock sweeps back out of the surface, e.g. B2=.015,B3=.015,T=.01')
# round 11 options (all default to the earlier behaviour)
parser.add_argument('--jitter-rows', default='T,B2,B3', help='rows that take --len-jitter (round 8 default T,B2,B3); add B1 so the edge row tips do not end on one line')
parser.add_argument('--dir-jitter', type=float, default=0., help='deterministic turn of each wing lock tip about its root, plus or minus this many degrees, so tips do not line up in a zipper')
parser.add_argument('--dir-jitter-rows', default='T,B1,B2,B3', help='rows that take --dir-jitter')
parser.add_argument('--edge-guard', type=float, default=0., help='lengthened or jittered wing lock tips (--len-scale, --len-jitter, --dir-jitter) are shortened back toward the spec tip until they lie this far inside the sheet outline (figure units); 0 = off. Rows listed in --guard-rows only')
parser.add_argument('--guard-rows', default='T,B2,B3', help='rows the --edge-guard applies to (B1 tips make the outline, so they are left alone by default)')
parser.add_argument('--row-len-jitter', default='', help='per-row length jitter that replaces --len-jitter for that row, e.g. B1=.15 (the edge row is otherwise left at the spec length)')
parser.add_argument('--row-dir-jitter', default='', help='per-row tip turn in degrees that replaces --dir-jitter for that row, e.g. B1=3')
parser.add_argument('--jitter-seed', default='', help='text added to the lock name before the jitter hash, to draw a different deterministic layout')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene, args.table])
table = json.loads(args.table.read_text())['locks']
rows = set(args.rows.split(','))

bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
head = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before rear lock table')
before = mesh_stats(head)
VS = args.voxel
M = head.matrix_world.copy()
points = np.array([M @ v.co for v in head.data.vertices], dtype=np.float32)
head.data.calc_loop_triangles()
tris = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
head.data.loop_triangles.foreach_get('vertices', tris)
tris = tris.reshape(-1, 3)
tree = BVHTree.FromPolygons([tuple(p) for p in points], tris.tolist())
HALF = args.bandwidth
grid = vdb.FloatGrid.createLevelSetFromPolygons(points, triangles=tris, transform=vdb.createLinearTransform(voxelSize=VS), halfWidth=HALF)
BAND = HALF*VS
lo = np.floor(points.min(axis=0)/VS).astype(int)-30
hi = np.ceil(points.max(axis=0)/VS).astype(int)+30
shape = tuple(int(v) for v in hi-lo+1)
field = np.empty(shape, dtype=np.float32)
grid.copyToArray(field, ijk=tuple(int(v) for v in lo))
del grid
XS = ((lo[0]+np.arange(shape[0]))*VS).astype(np.float32)
YS = ((lo[1]+np.arange(shape[1]))*VS).astype(np.float32)
ZS = ((lo[2]+np.arange(shape[2]))*VS).astype(np.float32)
print('grid', shape, 'band', BAND, flush=True)


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def interp(xs, ys):
    xs, ys = np.array(xs, float), np.array(ys, float)
    order = np.argsort(xs)
    xs, ys = xs[order], ys[order]
    return lambda v: np.interp(v, xs, ys)


field0 = field.copy() if args.cut_smooth else None


# ---- plans from the spec (figure units) ---------------------------------------------------------------------------
# Sheet column edges of each wing, from the spec's section 1 outline (back view; L is the character's left, +x local).
TOP = {'L': interp([.060, .105, .142, .209, .249, .279], [.027, .013, .006, .000, .008, .029]),
       'R': interp([.090, .126, .217, .274], [.029, .022, .021, .050])}
BOTTOM = {'L': interp([.090, .153, .214, .249, .274], [.178, .163, .128, .093, .053]),
          'R': interp([.085, .138, .180, .226, .260], [.175, .176, .163, .126, .088])}
MID = interp([.08, .10, .13, .16, .19, .22, .25, .27], [.066, .068, .066, .062, .059, .055, .045, .030])
CREST = interp([.06, .10, .16, .20, .24, .27], [.020, .020, .025, .028, .028, .020])
CREASE = interp([.05, .10, .175], [.044, .068, .085])    # u of the ear-root crease at y


def plan_rear(u, y, side):
    top, bottom = TOP[side](u), BOTTOM[side](u)
    c = CREST(u)
    topr = c+np.sqrt(np.maximum(y-top, 0)/15.)
    botr = np.maximum(.022, .020)+np.sqrt(np.maximum(bottom-y, 0)/25.)
    return np.minimum(np.minimum(MID(u), topr), botr)


# ---- plate cut and dome cut -----------------------------------------------------------------------------------------
cuts = {}
if args.plate > 0 or args.dome_cut:
    for sign, side in ((1, 'L'), (-1, 'R')):
        xi = np.where(XS*sign > 0)[0]
        for chunk in np.array_split(xi, max(1, len(xi)//40)):
            x = XS[chunk][:, None, None]
            y = YS[None, :, None]
            z = ZS[None, None, :]
            u = np.abs(x)/S                        # (nx,1,1)
            yf = (Z0-z)/S                          # figure y, (1,1,nz)
            df = (y-DF0)/S                         # (1,ny,1)
            sl = field[chunk]
            if args.plate > 0:
                plate_d = args.plate*(1-args.plate_outer*smoothstep((u-.17)/.07))
                plan = plan_rear(u, yf, side)-plate_d        # (nx,1,nz)
                plate_y = (plan*S+DF0).astype(np.float32)
                # weight: fade in from the crease, and not below the wing's lower edge
                w = smoothstep((u-CREASE(np.clip(yf, .05, .175))-args.plate_fade[0])/(args.plate_fade[1]-args.plate_fade[0]))
                w = w*smoothstep((BOTTOM[side](u)+.012-yf)/.012)*smoothstep((yf+.02)/.02)
                w = w.astype(np.float32)
                # slope-normalised vertical distance to the plate surface
                dy = np.gradient(plate_y[:, 0, :], VS, axis=0)
                dz = np.gradient(plate_y[:, 0, :], VS, axis=1)
                scale = (1/np.sqrt(1+dy**2+dz**2))[:, None, :].astype(np.float32)
                g = (y-plate_y)*scale
                cut = np.maximum(sl, g)
                sl = sl+w*(cut-sl)
            if args.dome_cut:
                top = TOP[side](u)+args.dome_slack
                kk = np.where(df > CREST(u), args.dome_k[0], args.dome_k[1])
                allowed = top+kk*(df-CREST(u))**2          # figure y, (nx,ny,1)
                allowed_z = (Z0-allowed*S).astype(np.float32)
                slope = np.abs(2*kk*(df-CREST(u)))
                g = (z-allowed_z)/np.sqrt(1+slope**2).astype(np.float32)
                w = smoothstep((u-.09)/.03)*smoothstep((yf+.05)/.03)
                w = w.astype(np.float32)
                cut = np.maximum(sl, g.astype(np.float32))
                sl = sl+w*(cut-sl)
            field[chunk] = sl
    print('cuts done', flush=True)


if args.dome_setback > 0:
    inside_ = field < 0
    ny_ = inside_.shape[1]
    yrear = np.where(inside_.any(axis=1), YS[ny_-1-inside_[:, ::-1, :].argmax(axis=1)], -9.).astype(np.float32)   # (nx, nz)
    del inside_
    u_ = np.abs(XS)[:, None]/S
    zf_ = (Z0-ZS[None, :])/S                                  # figure y
    wd = (smoothstep(1-u_/(args.crown_width*1.4))*smoothstep((zf_+.0)/.03)*smoothstep((.17-zf_)/.03)).astype(np.float32)
    target = yrear-args.dome_setback*S*wd
    gy = YS[None, :, None]-target[:, None, :]
    slope = np.hypot(np.gradient(target, VS, axis=0), np.gradient(target, VS, axis=1))
    gy = gy/np.sqrt(1+slope**2)[:, None, :]
    field = np.where((wd > 1e-3)[:, None, :], np.maximum(field, gy.astype(np.float32)), field).astype(np.float32)
    del gy
    print('dome set back', flush=True)


def box2d_masked(val, valid, r, passes=2):
    """Masked box blur of a 2D array: only valid cells count (so empty columns do not drag the surface down)."""
    num = np.where(valid, val, 0.).astype(np.float64)
    den = valid.astype(np.float64)
    for _ in range(passes):
        for ax_ in (0, 1):
            n_ = num.shape[ax_]
            for arr_name in ('num', 'den'):
                a = num if arr_name == 'num' else den
                c = np.cumsum(np.pad(a, [(r+1, r) if i == ax_ else (0, 0) for i in range(2)], mode='edge'), axis=ax_)
                b = np.take(c, np.arange(2*r+1, n_+2*r+1), axis=ax_)-np.take(c, np.arange(0, n_), axis=ax_)
                if arr_name == 'num':
                    num = b
                else:
                    den = b
    return np.where(den > 1e-6, num/np.maximum(den, 1e-6), np.nan)


if args.shave_dome > 0:
    inside_ = field < 0
    ny_ = inside_.shape[1]
    has_ = inside_.any(axis=1)
    yrear = YS[ny_-1-inside_[:, ::-1, :].argmax(axis=1)].astype(np.float64)
    del inside_
    blur_ = box2d_masked(yrear, has_, args.shave_dome)
    u_ = np.abs(XS)[:, None]/S
    zf_ = (Z0-ZS[None, :])/S
    crease_ = CREASE(np.clip(zf_, .05, .175))
    wd = (smoothstep((crease_-.006-u_)/.015)*smoothstep((zf_+.03)/.03)*smoothstep((args.shave_ymax-zf_)/.025)).astype(np.float32)
    smooth_ = np.where(np.isnan(blur_), yrear, blur_)-args.shave_off*S
    target = (smooth_ if args.shave_replace else np.minimum(yrear, smooth_)).astype(np.float32)
    gy = YS[None, :, None]-target[:, None, :]
    slope = np.hypot(np.gradient(target, VS, axis=0), np.gradient(target, VS, axis=1))
    gy = gy/np.sqrt(1+slope**2)[:, None, :]
    cut_ = np.maximum(field, gy.astype(np.float32))
    if args.shave_fill:
        # close the valleys too: a slab from just behind the old rear up to the target surface is unioned in, so the dome
        # rear becomes the blurred surface (peaks cut, valleys filled)
        slab_ = np.maximum(gy.astype(np.float32), (yrear.astype(np.float32)-.03*S)[:, None, :]-YS[None, :, None])
        cut_ = np.minimum(cut_, slab_)
        del slab_
    field = np.where(((wd > 1e-3) & has_)[:, None, :], field+wd[:, None, :]*(cut_-field), field).astype(np.float32)
    del gy, cut_
    print('dome shaved', flush=True)


if args.cut_smooth:
    def box(a, r):
        for ax_ in range(3):
            n_ = a.shape[ax_]
            c = np.cumsum(np.pad(a, [(r+1, r) if i == ax_ else (0, 0) for i in range(3)], mode='edge'), axis=ax_, dtype=np.float64)
            a = ((np.take(c, np.arange(2*r+1, n_+2*r+1), axis=ax_)-np.take(c, np.arange(0, n_), axis=ax_))/(2*r+1)).astype(np.float32)
        return a
    changed = (np.abs(field-field0) > 1e-5).astype(np.float32)
    del field0
    idx_ = np.argwhere(changed > 0)
    if len(idx_):
        a_ = np.maximum(idx_.min(axis=0)-args.cut_smooth*4, 0)
        b_ = np.minimum(idx_.max(axis=0)+args.cut_smooth*4+1, np.array(shape))
        sl_ = tuple(slice(int(i), int(j)) for i, j in zip(a_, b_))
        sub = field[sl_]
        weight = np.clip(box(box(changed[sl_], args.cut_smooth), args.cut_smooth)*4, 0, 1)
        blur = sub
        for _ in range(3):
            blur = box(blur, args.cut_smooth)
        field[sl_] = sub+weight*(blur-sub)
    del changed
    print('cut smoothing done', flush=True)


# ---- crown lowering: the model crown stands above the sheet's, so the tuft spikes would not clear it -----------------------
def crown_weight(xb_u, df):
    return smoothstep(1-xb_u/args.crown_width)*smoothstep((df-args.crown_df[0])/(args.crown_df[1]-args.crown_df[0]))


if args.crown_lower > 0:
    # Warp: the field is resampled so the crown dome moves down by crown_lower*S at the centerline, fading with |x|, with depth
    # and with height above the crown base (no flat cut, so no stepping).
    xu = np.abs(XS)[:, None]/S
    dfy = (YS[None, :]-DF0)/S
    wxy = crown_weight(xu, dfy).astype(np.float32)
    nz = len(ZS)
    zi = np.arange(nz, dtype=np.float32)
    wz = smoothstep((ZS-(Z0-.075*S))/(.03*S)).astype(np.float32)
    ix, iy = np.nonzero(wxy > 1e-3)
    for a_, b_ in zip(ix, iy):
        shift = args.crown_lower*S*wxy[a_, b_]*wz/VS            # voxels, per z
        field[a_, b_, :] = np.interp(zi+shift, zi, field[a_, b_, :]).astype(np.float32)
    print('crown lowered by warp', flush=True)


# ---- front surface of the wing wall: wing locks never reach in front of it --------------------------------------------
inside = field < 0
has = inside.any(axis=1)
first = inside.argmax(axis=1)
del inside
front2d = np.where(has, YS[first], np.nan).astype(np.float32)
fill = ~np.isnan(front2d)
for _ in range(400):
    if fill.all():
        break
    pad = np.pad(np.where(fill, front2d, 0.), 1)
    cnt = np.pad(fill.astype(np.float32), 1)
    num = sum(np.roll(np.roll(pad, a, 0), b, 1) for a in (-1, 0, 1) for b in (-1, 0, 1))[1:-1, 1:-1]
    den = sum(np.roll(np.roll(cnt, a, 0), b, 1) for a in (-1, 0, 1) for b in (-1, 0, 1))[1:-1, 1:-1]
    new = (~fill) & (den > 0)
    front2d[new] = (num[new]/den[new]).astype(np.float32)
    fill = fill | new
front2d[~fill] = 0.
print('front surface heightfield built', flush=True)

# rear and top heightfields of the (cut, shaved) field: the dome coat and the crown tuft lie on this surface, not on the old skin
_in = field < 0
_has = _in.any(axis=1)
rear2d = np.where(_has, YS[_in.shape[1]-1-_in[:, ::-1, :].argmax(axis=1)], np.nan).astype(np.float32)      # (nx, nz)
_hz = _in.any(axis=2)
top2d = np.where(_hz, ZS[_in.shape[2]-1-_in[:, :, ::-1].argmax(axis=2)], np.nan).astype(np.float32)        # (nx, ny)
del _in
if args.shave_dome > 0:
    # sub-voxel terraces of the argmax heightfield would print as fine ribs under the dome coat: smooth them
    rear2d = box2d_masked(rear2d.astype(np.float64), ~np.isnan(rear2d), 4, 2).astype(np.float32)
    top2d = box2d_masked(top2d.astype(np.float64), ~np.isnan(top2d), 4, 2).astype(np.float32)


def hf_sample(arr, a, b, axes):
    """Nearest-cell sample of a heightfield at head-local coordinates a (axis axes[0]) and b (axes[1])."""
    ia = int(round(a/VS-lo[axes[0]]))
    ib = int(round(b/VS-lo[axes[1]]))
    if not (0 <= ia < arr.shape[0] and 0 <= ib < arr.shape[1]):
        return None
    v = arr[ia, ib]
    return None if np.isnan(v) else float(v)


# ---- locks ------------------------------------------------------------------------------------------------------------
def to_local(xb, yd, df):
    return np.array([-S*xb, S*df+DF0, Z0-S*yd])


def surface_depth(xb, yd):
    """Head-local y of the original skin's rear surface at a back-view point (ray from behind); with --shave-dome the
    shaved field's rear surface instead."""
    if args.shave_dome > 0:
        return hf_sample(rear2d, -S*xb, Z0-S*yd, (0, 2))
    hit, normal, _, _ = tree.ray_cast(Vector((-S*xb, 3.0, Z0-S*yd)), Vector((0, -1, 0)))
    return None if hit is None else float(hit.y)


def surface_top(xb, df):
    if args.shave_dome > 0:
        return hf_sample(top2d, -S*xb, S*df+DF0, (0, 1))
    hit, normal, _, _ = tree.ray_cast(Vector((-S*xb, S*df+DF0, 2.0)), Vector((0, 0, -1)))
    if hit is None:
        return None
    return float(hit.z)-(args.crown_lower*S*float(crown_weight(abs(xb), df)) if args.crown_lower > 0 else 0.)


def bezier(p0, p1, p2, p3, t):
    t = t[:, None]
    return (1-t)**3*p0+3*(1-t)**2*t*p1+3*(1-t)*t**2*p2+t**3*p3


def row_opts(text):
    out = {}
    for part in text.split(','):
        if part.strip():
            k, v = part.split('=')
            out[k.strip()] = float(v)
    return out


LEN_SCALE, TIP_BACK, ROOT_IN, ROW_WIDTH = row_opts(args.len_scale), row_opts(args.tip_back), row_opts(args.root_in), row_opts(args.row_width)
THIN, YAW = row_opts(args.thin), row_opts(args.yaw)
ROW_LEN_JITTER, ROW_DIR_JITTER = row_opts(args.row_len_jitter), row_opts(args.row_dir_jitter)
D_SKIP = set(n.strip() for n in args.d_skip.split(',') if n.strip())


def jitter_of(name):
    import hashlib
    return int(hashlib.md5(name.encode()).hexdigest()[:8], 16)/0xffffffff*2-1


def adjust(l):
    """Round 8 per-row changes to a table row: length, depth shifts, flat B1 tips."""
    row = l['row']
    l = dict(l)
    k = LEN_SCALE.get(row, 1.)
    if row in ROW_LEN_JITTER:
        k *= 1+ROW_LEN_JITTER[row]*jitter_of(l['name']+args.jitter_seed)
    elif args.len_jitter and row in args.jitter_rows.split(','):
        k *= 1+args.len_jitter*jitter_of(l['name']+args.jitter_seed)
    if k != 1.:
        xr, yr = l['root']
        xt, yt = l['tip']
        l['tip'] = [xr+(xt-xr)*k, yr+(yt-yr)*k]
    dj = ROW_DIR_JITTER[row] if row in ROW_DIR_JITTER else (args.dir_jitter if row in args.dir_jitter_rows.split(',') else 0.)
    if dj:
        xr, yr = l['root']
        xt, yt = l['tip']
        ang = math.radians(dj*jitter_of(l['name']+'dir'+args.jitter_seed))
        dx, dy = xt-xr, yt-yr
        l['tip'] = [xr+dx*math.cos(ang)-dy*math.sin(ang), yr+dx*math.sin(ang)+dy*math.cos(ang)]
    if args.edge_guard > 0 and row in args.guard_rows.split(',') and l.get('side') in ('L', 'R'):
        spec_tip = next((t['tip'] for t in table if t['name'] == l['name']), l['tip'])
        xr, yr = l['root']
        full = l['tip']
        for f in np.linspace(1., 0., 21):
            tip = [spec_tip[0]+(full[0]-spec_tip[0])*f, spec_tip[1]+(full[1]-spec_tip[1])*f]
            u_, y_ = abs(tip[0]), tip[1]
            if TOP[l['side']](u_)+args.edge_guard*.0 <= y_ and y_ <= BOTTOM[l['side']](u_)-args.edge_guard and u_ <= .279-args.edge_guard:
                break
        l['tip'] = tip
    if row == 'B1' and args.tip_flat:
        l['depthTip'] = l['depthTip']+args.tip_flat*(l['depthRoot']-l['depthTip'])
    if args.depth_jitter and row in ('T', 'B2', 'B3'):
        sh = -args.depth_jitter*(jitter_of(l['name']+'depth')+1)
        l['depthTip'] += sh
        l['depthRoot'] += sh
    l['depthTip'] = l['depthTip']+TIP_BACK.get(row, 0.)
    l['depthRoot'] = l['depthRoot']-ROOT_IN.get(row, 0.)-YAW.get(row, 0.)
    if row == 'C' and args.c_tip_raise:
        l['tip'] = [l['tip'][0], l['tip'][1]-args.c_tip_raise]
    return l


def lock_axis(l, n=None):
    n = n or args.samples
    l = adjust(l)
    if l['row'] == 'D' and args.d_length != 1.:
        l = dict(l, tip=[l['root'][0]+(l['tip'][0]-l['root'][0])*args.d_length, l['root'][1]+(l['tip'][1]-l['root'][1])*args.d_length])
    """Axis samples in head-local space, arc length, frames. Positions in back-view figure units."""
    xr, yr = l['root']
    xt, yt = l['tip']
    row = l['row']
    sx = -1. if xr < 0 else 1.
    depth_root, depth_tip = l['depthRoot'], l['depthTip']
    if row in ('B1', 'B2', 'B3', 'T'):
        a0, a1 = math.radians(l['dirRoot']), math.radians(l['dirTip'])
        d0 = np.array([sx*math.cos(a0), math.sin(a0)])
        d1 = np.array([sx*math.cos(a1), math.sin(a1)])
    else:
        d0 = d1 = np.array([xt-xr, yt-yr])
        d0 = d0/max(np.linalg.norm(d0), 1e-9)
        d1 = d0
    p0, p3 = np.array([xr, yr]), np.array([xt, yt])
    chord = np.linalg.norm(p3-p0)
    p1, p2 = p0+d0*chord/3, p3-d1*chord/3
    t = np.linspace(0, 1, n)
    xy = bezier(p0, p1, p2, p3, t)
    df = depth_root+(depth_tip-depth_root)*t
    if args.tip_sink and row in args.sink_rows.split(','):
        df = df-args.tip_sink*smoothstep((t-.45)/.55)
    return xy, df


def build_lock(l, lift_extra=0.):
    xy, df = lock_axis(l)
    row = l['row']
    if row == 'D':
        # dome coat: lie on the actual dome, relief d-lift above it
        ys = [surface_depth(x, y) for x, y in xy]
        if any(v is None for v in ys):
            return None
        df = (np.array(ys)-DF0)/S+args.d_lift-args.dome_setback
    if row == 'C':
        # crown tuft: the six spikes grow out of the dome at the whorl; the root sits on the dome, the tip keeps the
        # height the spec gives it (no tip above the figure top)
        top = surface_top(xy[0][0], df[0])
        ax = np.array([to_local(x, y, d) for (x, y), d in zip(xy, df)])
        if top is not None:
            root_z = top+args.c_lift*S-.01
            tip_z = ax[-1, 2]
            ax[:, 2] = np.linspace(root_z, tip_z, len(ax))
        return ax
    ax = np.array([to_local(x, y, d) for (x, y), d in zip(xy, df)])
    return ax


def lock_field(sample, l, wscale, tscale):
    """Return (slices, value) of the lock's field inside its bounding box, or None."""
    ax = sample
    n = len(ax)
    seg = np.diff(ax, axis=0)
    arc = np.r_[0, np.cumsum(np.linalg.norm(seg, axis=1))]
    L = arc[-1]
    tang = np.gradient(ax, axis=0)
    tang /= np.linalg.norm(tang, axis=1)[:, None]
    up = np.array([0., 0., 1.]) if l['row'] == 'T' else np.array([0., 1., 0.])
    nrm = up[None, :]-(tang@up)[:, None]*tang
    bad = np.linalg.norm(nrm, axis=1) < 1e-3
    alt = np.array([0., 1., 0.]) if l['row'] == 'T' else np.array([0., 0., 1.])
    nrm[bad] = alt-(tang[bad]@alt)[:, None]*tang[bad]
    nrm /= np.linalg.norm(nrm, axis=1)[:, None]
    bin_ = np.cross(tang, nrm)
    wm, wr = l['widthMid']*S*wscale, l['widthRoot']*S*wscale
    th = l['thick']*S*tscale
    hmin, tmin = args.tip_min[0]*S, args.tip_min[1]*S

    def half_width(t):
        rise = np.where(t < .4, wr/2+(wm/2-wr/2)*smoothstep(t/.4), wm/2*np.clip(1-(t-.4)/.6, 0, 1)**args.taper_exp)
        if args.tip_point > 0:
            return np.maximum(rise, hmin*np.clip((1-t)/args.tip_point, 0, 1)+.0004)
        return np.maximum(rise, hmin)

    def height(t):
        h = np.where(t < .4, th*(.75+.25*smoothstep(t/.4)), np.where(t < .9, th*(1-.6*(t-.4)/.5), th*(.4-.25*(t-.9)/.1)))
        if args.tip_taper > 0:
            w = np.clip(half_width(t)/(wm/2), 0, 1)
            h = np.minimum(h, th*np.maximum(w**args.tip_taper, .12))
        return np.maximum(h, tmin)

    reach = wm/2+th+.03
    low = ax.min(axis=0)-reach
    high = ax.max(axis=0)+reach
    a = np.clip(np.floor(low/VS).astype(int)-lo, 0, np.array(shape)-1)
    z = np.clip(np.ceil(high/VS).astype(int)-lo+1, 0, np.array(shape))
    sl = tuple(slice(int(i), int(j)) for i, j in zip(a, z))
    if any(s.stop <= s.start for s in sl):
        return None
    xs, ys, zs = (np.arange(s.start, s.stop) for s in sl)
    X, Y, Z = np.meshgrid((lo[0]+xs)*VS, (lo[1]+ys)*VS, (lo[2]+zs)*VS, indexing='ij')
    P = np.stack([X, Y, Z], axis=-1).reshape(-1, 3).astype(np.float32)
    best = np.full(len(P), 1e9, np.float32)
    idx = np.zeros(len(P), np.int32)
    for k in range(n):
        d2 = ((P-ax[k].astype(np.float32))**2).sum(axis=1)
        m = d2 < best
        best[m] = d2[m]
        idx[m] = k
    q = P-ax[idx].astype(np.float32)
    s_loc = (q*tang[idx]).sum(axis=1)
    length = arc[idx]+s_loc
    aa = (q*bin_[idx]).sum(axis=1)
    cc = (q*nrm[idx]).sum(axis=1)
    t = np.clip(length/L, 0, 1)
    h = height(t).astype(np.float32)
    wh = half_width(t).astype(np.float32)
    crel = cc+h                                      # height above the base plane (crest at h)
    e = np.sqrt((aa/wh)**2+(np.maximum(crel, 0)/h)**2)
    # closed tip and buried root cap, and a floor so the base does not pierce the fan's front
    e = np.sqrt(e**2+(np.maximum(length-L, 0)/np.maximum(wh, hmin*1.5))**2+(np.maximum(-length, 0)/(.02))**2
                +(np.maximum(-crel-args.cap*S*np.clip(wh/(wm/2), 0, 1), 0)/(.02))**2)
    d = (e-1)*np.minimum(wh, h)
    if args.front_margin >= 0 and l['row'] in ('T', 'B1', 'B2', 'B3'):
        fr = front2d[sl[0], sl[2]]                                  # (nx, nz)
        limit = np.broadcast_to(fr[:, None, :], tuple(s_.stop-s_.start for s_ in sl)).reshape(-1)+args.front_margin
        d = np.maximum(d, limit-P[:, 1])
    return sl, d.reshape(tuple(s.stop-s.start for s in sl)).astype(np.float32)


lock_field_arr = np.full(shape, BAND, dtype=np.float32)
built = []
row_count = {}
for l in table:
    if l['row'] not in rows:
        continue
    if l['row'] == 'D' and (l['root'][1] > args.d_ymax or l['name'] in D_SKIP):
        continue
    if l['row'] in THIN:
        key_ = (l['row'], l['side'])
        row_count[key_] = row_count.get(key_, -1)+1
        if row_count[key_] % int(THIN[l['row']]) != 0:
            continue
    if args.only_side and l['side'] and l['side'] != args.only_side:
        continue
    ax = build_lock(l)
    if ax is None:
        built.append({'name': l['name'], 'skipped': 'no surface'})
        continue
    ts = args.t_scale if l['row'] == 'T' else 1.
    r = lock_field(ax, l, args.width_scale*ts*ROW_WIDTH.get(l['row'], 1.), args.thick_scale*ts*(args.d_thick if l['row'] == 'D' else 1.))
    if r is None:
        continue
    sl, d = r
    cur = lock_field_arr[sl]
    lock_field_arr[sl] = np.where(cur >= BAND*.9, np.minimum(cur, d), smin(cur, d, args.lock_blend)).astype(np.float32)
    built.append({'name': l['name'], 'axisRoot': [round(float(v), 4) for v in ax[0]], 'axisTip': [round(float(v), 4) for v in ax[-1]]})
print('locks', len(built), flush=True)

combined = np.minimum(smin(field, lock_field_arr, args.blend), BAND).astype(np.float32)
del lock_field_arr, field
out_grid = vdb.FloatGrid()
out_grid.background = BAND
out_grid.copyFromArray(combined, ijk=(0, 0, 0))
vertices, tri_out, quads = out_grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
vertices = (vertices.astype(np.float64)+lo)*VS
faces = [tuple(t) for t in tri_out.tolist()]+[tuple(q) for q in quads.tolist()]
materials = list(head.data.materials)
mesh = bpy.data.meshes.new('Head skin with rear lock table')
mesh.from_pydata(vertices.tolist(), [], faces)
mesh.update()
bm = bmesh.new(); bm.from_mesh(mesh)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(mesh); bm.free()
old = head.data
head.data = mesh
for material in materials:
    mesh.materials.append(material)
for polygon in mesh.polygons:
    polygon.use_smooth = True
inverse = M.inverted()
for vertex in mesh.vertices:
    vertex.co = inverse @ vertex.co
bpy.data.meshes.remove(old)
removed_flecks = remove_voxel_specks(head, max_extent=6*VS)
removed_islands = []
if args.max_island:
    bmi = bmesh.new(); bmi.from_mesh(head.data)
    unseen, groups = set(bmi.verts), []
    while unseen:
        queue = [unseen.pop()]
        group = set(queue)
        while queue:
            for edge in queue.pop().link_edges:
                for vertex in edge.verts:
                    if vertex in unseen:
                        unseen.remove(vertex); group.add(vertex); queue.append(vertex)
        groups.append(group)
    biggest = max(groups, key=len)
    for group in groups:
        if group is not biggest and len(group) <= args.max_island:
            removed_islands.append({'vertices': len(group),
                                    'bounds': [[round(min(v.co[i] for v in group), 4) for i in range(3)],
                                               [round(max(v.co[i] for v in group), 4) for i in range(3)]]})
            bmesh.ops.delete(bmi, geom=list(group), context='VERTS')
    bmi.to_mesh(head.data); bmi.free()
require_single_closed_mesh(head, args.out, 'Head skin with rear lock table')
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
params = {k: (str(v) if isinstance(v, Path) else v) for k, v in vars(args).items()}
(args.out/'rear-lock-table.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'R04: ear fan rear plate, section dome and the authored lock table (T, B1, B2, B3, D, C), field space; face untouched',
    'parameters': params, 'lockCount': len(built), 'locks': built, 'removedFlecks': removed_flecks, 'removedIslands': removed_islands,
    'skinBefore': before, 'skinAfter': mesh_stats(head),
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']},
}, indent=2)+'\n')
