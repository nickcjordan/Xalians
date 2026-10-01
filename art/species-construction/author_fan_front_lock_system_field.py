"""Rebuild the Akinza ear fan front as one authored lock system, in field space (R03, round 7).

Run with Blender (through loop_tools.py blender, --log before the script path):
  blender -b --factory-startup --python author_fan_front_lock_system_field.py --
    --scene <head.blend> --out <new-dir> --spec docs/design/species-construction/akinza/loop/specs/R03.md [options]

Round 5 (author_fan_front_spec_field.py) built the front from the same spec tables but cut it with hard weights (a fill that
switched on at weight .95, a planar plate, a backing slab) and added thin knife-edged leaves, so it read as torn plates, a vertical
seam at the skull and a ribbed tuft panel. This script keeps the spec's structure (58 lock rows: 24 coat locks P, F, M and 5 tuft
locks T per side, cup polygons, depth plan) and changes how it is built:

  1. Plan morph. The field is converted to an OpenVDB level set. A smooth target surface (plate at the coat plan plus --plate-offset,
     a concave cup floor inside the cup polygon, Gaussian smoothed, clamped to keep --min-thickness of wing behind it) is built from
     the spec's depth plan, and the old field is MORPHED toward "old, cut in front of the target, cup pit filled to the target" with a
     continuous weight (zero at the skull side line u .100, full from .12), so there is no seam, rolled lip or ramp edge left.
  2. Locks. Every lock is a tapered half-ellipse swept along a gently curved axis (crest line at the table's front depth, flat back
     buried in the plate, tip lifted off the plate), rounder and thicker than round 5's lens, with the width/thickness/length of the
     table scaled by options. Coat locks are smooth-unioned among themselves with a small radius (--lock-blend) so each stays a
     separate pointed mass; they are clipped to stay behind the old rear surface and the skull front.
  3. Tuft. T locks (plus optional --tuft-fluff in-between locks) root inside the skull side line and fan over the cup floor, tips lifted;
     faces within --pale-tol of the tuft's own field get the material `Pale inner-ear coat` (assignment only; the skin stays one mesh).
  4. Optional outline trim (--trim-pins): a thin-feature opening in the fan's outer band before the locks are added, so the R04 pins
     and the old cones that stand outside the envelope are gone while the new locks keep their tips.

Coordinates: head-local (x, y, z) maps to world (.5x, .5y-.02, .5z+.635). The spec's fit frame (x across and y down from the crown, figure
heights of 1.8605; df = world y / 1.8605, front negative) maps to head-local x = 3.721 xf, z = .537-3.721 yf, y = 3.721 df+.04.
Eyes, lids, nose and mouth are separate objects and do not move. Akinza-specific. Every parameter and lock is recorded in
fan-front-lock-system.json.
"""
import argparse
import json
import math
import re
from pathlib import Path
import sys

