"""Author directional coat locks on the front of the Akinza ear fan, in field space.

Run with Blender: -b --factory-startup --python author_fan_locks_field.py --
  --scene <head.blend> --out <new-dir> [options]

The simplified fan (simplify_fan_field.py) is calm but reads as rounded lumps; the preferred first
sheet shows tapered locks that radiate from the ear root and end in points, with the upper outline
rising toward the outer tips. This stage adds those locks to the closed head skin as distance-field
leaves and meshes the union once:

  1. The skin becomes an OpenVDB level set. The front surface of the fan (the first solid met from
     the front, per (x, z) column, sub-voxel accurate) is read as the floor the locks lie on, and
     the fan's front outline as a mask.
  2. Rim locks: one per station along the upper outline, each rooted on the fan front face and
     pointing up and out so its tip stands beyond the old outline. The tip heights follow a rising
     line, so the outline gets the upward V tilt of the reference. Tips stay inside the old span.
  3. Row locks: rings around the ear root at increasing radius, spaced by arc length, flowing
     outward (tilted up), overlapping like shingles. Roots inside the cupped inner-ear outline
     (plus a clearance) are skipped so the cup keeps a clean bowl.
  4. Optionally (--cup-clean), a blur inside the cup outline removes the remaining lumps.
  5. The locks join the skin with a small smooth union, the field is meshed once, and the skin must
     remain one closed connected solid.

Eyes, lids, nose and mouth are separate objects and do not move. Akinza-specific. Every parameter
and every lock is recorded in fan-locks.json.
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
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, remove_voxel_specks, require_single_closed_mesh, sha
from study_provenance import snapshot

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--voxel', type=float, default=.0025)
parser.add_argument('--seed', type=int, default=11)
parser.add_argument('--root', type=float, nargs=2, default=[.31, -.03], help='ear root (x, z), head-local')
parser.add_argument('--root-blend', type=float, default=.008)
# Tilt: a smooth monotone shear that raises the outer fan (upward V), before the locks are laid.
parser.add_argument('--tilt', type=float, default=0., help='height gained by the outermost fan, head-local (0 = off)')
parser.add_argument('--tilt-x0', type=float, default=.40)
parser.add_argument('--tilt-x1', type=float, default=.95)
parser.add_argument('--tilt-low', type=float, default=.55, help='share of the tilt kept at the fan lower edge')
parser.add_argument('--tilt-z0', type=float, default=.05)
parser.add_argument('--tilt-z1', type=float, default=.40)
# Sink: the upper fan (roof) between the skull and the outer tips settles down, so the outer tips are the
# highest part without the figure growing taller (the loop's width rows are fractions of figure height).
parser.add_argument('--sink', type=float, default=0., help='depth the upper fan sinks at its mid span, head-local')
parser.add_argument('--sink-x', type=float, nargs=4, default=[.35, .55, .65, .90], help='ramp in, full, ramp out start, out end')
parser.add_argument('--sink-z0', type=float, default=.20, help='sinking starts above this height')
parser.add_argument('--sink-zw', type=float, default=.25)
parser.add_argument('--rim-cap', type=float, default=None, help='no rim tip rises above this height')
parser.add_argument('--lock-cap', type=float, default=None, help='same cap for the row and edge locks (default off)')
# Rim locks: stations along the upper outline.
parser.add_argument('--rim-x', type=float, nargs='+', default=[.52, .60, .68, .76, .84, .92])
parser.add_argument('--rim-ext0', type=float, default=.05, help='how far a rim tip stands above the outline, inner station')
parser.add_argument('--rim-ext1', type=float, default=.07, help='same, outer station')
parser.add_argument('--rim-down', type=float, default=.09, help='root depth below the outline')
parser.add_argument('--rim-angle0', type=float, default=72., help='degrees above +x at the innermost station')
parser.add_argument('--rim-angle1', type=float, default=52., help='degrees above +x at the outermost station')
parser.add_argument('--rim-width', type=float, default=.058, help='half width')
parser.add_argument('--rim-thickness', type=float, default=.02)
parser.add_argument('--rim-lift', type=float, default=.012)
parser.add_argument('--rim-layers', type=int, default=2)
parser.add_argument('--rim-layer-shift', type=float, default=.5)
parser.add_argument('--rim-layer-drop', type=float, default=.08)
# Row locks: rings around the ear root.
parser.add_argument('--rings', type=float, nargs='*', default=[.36, .52, .68])
parser.add_argument('--ring-spacing', type=float, default=.125)
parser.add_argument('--ring-length', type=float, default=.20)
parser.add_argument('--ring-width', type=float, default=.056)
parser.add_argument('--ring-thickness', type=float, default=.02)
parser.add_argument('--ring-lift', type=float, default=.014)
parser.add_argument('--ring-up', type=float, default=.25, help='blend of straight up into the radial flow')
parser.add_argument('--ring-angle-min', type=float, default=14.)
parser.add_argument('--ring-angle-max', type=float, default=100.)
parser.add_argument('--cup-clear', type=float, default=.025)
parser.add_argument('--ring-tip-slack', type=float, default=0., help='a row lock tip may stand this far beyond the fan outline (0 = tips stay inside)')
# Edge locks: a fringe along the outer and lower outline of the fan front, pointing outward and slightly down.
parser.add_argument('--edge-spacing', type=float, default=0., help='arc spacing of edge locks along the fan outline (0 = off)')
parser.add_argument('--edge-rows', type=int, default=1)
parser.add_argument('--edge-inset', type=float, default=.13, help='root distance inside the outline, first row')
parser.add_argument('--edge-row-step', type=float, default=.11, help='extra inset for each further row')
parser.add_argument('--edge-out', type=float, default=.01, help='how far an edge lock tip stands beyond the outline')
parser.add_argument('--edge-width', type=float, default=.05, help='half width')
parser.add_argument('--edge-thickness', type=float, default=.018)
parser.add_argument('--edge-lift', type=float, default=.02)
parser.add_argument('--edge-down', type=float, default=.15, help='downward blend of the outward direction')
parser.add_argument('--edge-radial', type=float, default=.35, help='blend of the flow away from the ear root into the outline normal')
parser.add_argument('--edge-center', type=float, nargs=2, default=[.70, .15], help='point inside the fan (x, z) the outline is traced around')
parser.add_argument('--edge-max-facing', type=float, default=1.0, help='skip an edge lock whose direction leaves the floor by more than this share of its length (1 = keep all)')
parser.add_argument('--edge-x-min', type=float, default=.50)
parser.add_argument('--edge-nz-max', type=float, default=.45, help='skip outline points whose outward normal points more upward than this (the rim locks cover them)')
parser.add_argument('--wall-blur', type=float, default=0., help='blur sigma in voxels on the fan wall front before the locks (0 = off)')
parser.add_argument('--wall-z', type=float, nargs=2, default=[-.10, .40])
parser.add_argument('--wall-y-max', type=float, default=.11)
parser.add_argument('--no-rows', action='store_true')
parser.add_argument('--no-rim', action='store_true')
parser.add_argument('--cup-clean', type=float, default=0., help='blur sigma in voxels inside the cup outline (0 = off)')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene])

bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
head = max(meshes, key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before fan locks')
before = mesh_stats(head)

def smoothstep0(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


tilt_record = {'applied': args.tilt > 0 or args.sink > 0}
if args.tilt > 0 or args.sink > 0:
    Mw = np.array(head.matrix_world)
    inv = np.array(head.matrix_world.inverted())
    count = len(head.data.vertices)
    flat = np.empty(count*3, dtype=np.float32)
    head.data.vertices.foreach_get('co', flat)
    world = flat.reshape(-1, 3).astype(np.float64)@Mw[:3, :3].T+Mw[:3, 3]
    ax = np.abs(world[:, 0])
    lift = args.tilt*smoothstep0((ax-args.tilt_x0)/(args.tilt_x1-args.tilt_x0))
    lift *= args.tilt_low+(1-args.tilt_low)*smoothstep0((world[:, 2]-args.tilt_z0)/(args.tilt_z1-args.tilt_z0))
    if args.sink > 0:
        x0, x1, x2, x3 = args.sink_x
        bump = smoothstep0((ax-x0)/(x1-x0))*(1-smoothstep0((ax-x2)/(x3-x2)))
        lift = lift-args.sink*bump*smoothstep0((world[:, 2]-args.sink_z0)/args.sink_zw)
    world[:, 2] += lift
    head.data.vertices.foreach_set('co', (world@inv[:3, :3].T+inv[:3, 3]).astype(np.float32).ravel())
    head.data.update()
    tilt_record['maximumShift'] = float(lift.max())
    tilt_record['minimumShift'] = float(lift.min())
    require_single_closed_mesh(head, args.out, 'Head skin after fan tilt')

VS = args.voxel
M = head.matrix_world.copy()
points = np.array([M@v.co for v in head.data.vertices], dtype=np.float32)
head.data.calc_loop_triangles()
tris = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
head.data.loop_triangles.foreach_get('vertices', tris)
tris = tris.reshape(-1, 3)
old_tree = BVHTree.FromPolygons([tuple(p) for p in points], tris.tolist())
HALF = 16
grid = vdb.FloatGrid.createLevelSetFromPolygons(points, triangles=tris,
                                                transform=vdb.createLinearTransform(voxelSize=VS), halfWidth=HALF)
BAND = HALF*VS
lo = np.floor(points.min(axis=0)/VS).astype(int)-30
hi = np.ceil(points.max(axis=0)/VS).astype(int)+30
hi[2] += int(round(.16/VS))  # room for tips that rise above the old outline
shape = tuple(int(v) for v in hi-lo+1)
field = np.empty(shape, dtype=np.float32)
grid.copyToArray(field, ijk=tuple(int(v) for v in lo))
X, Y, Z = [(lo[i]+np.arange(shape[i]))*VS for i in range(3)]


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def blur3(a, sigma_voxels):
    radius = int(math.ceil(3*sigma_voxels))
    weights = np.exp(-.5*(np.arange(-radius, radius+1)/sigma_voxels)**2)
    weights /= weights.sum()
    for axis in range(3):
        moved = np.moveaxis(a, axis, 0)
        padded = np.pad(moved, [(radius, radius)]+[(0, 0)]*2, mode='edge')
        out = np.zeros_like(moved)
        for k, w in enumerate(weights):
            out += w*padded[k:k+moved.shape[0]]
        a = np.moveaxis(out, 0, axis)
    return np.ascontiguousarray(a)


# The cupped inner-ear outline used by the earlier front-of-fan stage (head-local, right side).
CUP = np.array([(.309, -.014), (.528, .164), (.647, .345), (.50, .275), (.309, .24)])


def polygon_sdf(px, pz):
    d = np.full(np.shape(px), 1e9)
    n = len(CUP)
    px = np.asarray(px, dtype=float)
    pz = np.asarray(pz, dtype=float)
    inside = np.zeros(px.shape, dtype=bool)
    for i in range(n):
        a, b = CUP[i], CUP[(i+1) % n]
        e = b-a
        w = np.stack([px-a[0], pz-a[1]], axis=-1)
        h = np.clip((w@e)/(e@e), 0, 1)
        d = np.minimum(d, np.linalg.norm(w-h[..., None]*e, axis=-1))
        cond = ((a[1] > pz) != (b[1] > pz))
        xint = a[0]+(pz-a[1])*(b[0]-a[0])/np.where(b[1] != a[1], b[1]-a[1], 1)
        inside ^= cond & (px < xint)
    return np.where(inside, -d, d)


# 1. The floor: the front surface of the fan, first solid met from the front (-y), per (x, z) column.
cols = np.where((X > .25) & (X < 1.08))[0]
rows = np.where((Z > -.20) & (Z < .72))[0]
c0, c1, r0, r1 = cols[0], cols[-1]+1, rows[0], rows[-1]+1
sub = field[c0:c1, :, r0:r1]
solid = sub < 0
has = solid.any(axis=1)
first = np.argmax(solid, axis=1)
first = np.clip(first, 1, len(Y)-1)
f_out = np.take_along_axis(sub, (first-1)[:, None, :], axis=1)[:, 0, :]
f_in = np.take_along_axis(sub, first[:, None, :], axis=1)[:, 0, :]
t_cross = np.clip(f_out/np.where(f_out != f_in, f_out-f_in, 1), 0, 1)
floor_sub = np.where(has, Y[first-1]+t_cross*(Y[first]-Y[first-1]), np.nan)
del solid, f_out, f_in
SX, SZ = X[c0:c1], Z[r0:r1]
# Fill columns with no solid from the nearest valid one (iterated neighbor propagation), then smooth for gradients.
floor_filled = np.where(has, floor_sub, 0.0).astype(np.float64)
known = has.copy()
for _ in range(400):
    if known.all():
        break
    grown_sum = np.zeros_like(floor_filled)
    grown_cnt = np.zeros(floor_filled.shape)
    for axis in (0, 1):
        for shift in (1, -1):
            v = np.roll(np.where(known, floor_filled, 0.0), shift, axis=axis)
            c = np.roll(known.astype(float), shift, axis=axis)
            grown_sum += v
            grown_cnt += c
    fresh = (~known) & (grown_cnt > 0)
    floor_filled = np.where(fresh, grown_sum/np.maximum(grown_cnt, 1), floor_filled)
    known = known | fresh


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


floor_smooth = gauss2d(floor_filled, .012/VS)
gxs = np.gradient(floor_smooth, VS, axis=0)
gzs = np.gradient(floor_smooth, VS, axis=1)
# Distance inside the outline (erosion count, capped), for tip and root tests.
depth_in = np.zeros(has.shape)
eroded = has.copy()
for _ in range(40):
    if not eroded.any():
        break
    depth_in += eroded
    e = eroded.copy()
    e[1:] &= eroded[:-1]
    e[:-1] &= eroded[1:]
    e[:, 1:] &= eroded[:, :-1]
    e[:, :-1] &= eroded[:, 1:]
    eroded = e
depth_in = depth_in*VS


def at(arr, x, z):
    i = int(np.clip(round((abs(x)-SX[0])/VS), 0, len(SX)-1))
    k = int(np.clip(round((z-SZ[0])/VS), 0, len(SZ)-1))
    return float(arr[i, k])


# The top edge of the fan per column, from the outline.
top_z = np.full(len(SX), np.nan)
for i in range(len(SX)):
    ks = np.where(has[i])[0]
    if len(ks):
        top_z[i] = SZ[ks[-1]]


def z_top(x):
    i = int(np.clip(round((abs(x)-SX[0])/VS), 0, len(SX)-1))
    w = int(.02/VS)
    seg = top_z[max(i-w, 0):i+w+1]
    return float(np.nanmedian(seg)) if np.isfinite(seg).any() else float(np.nan)


# 2-3. Author the locks (right side; mirrored to the left).
rng = np.random.default_rng(args.seed)
rx, rz = args.root
locks, skipped = [], {'insideCup': 0, 'outsideOutline': 0, 'tipOutside': 0}


def add_lock(kind, x, z, direction2, length, width, thickness, lift):
    """direction2 is the in-plane (x, z) direction; the lock is projected onto the floor's tangent plane."""
    y = at(floor_filled, x, z)
    slope = np.array([at(gxs, x, z), -1.0, at(gzs, x, z)])
    slope[0] = np.clip(slope[0], -1.2, 1.2)
    slope[2] = np.clip(slope[2], -1.2, 1.2)
    normal = slope/np.linalg.norm(slope)
    d = np.array([direction2[0], 0.0, direction2[1]])
    d = d-normal*d.dot(normal)
    d /= np.linalg.norm(d)
    if kind.startswith('rim') and args.rim_cap is not None and d[2] > 1e-6:
        # Cap the real tip (after projection onto the floor's tangent plane and the lift), not the nominal one.
        reach = (args.rim_cap-z-normal[2]*lift)/d[2]
        length = min(length, max(reach, .05))
    if not kind.startswith('rim') and args.lock_cap is not None and d[2] > 1e-6:
        reach = (args.lock_cap-z-normal[2]*lift)/d[2]
        length = min(length, max(reach, .05))
    locks.append({'kind': kind, 'root': [x, y, z], 'normal': normal.tolist(), 'direction': d.tolist(),
                  'length': float(length), 'width': float(width), 'thickness': float(thickness), 'lift': float(lift)})