import bpy
import bmesh
import numpy as np
import openvdb as vdb
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import material, mesh_stats, remove_voxel_specks, require_single_closed_mesh, sha
from study_provenance import snapshot

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--spec', type=Path, required=True)
parser.add_argument('--voxel', type=float, default=.0025)
parser.add_argument('--only-side', default='', help='debug: build only L or R')
parser.add_argument('--no-snapshot', action='store_true', help='debug probe: skip the provenance snapshot (never for a candidate)')
# Plan morph.
parser.add_argument('--plate-offset', type=float, default=.009, help='plate front behind the coat-front plan, figure heights')
parser.add_argument('--min-thickness', type=float, default=.012, help='the plate keeps at least this much wing behind its front (figure heights)')
parser.add_argument('--plan-u0', type=float, default=.100, help='the plan starts to apply here (|x|, figure heights)')
parser.add_argument('--plan-ramp', type=float, default=.022)
parser.add_argument('--plan-y-full', type=float, default=.165)
parser.add_argument('--plan-y-end', type=float, default=.192)
parser.add_argument('--cup-edge', type=float, default=.014, help='transition width from plate to cup floor, figure heights')
parser.add_argument('--plan-smooth', type=float, default=.006, help='Gaussian sigma of the target surface, figure heights')
parser.add_argument('--fill-depth', type=float, default=.25, help='thickness of the cup fill slab behind the target, head-local')
parser.add_argument('--floor-shift', type=float, default=.012, help='shift the cup floor rearward (positive), figure heights')
parser.add_argument('--no-plan', action='store_true')
# Locks.
parser.add_argument('--lock-blend', type=float, default=.004, help='smooth union radius among coat locks, head-local')
parser.add_argument('--blend', type=float, default=.008, help='smooth union radius of the coat locks with the plate, head-local')
parser.add_argument('--length-scale', type=float, default=1.0)
parser.add_argument('--width-scale', type=float, default=1.1)
parser.add_argument('--thick-scale', type=float, default=1.1)
parser.add_argument('--tip-lift', type=float, default=.008, help='tip rises toward the viewer this far, figure heights')
parser.add_argument('--curl', type=float, default=12., help='degrees the axis turns toward vertical-up from root to tip (locks that point up)')
parser.add_argument('--ogive', type=float, nargs=2, default=[1.0, .95], help='width fall from the widest point (t .4) to the point: (1 - s^p)^q with s the fraction of the remaining length')
parser.add_argument('--section-p', type=float, default=2.3, help='superellipse exponent of the lock cross section (2 = ellipse; higher = flatter crown, squarer edge)')
parser.add_argument('--tip-min', type=float, nargs=2, default=[.0012, .0012], help='smallest half width and full thickness at a tip, figure heights')
parser.add_argument('--cap', type=float, default=.012, help='how far a lock base reaches under its base plane at the lock middle, figure heights')
parser.add_argument('--coat-root-extend', type=float, default=.03, help='coat lock roots start this far further in along the axis (buried), figure heights; the tips stay on the table')
parser.add_argument('--jitter', type=float, nargs=3, default=[3., .06, 4.], help='per-lock deterministic jitter: axis turn (degrees), length (fraction), curl (degrees)')
parser.add_argument('--top-line', type=float, default=.0, help='profile top-line margin (figure heights): a lock crest is kept behind the sheet profile top line (R04 spec) so top-row tips do not add side extra; negative turns it off')
parser.add_argument('--drape-width', type=float, default=1.5, help='width scale of the drape locks (axis pointing down more than 20 degrees: P9, P10, F9), on top of --width-scale')
parser.add_argument('--top-width', type=float, default=1.35, help='extra width scale of coat locks whose tip is on the top edge (tip y < .035, |x| > .12): they cover the roof band that would otherwise show as a bare plate')
parser.add_argument('--cup-clear', type=float, default=.004, help='coat locks may reach this far (figure heights) into the cup polygon; deeper material is cut away so the cup keeps a clean rim and its floor; negative turns it off')
parser.add_argument('--tip-trim', type=float, default=.009, help='coat locks whose tip is beyond |x| --trim-from are shortened (root fixed) so the tip moves this far inward in x (figure heights); keeps the front ear span (R03.1) within 3 percent of the sheet')
parser.add_argument('--trim-from', type=float, default=.2)
parser.add_argument('--keep', default='PFMX', help='coat lock families to build')
parser.add_argument('--skip', default='P1,F1,M1', help='comma separated lock names (without side letter) to skip, e.g. P1,F1,M1')
parser.add_argument('--rear-margin', type=float, default=.004, help='coat locks stay this far in front of the old rear, head-local')
parser.add_argument('--samples', type=int, default=24)
# Tuft.
parser.add_argument('--tuft-width-scale', type=float, default=1.1)
parser.add_argument('--tuft-length-scale', type=float, default=1.0)
parser.add_argument('--tuft-thick-scale', type=float, default=1.05)
parser.add_argument('--tuft-root-extend', type=float, default=.014, help='tuft roots start this far inside the skull side line, figure heights')
parser.add_argument('--tuft-depth-shift', type=float, default=0., help='shift tuft depth, figure heights (negative = toward the viewer)')
parser.add_argument('--tuft-lift', type=float, default=.007, help='tuft tip lift toward the viewer, figure heights')
parser.add_argument('--tuft-curl', type=float, default=10.)
parser.add_argument('--tuft-ogive', type=float, nargs=2, default=[1.2, .8], help='tuft lock width fall (broader, leafier than the coat locks)')
parser.add_argument('--tuft-fan', type=float, default=5., help='degrees the first and last tuft locks turn away from the middle one (up for T1, down for T5)')
parser.add_argument('--tuft-root-sink', type=float, default=.02, help='tuft roots lie this much deeper (rearward) at the root, easing out by t .4, so they come from behind the skull side line instead of standing in front of it')
parser.add_argument('--tuft-fluff', type=int, default=2, help='in-between fluff locks per side (between neighbouring T locks)')
parser.add_argument('--tuft-blend', type=float, default=.003)
parser.add_argument('--tuft-stack', type=float, default=.004, help='each tuft lock after T1 lies this much further toward the viewer (figure heights), so the locks shingle')
parser.add_argument('--tuft-skull-blend', type=float, default=.02, help='smooth union radius of the tuft roots with the skull, head-local')
parser.add_argument('--no-tuft', action='store_true')
parser.add_argument('--no-extras', action='store_true', help='skip the extra filler locks (LX1, RX1)')
parser.add_argument('--pale-tol', type=float, default=.008)
parser.add_argument('--pale-gray', type=float, default=.68)
parser.add_argument('--pale-smooth', type=int, default=3, help='majority-vote passes over face neighbours that smooth the pale material boundary')
# Outline.
parser.add_argument('--trim-pins', type=float, default=0., help='opening radius (figure heights) applied to the old field in the outer band before the locks; 0 = off')
parser.add_argument('--trim-u0', type=float, default=.14, help='the opening applies from this |x| outward')
parser.add_argument('--trim-y', type=float, nargs=2, default=None, help='round 12: the pin trim fades out with depth, full in front of the first head-local y and gone behind the second, so the R04 rear locks keep their tips')
# Round 12 (R03): plate clip, lock forks, softer tuft.
parser.add_argument('--plate-clip', type=float, default=None, help='round 12: cut the old fan body to the spec outline table (section 1, sheet top and bottom per column plus the tip points) inset by this much (figure heights), so the plate stops short of the lock tips; the cut fades with depth (--clip-y) and in from |x| --clip-u0')
parser.add_argument('--clip-y', type=float, nargs=2, default=[.10, .18], help='head-local y where the plate clip is full and where it is gone')
parser.add_argument('--clip-u0', type=float, nargs=2, default=[.14, .19], help='|x| (figure heights) where the plate clip starts and is full')
parser.add_argument('--tip-wedge', action='store_true', help='round 12: cut each wing end, through every depth, to a pointed V (blunt vertical end -> point) before the locks are added; apex, start and top/bottom heights are the --wedge-* options')
parser.add_argument('--wedge-u', type=float, nargs=2, default=[.225, .262], help='|x| where the V starts and its apex, figure heights')
parser.add_argument('--wedge-apex-y', type=float, nargs=2, default=[.034, .062], help='apex y for L, R')
parser.add_argument('--wedge-top-y', type=float, nargs=2, default=[-.01, .01], help='y of the V top edge at its start, L, R')
parser.add_argument('--wedge-bottom-y', type=float, nargs=2, default=[.105, .12], help='y of the V bottom edge at its start, L, R')
parser.add_argument('--pale-cup-margin', type=float, default=None, help='round 12: faces more than this far (figure heights) outside the cup polygon in the front view are not given the pale material (tuft tips buried under the coat otherwise mark streaks on it)')
parser.add_argument('--tip-point', type=float, default=0., help='round 12: fraction of the lock length over which the tip-min floor fades to zero (a true point instead of a constant-width needle or a rounded knob); 0 = off')
parser.add_argument('--fork', type=int, default=0, help='forks per primary lock (0 or 2): short side points that split each tip into three')
parser.add_argument('--fork-angle', type=float, default=20.)
parser.add_argument('--fork-len', type=float, default=.45, help='fork length over its parent lock length')
parser.add_argument('--fork-from', type=float, default=.5, help='fraction along the parent axis where the forks root')
parser.add_argument('--fork-families', default='P')
parser.add_argument('--tuft-tip-min', type=float, nargs=2, default=None, help='tuft locks: smallest half width and thickness at a tip (default: --tip-min)')
parser.add_argument('--tuft-section-p', type=float, default=None)
parser.add_argument('--tuft-blur', type=float, default=0., help='Gaussian sigma (voxels) applied to the union of the tuft locks before it joins the skin: softens the serrated free edge into rounded clumps')
parser.add_argument('--tuft-aim', type=float, default=0., help='tuft tips move this fraction of the way toward the cup upper tip, so the clumps converge on it')
parser.add_argument('--bandwidth', type=int, default=14)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = None if args.no_snapshot else snapshot(args.out, __file__, [args.scene, args.spec])

K = 3.721          # figure heights to head-local (2 x 1.8605)
Z0 = .537          # head-local z of the crown line (y = 0 in the fit frame)
Y0 = .04           # head-local y offset (df = 0)


def to_local(xf, yf, df):
    """Figure frame (x across, y down, df depth) to head-local (x, y, z)."""
    return K*xf, K*df+Y0, Z0-K*yf


# ---------------------------------------------------------------------------------------------- spec tables
spec_text = args.spec.read_text(encoding='utf-8')
NUM = r'([+-]?\d*\.\d+)'
row_re = re.compile(r'^\|\s*([LR][PFMT]\d+)\s*\|\s*\(' + NUM + r',\s*' + NUM + r'\)\s*\|\s*\(' + NUM + r',\s*' + NUM +
                    r'\)\s*\|\s*' + NUM + r'\s*\|\s*' + NUM + r'\s*/\s*' + NUM + r'\s*\|\s*' + NUM + r'\s*\|\s*([+-]?\d+)\s*\|\s*'
                    + NUM + r'\s*/\s*' + NUM + r'\s*\|', re.M)
spec_locks = []
for m in row_re.finditer(spec_text):
    v = [float(g) if i else g for i, g in enumerate(m.groups())]
    name = v[0]
    spec_locks.append({'name': name, 'side': 1 if name[0] == 'L' else -1, 'family': name[1],
                       'root': (v[1], v[2]), 'tip': (v[3], v[4]), 'length': v[5], 'width_root': v[6], 'width_mid': v[7],
                       'thick': v[8], 'dir': v[9], 'depth_root': v[10], 'depth_tip': v[11]})
if len(spec_locks) != 58:
    raise ValueError(f'expected 58 lock rows in the spec, parsed {len(spec_locks)}')
cup_points = {}
for side, label in ((1, 'L'), (-1, 'R')):
    m = re.search(r'^- ' + label + r': (\(.*?)Area', spec_text, re.M | re.S)
    pts = re.findall(r'\(' + NUM + r',\s*' + NUM + r'\)', m.group(1))
    cup_points[side] = np.array([(float(a), float(b)) for a, b in pts])
    if len(pts) < 8:
        raise ValueError('cup polygon not parsed')
skip = {s.strip() for s in args.skip.split(',') if s.strip()}
# Extra coat locks (opt-out with --no-extras): the spec's table leaves the outer top corner of each wing as bare plate, so one
# filler lock per side runs from the F3/P4 roots to the envelope between P4 and F4 (tip on the edge table: L top .009 at x .24,
# R top .034 at x -.243, the R wing sitting about .025 lower on the sheet).
EXTRA_LOCKS = [
    {'name': 'LX1', 'side': 1, 'family': 'X', 'root': (.190, .050), 'tip': (.246, .011), 'length': .068, 'width_root': .024, 'width_mid': .038,
     'thick': .015, 'dir': 35, 'depth_root': -.002, 'depth_tip': .014},
    {'name': 'RX1', 'side': -1, 'family': 'X', 'root': (-.190, .072), 'tip': (-.245, .036), 'length': .066, 'width_root': .024, 'width_mid': .038,
     'thick': .015, 'dir': 33, 'depth_root': .002, 'depth_tip': .014},
]
EXTRA_LOCKS += [
    {'name': 'LX2', 'side': 1, 'family': 'X', 'root': (.208, .046), 'tip': (.258, .018), 'length': .057, 'width_root': .022, 'width_mid': .034,
     'thick': .014, 'dir': 29, 'depth_root': .006, 'depth_tip': .014},
    {'name': 'RX2', 'side': -1, 'family': 'X', 'root': (-.205, .066), 'tip': (-.260, .042), 'length': .060, 'width_root': .022, 'width_mid': .034,
     'thick': .014, 'dir': 24, 'depth_root': .008, 'depth_tip': .014},
]
if not args.no_extras:
    spec_locks = spec_locks+EXTRA_LOCKS

# Depth plan (spec section 3): front depth df against |x| in figure heights.
PLAN_U = np.array([.10, .13, .16, .19, .23, .27])
PLAN_COAT = np.array([-.040, -.030, -.014, .008, .016, .010])
FLOOR_U = np.array([.10, .13, .16, .19])
FLOOR_DF = np.array([-.026, -.010, .006, .020])

# ---------------------------------------------------------------------------------------------- skin
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
head = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before the R03 lock system')
before = mesh_stats(head)
M = head.matrix_world.copy()
VS = args.voxel
points = np.array([M@v.co for v in head.data.vertices], dtype=np.float32)
head.data.calc_loop_triangles()
tris = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
head.data.loop_triangles.foreach_get('vertices', tris)
tris = tris.reshape(-1, 3)
old_tree = BVHTree.FromPolygons([tuple(p) for p in points], tris.tolist())
HALF = args.bandwidth
grid = vdb.FloatGrid.createLevelSetFromPolygons(points, triangles=tris, transform=vdb.createLinearTransform(voxelSize=VS), halfWidth=HALF)
BAND = HALF*VS
lo = np.floor(points.min(axis=0)/VS).astype(int)-30
hi = np.ceil(points.max(axis=0)/VS).astype(int)+30
hi[0] += int(round(.06/VS))       # room for tips that stand beyond the old span
lo[0] -= int(round(.06/VS))
shape = tuple(int(v) for v in hi-lo+1)
field = np.empty(shape, dtype=np.float32)
grid.copyToArray(field, ijk=tuple(int(v) for v in lo))
del grid
X, Y, Z = [(lo[i]+np.arange(shape[i]))*VS for i in range(3)]
print('field', shape, 'voxel', VS, flush=True)


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def polygon_sdf(px, pz, poly):
    px = np.asarray(px, dtype=float)
    pz = np.asarray(pz, dtype=float)
    d = np.full(px.shape, 1e9)
    inside = np.zeros(px.shape, dtype=bool)
    n = len(poly)
    for i in range(n):
        a, b = poly[i], poly[(i+1) % n]
        e = b-a
        w = np.stack([px-a[0], pz-a[1]], axis=-1)
        h = np.clip((w@e)/(e@e), 0, 1)
        d = np.minimum(d, np.linalg.norm(w-h[..., None]*e, axis=-1))
        cond = ((a[1] > pz) != (b[1] > pz))
        xint = a[0]+(pz-a[1])*(b[0]-a[0])/np.where(b[1] != a[1], b[1]-a[1], 1)
        inside ^= cond & (px < xint)
    return np.where(inside, -d, d)


def gauss2d(a, sigma):
    radius = int(math.ceil(3*sigma))
    kernel = np.exp(-.5*(np.arange(-radius, radius+1)/sigma)**2)
    kernel /= kernel.sum()
    for axis in (0, 1):
        moved = np.moveaxis(a, axis, 0)
        padded = np.pad(moved, [(radius, radius), (0, 0)], mode='edge')
        out = np.zeros_like(moved)
        for k, w in enumerate(kernel):
            out += w*padded[k:k+moved.shape[0]]
        a = np.moveaxis(out, 0, axis)
    return a


def propagate(values, known):
    """Fill unknown cells from their nearest known neighbours (iterated), for smooth floor and rear maps."""
    filled = np.where(known, values, 0.0).astype(np.float64)
    known = known.copy()
    for _ in range(600):
        if known.all():
            break
        s = np.zeros_like(filled)
        c = np.zeros(filled.shape)
        base = np.where(known, filled, 0.0)
        for axis in (0, 1):
            for shift in (1, -1):
                s += np.roll(base, shift, axis=axis)
                c += np.roll(known.astype(float), shift, axis=axis)
        fresh = (~known) & (c > 0)
        filled = np.where(fresh, s/np.maximum(c, 1), filled)
        known |= fresh
    return filled