if not args.no_rim:
    xs = np.array(args.rim_x)
    step_x = float(np.mean(np.diff(xs))) if len(xs) > 1 else .1
    for layer in range(args.rim_layers):
        for k, x_tip in enumerate(xs):
            s = k/max(len(xs)-1, 1)
            x_here = x_tip+(args.rim_layer_shift*step_x if layer else 0.)
            top = z_top(x_here)
            ext = args.rim_ext0+s*(args.rim_ext1-args.rim_ext0)-args.rim_layer_drop*layer
            z_tip = top+ext
            if args.rim_cap is not None:
                z_tip = min(z_tip, args.rim_cap)
            root_z = top-args.rim_down-.03*layer
            angle = math.radians(args.rim_angle0+s*(args.rim_angle1-args.rim_angle0))
            dz = max(z_tip-root_z, .06)
            dx = dz/math.tan(angle)
            root = np.array([x_here-dx, root_z])
            length = float(math.hypot(dx, dz))*rng.uniform(.97, 1.05)
            d2 = np.array([dx, dz])/math.hypot(dx, dz)
            add_lock('rim%d' % layer, float(root[0]), float(root[1]), d2, length,
                     args.rim_width*rng.uniform(.95, 1.08)*(1-.12*layer), args.rim_thickness, args.rim_lift)