def box_blur(a, r):
    for ax_ in range(a.ndim):
        n_ = a.shape[ax_]
        c = np.cumsum(np.pad(a, [(r+1, r) if i == ax_ else (0, 0) for i in range(a.ndim)], mode='edge'), axis=ax_, dtype=np.float64)
        a = ((np.take(c, np.arange(2*r+1, n_+2*r+1), axis=ax_)-np.take(c, np.arange(0, n_), axis=ax_))/(2*r+1)).astype(np.float32)
    return a


sides = [1, -1] if not args.only_side else [1 if args.only_side == 'L' else -1]

# ---------------------------------------------------------------------------------------------- front and rear maps
side_cols = {1: np.where(X > .26)[0], -1: np.where(X < -.26)[0]}
rows_z = np.where((Z > -.34) & (Z < .62))[0]
r0, r1 = rows_z[0], rows_z[-1]+1
SZ = Z[r0:r1]
maps = {}


def build_maps(source):
    out = {}
    for side in sides:
        cols = side_cols[side]
        c0, c1 = cols[0], cols[-1]+1
        sub = source[c0:c1, :, r0:r1]
        solid = sub < 0
        has = solid.any(axis=1)
        first = np.clip(np.argmax(solid, axis=1), 1, len(Y)-1)
        last = np.clip(len(Y)-1-np.argmax(solid[:, ::-1, :], axis=1), 0, len(Y)-2)
        f_out = np.take_along_axis(sub, (first-1)[:, None, :], axis=1)[:, 0, :]
        f_in = np.take_along_axis(sub, first[:, None, :], axis=1)[:, 0, :]
        t1 = np.clip(f_out/np.where(f_out != f_in, f_out-f_in, 1), 0, 1)
        front = np.where(has, Y[first-1]+t1*(Y[first]-Y[first-1]), np.nan)
        r_in = np.take_along_axis(sub, last[:, None, :], axis=1)[:, 0, :]
        r_out = np.take_along_axis(sub, (last+1)[:, None, :], axis=1)[:, 0, :]
        t2 = np.clip(r_in/np.where(r_in != r_out, r_in-r_out, 1), 0, 1)
        rear = np.where(has, Y[last]+t2*(Y[last]+VS-Y[last]), np.nan)
        del solid, f_out, f_in, r_in, r_out
        out[side] = {'c0': c0, 'c1': c1, 'has': has, 'front': front, 'rear': rear,
                     'front_f': propagate(front, has), 'rear_f': propagate(rear, has)}
    return out


maps = build_maps(field)
print('maps done', flush=True)

# ---------------------------------------------------------------------------------------------- 0. optional pin trim
trim_record = {'applied': args.trim_pins > 0}
if args.trim_pins > 0:
    r = max(1, int(round(args.trim_pins*K/VS)))
    for side in sides:
        mp = maps[side]
        c0, c1 = mp['c0'], mp['c1']
        sub = field[c0:c1, :, r0:r1]
        xs = np.abs(X[c0:c1])/K
        wt = smoothstep((xs-args.trim_u0)/.02)[:, None, None].astype(np.float32)
        if args.trim_y:
            wt = wt*(1-smoothstep((Y-args.trim_y[0])/(args.trim_y[1]-args.trim_y[0])))[None, :, None].astype(np.float32)
        # opening of the solid: erode (grow the field) by r voxels, then dilate back; max/min filters via separable sliding windows
        def sliding(a, rr, fn):
            for ax_ in range(3):
                n_ = a.shape[ax_]
                padded = np.pad(a, [(rr, rr) if i == ax_ else (0, 0) for i in range(3)], mode='edge')
                acc = np.take(padded, np.arange(0, n_), axis=ax_)
                for s_ in range(1, 2*rr+1):
                    acc = fn(acc, np.take(padded, np.arange(s_, n_+s_), axis=ax_))
                a = acc
            return a
        eroded = sliding(sub, r, np.maximum)           # solid shrinks
        opened = sliding(eroded, r, np.minimum)        # solid grows back
        field[c0:c1, :, r0:r1] = sub+wt*(np.maximum(sub, opened)-sub)   # only ever removes material (opened >= sub where thin)
        del eroded, opened, sub
    trim_record['radiusVoxels'] = r
    maps = build_maps(field)
    print('pin trim done', flush=True)

# ---------------------------------------------------------------------------------------------- 0b. optional plate clip (round 12)
clip_record = {'applied': args.plate_clip is not None}
if args.plate_clip is not None:
    edge_rows = re.findall(r'^\|\s*([+-]\d*\.\d+)\s*\|\s*(\d*\.\d+)\s*\|\s*\d*\.\d+\s*\|\s*(\d*\.\d+)\s*\|\s*\d*\.\d+\s*\|', spec_text, re.M)
    edge = {}
    for xs_, top_, bot_ in edge_rows:
        edge[round(float(xs_), 2)] = (float(top_), float(bot_))
    TIPS = {1: (.276, .033), -1: (.273, .057)}
    clip_poly = {}
    for side in sides:
        cols = sorted((c for c in edge if (c > 0) == (side > 0) and .10-1e-9 <= abs(c) <= .26+1e-9), key=abs)
        tops = [(abs(c), edge[c][0]) for c in cols]
        bots = [(abs(c), edge[c][1]) for c in cols]
        poly = [(.06, -.05)]+tops+[TIPS[side]]+bots[::-1]+[(.06, .30)]
        clip_poly[side] = np.array(poly)
    for side in sides:
        mp = maps[side]
        c0, c1 = mp['c0'], mp['c1']
        sub = field[c0:c1, :, r0:r1]
        xf_ = np.abs(X[c0:c1])[:, None]/K*np.ones((1, len(SZ)))
        yf_ = (Z0-SZ[None, :])/K*np.ones((c1-c0, 1))
        sdf = polygon_sdf(xf_, yf_, clip_poly[side])                  # figure heights, negative inside
        d_clip = (K*(sdf+args.plate_clip)).astype(np.float32)
        wu = smoothstep((xf_-args.clip_u0[0])/(args.clip_u0[1]-args.clip_u0[0])).astype(np.float32)
        wy = (1-smoothstep((Y-args.clip_y[0])/(args.clip_y[1]-args.clip_y[0]))).astype(np.float32)
        wgt = wu[:, None, :]*wy[None, :, None]
        field[c0:c1, :, r0:r1] = np.clip(sub+wgt*(np.maximum(sub, d_clip[:, None, :])-sub), -BAND, BAND).astype(np.float32)
        del sub, sdf, d_clip, wgt
    clip_record['inset'] = args.plate_clip
    clip_record['polygons'] = {str(k): v.round(4).tolist() for k, v in clip_poly.items()}
    maps = build_maps(field)
    print('plate clip done', flush=True)

if args.tip_wedge:
    for side in sides:
        k_ = 0 if side == 1 else 1
        poly = np.array([(.15, -.10), (args.wedge_u[0], args.wedge_top_y[k_]), (args.wedge_u[1], args.wedge_apex_y[k_]),
                         (args.wedge_u[0], args.wedge_bottom_y[k_]), (.15, .32)])
        mp = maps[side]
        c0, c1 = mp['c0'], mp['c1']
        sub = field[c0:c1, :, r0:r1]
        xf_ = np.abs(X[c0:c1])[:, None]/K*np.ones((1, len(SZ)))
        yf_ = (Z0-SZ[None, :])/K*np.ones((c1-c0, 1))
        d_w = (K*polygon_sdf(xf_, yf_, poly)).astype(np.float32)
        wu = smoothstep((xf_-args.wedge_u[0]+.004)/.012).astype(np.float32)
        field[c0:c1, :, r0:r1] = np.clip(sub+wu[:, None, :]*(np.maximum(sub, d_w[:, None, :])-sub), -BAND, BAND).astype(np.float32)
        del sub, d_w
    clip_record['tipWedge'] = {'u': args.wedge_u, 'apexY': args.wedge_apex_y, 'topY': args.wedge_top_y, 'bottomY': args.wedge_bottom_y}
    maps = build_maps(field)
    print('tip wedge done', flush=True)

# ---------------------------------------------------------------------------------------------- 1. plan morph
plan_record = {'applied': not args.no_plan}
BIGW = 1.0
sm = args.plan_smooth*K/VS
plan_state = {}
for side in sides:
    mp = maps[side]
    c0, c1 = mp['c0'], mp['c1']
    SXs = X[c0:c1]
    xf = SXs[:, None]/K*np.ones((1, len(SZ)))
    yf = (Z0-SZ[None, :])/K*np.ones((len(SXs), 1))
    u = np.abs(xf)
    rear_f, front_f, has = mp['rear_f'], mp['front_f'], mp['has']
    plate_df = np.interp(u, PLAN_U, PLAN_COAT)+args.plate_offset
    slope = (FLOOR_DF[-1]-FLOOR_DF[-2])/(FLOOR_U[-1]-FLOOR_U[-2])
    floor_df = np.where(u > FLOOR_U[-1], FLOOR_DF[-1]+slope*(u-FLOOR_U[-1]), np.interp(u, FLOOR_U, FLOOR_DF))+args.floor_shift
    cup_sdf = polygon_sdf(xf, yf, cup_points[side])
    c = smoothstep((-cup_sdf+.5*args.cup_edge)/args.cup_edge)
    target = K*(plate_df*(1-c)+floor_df*c)+Y0
    target = gauss2d(target, sm)
    rear_s = gauss2d(rear_f, sm*1.5)
    target = np.minimum(target, rear_s-K*args.min_thickness)
    target = gauss2d(target, sm*.6)
    w = smoothstep((u-args.plan_u0)/args.plan_ramp)*(1-smoothstep((yf-args.plan_y_full)/(args.plan_y_end-args.plan_y_full)))
    plan_state[side] = {'target': target, 'w': w, 'c': c, 'xf': xf, 'yf': yf, 'u': u, 'rear_s': rear_s}
    plan_record[str(side)] = {
        'cutMax': float(np.nanmax(np.where((w > .5) & has, target-front_f, np.nan)))/K,
        'fillMax': float(np.nanmax(np.where((w > .5) & has, front_f-target, np.nan)))/K}

if not args.no_plan:
    for side in sides:
        mp, ps = maps[side], plan_state[side]
        c0, c1 = mp['c0'], mp['c1']
        piece = field[c0:c1, :, r0:r1]
        yy = Y[None, :, None]
        target = ps['target'][:, None, :]
        w = ps['w'][:, None, :].astype(np.float32)
        c = ps['c'][:, None, :]
        cutf = np.maximum(piece, target-yy)                                        # old, nothing in front of the target
        back = np.minimum(target+args.fill_depth, ps['rear_s'][:, None, :]-2*VS)
        fill = np.maximum(target-yy, yy-back)                                      # slab behind the target surface
        pit = np.minimum(cutf, np.where(c > .02, fill, BAND))                      # cup pit filled forward to the target
        want = (c*mp['has'][:, None, :]).astype(np.float32)
        wanted = cutf+want*(pit-cutf)
        field[c0:c1, :, r0:r1] = np.clip(piece+w*(wanted-piece), -BAND, BAND).astype(np.float32)
        del piece, cutf, fill, pit, wanted
    print('plan morph done', flush=True)

# maps of the new surface (the rear clip and the skull-front clip use them)
new_maps = build_maps(field)
rear_all = np.zeros((shape[0], len(SZ)), dtype=np.float32)
front_all = np.zeros((shape[0], len(SZ)), dtype=np.float32)
for side in sides:
    rear_all[new_maps[side]['c0']:new_maps[side]['c1']] = new_maps[side]['rear_f']
    front_all[new_maps[side]['c0']:new_maps[side]['c1']] = new_maps[side]['front_f']


def rear_limit(GX, GZ):
    i = np.clip(np.round((GX[:, 0, :]-X[0])/VS).astype(int), 0, shape[0]-1)
    k = np.clip(np.round((GZ[:, 0, :]-SZ[0])/VS).astype(int), 0, len(SZ)-1)
    return rear_all[i, k][:, None, :]


# ---------------------------------------------------------------------------------------------- 2. locks
def rot(v, deg):
    a = math.radians(deg)
    return np.array([v[0]*math.cos(a)-v[1]*math.sin(a), v[0]*math.sin(a)+v[1]*math.cos(a)])


def bezier(p0, p1, p2, p3, t):
    t = t[:, None]
    return (1-t)**3*p0+3*(1-t)**2*t*p1+3*(1-t)*t**2*p2+t**3*p3


def jit(name, k):
    h = (sum((i+1)*(ord(ch)+k*7) for i, ch in enumerate(name))*2654435761) % 1000003
    return (h/1000003)*2-1