if not args.no_rows and args.rings:
    for r in args.rings:
        # Sweep the angle at this radius; place a lock every ring_spacing of arc.
        step = args.ring_spacing/r
        theta = math.radians(args.ring_angle_min)+rng.uniform(0, .5)*step
        while theta < math.radians(args.ring_angle_max):
            jitter = rng.uniform(-.15, .15)*step
            th = theta+jitter
            px = rx+r*math.cos(th)
            pz = rz+r*math.sin(th)
            theta += step
            if polygon_sdf(np.array([px]), np.array([pz]))[0] < args.cup_clear:
                skipped['insideCup'] += 1
                continue
            if at(depth_in, px, pz) < .02:
                skipped['outsideOutline'] += 1
                skipped.setdefault('outsideAt', []).append([round(px, 3), round(pz, 3), round(at(depth_in, px, pz), 3)])
                continue
            radial = np.array([math.cos(th), math.sin(th)])
            d2 = radial*(1-args.ring_up)+np.array([0, 1.])*args.ring_up
            d2 /= np.linalg.norm(d2)
            length = args.ring_length*rng.uniform(.92, 1.08)
            tip2 = np.array([px, pz])+d2*length
            probe = tip2-d2*args.ring_tip_slack
            if at(depth_in, probe[0], probe[1]) <= 0 or polygon_sdf(np.array([tip2[0]]), np.array([tip2[1]]))[0] < 0:
                skipped['tipOutside'] += 1
                continue
            add_lock('row', px, pz, d2, length, args.ring_width*rng.uniform(.92, 1.1),
                     args.ring_thickness, args.ring_lift)