def lock_axis(spec, curl, lift, root_extend=0., length_scale=1., depth_shift=0., root_sink=0., tip_trim=0.):
    """Axis samples in head-local space: crest line, plus the per-sample frame inputs."""
    side = spec['side']
    r = np.array(spec['root'], float)
    t_ = np.array(spec['tip'], float)
    d = t_-r
    if args.jitter[0] or args.jitter[1] or args.jitter[2]:
        nm = spec['name']
        d = rot(d*np.array([side, -1.]), args.jitter[0]*jit(nm, 1))*np.array([side, -1.])   # turn in the (outward, up) plane
        d = d*(1+args.jitter[1]*jit(nm, 2))
        curl = curl+args.jitter[2]*jit(nm, 3)
        t_ = r+d
    L0 = float(np.hypot(*d))
    e = d/L0
    if root_extend > 0:
        r = r-e*root_extend
        L0 += root_extend
    L = L0*length_scale
    if tip_trim and abs(t_[0]) > args.trim_from:
        L = max(L-tip_trim/max(abs(e[0]), .45), .75*L)
    t_ = r+e*L
    # figure frame: x across (front +x for L), y DOWN. "up" is -y. Turn the tip tangent toward up by curl (half each way).
    up_sign = -1.
    ang = math.degrees(math.atan2(-e[1], e[0]*side))   # angle above horizontal-outward, positive when pointing up
    c = curl if ang > 5 else 0.
    # rotation in the (outward, up) plane: outward = side*x, up = -y
    def turned(vec, deg):
        o, u_ = vec[0]*side, -vec[1]
        o2, u2 = rot((o, u_), deg)
        return np.array([o2*side, -u2])
    d0 = turned(e, -c*.5)
    d1 = turned(e, +c*.5)
    p0, p3 = r, t_
    p1, p2 = p0+d0*L/3, p3-d1*L/3
    t = np.linspace(0, 1, args.samples)
    xy = bezier(p0, p1, p2, p3, t)
    df = spec['depth_root']+(spec['depth_tip']-spec['depth_root'])*t+depth_shift-lift*smoothstep((t-.25)/.75)
    if root_sink:
        df = df+root_sink*(1-smoothstep(t/.4))
    if args.top_line >= 0:
        # Sheet profile top line (R04 spec): at x_side the highest filled row is y; a crest at row yy must sit at x_side >= xs(yy).
        xs_ = np.interp(xy[:, 1]+args.top_line, [-.01, 0., .003, .008, .009, .019, .025, .04, .06], [.03, .03, .01, 0., -.01, -.02, -.03, -.05, -.07])
        floor_df = xs_-.011
        kk = .004
        df = .5*(df+floor_df+np.sqrt((df-floor_df)**2+kk**2))
    ax = np.array([to_local(x, y, dd) for (x, y), dd in zip(xy, df)])
    return ax, xy, L


def lock_field(ax, spec, wscale, tscale, clip_rear=True, ogive=None, cup_clip=False, tip_min=None, section_p=None):
    ogive = args.ogive if ogive is None else ogive
    tip_min = args.tip_min if tip_min is None else tip_min
    n = len(ax)
    seg = np.diff(ax, axis=0)
    arc = np.r_[0, np.cumsum(np.linalg.norm(seg, axis=1))]
    L = arc[-1]
    tang = np.gradient(ax, axis=0)
    tang /= np.linalg.norm(tang, axis=1)[:, None]
    up = np.array([0., -1., 0.])                      # toward the viewer
    nrm = up[None, :]-(tang@up)[:, None]*tang
    nrm /= np.linalg.norm(nrm, axis=1)[:, None]
    bin_ = np.cross(tang, nrm)
    wm, wr = K*spec['width_mid']*wscale, K*spec['width_root']*wscale
    th = K*spec['thick']*tscale
    hmin, tmin = tip_min[0]*K, tip_min[1]*K

    def point_fade(t):
        # round 12 --tip-point: the tip-min floor fades to zero over the last fraction of the length so the lock ends in a true point
        if not args.tip_point:
            return 1.
        return np.maximum(smoothstep((1-t)/args.tip_point), .22)

    def half_width(t):
        ss = np.clip((t-.4)/.6, 0, 1)
        rise = np.where(t < .4, wr/2+(wm/2-wr/2)*smoothstep(t/.4), wm/2*np.clip(1-ss**ogive[0], 0, 1)**ogive[1])
        return np.maximum(rise, hmin*point_fade(t))

    def height(t):
        h = np.where(t < .4, th*(.75+.25*smoothstep(t/.4)), np.where(t < .9, th*(1-.6*(t-.4)/.5), th*(.4-.25*(t-.9)/.1)))
        return np.maximum(h, tmin*point_fade(t))

    reach = wm/2+th+.03
    low = ax.min(axis=0)-reach
    high = ax.max(axis=0)+reach
    a = np.clip(np.floor(low/VS).astype(int)-lo, 0, np.array(shape)-1)
    z = np.clip(np.ceil(high/VS).astype(int)-lo+1, 0, np.array(shape))
    sl = tuple(slice(int(i), int(j)) for i, j in zip(a, z))
    if any(s.stop <= s.start for s in sl):
        return None
    xs, ys, zs = (np.arange(s.start, s.stop) for s in sl)
    GX, GY, GZ = np.meshgrid((lo[0]+xs)*VS, (lo[1]+ys)*VS, (lo[2]+zs)*VS, indexing='ij')
    P = np.stack([GX, GY, GZ], axis=-1).reshape(-1, 3).astype(np.float32)
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
    crel = cc+h                                     # height above the base plane (crest at h)
    pp = args.section_p if section_p is None else section_p
    e = (np.abs(aa/wh)**pp+(np.maximum(crel, 0)/h)**pp)**(1./pp)
    e = np.sqrt(e**2+(np.maximum(length-L, 0)/np.maximum(wh, hmin*1.5))**2+(np.maximum(-length, 0)/(.02))**2
                +(np.maximum(-crel-args.cap*K*np.clip(wh/(wm/2), 0, 1), 0)/(.02))**2)
    d = (e-1)*np.minimum(wh, h)
    if cup_clip:
        # keep the cup interior free: coat material deeper than --cup-clear inside the cup polygon is removed (smooth distance, no steps)
        q = polygon_sdf(GX[:, 0, :]/K, (Z0-GZ[:, 0, :])/K, cup_points[spec['side']])*K          # head-local units, negative inside
        d = np.maximum(d, np.broadcast_to((-q-args.cup_clear*K)[:, None, :], GX.shape).reshape(-1).astype(np.float32))
    if clip_rear:
        shp = tuple(s_.stop-s_.start for s_ in sl)
        lim = np.broadcast_to(rear_limit(GX, GZ), shp).reshape(-1)-args.rear_margin
        d = np.maximum(d, P[:, 1]-lim)
    return sl, d.reshape(tuple(s.stop-s.start for s in sl)).astype(np.float32)


coat_field = np.full(shape, BAND, dtype=np.float32)
tuft_field = np.full(shape, BAND, dtype=np.float32)
records, tuft_boxes = [], []


def add_to(target_field, sl, d, blend):
    cur = target_field[sl]
    target_field[sl] = np.where(cur >= BAND*.9, np.minimum(cur, d), smin(cur, d, blend)).astype(np.float32)