edge_record = {'applied': args.edge_spacing > 0, 'placed': 0, 'skipped': {'insideCup': 0, 'tooShallow': 0}}
if args.edge_spacing > 0:
    cx, cz = args.edge_center
    hm = gauss2d(has.astype(np.float64), .012/VS)
    hgx = np.gradient(hm, VS, axis=0)
    hgz = np.gradient(hm, VS, axis=1)
    outline = []
    for phi in np.arange(-180., 180., .25):
        cs, sn = math.cos(math.radians(phi)), math.sin(math.radians(phi))
        rs = np.arange(0., 1.2, VS)
        ii = np.clip(np.round((np.abs(cx+rs*cs)-SX[0])/VS).astype(int), 0, len(SX)-1)
        kk = np.clip(np.round((cz+rs*sn-SZ[0])/VS).astype(int), 0, len(SZ)-1)
        inside_ray = has[ii, kk]
        leave = np.where(~inside_ray)[0]
        if not len(leave) or leave[0] == 0:
            continue
        rb = rs[leave[0]]
        outline.append((cx+rb*cs, cz+rb*sn))
    outline = np.array(outline)
    # Arc-length sampling along the traced outline (a closed curve; only the lower and outer part is kept below).
    seg = np.r_[0., np.cumsum(np.hypot(*np.diff(outline, axis=0).T))]
    for row in range(args.edge_rows):
        inset = args.edge_inset+row*args.edge_row_step
        marks = np.arange(args.edge_spacing*(.5 if row == 0 else 1.0), seg[-1], args.edge_spacing)
        for m in marks:
            P = np.array([np.interp(m, seg, outline[:, 0]), np.interp(m, seg, outline[:, 1])])
            if P[0] < args.edge_x_min:
                continue
            N = -np.array([at(hgx, P[0], P[1]), at(hgz, P[0], P[1])])
            if np.linalg.norm(N) < 1e-9:
                continue
            N /= np.linalg.norm(N)
            if N[1] > args.edge_nz_max:
                continue
            rad = P-np.array([rx, rz])
            rad /= np.linalg.norm(rad)
            d2 = N*(1-args.edge_radial)+rad*args.edge_radial+np.array([0., -args.edge_down])
            d2 /= np.linalg.norm(d2)
            root = P-N*inset
            if polygon_sdf(np.array([root[0]]), np.array([root[1]]))[0] < args.cup_clear:
                edge_record['skipped']['insideCup'] += 1
                continue
            if at(depth_in, root[0], root[1]) < .02:
                edge_record['skipped']['tooShallow'] += 1
                continue
            fn = np.array([at(gxs, root[0], root[1]), -1.0, at(gzs, root[0], root[1])])
            fn[0] = np.clip(fn[0], -1.2, 1.2)
            fn[2] = np.clip(fn[2], -1.2, 1.2)
            fn /= np.linalg.norm(fn)
            facing = abs(float(np.array([d2[0], 0., d2[1]])@fn))
            if facing > args.edge_max_facing:
                edge_record['skipped']['leavesFloor'] = edge_record['skipped'].get('leavesFloor', 0)+1
                continue
            length = (inset+args.edge_out)/max(float(d2@N), .55)*rng.uniform(.95, 1.05)
            add_lock('edge%d' % row, float(root[0]), float(root[1]), d2, length,
                     args.edge_width*rng.uniform(.92, 1.08)*(1-.1*row), args.edge_thickness, args.edge_lift)
            edge_record['placed'] += 1
    edge_record['outlinePoints'] = int(len(outline))