tuft_specs = {s: [] for s in sides}
for spec in spec_locks:
    if spec['side'] not in sides or spec['name'][2:] in skip:
        continue
    fam = spec['family']
    if fam == 'T':
        if args.no_tuft:
            continue
        tuft_specs[spec['side']].append(spec)
        idx_ = int(spec['name'][2:])
        if args.tuft_fan:
            ang_ = args.tuft_fan*(3-idx_)/2.                    # +fan for T1, -fan for T5 (degrees, toward up)
            side_ = spec['side']
            r_, t_ = np.array(spec['root']), np.array(spec['tip'])
            d_ = t_-r_
            o_, u_ = d_[0]*side_, -d_[1]
            o2, u2 = rot((o_, u_), ang_)
            spec = dict(spec, tip=(r_[0]+o2*side_, r_[1]-u2))
        if args.tuft_aim:
            side_ = spec['side']
            aim_pt = cup_points[side_][4]+np.array([-.02*side_, .012])
            wgt_ = (5-int(spec['name'][2:]))/4.
            spec = dict(spec, tip=tuple(np.array(spec['tip'])+args.tuft_aim*wgt_*(aim_pt-np.array(spec['tip']))))
        ax, xy, L = lock_axis(spec, args.tuft_curl, args.tuft_lift, args.tuft_root_extend, args.tuft_length_scale,
                              args.tuft_depth_shift-args.tuft_stack*(int(spec['name'][2:])-1), args.tuft_root_sink)
        r = lock_field(ax, spec, args.tuft_width_scale, args.tuft_thick_scale, ogive=args.tuft_ogive, tip_min=args.tuft_tip_min, section_p=args.tuft_section_p)
        if r is None:
            continue
        sl, d = r
        add_to(tuft_field, sl, d, args.tuft_blend)
        tuft_boxes.append((sl, d))
        records.append({'name': spec['name'], 'axisRoot': [round(float(v), 4) for v in ax[0]], 'axisTip': [round(float(v), 4) for v in ax[-1]]})
    else:
        if fam not in args.keep:
            continue
        ax, xy, L = lock_axis(spec, args.curl, args.tip_lift, args.coat_root_extend, args.length_scale, tip_trim=args.tip_trim)
        top_edge = spec['tip'][1] < .035 and abs(spec['tip'][0]) > .12
        r = lock_field(ax, spec, args.width_scale*(args.drape_width if spec['dir'] < -20 else 1.)*(args.top_width if top_edge else 1.), args.thick_scale, cup_clip=args.cup_clear >= 0)
        if r is None:
            continue
        sl, d = r
        add_to(coat_field, sl, d, args.lock_blend)
        records.append({'name': spec['name'], 'axisRoot': [round(float(v), 4) for v in ax[0]], 'axisTip': [round(float(v), 4) for v in ax[-1]]})
        if args.fork and fam in args.fork_families and spec['dir'] > -20:
            side_ = spec['side']
            r_, t_ = np.array(spec['root']), np.array(spec['tip'])
            d_ = t_-r_
            len_ = float(np.hypot(*d_))
            mid_ = r_+d_*args.fork_from
            o_, u_ = d_[0]*side_, -d_[1]
            for sign_, tag_ in ((1, 'a'), (-1, 'b')):
                o2, u2 = rot((o_, u_), sign_*args.fork_angle)
                unit_ = np.array([o2*side_, -u2])/len_
                tip_ = mid_+unit_*len_*args.fork_len
                fork = {'name': f'{spec["name"]}{tag_}', 'side': side_, 'family': fam, 'root': tuple(mid_), 'tip': tuple(tip_),
                        'length': len_*args.fork_len, 'width_root': spec['width_mid']*.5, 'width_mid': spec['width_mid']*.62,
                        'thick': spec['thick']*.8, 'dir': spec['dir']+sign_*args.fork_angle,
                        'depth_root': spec['depth_root']+(spec['depth_tip']-spec['depth_root'])*args.fork_from,
                        'depth_tip': spec['depth_tip']+.002}
                ax2, xy2, L2 = lock_axis(fork, args.curl, args.tip_lift, args.coat_root_extend, args.length_scale, tip_trim=args.tip_trim)
                r2 = lock_field(ax2, fork, args.width_scale, args.thick_scale, cup_clip=args.cup_clear >= 0)
                if r2 is None:
                    continue
                add_to(coat_field, r2[0], r2[1], args.lock_blend)
                records.append({'name': fork['name'], 'axisRoot': [round(float(v), 4) for v in ax2[0]], 'axisTip': [round(float(v), 4) for v in ax2[-1]]})

# Optional fluff: in-between tuft locks, shorter, set .004 behind their neighbours and turned a little more.
if args.tuft_fluff > 0 and not args.no_tuft:
    for side in sides:
        ts = sorted(tuft_specs[side], key=lambda s: s['name'])
        for a_, b_ in zip(ts[:-1], ts[1:]):
            for j in range(args.tuft_fluff):
                f = (j+1)/(args.tuft_fluff+1)
                mid = {'name': f'{a_["name"]}f{j}', 'side': side, 'family': 'T',
                       'root': tuple(np.array(a_['root'])*(1-f)+np.array(b_['root'])*f),
                       'tip': tuple(np.array(a_['tip'])*(1-f)+np.array(b_['tip'])*f),
                       'width_root': (a_['width_root']+b_['width_root'])/2, 'width_mid': (a_['width_mid']+b_['width_mid'])*.5*.7,
                       'thick': (a_['thick']+b_['thick'])/2, 'depth_root': (a_['depth_root']+b_['depth_root'])/2+.001,
                       'depth_tip': (a_['depth_tip']+b_['depth_tip'])/2+.001}
                ax, xy, L = lock_axis(mid, args.tuft_curl+8, args.tuft_lift*1.4, args.tuft_root_extend, args.tuft_length_scale*1.0,
                                      args.tuft_depth_shift-args.tuft_stack*(int(a_['name'][2:])-.5), args.tuft_root_sink)
                r = lock_field(ax, mid, args.tuft_width_scale, args.tuft_thick_scale, ogive=args.tuft_ogive, tip_min=args.tuft_tip_min, section_p=args.tuft_section_p)
                if r is None:
                    continue
                sl, d = r
                add_to(tuft_field, sl, d, args.tuft_blend)
                tuft_boxes.append((sl, d))
                records.append({'name': mid['name'], 'axisRoot': [round(float(v), 4) for v in ax[0]], 'axisTip': [round(float(v), 4) for v in ax[-1]]})
print('locks built', len(records), flush=True)

def gauss3d(a, sigma):
    radius = int(math.ceil(3*sigma))
    kernel = np.exp(-.5*(np.arange(-radius, radius+1)/sigma)**2)
    kernel /= kernel.sum()
    for axis in range(3):
        moved = np.moveaxis(a, axis, 0)
        padded = np.pad(moved, [(radius, radius)]+[(0, 0)]*(moved.ndim-1), mode='edge')
        out = np.zeros_like(moved)
        for k, w in enumerate(kernel):
            out += w*padded[k:k+moved.shape[0]]
        a = np.moveaxis(out, 0, axis)
    return a