# 4. Lock field for both sides.
lock_field = np.full(shape, BAND, dtype=np.float32)
for lock in locks:
    for side in (1, -1):
        r = np.array(lock['root'], dtype=float)
        n = np.array(lock['normal'], dtype=float)
        d = np.array(lock['direction'], dtype=float)
        if side < 0:
            r[0] = -r[0]
            n[0] = -n[0]
            d[0] = -d[0]
        b = np.cross(d, n)
        L, W, T, lift = lock['length'], lock['width'], lock['thickness'], lock['lift']
        tip = r+d*L+n*lift
        reach = W+.03
        low = np.minimum(r, tip)-reach
        high = np.maximum(r, tip)+reach
        a = np.clip(np.floor(low/VS).astype(int)-lo, 0, np.array(shape)-1)
        z = np.clip(np.ceil(high/VS).astype(int)-lo+1, 0, np.array(shape))
        sl = tuple(slice(int(i), int(j)) for i, j in zip(a, z))
        grids = [(lo[i]+np.arange(s.start, s.stop))*VS for i, s in enumerate(sl)]
        GX, GY, GZ = np.meshgrid(*grids, indexing='ij')
        qx, qy, qz = GX-r[0], GY-r[1], GZ-r[2]
        u = qx*d[0]+qy*d[1]+qz*d[2]
        v = qx*n[0]+qy*n[1]+qz*n[2]
        w = qx*b[0]+qy*b[1]+qz*b[2]
        tt = np.clip(u/L, 0, 1)
        vv = v-lift*tt*tt
        # A tapered lock: narrow at the root, widest about a third of the way, a sharp tip; flat to the surface.
        omega = W*np.sin(np.pi*tt**.6)**1.1+.003
        tau = T*(1-.6*tt)+.003
        ell = np.sqrt((w/omega)**2+(vv/tau)**2)
        value = (ell-1)*np.minimum(omega, tau)
        along = np.abs(u-np.clip(u, 0, L))
        value = np.where((value < 0) & (along == 0), value, np.hypot(np.maximum(value, 0), along))
        lock_field[sl] = np.minimum(lock_field[sl], value.astype(np.float32))

shaped = field
if args.wall_blur > 0:
    for side in (1, -1):
        cols_s = np.where((np.sign(X) == side) & (np.abs(X) > .27) & (np.abs(X) < 1.05))[0]
        rows_s = np.where((Y > -.36) & (Y < .30))[0]
        planes = np.where((Z > args.wall_z[0]-.08) & (Z < args.wall_z[1]+.08))[0]
        a0, a1, b0, b1, p0, p1 = cols_s[0], cols_s[-1]+1, rows_s[0], rows_s[-1]+1, planes[0], planes[-1]+1
        piece = np.ascontiguousarray(shaped[a0:a1, b0:b1, p0:p1])
        wx = smoothstep((np.abs(X[a0:a1])-.30)/.05)
        wz = smoothstep((Z[p0:p1]-args.wall_z[0])/.05)*(1-smoothstep((Z[p0:p1]-args.wall_z[1])/.05))
        wy = 1-smoothstep((Y[b0:b1]-args.wall_y_max)/.04)
        weight = (wx[:, None, None]*wy[None, :, None]*wz[None, None, :]).astype(np.float32)
        shaped[a0:a1, b0:b1, p0:p1] = piece+weight*(blur3(piece, args.wall_blur)-piece)
        del piece, weight
if args.cup_clean > 0:
    for side in (1, -1):
        cols_s = np.where((np.sign(X) == side) & (np.abs(X) > .27) & (np.abs(X) < .72))[0]
        rows_s = np.where((Y > -.36) & (Y < .30))[0]
        planes = np.where((Z > -.07) & (Z < .40))[0]
        a0, a1, b0, b1, p0, p1 = cols_s[0], cols_s[-1]+1, rows_s[0], rows_s[-1]+1, planes[0], planes[-1]+1
        piece = np.ascontiguousarray(shaped[a0:a1, b0:b1, p0:p1])
        gridx, gridz = np.meshgrid(np.abs(X[a0:a1]), Z[p0:p1], indexing='ij')
        inside = smoothstep(-(polygon_sdf(gridx, gridz)+.01)/.02).astype(np.float32)
        near_front = 1-smoothstep((Y[b0:b1][None, :, None]-.09)/.04)
        weight = (inside[:, None, :]*near_front).astype(np.float32)
        shaped[a0:a1, b0:b1, p0:p1] = piece+weight*(blur3(piece, args.cup_clean)-piece)
        del piece, weight