if args.tuft_blur > 0 and tuft_boxes:
    lo_i = [min(sl[a_].start for sl, _ in tuft_boxes) for a_ in range(3)]
    hi_i = [max(sl[a_].stop for sl, _ in tuft_boxes) for a_ in range(3)]
    reg = tuple(slice(max(0, lo_i[a_]-8), min(shape[a_], hi_i[a_]+8)) for a_ in range(3))
    tuft_field[reg] = gauss3d(tuft_field[reg].astype(np.float32), args.tuft_blur).astype(np.float32)
    print('tuft blurred', args.tuft_blur, flush=True)

combined = np.minimum(smin(field, coat_field, args.blend), BAND) if args.keep else field
del coat_field
if not args.no_tuft:
    combined = np.minimum(smin(combined, tuft_field, args.tuft_blend), BAND)
combined = combined.astype(np.float32)
del tuft_field, field

out_grid = vdb.FloatGrid()
out_grid.background = BAND
out_grid.copyFromArray(combined, ijk=(0, 0, 0))
vertices, tri_out, quads = out_grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
vertices = (vertices.astype(np.float64)+lo)*VS
faces = [tuple(t) for t in tri_out.tolist()]+[tuple(q) for q in quads.tolist()]
materials = list(head.data.materials)
mesh = bpy.data.meshes.new('Head skin with the R03 lock system')
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
for mat in materials:
    mesh.materials.append(mat)
pale = material('Pale inner-ear coat', args.pale_gray)
mesh.materials.append(pale)
pale_index = len(mesh.materials)-1
for polygon in mesh.polygons:
    polygon.use_smooth = True
inverse = M.inverted()
for vertex in mesh.vertices:
    vertex.co = inverse@vertex.co
bpy.data.meshes.remove(old)
removed_flecks = remove_voxel_specks(head, max_extent=6*VS)


def remove_floating_pieces(obj, min_vertices):
    bmx = bmesh.new()
    bmx.from_mesh(obj.data)
    unseen, dropped = set(bmx.verts), []
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
        if len(group) < min_vertices:
            dropped.append({'vertices': len(group)})
            bmesh.ops.delete(bmx, geom=list(group), context='VERTS')
    bmx.to_mesh(obj.data)
    bmx.free()
    return dropped


removed_pieces = remove_floating_pieces(head, 20000)

# Pale material: faces whose centre lies on a tuft lock's surface.
pale_count = 0
if tuft_boxes:
    count = len(head.data.polygons)
    centers = np.empty(count*3, dtype=np.float32)
    head.data.polygons.foreach_get('center', centers)
    centers = centers.reshape(-1, 3).astype(np.float64)
    world = centers@np.array(M)[:3, :3].T+np.array(M)[:3, 3]
    index = np.round(world/VS).astype(int)-lo   # nearest voxel, only to find each tuft box's faces
    marked = np.zeros(count, dtype=bool)
    for sl, val in tuft_boxes:
        inside = np.ones(count, dtype=bool)
        for ax_ in range(3):
            inside &= (index[:, ax_] >= sl[ax_].start) & (index[:, ax_] < sl[ax_].stop)
        ids = np.nonzero(inside)[0]
        if not len(ids):
            continue
        # trilinear sample of the tuft lock's own field at the face centres: a smooth contour instead of a voxel staircase
        fidx = world[ids]/VS-lo-np.array([sl[0].start, sl[1].start, sl[2].start])
        i0 = np.clip(np.floor(fidx).astype(int), 0, np.array(val.shape)-2)
        fr = np.clip(fidx-i0, 0, 1)
        v = np.zeros(len(ids))
        for dx in (0, 1):
            for dy in (0, 1):
                for dz in (0, 1):
                    wgt = (fr[:, 0] if dx else 1-fr[:, 0])*(fr[:, 1] if dy else 1-fr[:, 1])*(fr[:, 2] if dz else 1-fr[:, 2])
                    v += wgt*val[i0[:, 0]+dx, i0[:, 1]+dy, i0[:, 2]+dz]
        marked[ids[v <= args.pale_tol]] = True
    if args.pale_cup_margin is not None:
        xf_c = world[:, 0]/K
        zf_c = (Z0-world[:, 2])/K
        for side_c in (1, -1):
            sel = (xf_c > 0) if side_c == 1 else (xf_c < 0)
            sdf_c = polygon_sdf(xf_c[sel], zf_c[sel], cup_points[side_c])
            idx_c = np.nonzero(sel)[0]
            marked[idx_c[sdf_c > args.pale_cup_margin]] = False
    # Smooth the staircase boundary: majority vote over edge-adjacent faces.
    if args.pale_smooth > 0:
        mesh_ = head.data
        loop_total = np.empty(count, dtype=np.int32)
        mesh_.polygons.foreach_get('loop_total', loop_total)
        edge_index = np.empty(len(mesh_.loops), dtype=np.int32)
        mesh_.loops.foreach_get('edge_index', edge_index)
        face_of = np.repeat(np.arange(count), loop_total)
        order = np.argsort(edge_index, kind='stable')
        ei_s, fl_s = edge_index[order], face_of[order]
        same = ei_s[1:] == ei_s[:-1]
        fa, fb = fl_s[:-1][same], fl_s[1:][same]
        deg = np.bincount(fa, minlength=count)+np.bincount(fb, minlength=count)
        for _ in range(args.pale_smooth):
            near = np.bincount(fa, weights=marked[fb], minlength=count)+np.bincount(fb, weights=marked[fa], minlength=count)
            marked = np.where(near*2 > deg, True, np.where(near*2 < deg, False, marked))
    mats = np.zeros(count, dtype=np.int32)
    head.data.polygons.foreach_get('material_index', mats)
    mats[marked] = pale_index
    head.data.polygons.foreach_set('material_index', mats)
    head.data.update()
    pale_count = int(marked.sum())
require_single_closed_mesh(head, args.out, 'Head skin with the R03 lock system')
after = mesh_stats(head)
top_after = float(max((M@v.co).z for v in head.data.vertices))
top_before = float(points[:, 2].max())

bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
summary = {
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene), 'specSha256': sha(args.spec),
    'scope': 'R03 ear fan front: plan morph (cut the rolled lip, fill the cup pit), 24 coat locks and 5 tuft locks per side as swept half-ellipse locks, pale tuft material',
    'parameters': {k: (str(v) if isinstance(v, Path) else v) for k, v in vars(args).items() if k not in ('scene', 'out')},
    'plan': plan_record, 'trim': trim_record, 'plateClip': clip_record, 'skinTopZ': {'before': top_before, 'after': top_after},
    'lockCount': len(records), 'paleFaces': pale_count, 'paleMaterialIndex': pale_index, 'locks': records,
    'removedFlecks': removed_flecks, 'removedFloatingPieces': removed_pieces, 'skinBefore': before, 'skinAfter': after,
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']},
}
(args.out/'fan-front-lock-system.json').write_text(json.dumps(summary, indent=2)+'\n')
print('lock system ok', json.dumps({'before': before, 'after': after, 'locks': len(records), 'paleFaces': pale_count}))