combined = np.minimum(smin(shaped, lock_field, args.root_blend), BAND).astype(np.float32)
del lock_field, shaped

out_grid = vdb.FloatGrid()
out_grid.background = BAND
out_grid.copyFromArray(combined, ijk=(0, 0, 0))
vertices, tri_out, quads = out_grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
vertices = (vertices.astype(np.float64)+lo)*VS
faces = [tuple(t) for t in tri_out.tolist()]+[tuple(q) for q in quads.tolist()]
materials = list(head.data.materials)
mesh = bpy.data.meshes.new('Head skin with fan locks')
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
for polygon in mesh.polygons:
    polygon.use_smooth = True
inverse = M.inverted()
for vertex in mesh.vertices:
    vertex.co = inverse@vertex.co
bpy.data.meshes.remove(old)
removed_flecks = remove_voxel_specks(head, max_extent=6*VS)


def remove_floating_pieces(obj, min_vertices):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    unseen, dropped = set(bm.verts), []
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
            bmesh.ops.delete(bm, geom=list(group), context='VERTS')
    bm.to_mesh(obj.data)
    bm.free()
    return dropped


removed_pieces = remove_floating_pieces(head, 20000)
require_single_closed_mesh(head, args.out, 'Head skin with fan locks')
after = mesh_stats(head)

rng2 = np.random.default_rng(1)
sample = rng2.choice(len(mesh.vertices), size=min(60000, len(mesh.vertices)), replace=False)
outside, inside = [], []
for index in sample:
    co = M@mesh.vertices[int(index)].co
    _, _, _, distance = old_tree.find_nearest(co)
    (inside if (abs(co.x) > .30 and co.z > -.12) else outside).append(distance)
outside, inside = np.array(outside), np.array(inside)
top_after = float(max((M@v.co).z for v in mesh.vertices))
top_before = float(points[:, 2].max())

bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
summary = {
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Ear fan front: directional rim and row locks joined by a smooth union; face objects preserved',
    'parameters': {k: (str(v) if isinstance(v, Path) else v) for k, v in vars(args).items() if k not in ('scene', 'out')},
    'tilt': tilt_record, 'skinTopZ': {'before': top_before, 'after': top_after}, 'edge': edge_record, 'lockCount': len(locks), 'lockSkipped': skipped, 'locks': locks,
    'removedFlecks': removed_flecks, 'removedFloatingPieces': removed_pieces, 'skinBefore': before, 'skinAfter': after,
    'deviationOutsideFanWindow': {'samples': int(len(outside)), 'maximum': float(outside.max()) if len(outside) else None,
                                  'p99': float(np.percentile(outside, 99)) if len(outside) else None},
    'deviationInsideFanWindow': {'samples': int(len(inside)), 'maximum': float(inside.max()) if len(inside) else None,
                                 'mean': float(inside.mean()) if len(inside) else None},
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']},
}
(args.out/'fan-locks.json').write_text(json.dumps(summary, indent=2)+'\n')
print('fan locks ok', json.dumps({'before': before, 'after': after, 'locks': len(locks), 'skipped': skipped}))
